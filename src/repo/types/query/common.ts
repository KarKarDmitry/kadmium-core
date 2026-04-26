import { AnyModel } from '../../../model/model.js';
import { BooleanFilterBuilder } from '../../field-builders/boolean-filter.builder.js';
import { NumberFilterBuilder } from '../../field-builders/number-filter.builder.js';
import { StringFilterBuilder } from '../../field-builders/string-filter.builder.js';
import { DateFilterBuilder } from '../../field-builders/date-filter.builder.js';
import { WhereCondition } from '../../../sqb/kadmium-sqb.js';
import { AggregateField } from '../aggregate.js';
import { SelectableField } from '../selectable.js';
import {
    PUBLIC_TYPE_SYMBOL,
    IS_QUERY_BUILDER,
    RELATIONS_SYMBOL,
} from '../../symbols.js';
import { KadmiumSqb } from '../../../sqb/kadmium-sqb.js';
import { BaseFilterBuilder } from '../../field-builders/base-filter.builder.js';
import { KadmiumRepo } from '../../repo.js';
import { IRelationBuilder } from '../../field-builders/relation-builder.js';
import { RelationsOf, ToManyRelation, ToOneRelation } from '../relations.js';

// --- COMPARABLE TYPES ---

// Interface for a query builder, used to enable subqueries
export type IQueryBuilder = {
    readonly sqb: Readonly<KadmiumSqb<any>>;
    [IS_QUERY_BUILDER]: true;
};

// A utility type to correctly handle nullable fields
type NullableValue<F> = null extends F ? F | null | undefined : F;

// The main type for values that can be used in comparisons (eq, gt, etc.)
// It accepts the field's literal type, another field, or a subquery.
export type Comparable<F> =
    | NullableValue<F>
    | BaseFilterBuilder<any, any>
    | IQueryBuilder;

// The type for values that can be used in an IN clause.
export type InOperable<F> = F[] | IQueryBuilder;

// --- NULLABLE TYPES ---

// Defines the shape of the methods available only on nullable fields
type NullableMethods = {
    get null(): WhereCondition;
    get notNull(): WhereCondition;
};

// --- TYPE DEFINITIONS ---

export type FilterProxy<T extends AnyModel> = {
    [K in keyof T]-?: (NonNullable<T[K]> extends string
        ? StringFilterBuilder<T, K>
        : NonNullable<T[K]> extends number
          ? NumberFilterBuilder<T, K>
          : NonNullable<T[K]> extends boolean
            ? BooleanFilterBuilder<T, K>
            : NonNullable<T[K]> extends Date
              ? DateFilterBuilder<T, K>
              : never) &
        (null extends T[K] ? NullableMethods : {});
};
// The object passed to the static transaction callback.
export interface ITransaction {
    get<T extends AnyModel>(type: new (...args: any[]) => T): KadmiumRepo<T>;
}

// Extracts the generated "Public" type via the phantom symbol property.
export type Public<T> = T extends { [PUBLIC_TYPE_SYMBOL]: infer P } ? P : T;

// --- AGGREGATION TYPES ---
export type AggregateFunction<T> = (
    field: SelectableField<any, any, any> | '*',
) => AggregateField<T>;

export type AggregateFunctions = {
    count: AggregateFunction<number>;
    sum: AggregateFunction<number | null>;
    avg: AggregateFunction<number | null>;
    min: <F extends SelectableField<any, any, any>>(
        field: F,
    ) => AggregateField<GetFieldType<F> | null>;
    max: <F extends SelectableField<any, any, any>>(
        field: F,
    ) => AggregateField<GetFieldType<F> | null>;
};

// A mapped type that transforms the properties of T into their own key names.
// e.g., { id: string, name: string } => { id: 'id', name: 'name' }
export type FieldsAsKeys<T> = {
    [P in keyof T]: P;
};

// --- Advanced Types for Select Result ---

export type AnySelectable =
    | SelectableField<any, any, any>
    | AggregateField<any>;

// Filter a readonly tuple of IRelationBuilder by parentAlias, preserving tuple structure
export type FilterByParentAlias<
    R extends readonly IRelationBuilder<any, any, any, any, any>[],
    A extends string,
> = R extends readonly [infer First, ...infer Rest]
    ? [
          ...(First extends { parentAlias: A } ? [First] : []),
          ...(Rest extends readonly IRelationBuilder<any, any, any, any, any>[]
              ? FilterByParentAlias<Rest, A>
              : []),
      ]
    : [];

// 1. Extracts the final property name from a selectable object (uses alias if it exists)
export type GetFieldName<S extends AnySelectable> = S['alias'] extends string
    ? S['alias']
    : S extends SelectableField<any, any, any>
      ? S['source']['fieldName']
      : never;

// 2. Extracts the raw type of the field
export type GetFieldType<S extends AnySelectable> =
    S extends SelectableField<any, any, any>
        ? S['source']['initialType']
        : S extends AggregateField<any>
          ? S['aggregateType']
          : never;

export type UnionToIntersection<U> = (
    U extends any ? (x: U) => any : never
) extends (x: infer I) => any
    ? I
    : never;

// Moved from single.ts to be accessible here
export type FlatFinalResult<T extends readonly AnySelectable[]> = {
    [S in T[number] as GetFieldName<S>]: GetFieldType<S>;
};

// --- Helper: Extract select type from a relation builder ---
type GetIncludedType<R, RelatedModel extends AnyModel> = R extends {
    _selects: infer S;
}
    ? S extends readonly [AnySelectable, ...AnySelectable[]]
        ? FlatFinalResult<S>
        : Public<RelatedModel>
    : Public<RelatedModel>;

// Process a single relation builder into an object
type ProcessRelation<T extends AnyModel, R> = R extends {
    originalName: infer TName extends string;
    alias: infer TAlias extends string;
    __nested?: infer TNested;
}
    ? TName extends keyof RelationsOf<T>
        ? RelationsOf<T>[TName] extends ToOneRelation<
              infer RelatedModel extends AnyModel
          >
            ? {
                  [K in TAlias]:
                      | (GetIncludedType<R, RelatedModel> &
                            (TNested extends readonly [any, ...any[]]
                                ? BuildIncludedResultRecur<
                                      RelatedModel,
                                      TNested
                                  >
                                : {}))
                      | undefined;
              }
            : RelationsOf<T>[TName] extends ToManyRelation<
                    infer RelatedModel extends AnyModel
                >
              ? {
                    [K in TAlias]: (GetIncludedType<R, RelatedModel> &
                        (TNested extends readonly [any, ...any[]]
                            ? BuildIncludedResultRecur<RelatedModel, TNested>
                            : {}))[];
                }
              : never
        : never
    : never;

// Recursive accumulator: builds a tuple of relation result objects
type BuildIncludedResultRecur<
    T extends AnyModel,
    R,
    Acc extends readonly object[] = [],
> = R extends readonly [infer First, ...infer Rest]
    ? BuildIncludedResultRecur<T, Rest, [...Acc, ProcessRelation<T, First>]>
    : UnionToIntersection<Acc[number]>;

// Recursive type to build the object for included relations
export type BuildIncludedResult<
    T extends AnyModel,
    R extends readonly IRelationBuilder<any, any, any, any, any>[],
> = BuildIncludedResultRecur<T, R>;

export type IncludeResult<
    T extends AnyModel,
    R extends readonly IRelationBuilder<any, any, any, any, any>[],
> = Public<T> & BuildIncludedResult<T, R>;
