"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FieldReferenceBuilder = void 0;
const errors_1 = require("../../core/errors");
const base_filter_builder_1 = require("./base-filter.builder");
/**
 * A concrete implementation of BaseFilterBuilder used specifically to reference
 * a field from another table in a WHERE condition. This builder does not
 * provide any filtering methods (eq, gt, etc.) but correctly generates
 * the SQL identifier for the referenced field.
 */
class FieldReferenceBuilder extends base_filter_builder_1.BaseFilterBuilder {
    constructor(sqb, field, alias) {
        super(sqb, field, alias);
        this.sqb = sqb;
        this.field = field;
        this.alias = alias;
        if (!alias) {
            throw errors_1.Errors.query.noAliasForTable();
        }
    }
}
exports.FieldReferenceBuilder = FieldReferenceBuilder;
//# sourceMappingURL=field-reference.builder.js.map