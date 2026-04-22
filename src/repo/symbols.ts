// Using Symbol.for() creates a symbol in the global symbol registry,
// which ensures that the symbol is the same instance across different modules,
// preventing potential issues with module resolution or bundlers.
export const PUBLIC_TYPE_SYMBOL = Symbol.for("kadmium-public-type");
export const IS_FILTER_BUILDER = Symbol.for("kadmium-is-filter-builder");
export const IS_QUERY_BUILDER = Symbol.for("kadmium-is-query-builder");
export const RELATIONS_SYMBOL = Symbol.for("kadmium-relations-type");
