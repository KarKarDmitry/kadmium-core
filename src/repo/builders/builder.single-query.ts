import { AnyModel } from '../../model/model.js';
import { ModelHooks } from '../../model/types.js';
import { AppCore } from '../../core/app-core.js';
import { SchemaCore } from '../../core/schema-core.js';
import { DbAdapter } from '../../sqb/adapters/adapter.js';
import { Profiler } from '../../core/profiling/profiler.js';
import { KadmiumRepo } from '../repo.js';
import { IS_QUERY_BUILDER } from '../symbols.js';
import {
    AggregateFunctions,
    AnySelectable,
    BuildIncludedResult,
    FilterProxy,
    FlatFinalResult,
    ICountQuery,
    IExistsQuery,
    IFirstQuery,
    IncludeResult,
    IQueryBuilder,
    ISingleTableQuery,
    Public,
} from '../types/query/index.js';
import { AggregateField } from '../types/aggregate.js';
import {
    IRelationBuilder,
    RelationProxy,
    ToManyRelationBuilder,
    ToOneRelationBuilder,
} from '../field-builders/relation-builder.js';
import { RelationsOf } from '../types/relations.js';
import { SelectableField } from '../types/selectable.js';
import { KadmiumSqb, WhereCondition } from '../../sqb/kadmium-sqb.js';
import { BaseQueryBuilder, toSqlString } from './base-query.builder.js';
import { createFilterProxy } from '../utils/filter-proxy.js';
import { resolveInclude } from '../utils/include-resolver.js';
import { aggregates } from '../utils/aggregates.js';
import { Errors } from '../../core/errors.js';

type SingleQuerySelectProxy<T extends AnyModel> = {
    [K in keyof T]: SelectableField<T, K>;
};

export class QueryBuilder<
    T extends AnyModel,
    R extends readonly IRelationBuilder<any, any, any, any, any>[] = [],
