"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToManyRelationBuilder = exports.ToOneRelationBuilder = exports.RelationBuilder = void 0;
const kadmium_sqb_1 = require("../../sqb/kadmium-sqb");
const builder_base_1 = require("../types/builder.base");
const selectable_1 = require("../types/selectable");
const filter_proxy_1 = require("../utils/filter-proxy");
const include_resolver_1 = require("../utils/include-resolver");
const symbols_1 = require("../symbols");
const errors_1 = require("../../core/errors");
// --- Helper for creating FilterProxy (similar to builder.single-query) ---
function createRelationFilterProxy(sqb, schemaCore, appCore, alias) {
    return (0, filter_proxy_1.createFilterProxy)(sqb, schemaCore, appCore, alias);
}
// --- Base Relation Builder ---
class RelationBuilder {
    constructor(parentSqb, name, relatedSchemaCore, appCore, parentAlias, parentCollectionName, alias) {
        this.parentSqb = parentSqb;
        this.relatedSchemaCore = relatedSchemaCore;
        this.appCore = appCore;
        this.parentAlias = parentAlias;
        this.parentCollectionName = parentCollectionName;
        this.originalName = name;
        this.alias = alias ?? name;
        this.internalSqb = new kadmium_sqb_1.KadmiumSqb(relatedSchemaCore);
        this.internalSqb._tableContext.set(this.alias, relatedSchemaCore.collection);
    }
    createFieldProxy() {
        return new Proxy({}, {
            get: (target, prop) => {
                const fieldName = prop;
                return new selectable_1.SelectableField({
                    tableAlias: this.alias,
                    fieldName: fieldName,
                    initialType: {},
                }, undefined);
            },
        });
    }
}
exports.RelationBuilder = RelationBuilder;
// --- ToOne Relation Builder ---
class ToOneRelationBuilder extends RelationBuilder {
    constructor(parentSqb, name, relatedSchemaCore, appCore, parentAlias, parentCollectionName, alias) {
        super(parentSqb, name, relatedSchemaCore, appCore, parentAlias, parentCollectionName, alias);
        this._selects = null;
        this.parentAlias = parentAlias;
        this.parentCollectionName = parentCollectionName;
        this.whereProxy = createRelationFilterProxy(this.internalSqb, relatedSchemaCore, appCore, this.alias);
    }
    as(alias) {
        const newBuilder = new ToOneRelationBuilder(this.parentSqb, this.originalName, this.relatedSchemaCore, this.appCore, this.parentAlias, this.parentCollectionName, alias);
        newBuilder.internalSqb = this.internalSqb.clone();
        // Re-alias the table context
        newBuilder.internalSqb._tableContext.delete(this.alias);
        newBuilder.internalSqb._tableContext.set(alias, this.relatedSchemaCore.collection);
        // Update alias in where conditions
        (0, include_resolver_1.updateWhereAlias)(newBuilder.internalSqb._wheres, this.alias, alias);
        // Update alias in join conditions
        (0, include_resolver_1.updateJoinAliases)(newBuilder.internalSqb._joins, this.alias, alias);
        return newBuilder;
    }
    select(selector) {
        this.internalSqb._selects = selector(this.createFieldProxy(), {});
        return this;
    }
    where(clause) {
        this.internalSqb._wheres.conditions.push(clause(this.whereProxy));
        return this;
    }
    include(selector) {
        const selectedRelationBuilders = selector(this.createNestedRelationProxy());
        const mainTablePK = this.relatedSchemaCore.normalized.primary.name;
        const includedRelations = selectedRelationBuilders.map((relBuilder) => (0, include_resolver_1.resolveInclude)(relBuilder, this.relatedSchemaCore.collection, this.appCore, this.relatedSchemaCore));
        this.internalSqb._includes.push(...includedRelations);
        return this;
    }
    createNestedRelationProxy() {
        return new Proxy({}, {
            get: (target, prop) => {
                if (typeof prop === "symbol") {
                    return;
                }
                const relationName = prop;
                const relationMetadata = this.appCore.relationMap.get(`${this.relatedSchemaCore.collection}:${relationName}`);
                if (!relationMetadata)
                    throw errors_1.Errors.repo.relationNotFound(relationName, this.relatedSchemaCore.collection);
                const relatedSchemaCore = this.appCore.schemas.find((s) => s.collection === relationMetadata.toSchema);
                if (!relatedSchemaCore)
                    throw errors_1.Errors.repo.relatedSchemaNotFound(relationName, relationMetadata.toSchema);
                if (relationMetadata.type === "one-to-many") {
                    return new ToManyRelationBuilder(this.internalSqb, relationName, relatedSchemaCore, this.appCore, this.alias, this.relatedSchemaCore.collection);
                }
                else {
                    return new ToOneRelationBuilder(this.internalSqb, relationName, relatedSchemaCore, this.appCore, this.alias, this.relatedSchemaCore.collection);
                }
            },
        });
    }
}
exports.ToOneRelationBuilder = ToOneRelationBuilder;
// --- ToMany Relation Builder ---
class ToManyRelationBuilder extends builder_base_1.BaseWhereBuilder {
    get sqb() {
        return this.internalSqb;
    }
    constructor(parentSqb, name, relatedSchemaCore, appCore, parentAlias, parentCollectionName, alias) {
        const internalSqb = new kadmium_sqb_1.KadmiumSqb(relatedSchemaCore);
        const outputAlias = alias ?? name;
        internalSqb._tableContext.set(outputAlias, relatedSchemaCore.collection);
        const whereProxy = createRelationFilterProxy(internalSqb, relatedSchemaCore, appCore, outputAlias);
        super(internalSqb, whereProxy, internalSqb._wheres);
        this[_a] = true;
        this._selects = null;
        this.internalSqb = internalSqb;
        this.originalName = name;
        this.alias = outputAlias;
        this.whereProxy = whereProxy;
        this.parentSqb = parentSqb;
        this.relatedSchemaCore = relatedSchemaCore;
        this.appCore = appCore;
        this.parentAlias = parentAlias;
        this.parentCollectionName = parentCollectionName;
    }
    as(alias) {
        const newBuilder = new ToManyRelationBuilder(this.parentSqb, this.originalName, this.relatedSchemaCore, this.appCore, this.parentAlias, this.parentCollectionName, alias);
        newBuilder.internalSqb = this.internalSqb.clone();
        // Re-alias the table context and update where conditions
        newBuilder.internalSqb._tableContext.delete(this.alias);
        newBuilder.internalSqb._tableContext.set(alias, this.relatedSchemaCore.collection);
        // Update alias in where conditions
        (0, include_resolver_1.updateWhereAlias)(newBuilder.internalSqb._wheres, this.alias, alias);
        // Update alias in join conditions
        (0, include_resolver_1.updateJoinAliases)(newBuilder.internalSqb._joins, this.alias, alias);
        return newBuilder;
    }
    createFieldProxy() {
        return new Proxy({}, {
            get: (target, prop) => {
                const fieldName = prop;
                return new selectable_1.SelectableField({
                    tableAlias: this.alias,
                    fieldName: fieldName,
                    initialType: {},
                }, undefined);
            },
        });
    }
    select(selector) {
        this.internalSqb._selects = selector(this.createFieldProxy(), {});
        return this;
    }
    limit(count) {
        this.internalSqb._limit = count;
        return this;
    }
    offset(count) {
        this.internalSqb._skip = count;
        return this;
    }
    order(selector, direction = "asc") {
        const field = selector(this.createFieldProxy());
        this.internalSqb._orders.push({ by: field, direction });
        return this;
    }
    page(page, size) {
        const pageNumber = Math.max(1, page);
        const pageSize = Math.max(1, size);
        this.limit(pageSize);
        this.offset((pageNumber - 1) * pageSize);
        return this;
    }
    createNestedRelationProxy() {
        return new Proxy({}, {
            get: (target, prop) => {
                if (typeof prop === "symbol") {
                    return;
                }
                const relationName = prop;
                const relationMetadata = this.appCore.relationMap.get(`${this.relatedSchemaCore.collection}:${relationName}`);
                if (!relationMetadata)
                    throw errors_1.Errors.repo.relationNotFound(relationName, this.relatedSchemaCore.collection);
                const relatedSchemaCore = this.appCore.schemas.find((s) => s.collection === relationMetadata.toSchema);
                if (!relatedSchemaCore)
                    throw errors_1.Errors.repo.relatedSchemaNotFound(relationName, relationMetadata.toSchema);
                if (relationMetadata.type === "one-to-many") {
                    return new ToManyRelationBuilder(this.internalSqb, relationName, relatedSchemaCore, this.appCore, this.alias, this.relatedSchemaCore.collection);
                }
                else {
                    return new ToOneRelationBuilder(this.internalSqb, relationName, relatedSchemaCore, this.appCore, this.alias, this.relatedSchemaCore.collection);
                }
            },
        });
    }
    include(selector) {
        const selectedRelationBuilders = selector(this.createNestedRelationProxy());
        const mainTablePK = this.relatedSchemaCore.normalized.primary.name;
        const includedRelations = selectedRelationBuilders.map((relBuilder) => (0, include_resolver_1.resolveInclude)(relBuilder, this.relatedSchemaCore.collection, this.appCore, this.relatedSchemaCore));
        this.internalSqb._includes.push(...includedRelations);
        return this;
    }
}
exports.ToManyRelationBuilder = ToManyRelationBuilder;
_a = symbols_1.IS_QUERY_BUILDER;
//# sourceMappingURL=relation-builder.js.map