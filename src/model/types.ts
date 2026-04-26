// src/model/types.ts

import { AnyModel } from './model.js';
import { SchemaCore } from '../core/schema-core.js';
import { KadmiumRefinementCtx } from '../validation/types/refinement.js';
import { WhereCondition } from '../sqb/kadmium-sqb.js';
import { KadmiumRepo } from '../repo/repo.js';
import { KadmiumFeature } from '../features/types/base.feature.js';

// ─────────────────────────────────────────────
// Model Hook Types
// ─────────────────────────────────────────────

/**
 * Контекст, передаваемый в хуки модели.
 */
export class ModelHookContext<T extends AnyModel> {
    /** Текущий репозиторий */
    public readonly repo: KadmiumRepo<T>;

    /** Схема, к которой привязан хук */
    public readonly schema: SchemaCore;

    /** Данные для записи (create/update) */
    public data: Partial<T>;

    /** Результент операции (после выполнения) */
    public result?: T;

    /** Накопленные where-условия (для beforeRead) */
    private _wheres: WhereCondition[] = [];

    /** Флаг прерывания */
    private _aborted = false;

    /** Причина прерывания */
    private _abortReason?: string;

    constructor(
        public readonly operation: 'create' | 'read' | 'update' | 'delete',
        repo: KadmiumRepo<T>,
        schema: SchemaCore,
        data?: Partial<T>,
    ) {
        this.repo = repo;
        this.schema = schema;
        this.data = data ? { ...data } : {};
    }

    // ── Where API ──

    /** Добавить условие where (для beforeRead) */
    whereAdd(condition: WhereCondition): void {
        this._wheres.push(condition);
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
        throw new Error(`Model hook aborted: ${reason ?? 'no reason'}`);
    }
}

/**
 * Тип хук-функции модели.
 */
export type ModelHook<T extends AnyModel = any> = (
    ctx: ModelHookContext<T>,
) => void | Promise<void>;

/**
 * Все возможные хуки модели.
 */
export interface ModelHooks<T extends AnyModel = any> {
    beforeCreate?: ModelHook<T>[];
    afterCreate?: ModelHook<T>[];
    beforeUpdate?: ModelHook<T>[];
    afterUpdate?: ModelHook<T>[];
    beforeDelete?: ModelHook<T>[];
    afterDelete?: ModelHook<T>[];
    beforeRead?: ModelHook<T>[];
    afterRead?: ModelHook<T>[];
}

/**
 * Правило валидации модели.
 */
export interface ModelValidationRule {
    name: string;
    refine: (data: any, ctx: KadmiumRefinementCtx) => void;
}

/**
 * Валидация модели.
 */
export interface ModelValidation<T> {
    rules: ModelValidationRule[];
}

// ─────────────────────────────────────────────
// Feature Type (для связи с фичами)
// ─────────────────────────────────────────────

/**
 * Тип класса фичи.
 */
export type ModelFeatureClass = new (core: SchemaCore) => KadmiumFeature<any>;

// ─────────────────────────────────────────────
// FeatureModel Types
// ─────────────────────────────────────────────

import { Schema_OPT } from '../schema/types/schema.js';

/**
 * Конфигурация модели фичи.
 * Содержит схему, которую нужно зарегистрировать в Kadmium.
 */
export interface FeatureModelConfig {
    schema: Schema_OPT;
}

/**
 * Базовый класс для моделей, создаваемых фичами.
 *
 * Разработчик наследуется от FeatureModel, определяет поля и указывает
 * схему через _conf_.schema. Генератор распознаёт такие классы и
 * генерирует полноценную модель в src/models/features/.
 */
export abstract class FeatureModel extends AnyModel {
    /** Конфигурация: схема фичи */
    _conf_: FeatureModelConfig = {
        schema: {} as Schema_OPT,
    };
}
