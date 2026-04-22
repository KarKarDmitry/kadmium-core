"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BooleanFilterBuilder = void 0;
const base_filter_builder_1 = require("./base-filter.builder");
class BooleanFilterBuilder extends base_filter_builder_1.BaseFilterBuilder {
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
    true() {
        return {
            field: this.field,
            alias: this.alias,
            op: "=",
            value: true,
        };
    }
    false() {
        return {
            field: this.field,
            alias: this.alias,
            op: "=",
            value: false,
        };
    }
}
exports.BooleanFilterBuilder = BooleanFilterBuilder;
//# sourceMappingURL=boolean-filter.builder.js.map