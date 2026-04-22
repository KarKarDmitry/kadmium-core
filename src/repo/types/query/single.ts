import { AnyModel } from "../../../model/model";
import { WhereCondition } from "../../../sqb/kadmium-sqb";
import { IRelationBuilder } from "../../field-builders/relation-builder";
import { SelectableField } from "../selectable";
import {
  AnySelectable,
  FilterProxy,
  GetFieldName,
  GetFieldType,
  IQueryBuilder,
} from "./common";

// --- Query Finalizer Interfaces ---

// A single, powerful finalizer for single-table queries.
// T is the base schema type, TResult is the final object shape.
export interface ISingleTableQuery<
  T extends AnyModel,
  R extends readonly IRelationBuilder<any, any, any, any, any>[],
  TResult,
> extends IQueryBuilder {
  where(
    clause: (fields: FilterProxy<T>) => WhereCondition,
  ): ISingleTableQuery<T, R, TResult>;
  and(
    clause: (fields: FilterProxy<T>) => WhereCondition,
  ): ISingleTableQuery<T, R, TResult>;
  or(
    clause: (fields: FilterProxy<T>) => WhereCondition,
  ): ISingleTableQuery<T, R, TResult>;
  order(
    selector: (fields: {
      [K in keyof T]: SelectableField<T, K>;
    }) => SelectableField<T, keyof T>,
    direction?: "asc" | "desc",
  ): ISingleTableQuery<T, R, TResult>;
  groupBy(
    selector: (fields: {
      [K in keyof T]: SelectableField<T, K>;
    }) => SelectableField<T, keyof T> | SelectableField<T, keyof T>[],
  ): ISingleTableQuery<T, R, TResult>;
  limit(count: number): ISingleTableQuery<T, R, TResult>;
  offset(count: number): ISingleTableQuery<T, R, TResult>;
  page(page: number, size: number): ISingleTableQuery<T, R, TResult>;
  sql(): string;
  go(): Promise<TResult[]>;
}

export interface IFirstQuery<
  T extends AnyModel,
  R extends readonly IRelationBuilder<any, any, any, any, any>[],
  TResult,
> extends IQueryBuilder {
  sql(): string;
  go(): Promise<TResult | undefined>;
}

export interface ICountQuery extends IQueryBuilder {
  sql(): string;
  go(): Promise<number>;
}

export interface IExistsQuery extends IQueryBuilder {
  sql(): string;
  go(): Promise<boolean>;
}
