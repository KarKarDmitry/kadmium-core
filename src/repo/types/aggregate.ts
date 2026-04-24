import { SelectableField } from "./selectable.js";

/**
 * Represents an aggregate function call within a select statement.
 * e.g., COUNT(posts.id) AS post_count
 */
export class AggregateField<T> {
  public readonly fieldType: "aggregate-field" = "aggregate-field";
  public alias: string = ""; // This will be set by the .as() method.
  public aggregateType!: T; // A trick to carry the resulting type (e.g., number for count)

  constructor(
    public readonly func: "count" | "sum" | "avg" | "min" | "max",
    // The field to aggregate, or '*' for COUNT(*)
    public readonly field: SelectableField<any, any, any> | "*",
  ) {}

  /**
   * Sets the alias for the aggregate field in the query result.
   * This is mandatory for aggregate fields.
   * @param alias The alias for the result column.
   */
  as<A extends string>(alias: A): this & { alias: A } {
    this.alias = alias;
    return this as any;
  }
}
