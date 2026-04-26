import { AnyModel } from '../../model/model.js';
import { KadmiumSqb, WhereCondition } from '../../sqb/kadmium-sqb.js';
import {
    FilterProxy,
    IQueryBuilder,
    AnySelectable,
    AggregateFunctions,
} from '../types/query/index.js';
import { BaseWhereBuilder } from '../types/builder.base.js';
import { SchemaCore } from '../../core/schema-core.js';
import { SelectableField } from '../types/selectable.js';
import { AppCore } from '../../core/app-core.js';
import { createFilterProxy } from '../utils/filter-proxy.js';
import {
    resolveInclude,
    updateWhereAlias,
    updateJoinAliases,
} from '../utils/include-resolver.js';
import { IS_QUERY_BUILDER } from '../symbols.js';
import {
    RelationsOf,
    ToManyRelation,
    ToOneRelation,
} from '../types/relations.js';
import { Errors } from '../../core/errors.js';

// This proxy provides access to related entities for the .include() method
export type RelationProxy<
    T extends AnyModel,
    TParentAlias extends string = string,
> = {
    [K in keyof RelationsOf<T> &
        string]: RelationsOf<T>[K] extends ToOneRelation<
        infer R extends AnyModel
    >
        ? ToOneRelationBuilder<R, T, K, K, [], TParentAlias>
        : RelationsOf<T>[K] extends ToManyRelation<infer R extends AnyModel>
          ? ToManyRelationBuilder<R, T, K, K, [], TParentAlias>
          : never;
};

// --- SelectableFieldsProxy for method selectors ---
export type SelectableFieldsProxy<T extends AnyModel> = {
    [K in keyof T]-?: SelectableField<T, K>;
};

export interface IRelationBuilder<
    TName extends string = string,
    TAlias extends string = TName,
    TNested extends readonly IRelationBuilder<any, any, any, any, any>[] = [],
    TParentAlias extends string = string,
    TSelects extends readonly AnySelectable[] = readonly AnySelectable[],
> {
    readonly originalName: TName;
    readonly alias: TAlias;
    readonly internalSqb: KadmiumSqb<any>;
    readonly _selects: TSelects;
    readonly relatedSchemaCore: SchemaCore;
    readonly parentAlias: TParentAlias;
    readonly parentCollectionName: string;
    readonly __nested?: TNested; // Phantom property
}

// --- Helper for creating FilterProxy (similar to builder.single-query) ---
function createRelationFilterProxy<T extends AnyModel>(
    sqb: KadmiumSqb<T>,
    schemaCore: SchemaCore,
    appCore: AppCore,
    alias: string,
): FilterProxy<T> {
    return createFilterProxy<T>(sqb, schemaCore, appCore, alias);
}

// --- Base Relation Builder ---
export class RelationBuilder<
    T extends AnyModel,
    TParent extends AnyModel,
    TName extends string,
    TAlias extends string = TName,
    TParentAlias extends string = string,
> {
    public readonly originalName: TName;
    public readonly alias: TAlias;
    public internalSqb: KadmiumSqb<T>;

    constructor(
        protected parentSqb: KadmiumSqb<TParent>,
        name: TName,
        public readonly relatedSchemaCore: SchemaCore,
        protected appCore: AppCore,
        public readonly parentAlias: TParentAlias,
        public readonly parentCollectionName: string,
        alias?: TAlias,
    ) {
        this.originalName = name;
        this.alias = alias ?? (name as unknown as TAlias);
        this.internalSqb = new KadmiumSqb<T>(relatedSchemaCore);
        this.internalSqb._tableContext.set(
            this.alias,
            relatedSchemaCore.collection,
        );
    }

    protected createFieldProxy(): SelectableFieldsProxy<T> {
        return new Proxy({} as SelectableFieldsProxy<T>, {
            get: (target, prop: string | symbol) => {
                const fieldName = prop as keyof T;
                return new SelectableField(
                    {
                        tableAlias: this.alias,
                        fieldName: fieldName,
                        initialType: {} as T[typeof fieldName],
                    },
                    undefined,
                );
            },
        }) as SelectableFieldsProxy<T>;
    }
}

