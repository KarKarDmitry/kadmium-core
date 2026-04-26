import { AppCore } from '../../core/app-core.js';
import { SchemaCore } from '../../core/schema-core.js';
import { DbAdapter } from '../../sqb/adapters/adapter.js';
import { KadmiumSqb, WhereCondition } from '../../sqb/kadmium-sqb.js';
import { SelectableField } from '../types/selectable.js';
import {
    AliasesMap,
    AnySelectable,
    FinalResult,
    IQueryBuilder,
    MultiFilterProxy,
    MultiSelectProxy,
    AggregateFunctions,
} from '../types/query/index.js';
import { IS_QUERY_BUILDER } from '../symbols.js';
import { BaseQueryBuilder, toSqlString } from './base-query.builder.js';
import { createFilterProxy } from '../utils/filter-proxy.js';
import { resolveInclude } from '../utils/include-resolver.js';

import {
    IRelationBuilder,
    RelationProxy,
    ToManyRelationBuilder,
    ToOneRelationBuilder,
} from '../field-builders/relation-builder.js';
import { Errors } from '../../core/errors.js';
import { RelationsOf } from '../types/relations.js';
import { aggregates } from '../utils/aggregates.js';

type MultiRelationProxy<T extends AliasesMap> = {
    [K in keyof T]: RelationProxy<InstanceType<T[K]>, K & string>;
};

// Helper function to create the whereProxy, moved outside the class
// to resolve constructor-time `this`/`super` and generics issues.
function createMultiQueryWhereProxy<T extends AliasesMap>(
    schemaCores: Map<string, SchemaCore>,
    sqb: KadmiumSqb<any>,
    appCore: AppCore,
): MultiFilterProxy<T> {
    return new Proxy(
        {},
        {
            get: <A extends keyof T & string>(_target: {}, alias: A) => {
                const schemaCore = schemaCores.get(alias);
                if (!schemaCore) {
                    throw Errors.query.invalidAlias(alias);
                }
                return createFilterProxy<InstanceType<T[A]>>(
                    sqb,
                    schemaCore,
                    appCore,
                    alias,
                );
            },
        },
    ) as any as MultiFilterProxy<T>;
}
export class MultiQueryBuilder<
    T extends AliasesMap,
    R extends readonly IRelationBuilder<any, any, any, any, any>[] = [],
