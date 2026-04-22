"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NumberFilterBuilder = void 0;
const base_filter_builder_1 = require("./base-filter.builder");
class NumberFilterBuilder extends base_filter_builder_1.BaseFilterBuilder {
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
    gt(value) {
        return {
            field: this.field,
            alias: this.alias,
            op: ">",
            value: value,
        };
    }
    gte(value) {
        return {
            field: this.field,
            alias: this.alias,
            op: ">=",
            value: value,
        };
    }
    lt(value) {
        return {
            field: this.field,
            alias: this.alias,
            op: "<",
            value: value,
        };
    }
    lte(value) {
        return {
            field: this.field,
            alias: this.alias,
            op: "<=",
            value: value,
        };
    }
    between(start, end) {
        return {
            field: this.field,
            alias: this.alias,
            op: 'BETWEEN',
            value: `${start} AND ${end}`,
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
exports.NumberFilterBuilder = NumberFilterBuilder;
//# sourceMappingURL=number-filter.builder.js.map