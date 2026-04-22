// src/core/schema-core.ts

import { Schema } from "../schema/engine/schema";
import { NormalizedSchema } from "../schema/types/schema";
import { getNormalizedFields } from "../schema/engine/fields";
import { getFormActions, getNormalizedActions } from "../schema/engine/actions";
import { getNormalizedSections } from "../schema/engine/sections";
import { NormalizedInputField_OPT } from "../schema/types/fields";
import { NormalizedAction_OPT } from "../schema/types/actions";
import { NormalizedSection_OPT } from "../schema/types/sections";

// validation core
import { ValidationCore, ValidationMode } from "./validation-core";
import { AppCore } from "./app-core";
import { ValidationAdapter } from "../validation/types/adapter";
import { FeatureModel, ModelValidationRule, ModelHooks } from "../model/types";
import { AnyModel, Model } from "../model/model";
import { Profiler } from "./profiling/profiler";

// features
import { KadmiumFeature } from "../features/types/base.feature";
import { SchemaAmendment } from "../features/types";
import { Errors } from "./errors";

export interface SchemaRegistry {
	fieldsByName: Map<string, NormalizedInputField_OPT>;
	fieldsBySection: Map<string, NormalizedInputField_OPT[]>;
	sectionsByPath: Map<string, NormalizedSection_OPT>;
	actionsBySection: Map<string, NormalizedAction_OPT[]>;
}

export class SchemaCore {
	public readonly collection: string;
	public features: KadmiumFeature<any>[] = [];

	/**
	 * Inline hooks из модели (_conf_.hooks).
	 * Заполняется через bindModelClass() когда класс модели становится доступен.
	 */
	public modelHooks: ModelHooks<any> | null = null;

	/**
	 * Класс модели, привязанный к этой схеме.
	 * Заполняется через bindModelClass() для доступа к _conf_.
	 */
	public modelClass: (new () => AnyModel) | null = null;

	/** Папка для генерации типов (по умолчанию "schemas") */
	get folder(): string {
		return this.schema.folder ?? "schemas";
	}

	constructor(
		private schema: Schema,
		private validationMode: ValidationMode = "strict",
		private validationAdapter?: ValidationAdapter,
	) {
		this.collection = schema.collection;

		// 1. Normalize schema (sections, fields, actions)
		this.normalized = this.normalize();

		// 2. Initialize features and call amendSchema
		this._initFeatures();

		// 3. Build registry (after features may have amended the schema)
		this.registry = this.buildRegistry();

		if (validationAdapter) {
			this.validationCache = new ValidationCore(
				this.registry,
				validationAdapter,
				this.validationMode,
			);
		}
	}
	public initialized: boolean = false;

	public normalized: NormalizedSchema;
	public registry: SchemaRegistry;

	private validationCache?: ValidationCore;

	public get validation(): ValidationCore {
		if (!this.validationCache) {
			throw Errors.validation.failed([
				{
					path: "",
					message:
						"ValidationAdapter must be provided to SchemaCore before using validation",
				},
			]);
		}
		return this.validationCache;
	}

	public setValidationAdapter(
		adapter: ValidationAdapter,
		rules: ModelValidationRule[] = [],
	) {
		this.validationCache = new ValidationCore(
			this.registry,
			adapter,
			this.validationMode,
			rules,
		);
	}

	private invalidateValidation() {
		this.validationCache = undefined;
	}

	@Profiler.Profile(__filename)
	public init(app: AppCore): this {
		if (this.initialized) return this;

		if (!this.validationCache) {
			this.setValidationAdapter(new app.adapters.validation.schema(), []);
		}

		// Register schemas from features (createSchemas) with deduplication
		this._registerFeatureSchemas(app);

		app.registerSchema(this);
		this.initialized = true;
		return this;
	}

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
	@Profiler.Profile(__filename)
	public bindModelClass(ModelClass: new () => AnyModel): void {
		if (this.modelClass === ModelClass) return; // уже привязана

		// Проверка что модель относится к этой схеме
		const modelCollection = (ModelClass as any)._collection;
		if (modelCollection && modelCollection !== this.collection) {
			throw Errors.schema.modelMismatch(
				ModelClass.name,
				modelCollection,
				this.collection,
			);
		}

		this.modelClass = ModelClass;

		// Проверяем что модель имеет _conf_ (унаследована от Model, а не AnyModel)
		const instance = new ModelClass();
		if (instance instanceof Model) {
			const conf = instance._conf_ as { hooks?: any } | undefined;
			if (conf?.hooks) {
				this.modelHooks = conf.hooks ?? null;
			}
		}
	}

