"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AggregateField = void 0;
/**
 * Represents an aggregate function call within a select statement.
 * e.g., COUNT(posts.id) AS post_count
 */
class AggregateField {
    constructor(func, 
    // The field to aggregate, or '*' for COUNT(*)
    field) {
        this.func = func;
        this.field = field;
        this.fieldType = "aggregate-field";
        this.alias = ""; // This will be set by the .as() method.
    }
    /**
     * Sets the alias for the aggregate field in the query result.
     * This is mandatory for aggregate fields.
     * @param alias The alias for the result column.
     */
    as(alias) {
        this.alias = alias;
        return this;
    }
}
exports.AggregateField = AggregateField;
//# sourceMappingURL=aggregate.js.map