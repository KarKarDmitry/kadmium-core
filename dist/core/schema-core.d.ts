import { Schema } from "../schema/engine/schema";
import { NormalizedSchema } from "../schema/types/schema";
import { NormalizedInputField_OPT } from "../schema/types/fields";
import { NormalizedAction_OPT } from "../schema/types/actions";
import { NormalizedSection_OPT } from "../schema/types/sections";
import { ValidationCore, ValidationMode } from "./validation-core";
import { AppCore } from "./app-core";
import { ValidationAdapter } from "../validation/types/adapter";
import { ModelValidationRule, ModelHooks } from "../model/types";
import { AnyModel } from "../model/model";
import { KadmiumFeature } from "../features/types/base.feature";
export interface SchemaRegistry {
    fieldsByName: Map<string, NormalizedInputField_OPT>;
    fieldsBySection: Map<string, NormalizedInputField_OPT[]>;
    sectionsByPath: Map<string, NormalizedSection_OPT>;
    actionsBySection: Map<string, NormalizedAction_OPT[]>;
}
export declare class SchemaCore {
    private schema;
    private validationMode;
    private validationAdapter?;
    readonly collection: string;
    features: KadmiumFeature<any>[];
    /**
     * Inline hooks из модели (_conf_.hooks).
     * Заполняется через bindModelClass() когда класс модели становится доступен.
     */
    modelHooks: ModelHooks<any> | null;
    /**
     * Класс модели, привязанный к этой схеме.
     * Заполняется через bindModelClass() для доступа к _conf_.
     */
    modelClass: (new () => AnyModel) | null;
    /** Папка для генерации типов (по умолчанию "schemas") */
    get folder(): string;
    constructor(schema: Schema, validationMode?: ValidationMode, validationAdapter?: ValidationAdapter | undefined);
    initialized: boolean;
    normalized: NormalizedSchema;
    registry: SchemaRegistry;
    private validationCache?;
    get validation(): ValidationCore;
    setValidationAdapter(adapter: ValidationAdapter, rules?: ModelValidationRule[]): void;
    private invalidateValidation;
    init(app: AppCore): this;
    /**
     * Привязывает класс модели к SchemaCore.
     * Извлекает _conf_.hooks и _conf_.validation из модели.
     * Вызывается автоматически при создании репозитория.
     *
     * Связь осуществляется через static _collection поля модели:
     *   class User extends Model {
     *     static readonly _collection = "user";
     *   }
     */
    bindModelClass(ModelClass: new () => AnyModel): void;
    /**
     * Регистрирует дополнительные схемы из createSchemas() фич.
     * Дубликаты по collection пропускаются.
     */
    private _registerFeatureSchemas;
    private normalize;
    /**
     * Инициализирует фичи, вызывает amendSchema и добавляет
     * возвращённые поля/секции/actions в normalized.
     */
    private _initFeatures;
    private buildRegistry;
}
//# sourceMappingURL=schema-core.d.ts.map