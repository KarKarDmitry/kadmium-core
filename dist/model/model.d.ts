import { ModelHooks, ModelValidation } from "./types";
export declare abstract class AnyModel {
    _meta: "generated-schema";
    abstract id: string | number;
}
/**
 * Конфигурация модели.
 */
export interface ModelConfig<T extends AnyModel> {
    hooks: ModelHooks<T>;
    validation: ModelValidation<T>;
    features: any[];
}
/**
 * Базовый класс для всех моделей Kadmium.
 */
export declare abstract class Model extends AnyModel {
    /** Конфигурация: хуки, валидация, фичи */
    _conf_: ModelConfig<this>;
}
//# sourceMappingURL=model.d.ts.map