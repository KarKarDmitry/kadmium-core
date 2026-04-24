// src/model/model.ts

import {
	ModelHook,
	ModelHooks,
	ModelValidation,
	ModelFeatureClass,
} from "./types.js";

export abstract class AnyModel {
	_meta: "generated-schema" = "generated-schema";
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
export abstract class Model extends AnyModel {

	/** Конфигурация: хуки, валидация, фичи */
	_conf_: ModelConfig<this> = {
		hooks: {
			beforeCreate: [],
			afterCreate: [],
			beforeUpdate: [],
			afterUpdate: [],
			beforeDelete: [],
			afterDelete: [],
			beforeRead: [],
			afterRead: [],
		},
		validation: { rules: [] },
		features: [],
	};
}

