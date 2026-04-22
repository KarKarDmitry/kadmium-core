"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DateFilterBuilder = void 0;
const base_filter_builder_1 = require("./base-filter.builder");
class DateFilterBuilder extends base_filter_builder_1.BaseFilterBuilder {
    eq(value) {
        return {
            field: this.field,
            alias: this.alias,
            op: "=",
            value: value,
        };
    }
    neq(value) {
        return {
            field: this.field,
            alias: this.alias,
            op: "!=",
            value: value,
        };
    }
    after(value) {
        return {
            field: this.field,
            alias: this.alias,
            op: ">",
            value: value,
        };
    }
    afterEq(value) {
        return {
            field: this.field,
            alias: this.alias,
            op: ">=",
            value: value,
        };
    }
    before(value) {
        return {
            field: this.field,
            alias: this.alias,
            op: "<",
            value: value,
        };
    }
    beforeEq(value) {
        return {
            field: this.field,
            alias: this.alias,
            op: "<=",
            value: value,
        };
    }
    // Note: The 'BETWEEN' operator may require special handling in the adapter.
    between(start, end) {
        return {
            field: this.field,
            alias: this.alias,
            op: "BETWEEN",
            value: [start, end],
        };
    }
    in(values) {
        return {
            field: this.field,
            alias: this.alias,
            op: "IN",
            value: values,
        };
    }
}
exports.DateFilterBuilder = DateFilterBuilder;
//# sourceMappingURL=date-filter.builder.js.map