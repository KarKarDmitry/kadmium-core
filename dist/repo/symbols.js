"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RELATIONS_SYMBOL = exports.IS_QUERY_BUILDER = exports.IS_FILTER_BUILDER = exports.PUBLIC_TYPE_SYMBOL = void 0;
// Using Symbol.for() creates a symbol in the global symbol registry,
// which ensures that the symbol is the same instance across different modules,
// preventing potential issues with module resolution or bundlers.
exports.PUBLIC_TYPE_SYMBOL = Symbol.for("kadmium-public-type");
exports.IS_FILTER_BUILDER = Symbol.for("kadmium-is-filter-builder");
exports.IS_QUERY_BUILDER = Symbol.for("kadmium-is-query-builder");
exports.RELATIONS_SYMBOL = Symbol.for("kadmium-relations-type");
//# sourceMappingURL=symbols.js.map