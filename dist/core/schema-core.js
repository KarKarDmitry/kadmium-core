"use strict";
// src/core/schema-core.ts
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaCore = void 0;
const schema_1 = require("../schema/engine/schema");
const fields_1 = require("../schema/engine/fields");
const actions_1 = require("../schema/engine/actions");
const sections_1 = require("../schema/engine/sections");
// validation core
const validation_core_1 = require("./validation-core");
const app_core_1 = require("./app-core");
const model_1 = require("../model/model");
const profiler_1 = require("./profiling/profiler");
const errors_1 = require("./errors");
class SchemaCore {
    /** Папка для генерации типов (по умолчанию "schemas") */
    get folder() {
        return this.schema.folder ?? "schemas";
    }
    constructor(schema, validationMode = "strict", validationAdapter) {
        this.schema = schema;
        this.validationMode = validationMode;
        this.validationAdapter = validationAdapter;
        this.features = [];
        /**
         * Inline hooks из модели (_conf_.hooks).
         * Заполняется через bindModelClass() когда класс модели становится доступен.
         */
        this.modelHooks = null;
        /**
         * Класс модели, привязанный к этой схеме.
         * Заполняется через bindModelClass() для доступа к _conf_.
         */
        this.modelClass = null;
        this.initialized = false;
        this.collection = schema.collection;
        // 1. Normalize schema (sections, fields, actions)
        this.normalized = this.normalize();
        // 2. Initialize features and call amendSchema
        this._initFeatures();
        // 3. Build registry (after features may have amended the schema)
        this.registry = this.buildRegistry();
        if (validationAdapter) {
            this.validationCache = new validation_core_1.ValidationCore(this.registry, validationAdapter, this.validationMode);
        }
    }
    get validation() {
        if (!this.validationCache) {
            throw errors_1.Errors.validation.failed([
                {
                    path: "",
                    message: "ValidationAdapter must be provided to SchemaCore before using validation",
                },
            ]);
        }
        return this.validationCache;
    }
    setValidationAdapter(adapter, rules = []) {
        this.validationCache = new validation_core_1.ValidationCore(this.registry, adapter, this.validationMode, rules);
    }
    invalidateValidation() {
        this.validationCache = undefined;
    }
    init(app) {
        if (this.initialized)
            return this;
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
    bindModelClass(ModelClass) {
        if (this.modelClass === ModelClass)
            return; // уже привязана
        // Проверка что модель относится к этой схеме
        const modelCollection = ModelClass._collection;
        if (modelCollection && modelCollection !== this.collection) {
            throw errors_1.Errors.schema.modelMismatch(ModelClass.name, modelCollection, this.collection);
        }
        this.modelClass = ModelClass;
        // Проверяем что модель имеет _conf_ (унаследована от Model, а не AnyModel)
        const instance = new ModelClass();
        if (instance instanceof model_1.Model) {
            const conf = instance._conf_;
            if (conf?.hooks) {
                this.modelHooks = conf.hooks ?? null;
            }
        }
    }
    /**
     * Регистрирует дополнительные схемы из createSchemas() фич.
     * Дубликаты по collection пропускаются.
     */
    _registerFeatureSchemas(app) {
        const featureClasses = this.schema.features;
        if (!featureClasses || featureClasses.length === 0)
            return;
        for (const FeatureCls of featureClasses) {
            // Проверяем есть ли createSchemas у класса
            if (!FeatureCls.prototype.createSchemas)
                continue;
            // Создаём временный экземпляр для вызова createSchemas
            const tempFeature = new FeatureCls(this);
            const schema = tempFeature.createSchemas?.() ?? null;
            if (!schema)
                continue;
            if (app.schemas.some((existing) => existing.collection === schema?.collection)) {
                continue; // Дедупликация
            }
            const featureSchemaCore = schema_1.Schema.from(schema).core;
            featureSchemaCore.init(app);
        }
    }
    normalize() {
        const sections = (0, sections_1.getNormalizedSections)(this.schema.form.sections);
        const fields = (0, fields_1.getNormalizedFields)(this.schema.form.sections);
        const actions = (0, actions_1.getNormalizedActions)(this.schema.form.sections);
        const layout_actions = (0, actions_1.getFormActions)(this.schema.form);
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
    _initFeatures() {
        const featureClasses = this.schema.features;
        if (!featureClasses || featureClasses.length === 0)
            return;
        // Создаём экземпляры фич и сортируем по приоритету
        this.features = featureClasses
            .map((Cls) => new Cls(this))
            .sort((a, b) => a.priority - b.priority);
        // Собираем amendments от всех фич
        const amendedFields = [];
        const amendedSections = [];
        const amendedActions = [];
        for (const feature of this.features) {
            if (!feature.amendSchema)
                continue;
            const amendment = feature.amendSchema();
            if (!amendment)
                continue;
            if (amendment.fields) {
                amendedFields.push(...amendment.fields);
            }
            if (amendment.sections) {
                amendedSections.push(...amendment.sections);
            }
            if (amendment.actions) {
                amendedActions.push(...amendment.actions);
            }
        }
        // Если есть amendments — добавляем в normalized
        if (amendedFields.length > 0 ||
            amendedSections.length > 0 ||
            amendedActions.length > 0) {
            // Проверяем дубликаты имён полей
            const existingNames = new Set();
            for (const f of this.normalized.form.fields) {
                if ("name" in f) {
                    existingNames.add(f.name);
                }
            }
            existingNames.add(this.normalized.primary.name);
            for (const field of amendedFields) {
                if ("name" in field && existingNames.has(field.name)) {
                    throw errors_1.Errors.schema.duplicateField(field.name, this.collection);
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
    buildRegistry() {
        const fieldsByName = new Map();
        const fieldsBySection = new Map();
        const sectionsByPath = new Map();
        const actionsBySection = new Map();
        // Combine form fields and the primary key for full registration
        const allFields = [
            ...this.normalized.form.fields,
            this.normalized.primary,
        ];
        // Fields
        for (const field of allFields) {
            if (fieldsByName.has(field.name)) {
                throw errors_1.Errors.schema.duplicateField(field.name, this.collection);
            }
            fieldsByName.set(field.name, field);
            // Only add fields that belong to a section to the by-section map
            if (field.section) {
                if (!fieldsBySection.has(field.section)) {
                    fieldsBySection.set(field.section, []);
                }
                fieldsBySection.get(field.section).push(field);
            }
        }
        // Sections
        const collectSections = (sections, parentPath = []) => {
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
            actionsBySection.get(section).push(action);
        }
        return {
            fieldsByName,
            fieldsBySection,
            sectionsByPath,
            actionsBySection,
        };
    }
}
exports.SchemaCore = SchemaCore;
__decorate([
    profiler_1.Profiler.Profile(__filename),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [app_core_1.AppCore]),
    __metadata("design:returntype", Object)
], SchemaCore.prototype, "init", null);
__decorate([
    profiler_1.Profiler.Profile(__filename),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Function]),
    __metadata("design:returntype", void 0)
], SchemaCore.prototype, "bindModelClass", null);
//# sourceMappingURL=schema-core.js.map