import { AnyModel } from "../../model/model";
import { KadmiumSqb, WhereCondition } from "../../sqb/kadmium-sqb";
import { FilterProxy, IQueryBuilder, AnySelectable, AggregateFunctions } from "../types/query";
import { BaseWhereBuilder } from "../types/builder.base";
import { SchemaCore } from "../../core/schema-core";
import { SelectableField } from "../types/selectable";
import { AppCore } from "../../core/app-core";
import { IS_QUERY_BUILDER } from "../symbols";
import { RelationsOf, ToManyRelation, ToOneRelation } from "../types/relations";
export type RelationProxy<T extends AnyModel, TParentAlias extends string = string> = {
    [K in keyof RelationsOf<T> & string]: RelationsOf<T>[K] extends ToOneRelation<infer R extends AnyModel> ? ToOneRelationBuilder<R, T, K, K, [], TParentAlias> : RelationsOf<T>[K] extends ToManyRelation<infer R extends AnyModel> ? ToManyRelationBuilder<R, T, K, K, [], TParentAlias> : never;
};
export type SelectableFieldsProxy<T extends AnyModel> = {
    [K in keyof T]-?: SelectableField<T, K>;
};
export interface IRelationBuilder<TName extends string = string, TAlias extends string = TName, TNested extends readonly IRelationBuilder<any, any, any, any, any>[] = [], TParentAlias extends string = string, TSelects extends readonly AnySelectable[] = readonly AnySelectable[]> {
    readonly originalName: TName;
    readonly alias: TAlias;
    readonly internalSqb: KadmiumSqb<any>;
    readonly _selects: TSelects;
    readonly relatedSchemaCore: SchemaCore;
    readonly parentAlias: TParentAlias;
    readonly parentCollectionName: string;
    readonly __nested?: TNested;
}
export declare class RelationBuilder<T extends AnyModel, TParent extends AnyModel, TName extends string, TAlias extends string = TName, TParentAlias extends string = string> {
    protected parentSqb: KadmiumSqb<TParent>;
    readonly relatedSchemaCore: SchemaCore;
    protected appCore: AppCore;
    readonly parentAlias: TParentAlias;
    readonly parentCollectionName: string;
    readonly originalName: TName;
    readonly alias: TAlias;
    internalSqb: KadmiumSqb<T>;
    constructor(parentSqb: KadmiumSqb<TParent>, name: TName, relatedSchemaCore: SchemaCore, appCore: AppCore, parentAlias: TParentAlias, parentCollectionName: string, alias?: TAlias);
    protected createFieldProxy(): SelectableFieldsProxy<T>;
}
export declare class ToOneRelationBuilder<T extends AnyModel, TParent extends AnyModel, TName extends string, TAlias extends string = TName, TNested extends readonly IRelationBuilder<any, any, any, any, any>[] = [], TParentAlias extends string = string, TSelects extends readonly AnySelectable[] = []> extends RelationBuilder<T, TParent, TName, TAlias, TParentAlias> implements IRelationBuilder<TName, TAlias, TNested, TParentAlias, TSelects> {
    private whereProxy;
    readonly parentAlias: TParentAlias;
    readonly parentCollectionName: string;
    readonly __nested?: TNested;
    readonly _selects: TSelects;
    constructor(parentSqb: KadmiumSqb<TParent>, name: TName, relatedSchemaCore: SchemaCore, appCore: AppCore, parentAlias: TParentAlias, parentCollectionName: string, alias?: TAlias);
    as<A extends string>(alias: A): ToOneRelationBuilder<T, TParent, TName, A, TNested, TParentAlias>;
    select<const S extends readonly AnySelectable[]>(selector: (fields: SelectableFieldsProxy<T>, aggregates: AggregateFunctions) => S): ToOneRelationBuilder<T, TParent, TName, TAlias, TNested, TParentAlias, S>;
    where(clause: (fields: FilterProxy<T>) => WhereCondition): this;
    include<const R extends readonly IRelationBuilder<any, any, any, any, any>[]>(selector: (relations: RelationProxy<T>) => R): ToOneRelationBuilder<T, TParent, TName, TAlias, [
        ...TNested,
        ...R
    ], TParentAlias>;
    private createNestedRelationProxy;
}
export declare class ToManyRelationBuilder<T extends AnyModel, TParent extends AnyModel, TName extends string, TAlias extends string = TName, TNested extends readonly IRelationBuilder<any, any, any, any, any>[] = [], TParentAlias extends string = string, TSelects extends readonly AnySelectable[] = []> extends BaseWhereBuilder<FilterProxy<T>, ToManyRelationBuilder<T, TParent, TName, TAlias, TNested, TParentAlias, TSelects>> implements IQueryBuilder, IRelationBuilder<TName, TAlias, TNested, TParentAlias, TSelects> {
    readonly [IS_QUERY_BUILDER] = true;
    readonly parentAlias: TParentAlias;
    readonly parentCollectionName: string;
    readonly __nested?: TNested;
    readonly _selects: TSelects;
    get sqb(): Readonly<KadmiumSqb<T>>;
    internalSqb: KadmiumSqb<T>;
    readonly originalName: TName;
    readonly alias: TAlias;
    private whereProxy;
    protected parentSqb: KadmiumSqb<TParent>;
    protected appCore: AppCore;
    readonly relatedSchemaCore: SchemaCore;
    constructor(parentSqb: KadmiumSqb<TParent>, name: TName, relatedSchemaCore: SchemaCore, appCore: AppCore, parentAlias: TParentAlias, parentCollectionName: string, alias?: TAlias);
    as<A extends string>(alias: A): ToManyRelationBuilder<T, TParent, TName, A, TNested, TParentAlias>;
    private createFieldProxy;
    select<const S extends readonly AnySelectable[]>(selector: (fields: SelectableFieldsProxy<T>, aggregates: AggregateFunctions) => S): ToManyRelationBuilder<T, TParent, TName, TAlias, TNested, TParentAlias, S>;
    limit(count: number): this;
    offset(count: number): this;
    order(selector: (fields: SelectableFieldsProxy<T>) => SelectableField<T, keyof T>, direction?: "asc" | "desc"): this;
    page(page: number, size: number): this;
    private createNestedRelationProxy;
    include<const R extends readonly IRelationBuilder<any, any, any, any, any>[]>(selector: (relations: RelationProxy<T>) => R): ToManyRelationBuilder<T, TParent, TName, TAlias, [
        ...TNested,
        ...R
    ], TParentAlias>;
}
//# sourceMappingURL=relation-builder.d.ts.map