>
    extends BaseQueryBuilder<
        FilterProxy<T>,
        SingleQuerySelectProxy<T>,
        QueryBuilder<T, R>
    >
    implements IQueryBuilder
{
    public readonly [IS_QUERY_BUILDER] = true;

    public get sqb() {
        return this._sqb;
    }

    // --- Class-specific properties ---
    private _schemaCore: SchemaCore;
    private adapter: DbAdapter;
    private appCore: AppCore;
    private collectionName: string;
    protected selectProxy: SingleQuerySelectProxy<T>;

    constructor(
        schemaCore: SchemaCore,
        adapter: DbAdapter,
        appCore: AppCore,
        private _repo: KadmiumRepo<T>,
    ) {
        const sqb = new KadmiumSqb<T>(schemaCore);
        const collectionName = schemaCore.collection;
        sqb._tableContext.set(collectionName, collectionName);

        // The whereProxy needs `this` context, but `this` is not available before super().
        // So we initialize it to a temporary value and then set it properly after super().
        super(sqb, {} as FilterProxy<T>, sqb._wheres);

        // Initialize the rest of the properties BEFORE createWhereProxy
        this._schemaCore = schemaCore;
        this.adapter = adapter;
        this.appCore = appCore;
        this.collectionName = collectionName;
        this._proxy = this.createWhereProxy();
        this.selectProxy = this.createFieldProxy();
    }

    private createWhereProxy(): FilterProxy<T> {
        return createFilterProxy<T>(
            this.sqb,
            this._schemaCore,
            this.appCore,
            this.collectionName,
        );
    }

    private createFieldProxy(): SingleQuerySelectProxy<T> {
        return new Proxy(
            {},
            {
                get: (target, prop: string | symbol) => {
                    const fieldName = prop as keyof T;
                    return new SelectableField(
                        {
                            tableAlias: this.collectionName,
                            fieldName: fieldName,
                            initialType: {} as T[typeof fieldName],
                        },
                        undefined,
                    );
                },
            },
        ) as SingleQuerySelectProxy<T>;
    }

    public include<
        const R2 extends readonly IRelationBuilder<any, any, any, any, any>[],
    >(
        selector: (relations: RelationProxy<T>) => R2,
    ): QueryBuilder<T, [...R, ...R2]> {
        const selectedRelationBuilders = selector(this.createRelationProxy());

        const includedRelations = selectedRelationBuilders.map((relBuilder) =>
            resolveInclude(
                relBuilder,
                this.collectionName,
                this.appCore,
                this._schemaCore,
            ),
        );

        this._sqb._includes = [...this._sqb._includes, ...includedRelations];

        return this as unknown as QueryBuilder<T, [...R, ...R2]>;
    }

    private createRelationProxy(): RelationProxy<T> {
        return new Proxy(
            {},
            {
                get: (target: {}, prop: string | symbol) => {
                    if (typeof prop === 'symbol') {
                        return;
                    }
                    const relationName = prop as keyof RelationsOf<T> & string;
                    const relationMetadata = this.appCore.relationMap.get(
                        `${this.collectionName}:${relationName}`,
                    );

                    if (!relationMetadata) {
                        throw Errors.repo.relationNotFound(
                            relationName,
                            this.collectionName,
                        );
                    }

                    const relatedSchemaCore = this.appCore.schemas.find(
                        (s) => s.collection === relationMetadata.toSchema,
                    );

                    if (!relatedSchemaCore) {
                        throw Errors.repo.relatedSchemaNotFound(
                            relationName,
                            relationMetadata.toSchema,
                        );
                    }

                    if (relationMetadata.type === 'one-to-many') {
                        return new ToManyRelationBuilder(
                            this.sqb,
                            relationName,
                            relatedSchemaCore,
                            this.appCore,
                            this.collectionName,
                            this.collectionName,
                        );
                    } else {
                        return new ToOneRelationBuilder(
                            this.sqb,
                            relationName,
                            relatedSchemaCore,
                            this.appCore,
                            this.collectionName,
                            this.collectionName,
                        );
                    }
                },
            },
        ) as RelationProxy<T>;
    }

    // --- Verbs ---
    public select<const S extends readonly AnySelectable[]>(
        selector: (
            fields: { [K in keyof T]: SelectableField<T, K> },
            aggregates: AggregateFunctions,
        ) => S,
        options: { includeSecured: true },
    ): ISingleTableQuery<T, R, FlatFinalResult<S> & BuildIncludedResult<T, R>>;
    public select<const S extends readonly AnySelectable[]>(
        selector: (
            fields: { [K in keyof T]: SelectableField<T, K> },
            aggregates: AggregateFunctions,
        ) => S,
    ): ISingleTableQuery<T, R, FlatFinalResult<S> & BuildIncludedResult<T, R>>;
    public select(options: {
        includeSecured: true;
    }): ISingleTableQuery<T, R, T & BuildIncludedResult<T, R>>;
    public select(options?: {
        includeSecured?: false | undefined;
    }): ISingleTableQuery<T, R, IncludeResult<Public<T>, R>>;
    public select<const S extends readonly AnySelectable[]>(
        selectorOrOptions?:
            | ((
                  fields: { [K in keyof T]: SelectableField<T, K> },
                  aggregates: AggregateFunctions,
              ) => S)
            | { includeSecured?: boolean },
        options?: { includeSecured?: boolean },
    ) {
        this._sqb._operation = 'select';

        let selector:
            | ((
                  fields: { [K in keyof T]: SelectableField<T, K> },
                  aggregates: AggregateFunctions,
              ) => readonly AnySelectable[])
            | undefined;
        let effectiveOptions = options;

        if (typeof selectorOrOptions === 'function') {
            selector = selectorOrOptions;
        } else if (typeof selectorOrOptions === 'object') {
            effectiveOptions = selectorOrOptions;
        }

        if (selector) {
            const selectedFields = selector(this.selectProxy, aggregates);
            this._sqb._selects = selectedFields;
        } else {
            const fieldsToSelect = [
                ...this._schemaCore.registry.fieldsByName.values(),
            ].filter((field) => field.persist !== false);

            const securedTypes = this.appCore.securedTypes;

            this._sqb._selects = fieldsToSelect
                .filter((field) => {
                    return effectiveOptions?.includeSecured
                        ? true
                        : !securedTypes.has(field.type);
                })
                .map(
                    (field) =>
                        new SelectableField({
                            tableAlias: this.collectionName,
                            fieldName: field.name as keyof T,
                            initialType: {} as T[keyof T],
                        }),
                );
        }

        type TResult = S extends readonly AnySelectable[]
            ? FlatFinalResult<S> & BuildIncludedResult<T, R>
            : typeof selectorOrOptions extends { includeSecured: true }
              ? T & BuildIncludedResult<T, R>
              : IncludeResult<Public<T>, R>;

        const finalizer: ISingleTableQuery<T, R, TResult> = {
            [IS_QUERY_BUILDER]: true,
            sqb: this.sqb,
            where: (clause) => {
                this.where(clause);
                return finalizer;
            },
            and: (clause) => {
                this.and(clause);
                return finalizer;
            },
            or: (clause) => {
                this.or(clause);
                return finalizer;
            },
            order: (selector, direction) => {
                this.order(selector, direction);
                return finalizer;
            },
            groupBy: (selector) => {
                this.groupBy(selector);
                return finalizer;
            },
            limit: (count: number) => {
                this.limit(count);
                return finalizer;
            },
            offset: (count: number) => {
                this.offset(count);
                return finalizer;
            },
            page: (page: number, size: number) => {
                this.page(page, size);
                return finalizer;
            },
            sql: () => toSqlString(this.sqb, this.adapter),
            go: (): Promise<TResult[]> => this.go() as any,
        };

        return finalizer;
    }

    public first<const S extends readonly AnySelectable[]>(
        selector: (
            fields: { [K in keyof T]: SelectableField<T, K> },
            aggregates: AggregateFunctions,
        ) => S,
        options: { includeSecured: true },
    ): IFirstQuery<T, R, FlatFinalResult<S> & BuildIncludedResult<T, R>>;
    public first<const S extends readonly AnySelectable[]>(
        selector: (
            fields: { [K in keyof T]: SelectableField<T, K> },
            aggregates: AggregateFunctions,
        ) => S,
    ): IFirstQuery<T, R, FlatFinalResult<S> & BuildIncludedResult<T, R>>;
    public first(options: {
        includeSecured: true;
    }): IFirstQuery<T, R, T & BuildIncludedResult<T, R>>;
    public first(options?: {
        includeSecured?: false | undefined;
    }): IFirstQuery<T, R, IncludeResult<Public<T>, R>>;
    public first<const S extends readonly AnySelectable[]>(
        selectorOrOptions?:
            | ((
                  fields: { [K in keyof T]: SelectableField<T, K> },
                  aggregates: AggregateFunctions,
              ) => S)
            | { includeSecured?: boolean },
    ) {
        this._sqb._operation = 'select';
        // First select to initialize _selects, then limit(1) to avoid overwriting
        this.select(selectorOrOptions as any);
        this.limit(1);

        type TResult = S extends readonly AnySelectable[]
            ? FlatFinalResult<S> & BuildIncludedResult<T, R>
            : typeof selectorOrOptions extends { includeSecured: true }
              ? T & BuildIncludedResult<T, R>
              : IncludeResult<Public<T>, R>;

        const finalizer: IFirstQuery<T, R, TResult> = {
            [IS_QUERY_BUILDER]: true,
            sqb: this.sqb,
            sql: () => toSqlString(this.sqb, this.adapter),
            go: async (): Promise<TResult | undefined> => {
                const results = (await this.go()) as any;
                return results[0];
            },
        };
        return finalizer;
    }

    public firstOrThrow<const S extends readonly AnySelectable[]>(
        selector: (
            fields: { [K in keyof T]: SelectableField<T, K> },
            aggregates: AggregateFunctions,
        ) => S,
        options: { includeSecured: true },
    ): IFirstQuery<T, R, FlatFinalResult<S> & BuildIncludedResult<T, R>>;
    public firstOrThrow<const S extends readonly AnySelectable[]>(
        selector: (
            fields: { [K in keyof T]: SelectableField<T, K> },
            aggregates: AggregateFunctions,
        ) => S,
    ): IFirstQuery<T, R, FlatFinalResult<S> & BuildIncludedResult<T, R>>;
    public firstOrThrow(options: {
        includeSecured: true;
    }): IFirstQuery<T, R, T & BuildIncludedResult<T, R>>;
    public firstOrThrow(options?: {
        includeSecured?: false | undefined;
    }): IFirstQuery<T, R, IncludeResult<Public<T>, R>>;
    public firstOrThrow<const S extends readonly AnySelectable[]>(
        selectorOrOptions?:
            | ((
                  fields: { [K in keyof T]: SelectableField<T, K> },
                  aggregates: AggregateFunctions,
              ) => S)
            | { includeSecured?: boolean },
    ) {
        const base = this.first(selectorOrOptions as any);

        type TResult = S extends readonly AnySelectable[]
            ? FlatFinalResult<S> & BuildIncludedResult<T, R>
            : typeof selectorOrOptions extends { includeSecured: true }
              ? T & BuildIncludedResult<T, R>
              : IncludeResult<Public<T>, R>;

        return {
            ...base,
            go: async (): Promise<TResult> => {
                const result = await (base.go as any)();
                if (result === undefined) {
                    throw Errors.query.notFound(this.collectionName);
                }
                return result;
            },
        } as IFirstQuery<T, R, TResult>;
    }

    public count(): ICountQuery {
        this._sqb._operation = 'select';
        this.select(() => [aggregates.count('*').as('count')]);

        const finalizer: ICountQuery = {
            [IS_QUERY_BUILDER]: true,
            sqb: this.sqb,
            sql: () => toSqlString(this.sqb, this.adapter),
            go: async (): Promise<number> => {
                const results = (await this.go()) as any;
                return Number(results[0]?.count ?? 0);
            },
        };
        return finalizer;
    }

    public exists(): IExistsQuery {
        this._sqb._operation = 'select';
        this._sqb._selects = [1];
        this.limit(1);

        const finalizer: IExistsQuery = {
            [IS_QUERY_BUILDER]: true,
            sqb: this.sqb,
            sql: () => toSqlString(this.sqb, this.adapter),
            go: async (): Promise<boolean> => {
                const results = (await this.go()) as any;
                return results.length > 0;
            },
        };
        return finalizer;
    }

    update(data: Partial<T>) {
        this._sqb._operation = 'update';
        const go = async (): Promise<T[]> => {
            // 1. Model beforeUpdate hooks (user business logic)
            const { data: modelData, operation: modelOp } =
                await this._repo._runModelBeforeUpdate(data);
            if (modelOp !== 'update') {
                throw Errors.query.error(
                    `Model beforeUpdate hook changed operation to "${modelOp}". This is not supported for update().`,
                );
            }
            // 2. Feature beforeUpdate hooks (infrastructure logic)
            const { data: processedData, operation } =
                await this._repo._runFeatureBeforeUpdate(
                    modelData as Partial<T>,
                );
            if (operation !== 'update') {
                throw Errors.query.error(
                    `beforeUpdate hook changed operation to "${operation}". This is not supported for update().`,
                );
            }
            this._sqb._updateData = await this._repo._hashPasswordsInData(
                processedData as Partial<T>,
            );
            const results = (await this.go()) as any;

            // 1. Model afterUpdate hooks (user business logic)
            let updatedResults = await this._repo._runModelAfterUpdate(
                results as T[],
            );
            // 2. Feature afterUpdate hooks (infrastructure logic)
            await this._repo._runFeatureAfterUpdate(updatedResults);
            return updatedResults;
        };
        const sql = () => {
            this._sqb._updateData = data; // For showing SQL without hashing
            const { text, values } = this.adapter.toSql(this._sqb);
            return `SQL: ${text}\nVALUES: [${values.join(', ')}]`;
        };
        return {
            sql,
            where: (clause: (fields: FilterProxy<T>) => WhereCondition) => {
                this.where(clause);
                return { go, sql };
            },
            go,
        };
    }

    delete() {
        this._sqb._operation = 'delete';
        const go = async () => {
            // 1. Model beforeDelete hooks (user business logic)
            const { operation: modelOp } =
                await this._repo._runModelBeforeDelete();
            if (modelOp !== 'delete') {
                throw Errors.query.error(
                    `Model beforeDelete hook changed operation to "${modelOp}". This is not supported for delete().`,
                );
            }
            // 2. Feature beforeDelete hooks — may change operation to "update"
            const { operation: effectiveOperation, data: deleteData } =
                await this._repo._runFeatureBeforeDelete();

            if (effectiveOperation === 'update') {
                // Soft-delete: вместо DELETE делаем UPDATE с данными из хука
                this._sqb._operation = 'update';
                this._sqb._updateData = deleteData as Partial<T>;
                const results = (await this.go()) as any;
                // 1. Model afterUpdate hooks
                await this._repo._runModelAfterUpdate(results);
                // 2. Feature afterUpdate hooks
                await this._repo._runFeatureAfterUpdate(results);
                return true;
            } else {
                // Обычное удаление
                const results = (await this.go()) as any;
                // 1. Model afterDelete hooks
                await this._repo._runModelAfterDelete(results as T[]);
                // 2. Feature afterDelete hooks
                await this._repo._runFeatureAfterDelete(results);
                return true;
            }
        };
        const sql = () => {
            const { text, values } = this.adapter.toSql(this._sqb);
            return `SQL: ${text}\nVALUES: [${values.join(', ')}]`;
        };
        return {
            sql,
            where: (clause: (fields: FilterProxy<T>) => WhereCondition) => {
                this.where(clause);
                return { go, sql };
            },
            go,
        };
    }

    private async go(): Promise<Partial<T>[]> {
        if (this.sqb._operation === 'select' && !this.sqb._selects) {
            this.select();
        }

        // 1. Model beforeRead hooks (user business logic)
        if (this.sqb._operation === 'select') {
            const modelWheres = await this._repo._runModelBeforeRead();
            for (const w of modelWheres) {
                this._sqb._wheres.conditions.push(w);
            }
        }
        // 2. Feature beforeRead hooks (infrastructure logic)
        if (this.sqb._operation === 'select') {
            const mainTableAlias = this.sqb._tableContext.keys().next().value;
            const wheres =
                await this._repo._runFeatureBeforeRead(mainTableAlias);
            for (const w of wheres) {
                this._sqb._wheres.conditions.push(w);
            }
        }

        const results = await this.sqb.execute(this.adapter);

        // Model afterRead hooks — только для SELECT
        if (this.sqb._operation === 'select') {
            const modelResults = await this._repo._runModelAfterRead(
                results as T[],
            );
            // Feature afterRead hooks
            return this._repo._runFeatureAfterRead(modelResults);
        }

        return results;
    }
}
