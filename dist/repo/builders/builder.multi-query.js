"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiQueryBuilder = void 0;
const kadmium_sqb_1 = require("../../sqb/kadmium-sqb");
const selectable_1 = require("../types/selectable");
const symbols_1 = require("../symbols");
const base_query_builder_1 = require("./base-query.builder");
const filter_proxy_1 = require("../utils/filter-proxy");
const include_resolver_1 = require("../utils/include-resolver");
const relation_builder_1 = require("../field-builders/relation-builder");
const errors_1 = require("../../core/errors");
const aggregates_1 = require("../utils/aggregates");
// Helper function to create the whereProxy, moved outside the class
// to resolve constructor-time `this`/`super` and generics issues.
function createMultiQueryWhereProxy(schemaCores, sqb, appCore) {
    return new Proxy({}, {
        get: (_target, alias) => {
            const schemaCore = schemaCores.get(alias);
            if (!schemaCore) {
                throw errors_1.Errors.query.invalidAlias(alias);
            }
            return (0, filter_proxy_1.createFilterProxy)(sqb, schemaCore, appCore, alias);
        },
    });
}
class MultiQueryBuilder extends base_query_builder_1.BaseQueryBuilder {
    get sqb() {
        return this._sqb;
    }
    constructor(schemaCores, adapter, appCore) {
        const firstSchemaCore = schemaCores.values().next().value;
        if (!firstSchemaCore) {
            throw errors_1.Errors.query.emptyAliases();
        }
        const sqb = new kadmium_sqb_1.KadmiumSqb(firstSchemaCore);
        // Call the external helper, passing the class's generic type <T>
        const whereProxy = createMultiQueryWhereProxy(schemaCores, sqb, appCore);
        // Now `super()` can be called with the correctly-typed proxy.
        super(sqb, whereProxy, sqb._wheres);
        this.schemaCores = schemaCores;
        this.adapter = adapter;
        this[_a] = true;
        this.appCore = appCore;
        for (const [alias, schemaCore] of schemaCores.entries()) {
            this._sqb._tableContext.set(alias, schemaCore.collection);
        }
        this.selectProxy = this.createSelectProxy();
        this.relationProxy = this.createRelationProxy();
    }
    createRelationProxy() {
        return new Proxy({}, {
            get: (target, alias) => {
                // e.g., 'u'
                const schemaCore = this.schemaCores.get(alias);
                if (!schemaCore)
                    return undefined;
                const collectionName = schemaCore.collection;
                // Create the inner proxy, which is identical to the single-query one
                return new Proxy({}, {
                    get: (target2, prop) => {
                        if (typeof prop === "symbol") {
                            return;
                        }
                        const relationName = prop;
                        const relationMetadata = this.appCore.relationMap.get(`${collectionName}:${relationName}`);
                        if (!relationMetadata) {
                            throw errors_1.Errors.repo.relationNotFound(relationName, collectionName);
                        }
                        const relatedSchemaCore = this.appCore.schemas.find((s) => s.collection === relationMetadata.toSchema);
                        if (!relatedSchemaCore) {
                            throw errors_1.Errors.repo.relatedSchemaNotFound(relationName, relationMetadata.toSchema);
                        }
                        if (relationMetadata.type === "one-to-many") {
                            return new relation_builder_1.ToManyRelationBuilder(this.sqb, relationName, relatedSchemaCore, this.appCore, alias, // Parent alias — cast to literal type
                            collectionName);
                        }
                        else {
                            return new relation_builder_1.ToOneRelationBuilder(this.sqb, relationName, relatedSchemaCore, this.appCore, alias, // Parent alias — cast to literal type
                            collectionName);
                        }
                    },
                });
            },
        });
    }
    include(selector) {
        const selectedRelationBuilders = selector(this.relationProxy);
        const includedRelations = selectedRelationBuilders.map((relBuilder) => {
            const parentSchemaCore = this.schemaCores.get(relBuilder.parentAlias);
            if (!parentSchemaCore) {
                throw errors_1.Errors.query.error(`Schema core not found for alias "${relBuilder.parentAlias}" during include setup.`, { alias: relBuilder.parentAlias });
            }
            return (0, include_resolver_1.resolveInclude)(relBuilder, parentSchemaCore.collection, this.appCore, parentSchemaCore);
        });
        this._sqb._includes = [...this._sqb._includes, ...includedRelations];
        return this;
    }
    join(options) {
        const onCondition = options.on(this._proxy);
        this._sqb._joins.push({
            left: options.left,
            right: options.right,
            direction: options.direction ?? "inner",
            on: onCondition,
        });
        return this;
    }
    select(selector) {
        const selected = selector(this.selectProxy, aggregates_1.aggregates);
        if (!selected || selected.length === 0) {
            // Our reshaping logic requires at least one selected field.
            throw errors_1.Errors.query.error("A select call on a multi-query must select at least one field.");
        }
        this._sqb._selects = selected;
        return {
            sql: () => (0, base_query_builder_1.toSqlString)(this._sqb, this.adapter),
            go: async () => {
                return this._sqb.execute(this.adapter);
            },
        };
    }
    createSelectProxy() {
        return new Proxy({}, {
            get: (target, alias) => {
                return new Proxy({}, {
                    get: (target2, fieldName) => {
                        return new selectable_1.SelectableField({
                            tableAlias: alias,
                            fieldName: fieldName,
                            initialType: {},
                        });
                    },
                });
            },
        });
    }
}
exports.MultiQueryBuilder = MultiQueryBuilder;
_a = symbols_1.IS_QUERY_BUILDER;
//# sourceMappingURL=builder.multi-query.js.map