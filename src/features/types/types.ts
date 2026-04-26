import { AnyModel, Model } from '../../model/model.js';
import { SchemaCore } from '../../core/schema-core.js';
import { WhereCondition } from '../../sqb/kadmium-sqb.js';
import { Errors } from '../../core/errors.js';
import { KadmiumRepo } from '../../repo/repo.js';
import {
    createHookFieldSelector,
    FieldSelector,
} from '../../repo/utils/hook-filter-proxy.js';

/**
 * Ограниченный интерфейс репозитория, доступный в хуках.
 * Только `get(Model)` для получения репозитория другой модели.
 * Без create/update/delete/where — только доступ к другим репозиториям.
 */
export interface HookRepo {
    get<T extends AnyModel>(ModelClass: new () => T): KadmiumRepo<T>;
}

/**
 * Контекст, передаваемый хукам фич.
 *
 * Каждый хук получает свой HookContext, через который может:
 * - Менять операцию (например, delete → update)
 * - Модифицировать данные (set, delete)
 * - Добавлять условия where (для beforeRead)
 * - Прерывать операцию через abort()
 */
export class HookContext<T extends AnyModel = any> {
    /** Тип текущей операции */
    public operation: 'create' | 'read' | 'update' | 'delete';

    /** Данные для записи (create/update) */
    private _data: Record<string, unknown>;

    /** Условия where, добавленные хуками */
    private _wheres: WhereCondition[] = [];

    /** Флаг прерывания */
    private _aborted = false;

    /** Причина прерывания */
    private _abortReason?: string;

    /**
     * Alias таблицы для multi-table запросов.
     * Устанавливается через _setAlias(), используется в beforeRead хуках.
     */
    private _alias?: string;

    constructor(
        operation: 'create' | 'read' | 'update' | 'delete',
        /** Текущий репозиторий (только get для получения других репозиториев) */
        public readonly repo: HookRepo,
        /** Схема, к которой привязан хук */
        public readonly schema: SchemaCore,
        /** Начальные данные */
        initialData?: Record<string, unknown>,
        /** Информация о текущем пользователе */
        public readonly user?: {
            id: string;
            roles?: string[];
            groups?: string[];
        },
    ) {
        this.operation = operation;
        this._data = initialData ? { ...initialData } : {};
    }

    /** Установить alias (для internal use) */
    _setAlias(alias: string | undefined): void {
        this._alias = alias;
    }

    /** Получить alias таблицы (для beforeRead хуков) */
    get tableAlias(): string | undefined {
        return this._alias;
    }

    // ── Data API ──

    /** Получить поле из данных */
    getData<K extends keyof T & string>(key: K): T[K] | undefined {
        return this._data[key] as T[K] | undefined;
    }

    /** Установить поле в данных */
    setData<K extends keyof T & string>(key: K, value: T[K]): void {
        this._data[key] = value as unknown;
    }

    /** Удалить поле из данных */
    deleteData<K extends keyof T & string>(key: K): void {
        delete this._data[key];
    }

    /** Получить все данные как PlainObject (для передачи в адаптер БД) */
    toData(): Record<string, unknown> {
        return { ...this._data };
    }

    // ── Where API ──

    /**
     * Типобезопасное добавление WHERE-условий.
     * Alias подставляется автоматически из ctx.tableAlias.
     *
     * beforeRead: [(ctx: HookContext<User>) => {
     *     ctx.where((f) => f.deleted_at.null);
     *     ctx.where((f) => f.status.eq('active'));
     * }],
     */
    where(fn: (f: FieldSelector<T>) => void): void {
        const selector = createHookFieldSelector<T>(this._alias, this._wheres);
        fn(selector);
    }

    /** Добавить сырое условие where (для beforeRead) — legacy API */
    whereAdd(condition: WhereCondition): void {
        this._wheres.push(condition);
    }

    /** Очистить все добавленные хуками where-условия */
    whereClear(): void {
        this._wheres = [];
    }

    /** Получить накопленные where-условия */
    getWheres(): ReadonlyArray<WhereCondition> {
        return this._wheres;
    }

    // ── Abort API ──

    get aborted(): boolean {
        return this._aborted;
    }

    /** Прервать операцию */
    abort(reason?: string): void {
        this._aborted = true;
        this._abortReason = reason;
        throw Errors.feature.abort(this.operation, reason);
    }
}

/**
 * Результат amendSchema — поля, секции и действия для добавления в схему.
 */
export interface SchemaAmendment {
    fields?: any[]; // Field_OPT[]
    sections?: any[]; // Section_OPT[]
    actions?: any[]; // Action_OPT[]
}

/**
 * Результат разрешения полей/секций для Policy.
 */
export type VisibilityLevel = 'full' | 'view' | 'hidden' | 'deny';
