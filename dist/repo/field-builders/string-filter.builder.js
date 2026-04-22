"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StringFilterBuilder = void 0;
const base_filter_builder_1 = require("./base-filter.builder");
class StringFilterBuilder extends base_filter_builder_1.BaseFilterBuilder {
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
    like(value) {
        return {
            field: this.field,
            alias: this.alias,
            op: "LIKE",
            value: `%${value}%`,
        };
    }
    ilike(value) {
        return {
            field: this.field,
            alias: this.alias,
            op: "ILIKE",
            value: `%${value}%`,
        };
    }
    start(value) {
        return {
            field: this.field,
            alias: this.alias,
            op: "LIKE",
            value: `${value}%`,
        };
    }
    istart(value) {
        return {
            field: this.field,
            alias: this.alias,
            op: "ILIKE",
            value: `${value}%`,
        };
    }
    end(value) {
        return {
            field: this.field,
            alias: this.alias,
            op: "LIKE",
            value: `%${value}`,
        };
    }
    iend(value) {
        return {
            field: this.field,
            alias: this.alias,
            op: "ILIKE",
            value: `%${value}`,
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
exports.StringFilterBuilder = StringFilterBuilder;
//# sourceMappingURL=string-filter.builder.js.map