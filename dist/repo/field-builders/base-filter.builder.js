"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseFilterBuilder = void 0;
const symbols_1 = require("../symbols");
/**
 * The abstract base class for all field-specific filter builders.
 */
class BaseFilterBuilder {
    constructor(sqb, field, alias) {
        this.sqb = sqb;
        this.field = field;
        this.alias = alias;
        this[_a] = true;
    }
    getIdentifierForSql() {
        const field = `"${this.field}"`;
        return this.alias ? `"${this.alias}".${field}` : field;
    }
}
exports.BaseFilterBuilder = BaseFilterBuilder;
_a = symbols_1.IS_FILTER_BUILDER;
//# sourceMappingURL=base-filter.builder.js.map