>
    extends BaseQueryBuilder<
        MultiFilterProxy<T>,
        MultiSelectProxy<T>,
        MultiQueryBuilder<T, R>
    >
    implements IQueryBuilder
{
    public readonly [IS_QUERY_BUILDER] = true;

    public get sqb() {
        return this._sqb;
    }

    protected selectProxy: MultiSelectProxy<T>;
    protected relationProxy: MultiRelationProxy<T>;
    private appCore: AppCore;

    constructor(
        private schemaCores: Map<string, SchemaCore>,
        private adapter: DbAdapter,
        appCore: AppCore,
    ) {
        const firstSchemaCore = schemaCores.values().next().value;
        if (!firstSchemaCore) {
            throw Errors.query.emptyAliases();
        }
        const sqb = new KadmiumSqb<any>(firstSchemaCore);

        // Call the external helper, passing the class's generic type <T>
        const whereProxy = createMultiQueryWhereProxy<T>(
            schemaCores,
            sqb,
            appCore,
        );

        // Now `super()` can be called with the correctly-typed proxy.
        super(sqb, whereProxy, sqb._wheres);
        this.appCore = appCore;

        for (const [alias, schemaCore] of schemaCores.entries()) {
            this._sqb._tableContext.set(alias, schemaCore.collection);
        }
        this.selectProxy = this.createSelectProxy();
        this.relationProxy = this.createRelationProxy();
    }

    private createRelationProxy(): MultiRelationProxy<T> {
        return new Proxy(
            {},
            {
                get: <A extends keyof T & string>(target: {}, alias: A) => {
                    // e.g., 'u'
                    const schemaCore = this.schemaCores.get(alias);
                    if (!schemaCore) return undefined;

                    const collectionName = schemaCore.collection;

                    // Create the inner proxy, which is identical to the single-query one
                    return new Proxy(
                        {},
                        {
                            get: (target2: {}, prop: string | symbol) => {
                                if (typeof prop === 'symbol') {
                                    return;
                                }
                                const relationName =
                                    prop as keyof RelationsOf<any> & string;
                                const relationMetadata =
                                    this.appCore.relationMap.get(
                                        `${collectionName}:${relationName}`,
                                    );

                                if (!relationMetadata) {
                                    throw Errors.repo.relationNotFound(
                                        relationName,
                                        collectionName,
                                    );
                                }

                                const relatedSchemaCore =
                                    this.appCore.schemas.find(
                                        (s) =>
                                            s.collection ===
                                            relationMetadata.toSchema,
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
                                        alias as A, // Parent alias — cast to literal type
                                        collectionName, // Parent collection name
                                    );
                                } else {
                                    return new ToOneRelationBuilder(
                                        this.sqb,
                                        relationName,
                                        relatedSchemaCore,
                                        this.appCore,
                                        alias as A, // Parent alias — cast to literal type
                                        collectionName, // Parent collection name
                                    );
                                }
                            },
                        },
                    );
                },
            },
        ) as MultiRelationProxy<T>;
    }

    public include<
        const R2 extends readonly IRelationBuilder<any, any, any, any, any>[],
    >(
        selector: (relations: MultiRelationProxy<T>) => R2,
    ): MultiQueryBuilder<T, [...R, ...R2]> {
        const selectedRelationBuilders = selector(this.relationProxy);

        const includedRelations = selectedRelationBuilders.map((relBuilder) => {
            const parentSchemaCore = this.schemaCores.get(
                relBuilder.parentAlias,
            );
            if (!parentSchemaCore) {
                throw Errors.query.error(
                    `Schema core not found for alias "${relBuilder.parentAlias}" during include setup.`,
                    { alias: relBuilder.parentAlias },
                );
            }
            return resolveInclude(
                relBuilder,
                parentSchemaCore.collection,
                this.appCore,
                parentSchemaCore,
            );
        });

        this._sqb._includes = [...this._sqb._includes, ...includedRelations];

        return this as unknown as MultiQueryBuilder<T, [...R, ...R2]>;
    }

    public join(options: {
        left: keyof T;
        right: keyof T;
        direction?: 'inner' | 'left' | 'right' | 'outer';
        on: (tables: MultiFilterProxy<T>) => WhereCondition;
    }): this {
        const onCondition = options.on(this._proxy);
        this._sqb._joins.push({
            left: options.left as string,
            right: options.right as string,
            direction: options.direction ?? 'inner',
            on: onCondition,
        });
        return this;
    }

    public select<const S extends readonly AnySelectable[]>(
        selector: (
            proxies: MultiSelectProxy<T>,
            aggregates: AggregateFunctions,
        ) => S,
    ) {
        const selected = selector(this.selectProxy, aggregates);
        if (!selected || selected.length === 0) {
            // Our reshaping logic requires at least one selected field.
            throw Errors.query.error(
                'A select call on a multi-query must select at least one field.',
            );
        }
        this._sqb._selects = selected;

        return {
            sql: () => toSqlString(this._sqb, this.adapter),
            go: async (): Promise<FinalResult<S, T, R>[]> => {
                return this._sqb.execute(this.adapter) as any;
            },
        };
    }

    private createSelectProxy(): MultiSelectProxy<T> {
        return new Proxy(
            {},
            {
                get: <A extends keyof T & string>(target: {}, alias: A) => {
                    type Model = InstanceType<T[A]>;
                    return new Proxy(
                        {},
                        {
                            get: (target2: {}, fieldName: string | symbol) => {
                                return new SelectableField<
                                    Model,
                                    keyof Model,
                                    A
                                >({
                                    tableAlias: alias,
                                    fieldName: fieldName as keyof Model,
                                    initialType: {} as any,
                                });
                            },
                        },
                    );
                },
            },
        ) as any;
    }
}