// --- ToOne Relation Builder ---
export class ToOneRelationBuilder<
    T extends AnyModel,
    TParent extends AnyModel,
    TName extends string,
    TAlias extends string = TName,
    TNested extends readonly IRelationBuilder<any, any, any, any, any>[] = [],
    TParentAlias extends string = string,
    TSelects extends readonly AnySelectable[] = [],
>
    extends RelationBuilder<T, TParent, TName, TAlias, TParentAlias>
    implements IRelationBuilder<TName, TAlias, TNested, TParentAlias, TSelects>
{
    private whereProxy: FilterProxy<T>;
    public readonly parentAlias: TParentAlias;
    public readonly parentCollectionName: string;
    public readonly __nested?: TNested;
    public readonly _selects: TSelects = null!;

    constructor(
        parentSqb: KadmiumSqb<TParent>,
        name: TName,
        relatedSchemaCore: SchemaCore,
        appCore: AppCore,
        parentAlias: TParentAlias,
        parentCollectionName: string,
        alias?: TAlias,
    ) {
        super(
            parentSqb,
            name,
            relatedSchemaCore,
            appCore,
            parentAlias,
            parentCollectionName,
            alias,
        );
        this.parentAlias = parentAlias;
        this.parentCollectionName = parentCollectionName;
        this.whereProxy = createRelationFilterProxy(
            this.internalSqb,
            relatedSchemaCore,
            appCore,
            this.alias,
        );
    }

    as<A extends string>(
        alias: A,
    ): ToOneRelationBuilder<T, TParent, TName, A, TNested, TParentAlias> {
        const newBuilder = new ToOneRelationBuilder<
            T,
            TParent,
            TName,
            A,
            TNested,
            TParentAlias
        >(
            this.parentSqb,
            this.originalName,
            this.relatedSchemaCore,
            this.appCore,
            this.parentAlias,
            this.parentCollectionName,
            alias,
        );

        newBuilder.internalSqb = this.internalSqb.clone();
        // Re-alias the table context
        newBuilder.internalSqb._tableContext.delete(this.alias);
        newBuilder.internalSqb._tableContext.set(
            alias,
            this.relatedSchemaCore.collection,
        );

        // Update alias in where conditions
        updateWhereAlias(newBuilder.internalSqb._wheres, this.alias, alias);

        // Update alias in join conditions
        updateJoinAliases(newBuilder.internalSqb._joins, this.alias, alias);

        return newBuilder;
    }

    select<const S extends readonly AnySelectable[]>(
        selector: (
            fields: SelectableFieldsProxy<T>,
            aggregates: AggregateFunctions,
        ) => S,
    ): ToOneRelationBuilder<
        T,
        TParent,
        TName,
        TAlias,
        TNested,
        TParentAlias,
        S
    > {
        this.internalSqb._selects = selector(
            this.createFieldProxy(),
            {} as any,
        );
        return this as unknown as ToOneRelationBuilder<
            T,
            TParent,
            TName,
            TAlias,
            TNested,
            TParentAlias,
            S
        >;
    }

    where(clause: (fields: FilterProxy<T>) => WhereCondition): this {
        this.internalSqb._wheres.conditions.push(clause(this.whereProxy));
        return this;
    }

    public include<
        const R extends readonly IRelationBuilder<any, any, any, any, any>[],
    >(
        selector: (relations: RelationProxy<T>) => R,
    ): ToOneRelationBuilder<
        T,
        TParent,
        TName,
        TAlias,
        [...TNested, ...R],
        TParentAlias
    > {
        const selectedRelationBuilders = selector(
            this.createNestedRelationProxy(),
        );

        const mainTablePK = this.relatedSchemaCore.normalized.primary.name;

        const includedRelations = selectedRelationBuilders.map((relBuilder) =>
            resolveInclude(
                relBuilder,
                this.relatedSchemaCore.collection,
                this.appCore,
                this.relatedSchemaCore,
            ),
        );

        this.internalSqb._includes.push(...includedRelations);
        return this as any;
    }

    private createNestedRelationProxy(): RelationProxy<T, TAlias> {
        return new Proxy(
            {},
            {
                get: (target: {}, prop: string | symbol) => {
                    if (typeof prop === 'symbol') {
                        return;
                    }
                    const relationName = prop as keyof RelationsOf<T> & string;
                    const relationMetadata = this.appCore.relationMap.get(
                        `${this.relatedSchemaCore.collection}:${relationName}`,
                    );

                    if (!relationMetadata)
                        throw Errors.repo.relationNotFound(
                            relationName,
                            this.relatedSchemaCore.collection,
                        );

                    const relatedSchemaCore = this.appCore.schemas.find(
                        (s) => s.collection === relationMetadata.toSchema,
                    );

                    if (!relatedSchemaCore)
                        throw Errors.repo.relatedSchemaNotFound(
                            relationName,
                            relationMetadata.toSchema,
                        );

                    if (relationMetadata.type === 'one-to-many') {
                        return new ToManyRelationBuilder(
                            this.internalSqb,
                            relationName,
                            relatedSchemaCore,
                            this.appCore,
                            this.alias,
                            this.relatedSchemaCore.collection,
                        );
                    } else {
                        return new ToOneRelationBuilder(
                            this.internalSqb,
                            relationName,
                            relatedSchemaCore,
                            this.appCore,
                            this.alias,
                            this.relatedSchemaCore.collection,
                        );
                    }
                },
            },
        ) as RelationProxy<T, TAlias>;
    }
}

