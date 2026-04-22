"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFilterProxy = createFilterProxy;
const nullable_mixin_1 = require("../field-builders/nullable.mixin");
const boolean_filter_builder_1 = require("../field-builders/boolean-filter.builder");
const date_filter_builder_1 = require("../field-builders/date-filter.builder");
const number_filter_builder_1 = require("../field-builders/number-filter.builder");
const string_filter_builder_1 = require("../field-builders/string-filter.builder");
/**
 * Determines the correct filter builder class for a field definition.
 */
function getFilterBuilderClass(fieldDef, appCore) {
    if (!fieldDef)
        return string_filter_builder_1.StringFilterBuilder;
    switch (fieldDef.type) {
        case "primary":
            return fieldDef.db_type === "number"
                ? number_filter_builder_1.NumberFilterBuilder
                : string_filter_builder_1.StringFilterBuilder;
        case "date":
        case "datetime":
        case "time":
            return date_filter_builder_1.DateFilterBuilder;
        case "boolean":
            return boolean_filter_builder_1.BooleanFilterBuilder;
        case "ref": {
            const refCollectionName = fieldDef.ref;
            const refSchema = appCore.schemas.find((s) => s.collection === refCollectionName);
            if (!refSchema)
                return string_filter_builder_1.StringFilterBuilder;
            return refSchema.normalized.primary.db_type === "number"
                ? number_filter_builder_1.NumberFilterBuilder
                : string_filter_builder_1.StringFilterBuilder;
        }
        default:
            return string_filter_builder_1.StringFilterBuilder;
    }
}
/**
 * Creates a Proxy-based FilterProxy<T> that returns appropriately-typed
 * filter builder instances for each field access.
 */
function createFilterProxy(sqb, schemaCore, appCore, alias) {
    return new Proxy({}, {
        get: (_target, prop) => {
            if (typeof prop === "symbol")
                return undefined;
            const fieldName = prop;
            const fieldDef = schemaCore.registry.fieldsByName.get(fieldName);
            if (!fieldDef)
                return {};
            const builderClass = getFilterBuilderClass(fieldDef, appCore);
            const isNullable = fieldDef.required === false || fieldDef.db?.nullable === true;
            if (isNullable) {
                const NullableBuilder = (0, nullable_mixin_1.NullableMixin)(builderClass);
                return new NullableBuilder(sqb, fieldName, alias);
            }
            return new builderClass(sqb, fieldName, alias);
        },
    });
}
//# sourceMappingURL=filter-proxy.js.map