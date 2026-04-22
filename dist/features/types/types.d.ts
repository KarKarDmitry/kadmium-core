import { AnyModel } from "../../model/model";
import { SchemaCore } from "../../core/schema-core";
import { WhereCondition } from "../../sqb/kadmium-sqb";
import { KadmiumRepo } from "../../repo/repo";
import { FieldSelector } from "../../repo/utils/hook-filter-proxy";
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
export declare class HookContext<T extends AnyModel = any> {
    /** Текущий репозиторий (только get для получения других репозиториев) */
    readonly repo: HookRepo;
    /** Схема, к которой привязан хук */
    readonly schema: SchemaCore;
    /** Информация о текущем пользователе */
    readonly user?: {
        id: string;
        roles?: string[];
        groups?: string[];
    } | undefined;
    /** Тип текущей операции */
    operation: "create" | "read" | "update" | "delete";
    /** Данные для записи (create/update) */
    private _data;
    /** Условия where, добавленные хуками */
    private _wheres;
    /** Флаг прерывания */
    private _aborted;
    /** Причина прерывания */
    private _abortReason?;
    /**
     * Alias таблицы для multi-table запросов.
     * Устанавливается через _setAlias(), используется в beforeRead хуках.
     */
    private _alias?;
    constructor(operation: "create" | "read" | "update" | "delete", 
    /** Текущий репозиторий (только get для получения других репозиториев) */
    repo: HookRepo, 
    /** Схема, к которой привязан хук */
    schema: SchemaCore, 
    /** Начальные данные */
    initialData?: Record<string, unknown>, 
    /** Информация о текущем пользователе */
    user?: {
        id: string;
        roles?: string[];
        groups?: string[];
    } | undefined);
    /** Установить alias (для internal use) */
    _setAlias(alias: string | undefined): void;
    /** Получить alias таблицы (для beforeRead хуков) */
    get tableAlias(): string | undefined;
    /** Получить поле из данных */
    getData<K extends keyof T & string>(key: K): T[K] | undefined;
    /** Установить поле в данных */
    setData<K extends keyof T & string>(key: K, value: T[K]): void;
    /** Удалить поле из данных */
    deleteData<K extends keyof T & string>(key: K): void;
    /** Получить все данные как PlainObject (для передачи в адаптер БД) */
    toData(): Record<string, unknown>;
    /**
     * Типобезопасное добавление WHERE-условий.
     * Alias подставляется автоматически из ctx.tableAlias.
     *
     * beforeRead: [(ctx: HookContext<User>) => {
     *     ctx.where((f) => f.deleted_at.null);
     *     ctx.where((f) => f.status.eq('active'));
     * }],
     */
    where(fn: (f: FieldSelector<T>) => void): void;
    /** Добавить сырое условие where (для beforeRead) — legacy API */
    whereAdd(condition: WhereCondition): void;
    /** Очистить все добавленные хуками where-условия */
    whereClear(): void;
    /** Получить накопленные where-условия */
    getWheres(): ReadonlyArray<WhereCondition>;
    get aborted(): boolean;
    /** Прервать операцию */
    abort(reason?: string): void;
}
/**
 * Результат amendSchema — поля, секции и действия для добавления в схему.
 */
export interface SchemaAmendment {
    fields?: any[];
    sections?: any[];
    actions?: any[];
}
/**
 * Результат разрешения полей/секций для Policy.
 */
export type VisibilityLevel = "full" | "view" | "hidden" | "deny";
//# sourceMappingURL=types.d.ts.map