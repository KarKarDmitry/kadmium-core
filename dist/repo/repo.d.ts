import { AnyModel } from "../model/model";
import { AppCore } from "../core/app-core";
import { SchemaCore } from "../core/schema-core";
import { DbAdapter } from "../sqb/adapters/adapter";
import { WhereCondition } from "../sqb/kadmium-sqb";
import { QueryBuilder } from "./builders/builder.single-query";
import { SelectableField } from "./types/selectable";
import { AnySelectable, FilterProxy, FlatFinalResult, ICountQuery, IFirstQuery, ISingleTableQuery, ITransaction, Public, AggregateFunctions, IncludeResult } from "./types/query";
import { IRelationBuilder, RelationProxy } from "./field-builders/relation-builder";
export declare class KadmiumRepo<T extends AnyModel> {
    private schemaCore;
    private adapter;
    private _appCore;
    private _tx?;
    private passwordFieldNames;
    private readonly SALT_ROUNDS;
    constructor(schemaCore: SchemaCore, adapter: DbAdapter, _appCore: AppCore, _tx?: ITransaction | undefined);
    get appCore(): Readonly<AppCore>;
    /**
     * Получает репозиторий другой модели в том же контексте (транзакция или нет).
     */
    get<U extends AnyModel>(schema: new () => U): KadmiumRepo<U>;
    /**
     * Создаёт обёртку HookRepo для передачи в хуки.
     */
    private _createHookRepo;
    /**
     * Запускает beforeCreate хуки МОДЕЛИ (_conf_.hooks).
     * Вызывается ПЕРЕД хуками фич.
     */
    _runModelBeforeCreate(data: Partial<T>): Promise<{
        data: Record<string, unknown>;
        operation: string;
    }>;
    /**
     * Запускает afterCreate хуки МОДЕЛИ (_conf_.hooks).
     * Вызывается ПЕРЕД хуками фич.
     */
    _runModelAfterCreate(result: T): Promise<T>;
    /**
     * Запускает beforeUpdate хуки МОДЕЛИ (_conf_.hooks).
     */
    _runModelBeforeUpdate(data: Partial<T>): Promise<{
        data: Record<string, unknown>;
        operation: string;
    }>;
    /**
     * Запускает afterUpdate хуки МОДЕЛИ (_conf_.hooks).
     * Hooks are applied to each result individually.
     */
    _runModelAfterUpdate(results: T[]): Promise<T[]>;
    /**
     * Запускает beforeDelete хуки МОДЕЛИ (_conf_.hooks).
     */
    _runModelBeforeDelete(): Promise<{
        operation: string;
    }>;
    /**
     * Запускает afterDelete хуки МОДЕЛИ (_conf_.hooks).
     * Hooks are applied to each result individually.
     */
    _runModelAfterDelete(results: T[]): Promise<void>;
    /**
     * Запускает beforeRead хуки МОДЕЛИ (_conf_.hooks).
     */
    _runModelBeforeRead(): Promise<WhereCondition[]>;
    /**
     * Запускает afterRead хуки МОДЕЛИ (_conf_.hooks).
     * Hooks are applied to each result individually.
     */
    _runModelAfterRead(results: T[]): Promise<T[]>;
    /**
     * Запускает beforeCreate хуки всех фич схемы.
     * Данные модифицируются через HookContext.
     */
    _runFeatureBeforeCreate(data: Partial<T>): Promise<{
        data: Record<string, unknown>;
        operation: string;
    }>;
    /**
     * Запускает afterCreate хуки всех фич схемы.
     */
    _runFeatureAfterCreate(result: T): Promise<void>;
    /**
     * Запускает beforeUpdate хуки всех фич схемы.
     */
    _runFeatureBeforeUpdate(data: Partial<T>): Promise<{
        data: Record<string, unknown>;
        operation: string;
    }>;
    /**
     * Запускает afterUpdate хуки всех фич схемы.
     */
    _runFeatureAfterUpdate(results: T[]): Promise<void>;
    /**
     * Запускает beforeDelete хуки всех фич схемы.
     * Может сменить операцию на "update" (для soft-delete).
     */
    _runFeatureBeforeDelete(): Promise<{
        operation: string;
        data: Record<string, unknown>;
    }>;
    /**
     * Запускает afterDelete хуки всех фич схемы.
     */
    _runFeatureAfterDelete(results: T[]): Promise<void>;
    /**
     * Запускает beforeRead хуки и возвращает накопленные where-условия.
     */
    _runFeatureBeforeRead(alias?: string): Promise<import("../sqb/kadmium-sqb").WhereCondition[]>;
    /**
     * Запускает afterRead хуки.
     */
    _runFeatureAfterRead(results: any[]): Promise<any[]>;
    _hashPasswordsInData(data: Partial<T>): Promise<Partial<T>>;
    where(clause: (fields: FilterProxy<T>) => WhereCondition): QueryBuilder<T>;
    where(clause: [(group: QueryBuilder<T>) => void]): QueryBuilder<T>;
    include<const R extends readonly IRelationBuilder<any, any, any, any, any>[]>(selector: (relations: RelationProxy<T>) => R): QueryBuilder<T, R>;
    findById(id: string | number): Promise<Public<Public<T>> | undefined>;
    first<const S extends readonly AnySelectable[]>(selector: (fields: {
        [K in keyof T]: SelectableField<T, K>;
    }, aggregates: AggregateFunctions) => S, options: {
        includeSecured: true;
    }): IFirstQuery<T, [], FlatFinalResult<S>>;
    first<const S extends readonly AnySelectable[]>(selector: (fields: {
        [K in keyof T]: SelectableField<T, K>;
    }, aggregates: AggregateFunctions) => S): IFirstQuery<T, [], FlatFinalResult<S>>;
    first(options: {
        includeSecured: true;
    }): IFirstQuery<T, [], T>;
    first(options?: {
        includeSecured?: false | undefined;
    }): IFirstQuery<T, [], Public<T>>;
    countAll(): ICountQuery;
    create(data: Partial<T>): {
        go: () => Promise<T>;
    };
    create(data: Partial<T>[]): {
        go: () => Promise<T[]>;
    };
    select<const S extends readonly AnySelectable[], R extends IRelationBuilder[]>(selector: (fields: {
        [K in keyof T]: SelectableField<T, K>;
    }, aggregates: AggregateFunctions) => S, options: {
        includeSecured: true;
    }): ISingleTableQuery<T, R, FlatFinalResult<S> & IncludeResult<Public<T>, R>>;
    select<const S extends readonly AnySelectable[], R extends IRelationBuilder[]>(selector: (fields: {
        [K in keyof T]: SelectableField<T, K>;
    }, aggregates: AggregateFunctions) => S): ISingleTableQuery<T, R, FlatFinalResult<S>>;
    select<R extends IRelationBuilder[]>(options: {
        includeSecured: true;
    }): ISingleTableQuery<T, R, T>;
    select<R extends IRelationBuilder[]>(options?: {
        includeSecured?: false | undefined;
    }): ISingleTableQuery<T, R, Public<T>>;
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
    /**
     * Executes a callback inside a database transaction.
     * Automatically commits on success, rolls back on error.
     *
     * The callback receives an ITransaction context with a `get()` method
     * to access repositories bound to the same transaction.
     *
     * @param callback - Function to execute within the transaction.
     * @returns The result of the callback.
     */
    transaction<R>(callback: (tx: ITransaction) => Promise<R>): Promise<R>;
}
//# sourceMappingURL=repo.d.ts.map