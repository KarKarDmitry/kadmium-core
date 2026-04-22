import { AnyModel } from "../../../model/model";
import { WhereCondition } from "../../../sqb/kadmium-sqb";
import { AggregateField } from "../aggregate";
import { SelectableField } from "../selectable";
import {
  AnySelectable,
  FilterProxy,
  GetFieldName,
  GetFieldType,
  BuildIncludedResult,
  UnionToIntersection,
  FilterByParentAlias,
} from "./common";
import { IRelationBuilder } from "../../field-builders/relation-builder";

// --- MULTI-QUERY TYPES ---

export type AnyModelClass = new (...args: any[]) => AnyModel;
export type AliasesMap = Record<string, AnyModelClass>;

// Types for multi-table proxies
export type ShapeFromAliases<T extends AliasesMap> = {
  [K in keyof T]: InstanceType<T[K]>;
};
export type MultiFilterProxy<T extends AliasesMap> = {
  [K in keyof T]: FilterProxy<InstanceType<T[K]>>;
};
export type MultiSelectProxy<T extends AliasesMap> = {
  [TAlias in keyof T & string]: {
    [TField in keyof InstanceType<T[TAlias]>]: SelectableField<
      InstanceType<T[TAlias]>,
      TField,
      TAlias
    >;
  };
};

export type JoinOptions = {
  left: string;
  right: string;
  direction: "inner" | "left" | "right" | "outer";
  on: WhereCondition;
};

// Extracts the table alias (e.g., 'u' or 'p')
export type GetTableAlias<S extends AnySelectable> =
  S extends SelectableField<any, any, any>
  ? S["source"]["tableAlias"]
  : undefined; // Aggregates don't have a table alias in the same way

// From an array of selections, extracts a union of all used table aliases
export type AllTableAliases<T extends readonly AnySelectable[]> = GetTableAlias<
  T[number]
>;

// From an array of selections, filters out the selections that belong to a specific table alias
export type FieldsForAlias<
  T extends readonly AnySelectable[],
  A extends string,
> = Extract<T[number], { source: { tableAlias: A } }>;

// Builds the inner object for a single table alias (e.g., { id: string, name: string })
export type ObjectForAlias<
  T extends readonly AnySelectable[],
  A extends string,
> = {
  // Regular fields for this alias
  [S in FieldsForAlias<T, A> as GetFieldName<S>]: GetFieldType<S>;
} extends infer O
  ? { [K in keyof O]: O[K] }
  : never;

// The final mapped type: builds the top-level object (e.g., { u: { ... }, p: { ... }, agg: ... })
export type FinalResult<
  S extends readonly AnySelectable[],
  T extends AliasesMap = {},
  R extends readonly IRelationBuilder<any, any, any, any, any>[] = [],
> = {
  [A in AllTableAliases<S> & string]: ObjectForAlias<S, A> &
  BuildIncludedResult<
    InstanceType<T[A]>,
    FilterByParentAlias<R, A>
  >;
} & {
    // Add ALL aggregate fields to the top level
    [Sel in Extract<
      S[number],
      AggregateField<any>
    > as GetFieldName<Sel>]: GetFieldType<Sel>;
  };
