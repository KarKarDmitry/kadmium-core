"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KadmiumRepo = void 0;
const crypto_1 = require("crypto");
const builder_single_query_1 = require("./builders/builder.single-query");
const types_1 = require("../model/types");
const profiler_1 = require("../core/profiling/profiler");
const bcrypt = __importStar(require("bcrypt"));
const repo_manager_1 = require("./repo-manager");
const types_2 = require("../features/types");
const errors_1 = require("../core/errors");
class KadmiumRepo {
    constructor(schemaCore, adapter, _appCore, _tx) {
        this.schemaCore = schemaCore;
        this.adapter = adapter;
        this._appCore = _appCore;
        this._tx = _tx;
        this.SALT_ROUNDS = 10;
        this.passwordFieldNames = [
            ...this.schemaCore.registry.fieldsByName.values(),
        ]
            .filter((f) => f.type === "password")
            .map((f) => f.name);
    }
    get appCore() {
        return this._appCore;
    }
    /**
     * Получает репозиторий другой модели в том же контексте (транзакция или нет).
     */
    get(schema) {
        const schemaName = schema._collection ?? schema.name.toLowerCase();
        const schemaCore = this._appCore.schemas.find((s) => s.collection === schemaName);
        if (!schemaCore) {
            throw errors_1.Errors.repo.notFound(schemaName);
        }
        schemaCore.bindModelClass(schema);
        return new KadmiumRepo(schemaCore, this.adapter, this._appCore, this._tx);
    }
    // ── Feature hooks helpers ──
    /**
     * Создаёт обёртку HookRepo для передачи в хуки.
     */
    _createHookRepo() {
        const self = this;
        return {
            get: (ModelClass) => self.get(ModelClass),
        };
    }
    /**
     * Запускает beforeCreate хуки МОДЕЛИ (_conf_.hooks).
     * Вызывается ПЕРЕД хуками фич.
     */
    async _runModelBeforeCreate(data) {
        const modelHooks = this.schemaCore.modelHooks;
        if (!modelHooks?.beforeCreate?.length) {
            return { data: data, operation: "create" };
        }
        const ctx = new types_1.ModelHookContext("create", this, this.schemaCore, data);
        for (const hook of modelHooks.beforeCreate) {
            await hook(ctx);
            if (ctx.aborted)
                break;
        }
        return { data: ctx.data, operation: ctx.operation };
    }
    /**
     * Запускает afterCreate хуки МОДЕЛИ (_conf_.hooks).
     * Вызывается ПЕРЕД хуками фич.
     */
    async _runModelAfterCreate(result) {
        const modelHooks = this.schemaCore.modelHooks;
        if (!modelHooks?.afterCreate?.length)
            return result;
        const ctx = new types_1.ModelHookContext("create", this, this.schemaCore, result);
        for (const hook of modelHooks.afterCreate) {
            await hook(ctx);
            if (ctx.aborted)
                break;
        }
        // Merge ctx.data modifications into result
        return { ...result, ...ctx.data };
    }
    /**
     * Запускает beforeUpdate хуки МОДЕЛИ (_conf_.hooks).
     */
    async _runModelBeforeUpdate(data) {
        const modelHooks = this.schemaCore.modelHooks;
        if (!modelHooks?.beforeUpdate?.length) {
            return { data: data, operation: "update" };
        }
        const ctx = new types_1.ModelHookContext("update", this, this.schemaCore, data);
        for (const hook of modelHooks.beforeUpdate) {
            await hook(ctx);
            if (ctx.aborted)
                break;
        }
        return { data: ctx.data, operation: ctx.operation };
    }
    /**
     * Запускает afterUpdate хуки МОДЕЛИ (_conf_.hooks).
     * Hooks are applied to each result individually.
     */
    async _runModelAfterUpdate(results) {
        const modelHooks = this.schemaCore.modelHooks;
        if (!modelHooks?.afterUpdate?.length)
            return results;
        for (let i = 0; i < results.length; i++) {
            const ctx = new types_1.ModelHookContext("update", this, this.schemaCore, results[i]);
            for (const hook of modelHooks.afterUpdate) {
                await hook(ctx);
                if (ctx.aborted)
                    break;
            }
            if (Object.keys(ctx.data).length > 0) {
                results[i] = { ...results[i], ...ctx.data };
            }
        }
        return results;
    }
    /**
     * Запускает beforeDelete хуки МОДЕЛИ (_conf_.hooks).
     */
    async _runModelBeforeDelete() {
        const modelHooks = this.schemaCore.modelHooks;
        if (!modelHooks?.beforeDelete?.length) {
            return { operation: "delete" };
        }
        const ctx = new types_1.ModelHookContext("delete", this, this.schemaCore);
        for (const hook of modelHooks.beforeDelete) {
            await hook(ctx);
            if (ctx.aborted)
                break;
        }
        return { operation: ctx.operation };
    }
    /**
     * Запускает afterDelete хуки МОДЕЛИ (_conf_.hooks).
     * Hooks are applied to each result individually.
     */
    async _runModelAfterDelete(results) {
        const modelHooks = this.schemaCore.modelHooks;
        if (!modelHooks?.afterDelete?.length)
            return;
        for (let i = 0; i < results.length; i++) {
            const ctx = new types_1.ModelHookContext("delete", this, this.schemaCore, results[i]);
            for (const hook of modelHooks.afterDelete) {
                await hook(ctx);
                if (ctx.aborted)
                    break;
            }
        }
    }
    /**
     * Запускает beforeRead хуки МОДЕЛИ (_conf_.hooks).
     */
    async _runModelBeforeRead() {
        const modelHooks = this.schemaCore.modelHooks;
        if (!modelHooks?.beforeRead?.length)
            return [];
        const ctx = new types_1.ModelHookContext("read", this, this.schemaCore);
        for (const hook of modelHooks.beforeRead) {
            await hook(ctx);
        }
        return ctx.getWheres();
    }
    /**
     * Запускает afterRead хуки МОДЕЛИ (_conf_.hooks).
     * Hooks are applied to each result individually.
     */
    async _runModelAfterRead(results) {
        const modelHooks = this.schemaCore.modelHooks;
        if (!modelHooks?.afterRead?.length)
            return results;
        for (let i = 0; i < results.length; i++) {
            const ctx = new types_1.ModelHookContext("read", this, this.schemaCore, results[i]);
            for (const hook of modelHooks.afterRead) {
                await hook(ctx);
            }
            if (Object.keys(ctx.data).length > 0) {
                results[i] = { ...results[i], ...ctx.data };
            }
        }
        return results;
    }
    /**
     * Запускает beforeCreate хуки всех фич схемы.
     * Данные модифицируются через HookContext.
     */
    async _runFeatureBeforeCreate(data) {
        const ctx = new types_2.HookContext("create", this._createHookRepo(), this.schemaCore, data);
        for (const feature of this.schemaCore.features) {
            const hooks = feature.hooks?.beforeCreate ?? [];
            for (const hook of hooks) {
                await hook(ctx);
                if (ctx.aborted)
                    break;
            }
            if (ctx.aborted)
                break;
        }
        return { data: ctx.toData(), operation: ctx.operation };
    }
    /**
     * Запускает afterCreate хуки всех фич схемы.
     */
    async _runFeatureAfterCreate(result) {
        const ctx = new types_2.HookContext("create", this._createHookRepo(), this.schemaCore);
        for (const feature of this.schemaCore.features) {
            const hooks = feature.hooks?.afterCreate ?? [];
            for (const hook of hooks) {
                await hook(result, ctx);
            }
        }
    }
    /**
     * Запускает beforeUpdate хуки всех фич схемы.
     */
    async _runFeatureBeforeUpdate(data) {
        const ctx = new types_2.HookContext("update", this._createHookRepo(), this.schemaCore, data);
        for (const feature of this.schemaCore.features) {
            const hooks = feature.hooks?.beforeUpdate ?? [];
            for (const hook of hooks) {
                await hook(ctx);
                if (ctx.aborted)
                    break;
            }
            if (ctx.aborted)
                break;
        }
        return { data: ctx.toData(), operation: ctx.operation };
    }
    /**
     * Запускает afterUpdate хуки всех фич схемы.
     */
    async _runFeatureAfterUpdate(results) {
        const ctx = new types_2.HookContext("update", this._createHookRepo(), this.schemaCore);
        for (const feature of this.schemaCore.features) {
            const hooks = feature.hooks?.afterUpdate ?? [];
            for (const hook of hooks) {
                await hook(results, ctx);
            }
        }
    }
    /**
     * Запускает beforeDelete хуки всех фич схемы.
     * Может сменить операцию на "update" (для soft-delete).
     */
    async _runFeatureBeforeDelete() {
        const ctx = new types_2.HookContext("delete", this._createHookRepo(), this.schemaCore);
        for (const feature of this.schemaCore.features) {
            const hooks = feature.hooks?.beforeDelete ?? [];
            for (const hook of hooks) {
                await hook(ctx);
                if (ctx.aborted)
                    break;
            }
            if (ctx.aborted)
                break;
        }
        return { operation: ctx.operation, data: ctx.toData() };
    }
    /**
     * Запускает afterDelete хуки всех фич схемы.
     */
    async _runFeatureAfterDelete(results) {
        const ctx = new types_2.HookContext("delete", this._createHookRepo(), this.schemaCore);
        for (const feature of this.schemaCore.features) {
            const hooks = feature.hooks?.afterDelete ?? [];
            for (const hook of hooks) {
                await hook(results, ctx);
            }
        }
    }
    /**
     * Запускает beforeRead хуки и возвращает накопленные where-условия.
     */
    async _runFeatureBeforeRead(alias) {
        const ctx = new types_2.HookContext("read", this._createHookRepo(), this.schemaCore);
        ctx._setAlias(alias);
        for (const feature of this.schemaCore.features) {
            const hooks = feature.hooks?.beforeRead ?? [];
            for (const hook of hooks) {
                await hook(ctx);
            }
        }
        return ctx.getWheres();
    }
    /**
     * Запускает afterRead хуки.
     */
    async _runFeatureAfterRead(results) {
        const ctx = new types_2.HookContext("read", this._createHookRepo(), this.schemaCore);
        for (const feature of this.schemaCore.features) {
            const hooks = feature.hooks?.afterRead ?? [];
            for (const hook of hooks) {
                await hook(results, ctx);
            }
        }
        return results;
    }
    async _hashPasswordsInData(data) {
        const processedData = { ...data };
        for (const fieldName of this.passwordFieldNames) {
            const value = processedData[fieldName];
            if (typeof value === "string" &&
                value.length > 0 &&
                !value.startsWith("$2")) {
                processedData[fieldName] = await bcrypt.hash(value, this.SALT_ROUNDS);
            }
        }
        return processedData;
    }
    where(clause) {
        const queryBuilder = new builder_single_query_1.QueryBuilder(this.schemaCore, this.adapter, this._appCore, this);
        // The `where` method on the queryBuilder is from BaseWhereBuilder,
        // which correctly handles both simple and grouped clauses.
        queryBuilder.where(clause);
        return queryBuilder;
    }
    include(selector) {
        const queryBuilder = new builder_single_query_1.QueryBuilder(this.schemaCore, this.adapter, this._appCore, this);
        return queryBuilder.include(selector);
    }
    findById(id) {
        const pkName = this.schemaCore.normalized.primary.name;
        // The cast to `any` is needed because `pkName` is a string, so TypeScript
        // cannot statically verify that it's a valid key on the FilterProxy.
        return this.where((e) => e[pkName].eq(id))
            .first()
            .go();
    }
    first(selectorOrOptions, options) {
        const builder = new builder_single_query_1.QueryBuilder(this.schemaCore, this.adapter, this._appCore, this);
        return builder.first(selectorOrOptions, options);
    }
    countAll() {
        const queryBuilder = new builder_single_query_1.QueryBuilder(this.schemaCore, this.adapter, this._appCore, this);
        return queryBuilder.count();
    }
    create(data) {
        const runner = {
            go: async () => {
                const pkField = this.schemaCore.normalized.primary;
                const schemaFields = this.schemaCore.registry.fieldsByName;
                const processSingleItem = async (item) => {
                    const newItem = { ...item };
                    if (pkField.db_type === "uuid" && !newItem[pkField.name]) {
                        newItem[pkField.name] = (0, crypto_1.randomUUID)();
                    }
                    const persistedData = { ...newItem };
                    for (const key in persistedData) {
                        const fieldDef = schemaFields.get(key);
                        if (fieldDef && fieldDef.persist === false) {
                            delete persistedData[key];
                        }
                    }
                    // 1. Model beforeCreate hooks (user business logic)
                    const { data: modelData, operation: modelOp } = await this._runModelBeforeCreate(persistedData);
                    if (modelOp !== "create") {
                        throw errors_1.Errors.query.error(`Model beforeCreate hook changed operation to "${modelOp}". This is not supported for create().`);
                    }
                    // 2. Feature beforeCreate hooks (infrastructure logic)
                    const { data: featureData, operation } = await this._runFeatureBeforeCreate(modelData);
                    if (operation !== "create") {
                        throw errors_1.Errors.query.error(`beforeCreate hook changed operation to "${operation}". This is not supported for create().`);
                    }
                    return this._hashPasswordsInData(featureData);
                };
                if (Array.isArray(data)) {
                    if (data.length === 0)
                        return [];
                    const processedData = await Promise.all(data.map(processSingleItem));
                    const results = await this.adapter.createMany(this.schemaCore.collection, processedData);
                    // Feature afterCreate hooks for each result
                    for (let i = 0; i < results.length; i++) {
                        // 1. Model afterCreate hooks (user business logic)
                        results[i] = await this._runModelAfterCreate(results[i]);
                        // 2. Feature afterCreate hooks (infrastructure logic)
                        await this._runFeatureAfterCreate(results[i]);
                    }
                    return results;
                }
                else {
                    const processedData = await processSingleItem(data);
                    let result = await this.adapter.create(this.schemaCore.collection, processedData);
                    // 1. Model afterCreate hooks (user business logic)
                    result = await this._runModelAfterCreate(result);
                    // 2. Feature afterCreate hooks (infrastructure logic)
                    await this._runFeatureAfterCreate(result);
                    return result;
                }
            },
        };
        return runner;
    }
    select(selectorOrOptions, options) {
        const builder = new builder_single_query_1.QueryBuilder(this.schemaCore, this.adapter, this._appCore, this);
        return builder.select(selectorOrOptions, options);
    }
    update(data) {
        const builder = new builder_single_query_1.QueryBuilder(this.schemaCore, this.adapter, this._appCore, this);
        return builder.update(data);
    }
    delete() {
        const builder = new builder_single_query_1.QueryBuilder(this.schemaCore, this.adapter, this._appCore, this);
        return builder.delete();
    }
    /**
     * Executes a callback inside a database transaction.
     * Automatically commits on success, rolls back on error.
     *
     * The callback receives an ITransaction context with a `get()` method
     * to access repositories bound to the same transaction.
     *
     * @param callback - Function to execute within the transaction.
     * @returns The result of the callback.
     */
    async transaction(callback) {
        const txAdapter = await this.adapter.beginTransaction();
        try {
            // Initialize RepoManager BEFORE creating txContext to avoid ! assertion
            const txRepoManager = new repo_manager_1.RepoManager(this._appCore, txAdapter);
            const txContext = {
                get: (type) => txRepoManager.get(type),
            };
            // Set the transaction context on the repo manager
            txRepoManager._tx = txContext;
            const result = await callback(txContext);
            await txAdapter.commit();
            return result;
        }
        catch (err) {
            await txAdapter.rollback();
            throw err;
        }
    }
}
exports.KadmiumRepo = KadmiumRepo;
__decorate([
    profiler_1.Profiler.Profile(__filename),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], KadmiumRepo.prototype, "_runModelBeforeCreate", null);
