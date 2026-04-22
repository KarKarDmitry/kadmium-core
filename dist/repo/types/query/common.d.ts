import { AnyModel } from "../../../model/model";
import { BooleanFilterBuilder } from "../../field-builders/boolean-filter.builder";
import { NumberFilterBuilder } from "../../field-builders/number-filter.builder";
import { StringFilterBuilder } from "../../field-builders/string-filter.builder";
import { DateFilterBuilder } from "../../field-builders/date-filter.builder";
import { WhereCondition } from "../../../sqb/kadmium-sqb";
import { AggregateField } from "../aggregate";
import { SelectableField } from "../selectable";
import { PUBLIC_TYPE_SYMBOL, IS_QUERY_BUILDER } from "../../symbols";
import { KadmiumSqb } from "../../../sqb/kadmium-sqb";
import { BaseFilterBuilder } from "../../field-builders/base-filter.builder";
import { KadmiumRepo } from "../../repo";
import { IRelationBuilder } from "../../field-builders/relation-builder";
import { RelationsOf, ToManyRelation, ToOneRelation } from "../relations";
export type IQueryBuilder = {
    readonly sqb: Readonly<KadmiumSqb<any>>;
    [IS_QUERY_BUILDER]: true;
};
type NullableValue<F> = null extends F ? F | null | undefined : F;
export type Comparable<F> = NullableValue<F> | BaseFilterBuilder<any, any> | IQueryBuilder;
export type InOperable<F> = F[] | IQueryBuilder;
type NullableMethods = {
    get null(): WhereCondition;
    get notNull(): WhereCondition;
};
export type FilterProxy<T extends AnyModel> = {
    [K in keyof T]-?: (NonNullable<T[K]> extends string ? StringFilterBuilder<T, K> : NonNullable<T[K]> extends number ? NumberFilterBuilder<T, K> : NonNullable<T[K]> extends boolean ? BooleanFilterBuilder<T, K> : NonNullable<T[K]> extends Date ? DateFilterBuilder<T, K> : never) & (null extends T[K] ? NullableMethods : {});
};
export interface ITransaction {
    get<T extends AnyModel>(type: new (...args: any[]) => T): KadmiumRepo<T>;
}
export type Public<T> = T extends {
    [PUBLIC_TYPE_SYMBOL]: infer P;
} ? P : T;
export type AggregateFunction<T> = (field: SelectableField<any, any, any> | "*") => AggregateField<T>;
export type AggregateFunctions = {
    count: AggregateFunction<number>;
    sum: AggregateFunction<number | null>;
    avg: AggregateFunction<number | null>;
    min: <F extends SelectableField<any, any, any>>(field: F) => AggregateField<GetFieldType<F> | null>;
    max: <F extends SelectableField<any, any, any>>(field: F) => AggregateField<GetFieldType<F> | null>;
};
export type FieldsAsKeys<T> = {
    [P in keyof T]: P;
};
export type AnySelectable = SelectableField<any, any, any> | AggregateField<any>;
export type FilterByParentAlias<R extends readonly IRelationBuilder<any, any, any, any, any>[], A extends string> = R extends readonly [infer First, ...infer Rest] ? [
    ...(First extends {
        parentAlias: A;
    } ? [First] : []),
    ...(Rest extends readonly IRelationBuilder<any, any, any, any, any>[] ? FilterByParentAlias<Rest, A> : [])
] : [];
export type GetFieldName<S extends AnySelectable> = S["alias"] extends string ? S["alias"] : S extends SelectableField<any, any, any> ? S["source"]["fieldName"] : never;
export type GetFieldType<S extends AnySelectable> = S extends SelectableField<any, any, any> ? S["source"]["initialType"] : S extends AggregateField<any> ? S["aggregateType"] : never;
export type UnionToIntersection<U> = (U extends any ? (x: U) => any : never) extends (x: infer I) => any ? I : never;
export type FlatFinalResult<T extends readonly AnySelectable[]> = {
    [S in T[number] as GetFieldName<S>]: GetFieldType<S>;
};
type GetIncludedType<R, RelatedModel extends AnyModel> = R extends {
    _selects: infer S;
} ? S extends readonly [AnySelectable, ...AnySelectable[]] ? FlatFinalResult<S> : Public<RelatedModel> : Public<RelatedModel>;
type ProcessRelation<T extends AnyModel, R> = R extends {
    originalName: infer TName extends string;
    alias: infer TAlias extends string;
    __nested?: infer TNested;
} ? TName extends keyof RelationsOf<T> ? RelationsOf<T>[TName] extends ToOneRelation<infer RelatedModel extends AnyModel> ? {
    [K in TAlias]: (GetIncludedType<R, RelatedModel> & (TNested extends readonly [any, ...any[]] ? BuildIncludedResultRecur<RelatedModel, TNested> : {})) | undefined;
} : RelationsOf<T>[TName] extends ToManyRelation<infer RelatedModel extends AnyModel> ? {
    [K in TAlias]: (GetIncludedType<R, RelatedModel> & (TNested extends readonly [any, ...any[]] ? BuildIncludedResultRecur<RelatedModel, TNested> : {}))[];
} : never : never : never;
type BuildIncludedResultRecur<T extends AnyModel, R, Acc extends readonly object[] = []> = R extends readonly [infer First, ...infer Rest] ? BuildIncludedResultRecur<T, Rest, [...Acc, ProcessRelation<T, First>]> : UnionToIntersection<Acc[number]>;
export type BuildIncludedResult<T extends AnyModel, R extends readonly IRelationBuilder<any, any, any, any, any>[]> = BuildIncludedResultRecur<T, R>;
export type IncludeResult<T extends AnyModel, R extends readonly IRelationBuilder<any, any, any, any, any>[]> = Public<T> & BuildIncludedResult<T, R>;
export {};
//# sourceMappingURL=common.d.ts.map