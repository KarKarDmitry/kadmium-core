"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NullableMixin = NullableMixin;
const symbols_1 = require("../symbols");
/**
 * A mixin function that takes a filter builder class and extends it
 * with `null()` and `notNull()` methods.
 */
function NullableMixin(Base) {
    var _a, _b;
    return _b = class Nullable extends Base {
            constructor() {
                super(...arguments);
                this[_a] = true;
            }
            get null() {
                return {
                    field: this.field,
                    alias: this.alias,
                    op: "IS",
                    value: null,
                };
            }
            get notNull() {
                return {
                    field: this.field,
                    alias: this.alias,
                    op: "IS NOT",
                    value: null,
                };
            }
        },
        _a = symbols_1.IS_FILTER_BUILDER,
        _b;
}
//# sourceMappingURL=nullable.mixin.js.map