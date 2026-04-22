import { AppCore } from "../../core/app-core";
import { SchemaCore } from "../../core/schema-core";
import { DbAdapter } from "../../sqb/adapters/adapter";
import { KadmiumSqb, WhereCondition } from "../../sqb/kadmium-sqb";
import { AliasesMap, AnySelectable, FinalResult, IQueryBuilder, MultiFilterProxy, MultiSelectProxy, AggregateFunctions } from "../types/query";
import { IS_QUERY_BUILDER } from "../symbols";
import { BaseQueryBuilder } from "./base-query.builder";
import { IRelationBuilder, RelationProxy } from "../field-builders/relation-builder";
type MultiRelationProxy<T extends AliasesMap> = {
    [K in keyof T]: RelationProxy<InstanceType<T[K]>, K & string>;
};
export declare class MultiQueryBuilder<T extends AliasesMap, R extends readonly IRelationBuilder<any, any, any, any, any>[] = []> extends BaseQueryBuilder<MultiFilterProxy<T>, MultiSelectProxy<T>, MultiQueryBuilder<T, R>> implements IQueryBuilder {
    private schemaCores;
    private adapter;
    readonly [IS_QUERY_BUILDER] = true;
    get sqb(): KadmiumSqb<any>;
    protected selectProxy: MultiSelectProxy<T>;
    protected relationProxy: MultiRelationProxy<T>;
    private appCore;
    constructor(schemaCores: Map<string, SchemaCore>, adapter: DbAdapter, appCore: AppCore);
    private createRelationProxy;
    include<const R2 extends readonly IRelationBuilder<any, any, any, any, any>[]>(selector: (relations: MultiRelationProxy<T>) => R2): MultiQueryBuilder<T, [...R, ...R2]>;
    join(options: {
        left: keyof T;
        right: keyof T;
        direction?: "inner" | "left" | "right" | "outer";
        on: (tables: MultiFilterProxy<T>) => WhereCondition;
    }): this;
    select<const S extends readonly AnySelectable[]>(selector: (proxies: MultiSelectProxy<T>, aggregates: AggregateFunctions) => S): {
        sql: () => string;
        go: () => Promise<FinalResult<S, T, R>[]>;
    };
    private createSelectProxy;
}
export {};
//# sourceMappingURL=builder.multi-query.d.ts.map