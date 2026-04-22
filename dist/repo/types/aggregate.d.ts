import { SelectableField } from "./selectable";
/**
 * Represents an aggregate function call within a select statement.
 * e.g., COUNT(posts.id) AS post_count
 */
export declare class AggregateField<T> {
    readonly func: "count" | "sum" | "avg" | "min" | "max";
    readonly field: SelectableField<any, any, any> | "*";
    readonly fieldType: "aggregate-field";
    alias: string;
    aggregateType: T;
    constructor(func: "count" | "sum" | "avg" | "min" | "max", field: SelectableField<any, any, any> | "*");
    /**
     * Sets the alias for the aggregate field in the query result.
     * This is mandatory for aggregate fields.
     * @param alias The alias for the result column.
     */
    as<A extends string>(alias: A): this & {
        alias: A;
    };
}
//# sourceMappingURL=aggregate.d.ts.map