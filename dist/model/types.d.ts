import { AnyModel } from "./model";
import { SchemaCore } from "../core/schema-core";
import { KadmiumRefinementCtx } from "../validation/types/refinement";
import { WhereCondition } from "../sqb/kadmium-sqb";
import { KadmiumRepo } from "../repo/repo";
import { KadmiumFeature } from "../features/types/base.feature";
/**
 * Контекст, передаваемый в хуки модели.
 */
export declare class ModelHookContext<T extends AnyModel> {
    readonly operation: "create" | "read" | "update" | "delete";
    /** Текущий репозиторий */
    readonly repo: KadmiumRepo<T>;
    /** Схема, к которой привязан хук */
    readonly schema: SchemaCore;
    /** Данные для записи (create/update) */
    data: Partial<T>;
    /** Результент операции (после выполнения) */
    result?: T;
    /** Накопленные where-условия (для beforeRead) */
    private _wheres;
    /** Флаг прерывания */
    private _aborted;
    /** Причина прерывания */
    private _abortReason?;
    constructor(operation: "create" | "read" | "update" | "delete", repo: KadmiumRepo<T>, schema: SchemaCore, data?: Partial<T>);
    /** Добавить условие where (для beforeRead) */
    whereAdd(condition: WhereCondition): void;
    /** Получить накопленные where-условия */
    getWheres(): ReadonlyArray<WhereCondition>;
    get aborted(): boolean;
    /** Прервать операцию */
    abort(reason?: string): void;
}
/**
 * Тип хук-функции модели.
 */
export type ModelHook<T extends AnyModel = any> = (ctx: ModelHookContext<T>) => void | Promise<void>;
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
/**
 * Тип класса фичи.
 */
export type ModelFeatureClass = new (core: SchemaCore) => KadmiumFeature<any>;
import { Schema_OPT } from "../schema/types/schema";
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
export declare abstract class FeatureModel extends AnyModel {
    /** Конфигурация: схема фичи */
    _conf_: FeatureModelConfig;
}
//# sourceMappingURL=types.d.ts.map