	/**
	 * Регистрирует дополнительные схемы из createSchemas() фич.
	 * Дубликаты по collection пропускаются.
	 */
	private _registerFeatureSchemas(app: AppCore): void {
		const featureClasses = this.schema.features;
		if (!featureClasses || featureClasses.length === 0) return;

		for (const FeatureCls of featureClasses) {
			// Проверяем есть ли createSchemas у класса
			if (!FeatureCls.prototype.createSchemas) continue;

			// Создаём временный экземпляр для вызова createSchemas
			const tempFeature = new FeatureCls(this);
			const schema = tempFeature.createSchemas?.() ?? null;

			if (!schema) continue;
			if (
				app.schemas.some(
					(existing) => existing.collection === schema?.collection,
				)
			) {
				continue; // Дедупликация
			}

			const featureSchemaCore = Schema.from(schema).core;
			featureSchemaCore.init(app);
		}
	}

	private normalize(): NormalizedSchema {
		const sections = getNormalizedSections(this.schema.form.sections);
		const fields = getNormalizedFields(this.schema.form.sections);
		const actions = getNormalizedActions(this.schema.form.sections);
		const layout_actions = getFormActions(this.schema.form);

		return {
			primary: this.schema.primary,
			form: {
				sections,
				fields,
				actions: [...actions, ...layout_actions],
			},
		};
	}

	/**
	 * Инициализирует фичи, вызывает amendSchema и добавляет
	 * возвращённые поля/секции/actions в normalized.
	 */
	private _initFeatures(): void {
		const featureClasses = this.schema.features;
		if (!featureClasses || featureClasses.length === 0) return;

		// Создаём экземпляры фич и сортируем по приоритету
		this.features = featureClasses
			.map(
				(Cls: new (core: SchemaCore) => KadmiumFeature<FeatureModel>) =>
					new Cls(this),
			)
			.sort((a, b) => a.priority - b.priority);

		// Собираем amendments от всех фич
		const amendedFields: NormalizedInputField_OPT[] = [];
		const amendedSections: NormalizedSection_OPT[] = [];
		const amendedActions: NormalizedAction_OPT[] = [];

		for (const feature of this.features) {
			if (!feature.amendSchema) continue;

			const amendment: SchemaAmendment | void = feature.amendSchema();
			if (!amendment) continue;

			if (amendment.fields) {
				amendedFields.push(...(amendment.fields as NormalizedInputField_OPT[]));
			}
			if (amendment.sections) {
				amendedSections.push(
					...(amendment.sections as NormalizedSection_OPT[]),
				);
			}
			if (amendment.actions) {
				amendedActions.push(...(amendment.actions as NormalizedAction_OPT[]));
			}
		}

		// Если есть amendments — добавляем в normalized
		if (
			amendedFields.length > 0 ||
			amendedSections.length > 0 ||
			amendedActions.length > 0
		) {
			// Проверяем дубликаты имён полей
			const existingNames = new Set<string>();
			for (const f of this.normalized.form.fields) {
				if ("name" in f) {
					existingNames.add(f.name);
				}
			}
			existingNames.add(this.normalized.primary.name);

			for (const field of amendedFields) {
				if ("name" in field && existingNames.has(field.name)) {
					throw Errors.schema.duplicateField(field.name, this.collection);
				}
				if ("name" in field) {
					existingNames.add(field.name);
				}
				this.normalized.form.fields.push(field);
			}

			for (const section of amendedSections) {
				this.normalized.form.sections.push(section);
			}

			for (const action of amendedActions) {
				this.normalized.form.actions.push(action);
			}
		}
	}

	private buildRegistry(): SchemaRegistry {
		const fieldsByName = new Map<string, NormalizedInputField_OPT>();
		const fieldsBySection = new Map<string, NormalizedInputField_OPT[]>();
		const sectionsByPath = new Map<string, NormalizedSection_OPT>();
		const actionsBySection = new Map<string, NormalizedAction_OPT[]>();

		// Combine form fields and the primary key for full registration
		const allFields = [
			...this.normalized.form.fields,
			this.normalized.primary,
		] as NormalizedInputField_OPT[];

		// Fields
		for (const field of allFields) {
			if (fieldsByName.has(field.name)) {
				throw Errors.schema.duplicateField(field.name, this.collection);
			}

			fieldsByName.set(field.name, field);

			// Only add fields that belong to a section to the by-section map
			if (field.section) {
				if (!fieldsBySection.has(field.section)) {
					fieldsBySection.set(field.section, []);
				}
				fieldsBySection.get(field.section)!.push(field);
			}
		}

		// Sections
		const collectSections = (
			sections: NormalizedSection_OPT[],
			parentPath: string[] = [],
		) => {
			for (const section of sections) {
				const path = [...parentPath, section.key];
				const key = path.join(":");

				sectionsByPath.set(key, section);

				if (section.sections) {
					collectSections(section.sections, path);
				}
			}
		};

		collectSections(this.normalized.form.sections);

		// Actions
		for (const action of this.normalized.form.actions) {
			const section = action.section ?? "";

			if (!actionsBySection.has(section)) {
				actionsBySection.set(section, []);
			}

			actionsBySection.get(section)!.push(action);
		}

		return {
			fieldsByName,
			fieldsBySection,
			sectionsByPath,
			actionsBySection,
		};
	}
}
