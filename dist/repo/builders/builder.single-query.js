"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryBuilder = void 0;
const symbols_1 = require("../symbols");
const relation_builder_1 = require("../field-builders/relation-builder");
const selectable_1 = require("../types/selectable");
const kadmium_sqb_1 = require("../../sqb/kadmium-sqb");
const base_query_builder_1 = require("./base-query.builder");
const filter_proxy_1 = require("../utils/filter-proxy");
const include_resolver_1 = require("../utils/include-resolver");
const aggregates_1 = require("../utils/aggregates");
const errors_1 = require("../../core/errors");
class QueryBuilder extends base_query_builder_1.BaseQueryBuilder {
    get sqb() {
        return this._sqb;
    }
    constructor(schemaCore, adapter, appCore, _repo) {
        const sqb = new kadmium_sqb_1.KadmiumSqb(schemaCore);
        const collectionName = schemaCore.collection;
        sqb._tableContext.set(collectionName, collectionName);
        // The whereProxy needs `this` context, but `this` is not available before super().
        // So we initialize it to a temporary value and then set it properly after super().
        super(sqb, {}, sqb._wheres);
        this._repo = _repo;
        this[_a] = true;
        // Initialize the rest of the properties BEFORE createWhereProxy
        this._schemaCore = schemaCore;
        this.adapter = adapter;
        this.appCore = appCore;
        this.collectionName = collectionName;
        this._proxy = this.createWhereProxy();
        this.selectProxy = this.createFieldProxy();
    }
    createWhereProxy() {
        return (0, filter_proxy_1.createFilterProxy)(this.sqb, this._schemaCore, this.appCore, this.collectionName);
    }
    createFieldProxy() {
        return new Proxy({}, {
            get: (target, prop) => {
                const fieldName = prop;
                return new selectable_1.SelectableField({
                    tableAlias: this.collectionName,
                    fieldName: fieldName,
                    initialType: {},
                }, undefined);
            },
        });
    }
    include(selector) {
        const selectedRelationBuilders = selector(this.createRelationProxy());
        const includedRelations = selectedRelationBuilders.map((relBuilder) => (0, include_resolver_1.resolveInclude)(relBuilder, this.collectionName, this.appCore, this._schemaCore));
        this._sqb._includes = [...this._sqb._includes, ...includedRelations];
        return this;
    }
    createRelationProxy() {
        return new Proxy({}, {
            get: (target, prop) => {
                if (typeof prop === "symbol") {
                    return;
                }
                const relationName = prop;
                const relationMetadata = this.appCore.relationMap.get(`${this.collectionName}:${relationName}`);
                if (!relationMetadata) {
                    throw errors_1.Errors.repo.relationNotFound(relationName, this.collectionName);
                }
                const relatedSchemaCore = this.appCore.schemas.find((s) => s.collection === relationMetadata.toSchema);
                if (!relatedSchemaCore) {
                    throw errors_1.Errors.repo.relatedSchemaNotFound(relationName, relationMetadata.toSchema);
                }
                if (relationMetadata.type === "one-to-many") {
                    return new relation_builder_1.ToManyRelationBuilder(this.sqb, relationName, relatedSchemaCore, this.appCore, this.collectionName, this.collectionName);
                }
                else {
                    return new relation_builder_1.ToOneRelationBuilder(this.sqb, relationName, relatedSchemaCore, this.appCore, this.collectionName, this.collectionName);
                }
            },
        });
    }
    select(selectorOrOptions, options) {
        this._sqb._operation = "select";
        let selector;
        let effectiveOptions = options;
        if (typeof selectorOrOptions === "function") {
            selector = selectorOrOptions;
        }
        else if (typeof selectorOrOptions === "object") {
            effectiveOptions = selectorOrOptions;
        }
        if (selector) {
            const selectedFields = selector(this.selectProxy, aggregates_1.aggregates);
            this._sqb._selects = selectedFields;
        }
        else {
            const fieldsToSelect = [
                ...this._schemaCore.registry.fieldsByName.values(),
            ].filter((field) => field.persist !== false);
            const securedTypes = this.appCore.securedTypes;
            this._sqb._selects = fieldsToSelect
                .filter((field) => {
                return effectiveOptions?.includeSecured
                    ? true
                    : !securedTypes.has(field.type);
            })
                .map((field) => new selectable_1.SelectableField({
                tableAlias: this.collectionName,
                fieldName: field.name,
                initialType: {},
            }));
        }
        const finalizer = {
            [symbols_1.IS_QUERY_BUILDER]: true,
            sqb: this.sqb,
            where: (clause) => {
                this.where(clause);
                return finalizer;
            },
            and: (clause) => {
                this.and(clause);
                return finalizer;
            },
            or: (clause) => {
                this.or(clause);
                return finalizer;
            },
            order: (selector, direction) => {
                this.order(selector, direction);
                return finalizer;
            },
            groupBy: (selector) => {
                this.groupBy(selector);
                return finalizer;
            },
            limit: (count) => {
                this.limit(count);
                return finalizer;
            },
            offset: (count) => {
                this.offset(count);
                return finalizer;
            },
            page: (page, size) => {
                this.page(page, size);
                return finalizer;
            },
            sql: () => (0, base_query_builder_1.toSqlString)(this.sqb, this.adapter),
            go: () => this.go(),
        };
        return finalizer;
    }
    first(selectorOrOptions) {
        this._sqb._operation = "select";
        // First select to initialize _selects, then limit(1) to avoid overwriting
        this.select(selectorOrOptions);
        this.limit(1);
        const finalizer = {
            [symbols_1.IS_QUERY_BUILDER]: true,
            sqb: this.sqb,
            sql: () => (0, base_query_builder_1.toSqlString)(this.sqb, this.adapter),
            go: async () => {
                const results = (await this.go());
                return results[0];
            },
        };
        return finalizer;
    }
    firstOrThrow(selectorOrOptions) {
        const base = this.first(selectorOrOptions);
        return {
            ...base,
            go: async () => {
                const result = await base.go();
                if (result === undefined) {
                    throw errors_1.Errors.query.notFound(this.collectionName);
                }
                return result;
            },
        };
    }
    count() {
        this._sqb._operation = "select";
        this.select(() => [aggregates_1.aggregates.count("*").as("count")]);
        const finalizer = {
            [symbols_1.IS_QUERY_BUILDER]: true,
            sqb: this.sqb,
            sql: () => (0, base_query_builder_1.toSqlString)(this.sqb, this.adapter),
            go: async () => {
                const results = (await this.go());
                return Number(results[0]?.count ?? 0);
            },
        };
        return finalizer;
    }
    exists() {
        this._sqb._operation = "select";
        this._sqb._selects = [1];
        this.limit(1);
        const finalizer = {
            [symbols_1.IS_QUERY_BUILDER]: true,
            sqb: this.sqb,
            sql: () => (0, base_query_builder_1.toSqlString)(this.sqb, this.adapter),
            go: async () => {
                const results = (await this.go());
                return results.length > 0;
            },
        };
        return finalizer;
    }
    update(data) {
        this._sqb._operation = "update";
        const go = async () => {
            // 1. Model beforeUpdate hooks (user business logic)
            const { data: modelData, operation: modelOp } = await this._repo._runModelBeforeUpdate(data);
            if (modelOp !== "update") {
                throw errors_1.Errors.query.error(`Model beforeUpdate hook changed operation to "${modelOp}". This is not supported for update().`);
            }
            // 2. Feature beforeUpdate hooks (infrastructure logic)
            const { data: processedData, operation } = await this._repo._runFeatureBeforeUpdate(modelData);
            if (operation !== "update") {
                throw errors_1.Errors.query.error(`beforeUpdate hook changed operation to "${operation}". This is not supported for update().`);
            }
            this._sqb._updateData = await this._repo._hashPasswordsInData(processedData);
            const results = (await this.go());
            // 1. Model afterUpdate hooks (user business logic)
            let updatedResults = await this._repo._runModelAfterUpdate(results);
            // 2. Feature afterUpdate hooks (infrastructure logic)
            await this._repo._runFeatureAfterUpdate(updatedResults);
            return updatedResults;
        };
        const sql = () => {
            this._sqb._updateData = data; // For showing SQL without hashing
            const { text, values } = this.adapter.toSql(this._sqb);
            return `SQL: ${text}\nVALUES: [${values.join(", ")}]`;
        };
        return {
            sql,
            where: (clause) => {
                this.where(clause);
                return { go, sql };
            },
            go,
        };
    }
    delete() {
        this._sqb._operation = "delete";
        const go = async () => {
            // 1. Model beforeDelete hooks (user business logic)
            const { operation: modelOp } = await this._repo._runModelBeforeDelete();
            if (modelOp !== "delete") {
                throw errors_1.Errors.query.error(`Model beforeDelete hook changed operation to "${modelOp}". This is not supported for delete().`);
            }
            // 2. Feature beforeDelete hooks — may change operation to "update"
            const { operation: effectiveOperation, data: deleteData } = await this._repo._runFeatureBeforeDelete();
            if (effectiveOperation === "update") {
                // Soft-delete: вместо DELETE делаем UPDATE с данными из хука
                this._sqb._operation = "update";
                this._sqb._updateData = deleteData;
                const results = (await this.go());
                // 1. Model afterUpdate hooks
                await this._repo._runModelAfterUpdate(results);
                // 2. Feature afterUpdate hooks
                await this._repo._runFeatureAfterUpdate(results);
                return true;
            }
            else {
                // Обычное удаление
                const results = (await this.go());
                // 1. Model afterDelete hooks
                await this._repo._runModelAfterDelete(results);
                // 2. Feature afterDelete hooks
                await this._repo._runFeatureAfterDelete(results);
                return true;
            }
        };
        const sql = () => {
            const { text, values } = this.adapter.toSql(this._sqb);
            return `SQL: ${text}\nVALUES: [${values.join(", ")}]`;
        };
        return {
            sql,
            where: (clause) => {
                this.where(clause);
                return { go, sql };
            },
            go,
        };
    }
    async go() {
        if (this.sqb._operation === "select" && !this.sqb._selects) {
            this.select();
        }
        // 1. Model beforeRead hooks (user business logic)
        if (this.sqb._operation === "select") {
            const modelWheres = await this._repo._runModelBeforeRead();
            for (const w of modelWheres) {
                this._sqb._wheres.conditions.push(w);
            }
        }
        // 2. Feature beforeRead hooks (infrastructure logic)
        if (this.sqb._operation === "select") {
            const mainTableAlias = this.sqb._tableContext.keys().next().value;
            const wheres = await this._repo._runFeatureBeforeRead(mainTableAlias);
            for (const w of wheres) {
                this._sqb._wheres.conditions.push(w);
            }
        }
        const results = await this.sqb.execute(this.adapter);
        // Model afterRead hooks — только для SELECT
        if (this.sqb._operation === "select") {
            const modelResults = await this._repo._runModelAfterRead(results);
            // Feature afterRead hooks
            return this._repo._runFeatureAfterRead(modelResults);
        }
        return results;
    }
}
exports.QueryBuilder = QueryBuilder;
_a = symbols_1.IS_QUERY_BUILDER;
//# sourceMappingURL=builder.single-query.js.map