import { AnyModel } from "../model/model";
import { SchemaCore } from "../core/schema-core";
import { DbAdapter } from "./adapters/adapter";
import { SelectableField } from "../repo/types/selectable";
import { JoinOptions } from "../repo/types/query";
export type WhereCondition = {
    alias?: string;
    field: string;
    op: string;
    value: any;
};
export type WhereGroup = {
    op: "AND" | "OR";
    conditions: Array<WhereCondition | WhereGroup>;
};
export interface IncludedRelation<T extends AnyModel = any> {
    parentAlias: string;
    propertyName: string;
    relationType: "one-to-one" | "one-to-many" | "many-to-one";
    internalSqb: KadmiumSqb<T>;
    relatedSchemaCore: SchemaCore;
    parentField: string;
    childField: string;
}
/**
 * The internal, stateful query builder.
 * It accumulates query state and passes it to a DB adapter for execution.
 */
export declare class KadmiumSqb<T extends AnyModel> {
    private schemaCore;
    _operation: "select" | "update" | "delete";
    _tableContext: Map<string, string>;
    _joins: JoinOptions[];
    _updateData: Partial<T> | null;
    _wheres: WhereGroup;
    _selects: readonly any[] | null;
    _orders: {
        by: SelectableField<any, any, any>;
        direction: "asc" | "desc";
    }[];
    _includes: IncludedRelation[];
    _limit: number | null;
    _skip: number | null;
    _groupBy: SelectableField<any, any, any>[];
    constructor(schemaCore: SchemaCore);
    /**
     * Creates a shallow copy of this SQB with deep-copied mutable state.
     * Used when cloning a relation builder via .as().
     */
    clone(): KadmiumSqb<T>;
    /**
     * Delegates execution of the accumulated query state to a DB adapter.
     * @param adapter The database adapter that will generate and run the query.
     * @param collectionName The name of the table/collection to query.
     */
    execute(adapter: DbAdapter): Promise<Partial<T>[]>;
}
//# sourceMappingURL=kadmium-sqb.d.ts.map