// --- ToMany Relation Builder ---
export class ToManyRelationBuilder<
    T extends AnyModel,
    TParent extends AnyModel,
    TName extends string,
    TAlias extends string = TName,
    TNested extends readonly IRelationBuilder<any, any, any, any, any>[] = [],
    TParentAlias extends string = string,
    TSelects extends readonly AnySelectable[] = [],
>
    extends BaseWhereBuilder<
        FilterProxy<T>,
        ToManyRelationBuilder<
            T,
            TParent,
            TName,
            TAlias,
            TNested,
            TParentAlias,
            TSelects
        >
    >
    implements
        IQueryBuilder,
        IRelationBuilder<TName, TAlias, TNested, TParentAlias, TSelects>
{
    public readonly [IS_QUERY_BUILDER] = true;
    public readonly parentAlias: TParentAlias;
    public readonly parentCollectionName: string;
    public readonly __nested?: TNested;
    public readonly _selects: TSelects = null!;

    public get sqb(): Readonly<KadmiumSqb<T>> {
        return this.internalSqb;
    }

    public internalSqb: KadmiumSqb<T>;
    public readonly originalName: TName;
    public readonly alias: TAlias;
    private whereProxy: FilterProxy<T>;
    protected parentSqb: KadmiumSqb<TParent>;
    protected appCore: AppCore;
    public readonly relatedSchemaCore: SchemaCore;

    constructor(
        parentSqb: KadmiumSqb<TParent>,
        name: TName,
        relatedSchemaCore: SchemaCore,
        appCore: AppCore,
        parentAlias: TParentAlias,
        parentCollectionName: string,
        alias?: TAlias,
    ) {
        const internalSqb = new KadmiumSqb<T>(relatedSchemaCore);
        const outputAlias = alias ?? (name as unknown as TAlias);
        internalSqb._tableContext.set(
            outputAlias,
            relatedSchemaCore.collection,
        );

        const whereProxy = createRelationFilterProxy(
            internalSqb,
            relatedSchemaCore,
            appCore,
            outputAlias,
        );
        super(internalSqb, whereProxy, internalSqb._wheres);

        this.internalSqb = internalSqb;
        this.originalName = name;
        this.alias = outputAlias;
        this.whereProxy = whereProxy;
        this.parentSqb = parentSqb;
        this.relatedSchemaCore = relatedSchemaCore;
        this.appCore = appCore;
        this.parentAlias = parentAlias;
        this.parentCollectionName = parentCollectionName;
    }

    as<A extends string>(
        alias: A,
    ): ToManyRelationBuilder<T, TParent, TName, A, TNested, TParentAlias> {
        const newBuilder = new ToManyRelationBuilder<
            T,
            TParent,
            TName,
            A,
            TNested,
            TParentAlias
        >(
            this.parentSqb,
            this.originalName,
            this.relatedSchemaCore,
            this.appCore,
            this.parentAlias,
            this.parentCollectionName,
            alias,
        );

        newBuilder.internalSqb = this.internalSqb.clone();
        // Re-alias the table context and update where conditions
        newBuilder.internalSqb._tableContext.delete(this.alias);
        newBuilder.internalSqb._tableContext.set(
            alias,
            this.relatedSchemaCore.collection,
        );

        // Update alias in where conditions
        updateWhereAlias(newBuilder.internalSqb._wheres, this.alias, alias);

        // Update alias in join conditions
        updateJoinAliases(newBuilder.internalSqb._joins, this.alias, alias);

        return newBuilder;
    }

    private createFieldProxy(): SelectableFieldsProxy<T> {
        return new Proxy({} as SelectableFieldsProxy<T>, {
            get: (target, prop: string | symbol) => {
                const fieldName = prop as keyof T;
                return new SelectableField(
                    {
                        tableAlias: this.alias,
                        fieldName: fieldName,
                        initialType: {} as T[typeof fieldName],
                    },
                    undefined,
                );
            },
        }) as SelectableFieldsProxy<T>;
    }

    select<const S extends readonly AnySelectable[]>(
        selector: (
            fields: SelectableFieldsProxy<T>,
            aggregates: AggregateFunctions,
        ) => S,
    ): ToManyRelationBuilder<
        T,
        TParent,
        TName,
        TAlias,
        TNested,
        TParentAlias,
        S
    > {
        this.internalSqb._selects = selector(
            this.createFieldProxy(),
            {} as any,
        );
        return this as unknown as ToManyRelationBuilder<
            T,
            TParent,
            TName,
            TAlias,
            TNested,
            TParentAlias,
            S
        >;
    }

    limit(count: number): this {
        this.internalSqb._limit = count;
        return this;
    }

    offset(count: number): this {
        this.internalSqb._skip = count;
        return this;
    }

    order(
        selector: (
            fields: SelectableFieldsProxy<T>,
        ) => SelectableField<T, keyof T>,
        direction: 'asc' | 'desc' = 'asc',
    ): this {
        const field = selector(this.createFieldProxy());
        this.internalSqb._orders.push({ by: field, direction });
        return this;
    }

    page(page: number, size: number): this {
        const pageNumber = Math.max(1, page);
        const pageSize = Math.max(1, size);
        this.limit(pageSize);
        this.offset((pageNumber - 1) * pageSize);
        return this;
    }

    private createNestedRelationProxy(): RelationProxy<T, TAlias> {
        return new Proxy(
            {},
            {
                get: (target: {}, prop: string | symbol) => {
                    if (typeof prop === 'symbol') {
                        return;
                    }
                    const relationName = prop as keyof RelationsOf<T> & string;
                    const relationMetadata = this.appCore.relationMap.get(
                        `${this.relatedSchemaCore.collection}:${relationName}`,
                    );

                    if (!relationMetadata)
                        throw Errors.repo.relationNotFound(
                            relationName,
                            this.relatedSchemaCore.collection,
                        );

                    const relatedSchemaCore = this.appCore.schemas.find(
                        (s) => s.collection === relationMetadata.toSchema,
                    );

                    if (!relatedSchemaCore)
                        throw Errors.repo.relatedSchemaNotFound(
                            relationName,
                            relationMetadata.toSchema,
                        );

                    if (relationMetadata.type === 'one-to-many') {
                        return new ToManyRelationBuilder(
                            this.internalSqb,
                            relationName,
                            relatedSchemaCore,
                            this.appCore,
                            this.alias,
                            this.relatedSchemaCore.collection,
                        );
                    } else {
                        return new ToOneRelationBuilder(
                            this.internalSqb,
                            relationName,
                            relatedSchemaCore,
                            this.appCore,
                            this.alias,
                            this.relatedSchemaCore.collection,
                        );
                    }
                },
            },
        ) as RelationProxy<T, TAlias>;
    }

    public include<
        const R extends readonly IRelationBuilder<any, any, any, any, any>[],
    >(
        selector: (relations: RelationProxy<T>) => R,
    ): ToManyRelationBuilder<
        T,
        TParent,
        TName,
        TAlias,
        [...TNested, ...R],
        TParentAlias
    > {
        const selectedRelationBuilders = selector(
            this.createNestedRelationProxy(),
        );

        const mainTablePK = this.relatedSchemaCore.normalized.primary.name;

        const includedRelations = selectedRelationBuilders.map((relBuilder) =>
            resolveInclude(
                relBuilder,
                this.relatedSchemaCore.collection,
                this.appCore,
                this.relatedSchemaCore,
            ),
        );

        this.internalSqb._includes.push(...includedRelations);
        return this as any;
    }
}