__decorate([
    profiler_1.Profiler.Profile(__filename),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], KadmiumRepo.prototype, "_runModelAfterCreate", null);
__decorate([
    profiler_1.Profiler.Profile(__filename),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], KadmiumRepo.prototype, "_runModelBeforeUpdate", null);
__decorate([
    profiler_1.Profiler.Profile(__filename),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array]),
    __metadata("design:returntype", Promise)
], KadmiumRepo.prototype, "_runModelAfterUpdate", null);
__decorate([
    profiler_1.Profiler.Profile(__filename),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], KadmiumRepo.prototype, "_runModelBeforeDelete", null);
__decorate([
    profiler_1.Profiler.Profile(__filename),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array]),
    __metadata("design:returntype", Promise)
], KadmiumRepo.prototype, "_runModelAfterDelete", null);
__decorate([
    profiler_1.Profiler.Profile(__filename),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], KadmiumRepo.prototype, "_runModelBeforeRead", null);
__decorate([
    profiler_1.Profiler.Profile(__filename),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array]),
    __metadata("design:returntype", Promise)
], KadmiumRepo.prototype, "_runModelAfterRead", null);
__decorate([
    profiler_1.Profiler.Profile(__filename),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], KadmiumRepo.prototype, "_runFeatureBeforeCreate", null);
__decorate([
    profiler_1.Profiler.Profile(__filename),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], KadmiumRepo.prototype, "_runFeatureAfterCreate", null);
__decorate([
    profiler_1.Profiler.Profile(__filename),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], KadmiumRepo.prototype, "_runFeatureBeforeUpdate", null);
__decorate([
    profiler_1.Profiler.Profile(__filename),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array]),
    __metadata("design:returntype", Promise)
], KadmiumRepo.prototype, "_runFeatureAfterUpdate", null);
__decorate([
    profiler_1.Profiler.Profile(__filename),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], KadmiumRepo.prototype, "_runFeatureBeforeDelete", null);
__decorate([
    profiler_1.Profiler.Profile(__filename),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array]),
    __metadata("design:returntype", Promise)
], KadmiumRepo.prototype, "_runFeatureAfterDelete", null);
__decorate([
    profiler_1.Profiler.Profile(__filename),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Function]),
    __metadata("design:returntype", Promise)
], KadmiumRepo.prototype, "transaction", null);
//# sourceMappingURL=repo.js.map