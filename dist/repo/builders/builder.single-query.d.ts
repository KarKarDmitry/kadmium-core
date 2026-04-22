import { AnyModel } from "../../model/model";
import { AppCore } from "../../core/app-core";
import { SchemaCore } from "../../core/schema-core";
import { DbAdapter } from "../../sqb/adapters/adapter";
import { KadmiumRepo } from "../repo";
import { IS_QUERY_BUILDER } from "../symbols";
import { AggregateFunctions, AnySelectable, BuildIncludedResult, FilterProxy, FlatFinalResult, ICountQuery, IExistsQuery, IFirstQuery, IncludeResult, IQueryBuilder, ISingleTableQuery, Public } from "../types/query";
import { IRelationBuilder, RelationProxy } from "../field-builders/relation-builder";
import { SelectableField } from "../types/selectable";
import { KadmiumSqb, WhereCondition } from "../../sqb/kadmium-sqb";
import { BaseQueryBuilder } from "./base-query.builder";
type SingleQuerySelectProxy<T extends AnyModel> = {
    [K in keyof T]: SelectableField<T, K>;
};
export declare class QueryBuilder<T extends AnyModel, R extends readonly IRelationBuilder<any, any, any, any, any>[] = []> extends BaseQueryBuilder<FilterProxy<T>, SingleQuerySelectProxy<T>, QueryBuilder<T, R>> implements IQueryBuilder {
    private _repo;
    readonly [IS_QUERY_BUILDER] = true;
    get sqb(): KadmiumSqb<any>;
    private _schemaCore;
    private adapter;
    private appCore;
    private collectionName;
    protected selectProxy: SingleQuerySelectProxy<T>;
    constructor(schemaCore: SchemaCore, adapter: DbAdapter, appCore: AppCore, _repo: KadmiumRepo<T>);
    private createWhereProxy;
    private createFieldProxy;
    include<const R2 extends readonly IRelationBuilder<any, any, any, any, any>[]>(selector: (relations: RelationProxy<T>) => R2): QueryBuilder<T, [...R, ...R2]>;
    private createRelationProxy;
    select<const S extends readonly AnySelectable[]>(selector: (fields: {
        [K in keyof T]: SelectableField<T, K>;
    }, aggregates: AggregateFunctions) => S, options: {
        includeSecured: true;
    }): ISingleTableQuery<T, R, FlatFinalResult<S> & BuildIncludedResult<T, R>>;
    select<const S extends readonly AnySelectable[]>(selector: (fields: {
        [K in keyof T]: SelectableField<T, K>;
    }, aggregates: AggregateFunctions) => S): ISingleTableQuery<T, R, FlatFinalResult<S> & BuildIncludedResult<T, R>>;
    select(options: {
        includeSecured: true;
    }): ISingleTableQuery<T, R, T & BuildIncludedResult<T, R>>;
    select(options?: {
        includeSecured?: false | undefined;
    }): ISingleTableQuery<T, R, IncludeResult<Public<T>, R>>;
    first<const S extends readonly AnySelectable[]>(selector: (fields: {
        [K in keyof T]: SelectableField<T, K>;
    }, aggregates: AggregateFunctions) => S, options: {
        includeSecured: true;
    }): IFirstQuery<T, R, FlatFinalResult<S> & BuildIncludedResult<T, R>>;
    first<const S extends readonly AnySelectable[]>(selector: (fields: {
        [K in keyof T]: SelectableField<T, K>;
    }, aggregates: AggregateFunctions) => S): IFirstQuery<T, R, FlatFinalResult<S> & BuildIncludedResult<T, R>>;
    first(options: {
        includeSecured: true;
    }): IFirstQuery<T, R, T & BuildIncludedResult<T, R>>;
    first(options?: {
        includeSecured?: false | undefined;
    }): IFirstQuery<T, R, IncludeResult<Public<T>, R>>;
    firstOrThrow<const S extends readonly AnySelectable[]>(selector: (fields: {
        [K in keyof T]: SelectableField<T, K>;
    }, aggregates: AggregateFunctions) => S, options: {
        includeSecured: true;
    }): IFirstQuery<T, R, FlatFinalResult<S> & BuildIncludedResult<T, R>>;
    firstOrThrow<const S extends readonly AnySelectable[]>(selector: (fields: {
        [K in keyof T]: SelectableField<T, K>;
    }, aggregates: AggregateFunctions) => S): IFirstQuery<T, R, FlatFinalResult<S> & BuildIncludedResult<T, R>>;
    firstOrThrow(options: {
        includeSecured: true;
    }): IFirstQuery<T, R, T & BuildIncludedResult<T, R>>;
    firstOrThrow(options?: {
        includeSecured?: false | undefined;
    }): IFirstQuery<T, R, IncludeResult<Public<T>, R>>;
    count(): ICountQuery;
    exists(): IExistsQuery;
    update(data: Partial<T>): {
        sql: () => string;
        where: (clause: (fields: FilterProxy<T>) => WhereCondition) => {
            go: () => Promise<T[]>;
            sql: () => string;
        };
        go: () => Promise<T[]>;
    };
    delete(): {
        sql: () => string;
        where: (clause: (fields: FilterProxy<T>) => WhereCondition) => {
            go: () => Promise<boolean>;
            sql: () => string;
        };
        go: () => Promise<boolean>;
    };
    private go;
}
export {};
//# sourceMappingURL=builder.single-query.d.ts.map