import { randomUUID } from "crypto";
import { AnyModel } from "../model/model.js";
import { AppCore } from "../core/app-core.js";
import { SchemaCore } from "../core/schema-core.js";
import { DbAdapter, TransactionalDbAdapter } from "../sqb/adapters/adapter.js";
import { WhereCondition } from "../sqb/kadmium-sqb.js";
import { QueryBuilder } from "./builders/builder.single-query.js";
import { SelectableField } from "./types/selectable.js";
import { HookRepo } from "../features/types/index.js";
import { ModelHook, ModelHookContext, ModelHooks } from "../model/types.js";
import { Profiler } from "../core/profiling/profiler.js";
import {
	AnySelectable,
	FilterProxy,
	FlatFinalResult,
	ICountQuery,
	IFirstQuery,
	ISingleTableQuery,
	ITransaction,
	Public,
	AggregateFunctions,
	IncludeResult,
} from "./types/query/index.js";
import * as bcrypt from "bcrypt";
import {
	IRelationBuilder,
	RelationProxy,
} from "./field-builders/relation-builder.js";
import { RepoManager } from "./repo-manager.js";
import { HookContext } from "../features/types/index.js";
import { Errors } from "../core/errors.js";

export class KadmiumRepo<T extends AnyModel> {
	private passwordFieldNames: string[];
	private readonly SALT_ROUNDS = 10;
	constructor(
		private schemaCore: SchemaCore,
		private adapter: DbAdapter,
		private _appCore: AppCore,
		private _tx?: ITransaction,
	) {
		this.passwordFieldNames = [
			...this.schemaCore.registry.fieldsByName.values(),
		]
			.filter((f) => f.type === "password")
			.map((f) => f.name);
	}

	public get appCore(): Readonly<AppCore> {
		return this._appCore;
	}

	/**
	 * Получает репозиторий другой модели в том же контексте (транзакция или нет).
	 */
	get<U extends AnyModel>(schema: new () => U): KadmiumRepo<U> {
		const schemaName = (schema as any)._collection ?? schema.name.toLowerCase();
		const schemaCore = this._appCore.schemas.find(
			(s) => s.collection === schemaName,
		);
		if (!schemaCore) {
			throw Errors.repo.notFound(schemaName);
		}
		schemaCore.bindModelClass(schema);
		return new KadmiumRepo<U>(
			schemaCore,
			this.adapter,
			this._appCore,
			this._tx,
		);
	}

	// ── Feature hooks helpers ──

	/**
	 * Создаёт обёртку HookRepo для передачи в хуки.
	 */
	private _createHookRepo(): HookRepo {
		const self = this;
		return {
			get: <M extends AnyModel>(ModelClass: new () => M) =>
				self.get(ModelClass),
		};
	}

	/**
	 * Запускает beforeCreate хуки МОДЕЛИ (_conf_.hooks).
	 * Вызывается ПЕРЕД хуками фич.
	 */
	@Profiler.Profile(__filename)
	async _runModelBeforeCreate(
		data: Partial<T>,
	): Promise<{ data: Record<string, unknown>; operation: string }> {
		const modelHooks = this.schemaCore.modelHooks as ModelHooks<T> | null;
		if (!modelHooks?.beforeCreate?.length) {
			return { data: data as Record<string, unknown>, operation: "create" };
		}

		const ctx = new ModelHookContext<T>("create", this, this.schemaCore, data);
		for (const hook of modelHooks.beforeCreate) {
			await hook(ctx);
			if (ctx.aborted) break;
		}

		return { data: ctx.data, operation: ctx.operation };
	}

	/**
	 * Запускает afterCreate хуки МОДЕЛИ (_conf_.hooks).
	 * Вызывается ПЕРЕД хуками фич.
	 */
	@Profiler.Profile(__filename)
	async _runModelAfterCreate(result: T): Promise<T> {
		const modelHooks = this.schemaCore.modelHooks as ModelHooks<T> | null;
		if (!modelHooks?.afterCreate?.length) return result;

		const ctx = new ModelHookContext<T>("create", this, this.schemaCore, result as Partial<T>);
		for (const hook of modelHooks.afterCreate) {
			await hook(ctx);
			if (ctx.aborted) break;
		}

		// Merge ctx.data modifications into result
		return { ...result, ...ctx.data } as T;
	}

	/**
	 * Запускает beforeUpdate хуки МОДЕЛИ (_conf_.hooks).
	 */
	@Profiler.Profile(__filename)
	async _runModelBeforeUpdate(
		data: Partial<T>,
	): Promise<{ data: Record<string, unknown>; operation: string }> {
		const modelHooks = this.schemaCore.modelHooks as ModelHooks<T> | null;
		if (!modelHooks?.beforeUpdate?.length) {
			return { data: data as Record<string, unknown>, operation: "update" };
		}

		const ctx = new ModelHookContext<T>("update", this, this.schemaCore, data);
		for (const hook of modelHooks.beforeUpdate) {
			await hook(ctx);
			if (ctx.aborted) break;
		}

		return { data: ctx.data, operation: ctx.operation };
	}

	/**
	 * Запускает afterUpdate хуки МОДЕЛИ (_conf_.hooks).
	 * Hooks are applied to each result individually.
	 */
	@Profiler.Profile(__filename)
	async _runModelAfterUpdate(results: T[]): Promise<T[]> {
		const modelHooks = this.schemaCore.modelHooks as ModelHooks<T> | null;
		if (!modelHooks?.afterUpdate?.length) return results;

		for (let i = 0; i < results.length; i++) {
			const ctx = new ModelHookContext<T>("update", this, this.schemaCore, results[i] as Partial<T>);
			for (const hook of modelHooks.afterUpdate) {
				await hook(ctx);
				if (ctx.aborted) break;
			}
			if (Object.keys(ctx.data).length > 0) {
				results[i] = { ...results[i], ...ctx.data } as T;
			}
		}

		return results;
	}

	/**
	 * Запускает beforeDelete хуки МОДЕЛИ (_conf_.hooks).
	 */
	@Profiler.Profile(__filename)
	async _runModelBeforeDelete(): Promise<{ operation: string }> {
		const modelHooks = this.schemaCore.modelHooks as ModelHooks<T> | null;
		if (!modelHooks?.beforeDelete?.length) {
			return { operation: "delete" };
		}

		const ctx = new ModelHookContext<T>("delete", this, this.schemaCore);
		for (const hook of modelHooks.beforeDelete) {
			await hook(ctx);
			if (ctx.aborted) break;
		}

		return { operation: ctx.operation };
	}

	/**
	 * Запускает afterDelete хуки МОДЕЛИ (_conf_.hooks).
	 * Hooks are applied to each result individually.
	 */
	@Profiler.Profile(__filename)
	async _runModelAfterDelete(results: T[]): Promise<void> {
		const modelHooks = this.schemaCore.modelHooks as ModelHooks<T> | null;
		if (!modelHooks?.afterDelete?.length) return;

		for (let i = 0; i < results.length; i++) {
			const ctx = new ModelHookContext<T>("delete", this, this.schemaCore, results[i] as Partial<T>);
			for (const hook of modelHooks.afterDelete) {
				await hook(ctx);
				if (ctx.aborted) break;
			}
		}
	}

	/**
	 * Запускает beforeRead хуки МОДЕЛИ (_conf_.hooks).
	 */
	@Profiler.Profile(__filename)
	async _runModelBeforeRead(): Promise<WhereCondition[]> {
		const modelHooks = this.schemaCore.modelHooks as ModelHooks<T> | null;
		if (!modelHooks?.beforeRead?.length) return [];

		const ctx = new ModelHookContext<T>("read", this, this.schemaCore);
		for (const hook of modelHooks.beforeRead) {
			await hook(ctx);
		}

		return ctx.getWheres() as WhereCondition[];
	}

	/**
	 * Запускает afterRead хуки МОДЕЛИ (_conf_.hooks).
	 * Hooks are applied to each result individually.
	 */
	@Profiler.Profile(__filename)
	async _runModelAfterRead(results: T[]): Promise<T[]> {
		const modelHooks = this.schemaCore.modelHooks as ModelHooks<T> | null;
		if (!modelHooks?.afterRead?.length) return results;

		for (let i = 0; i < results.length; i++) {
			const ctx = new ModelHookContext<T>("read", this, this.schemaCore, results[i] as Partial<T>);
			for (const hook of modelHooks.afterRead) {
				await hook(ctx);
			}
			if (Object.keys(ctx.data).length > 0) {
				results[i] = { ...results[i], ...ctx.data } as T;
			}
		}

		return results;
	}

	/**
	 * Запускает beforeCreate хуки всех фич схемы.
	 * Данные модифицируются через HookContext.
	 */
	@Profiler.Profile(__filename)
	async _runFeatureBeforeCreate(
		data: Partial<T>,
	): Promise<{ data: Record<string, unknown>; operation: string }> {
		const ctx = new HookContext<T>(
			"create",
			this._createHookRepo(),
			this.schemaCore,
			data,
		);

		for (const feature of this.schemaCore.features) {
			const hooks = feature.hooks?.beforeCreate ?? [];
			for (const hook of hooks) {
				await hook(ctx as any);
				if (ctx.aborted) break;
			}
			if (ctx.aborted) break;
		}

		return { data: ctx.toData(), operation: ctx.operation };
	}

	/**
	 * Запускает afterCreate хуки всех фич схемы.
	 */
	@Profiler.Profile(__filename)
	async _runFeatureAfterCreate(result: T): Promise<void> {
		const ctx = new HookContext<T>(
			"create",
			this._createHookRepo(),
			this.schemaCore,
		);

		for (const feature of this.schemaCore.features) {
			const hooks = feature.hooks?.afterCreate ?? [];
			for (const hook of hooks) {
				await hook(result, ctx as any);
			}
		}
	}

	/**
	 * Запускает beforeUpdate хуки всех фич схемы.
	 */
	@Profiler.Profile(__filename)
	async _runFeatureBeforeUpdate(
		data: Partial<T>,
	): Promise<{ data: Record<string, unknown>; operation: string }> {
		const ctx = new HookContext<T>(
			"update",
			this._createHookRepo(),
			this.schemaCore,
			data,
		);

		for (const feature of this.schemaCore.features) {
			const hooks = feature.hooks?.beforeUpdate ?? [];
			for (const hook of hooks) {
				await hook(ctx as any);
				if (ctx.aborted) break;
			}
			if (ctx.aborted) break;
		}

		return { data: ctx.toData(), operation: ctx.operation };
	}

	/**
	 * Запускает afterUpdate хуки всех фич схемы.
	 */
	@Profiler.Profile(__filename)
	async _runFeatureAfterUpdate(results: T[]): Promise<void> {
		const ctx = new HookContext<T>(
			"update",
			this._createHookRepo(),
			this.schemaCore,
		);

		for (const feature of this.schemaCore.features) {
			const hooks = feature.hooks?.afterUpdate ?? [];
			for (const hook of hooks) {
				await hook(results, ctx as any);
			}
		}
	}

	/**
	 * Запускает beforeDelete хуки всех фич схемы.
	 * Может сменить операцию на "update" (для soft-delete).
	 */
	@Profiler.Profile(__filename)
	async _runFeatureBeforeDelete(): Promise<{
		operation: string;
		data: Record<string, unknown>;
	}> {
		const ctx = new HookContext<T>(
			"delete",
			this._createHookRepo(),
			this.schemaCore,
		);

		for (const feature of this.schemaCore.features) {
			const hooks = feature.hooks?.beforeDelete ?? [];
			for (const hook of hooks) {
				await hook(ctx as any);
				if (ctx.aborted) break;
			}
			if (ctx.aborted) break;
		}

		return { operation: ctx.operation, data: ctx.toData() };
	}

	/**
	 * Запускает afterDelete хуки всех фич схемы.
	 */
	@Profiler.Profile(__filename)
	async _runFeatureAfterDelete(results: T[]): Promise<void> {
		const ctx = new HookContext<T>(
			"delete",
			this._createHookRepo(),
			this.schemaCore,
		);

		for (const feature of this.schemaCore.features) {
			const hooks = feature.hooks?.afterDelete ?? [];
			for (const hook of hooks) {
				await hook(results, ctx as any);
			}
		}
	}

	/**
	 * Запускает beforeRead хуки и возвращает накопленные where-условия.
	 */
	public async _runFeatureBeforeRead(alias?: string): Promise<readonly WhereCondition[]> {
		const ctx = new HookContext<T>(
			"read",
			this._createHookRepo(),
			this.schemaCore,
		);
		ctx._setAlias(alias);

		for (const feature of this.schemaCore.features) {
			const hooks = feature.hooks?.beforeRead ?? [];
			for (const hook of hooks) {
				await hook(ctx as any);
			}
		}

		return ctx.getWheres();
	}

	/**
	 * Запускает afterRead хуки.
	 */
	public async _runFeatureAfterRead(results: any[]): Promise<any[]> {
		const ctx = new HookContext<T>(
			"read",
			this._createHookRepo(),
			this.schemaCore,
		);

		for (const feature of this.schemaCore.features) {
			const hooks = feature.hooks?.afterRead ?? [];
			for (const hook of hooks) {
				await hook(results, ctx as any);
			}
		}

		return results;
	}

	public async _hashPasswordsInData(data: Partial<T>): Promise<Partial<T>> {
		const processedData = { ...data };
		for (const fieldName of this.passwordFieldNames) {
			const value = (processedData as any)[fieldName];
			if (
				typeof value === "string" &&
				value.length > 0 &&
				!value.startsWith("$2")
			) {
				(processedData as any)[fieldName] = await bcrypt.hash(
					value,
					this.SALT_ROUNDS,
				);
			}
		}
		return processedData;
	}

	// --- "Parameterization-First" API ---
	public where(
		clause: (fields: FilterProxy<T>) => WhereCondition,
	): QueryBuilder<T>;
	public where(clause: [(group: QueryBuilder<T>) => void]): QueryBuilder<T>;
	public where(
		clause:
			| ((fields: FilterProxy<T>) => WhereCondition)
			| [(group: QueryBuilder<T>) => void],
	): QueryBuilder<T> {
		const queryBuilder = new QueryBuilder<T>(
			this.schemaCore,
			this.adapter,
			this._appCore,
			this,
		);

		// The `where` method on the queryBuilder is from BaseWhereBuilder,
		// which correctly handles both simple and grouped clauses.
		(queryBuilder.where as any)(clause);

		return queryBuilder;
	}

	public include<
		const R extends readonly IRelationBuilder<any, any, any, any, any>[],
	>(selector: (relations: RelationProxy<T>) => R): QueryBuilder<T, R> {
		const queryBuilder = new QueryBuilder<T, []>(
			this.schemaCore,
			this.adapter,
			this._appCore,
			this,
		);
		return queryBuilder.include(selector);
	}

	public findById(id: string | number) {
		const pkName = this.schemaCore.normalized.primary.name;

		// The cast to `any` is needed because `pkName` is a string, so TypeScript
		// cannot statically verify that it's a valid key on the FilterProxy.
		return this.where((e) => (e as any)[pkName].eq(id))
			.first()
			.go();
	}

	public first<const S extends readonly AnySelectable[]>(
		selector: (
			fields: { [K in keyof T]: SelectableField<T, K> },
			aggregates: AggregateFunctions,
		) => S,
		options: { includeSecured: true },
	): IFirstQuery<T, [], FlatFinalResult<S>>;
	public first<const S extends readonly AnySelectable[]>(
		selector: (
			fields: { [K in keyof T]: SelectableField<T, K> },
			aggregates: AggregateFunctions,
		) => S,
	): IFirstQuery<T, [], FlatFinalResult<S>>;
	public first(options: { includeSecured: true }): IFirstQuery<T, [], T>;
	public first(options?: {
		includeSecured?: false | undefined;
	}): IFirstQuery<T, [], Public<T>>;
	public first<const S extends readonly AnySelectable[]>(
		selectorOrOptions?:
			| ((
				fields: { [K in keyof T]: SelectableField<T, K> },
				aggregates: AggregateFunctions,
			) => S)
			| { includeSecured?: boolean },
		options?: { includeSecured?: boolean },
	) {
		const builder = new QueryBuilder<T>(
			this.schemaCore,
			this.adapter,
			this._appCore,
			this,
		);
		return (builder.first as any)(selectorOrOptions, options);
	}

	public countAll(): ICountQuery {
		const queryBuilder = new QueryBuilder<T>(
			this.schemaCore,
			this.adapter,
			this._appCore,
			this,
		);
		return queryBuilder.count();
	}

	public create(data: Partial<T>): { go: () => Promise<T> };
	public create(data: Partial<T>[]): { go: () => Promise<T[]> };
	public create(data: Partial<T> | Partial<T>[]) {
		const runner = {
			go: async (): Promise<T | T[]> => {
				const pkField = this.schemaCore.normalized.primary;
				const schemaFields = this.schemaCore.registry.fieldsByName;

				const processSingleItem = async (item: Partial<T>) => {
					const newItem = { ...item };
					if (pkField.db_type === "uuid" && !newItem[pkField.name as keyof T]) {
						(newItem as any)[pkField.name] = randomUUID();
					}

					const persistedData = { ...newItem };
					for (const key in persistedData) {
						const fieldDef = schemaFields.get(key);
						if (fieldDef && fieldDef.persist === false) {
							delete (persistedData as any)[key];
						}
					}

					// 1. Model beforeCreate hooks (user business logic)
					const { data: modelData, operation: modelOp } =
						await this._runModelBeforeCreate(persistedData);
					if (modelOp !== "create") {
						throw Errors.query.error(
							`Model beforeCreate hook changed operation to "${modelOp}". This is not supported for create().`,
						);
					}

					// 2. Feature beforeCreate hooks (infrastructure logic)
					const { data: featureData, operation } =
						await this._runFeatureBeforeCreate(modelData as T);
					if (operation !== "create") {
						throw Errors.query.error(
							`beforeCreate hook changed operation to "${operation}". This is not supported for create().`,
						);
					}

					return this._hashPasswordsInData(featureData as Partial<T>);
				};

				if (Array.isArray(data)) {
					if (data.length === 0) return [];

					const processedData = await Promise.all(data.map(processSingleItem));
					const results = await this.adapter.createMany<T>(
						this.schemaCore.collection,
						processedData,
					);

					// Feature afterCreate hooks for each result
					for (let i = 0; i < results.length; i++) {
						// 1. Model afterCreate hooks (user business logic)
						results[i] = await this._runModelAfterCreate(results[i] as T);
						// 2. Feature afterCreate hooks (infrastructure logic)
						await this._runFeatureAfterCreate(results[i] as T);
					}

					return results;
				} else {
					const processedData = await processSingleItem(data);
					let result = await this.adapter.create<T>(
						this.schemaCore.collection,
						processedData,
					);

					// 1. Model afterCreate hooks (user business logic)
					result = await this._runModelAfterCreate(result as T);
					// 2. Feature afterCreate hooks (infrastructure logic)
					await this._runFeatureAfterCreate(result as T);

					return result;
				}
			},
		};
		return runner;
	}

	select<
		const S extends readonly AnySelectable[],
		R extends IRelationBuilder[],
	>(
		selector: (
			fields: { [K in keyof T]: SelectableField<T, K> },
			aggregates: AggregateFunctions,
		) => S,
		options: { includeSecured: true },
	): ISingleTableQuery<T, R, FlatFinalResult<S> & IncludeResult<Public<T>, R>>;
	select<
		const S extends readonly AnySelectable[],
		R extends IRelationBuilder[],
	>(
		selector: (
			fields: { [K in keyof T]: SelectableField<T, K> },
			aggregates: AggregateFunctions,
		) => S,
	): ISingleTableQuery<T, R, FlatFinalResult<S>>;
	select<R extends IRelationBuilder[]>(options: {
		includeSecured: true;
	}): ISingleTableQuery<T, R, T>;
	select<R extends IRelationBuilder[]>(options?: {
		includeSecured?: false | undefined;
	}): ISingleTableQuery<T, R, Public<T>>;
	public select<
		const S extends readonly AnySelectable[],
		R extends IRelationBuilder[],
	>(
		selectorOrOptions?:
			| ((
				fields: { [K in keyof T]: SelectableField<T, K> },
				aggregates: AggregateFunctions,
			) => S)
			| { includeSecured?: boolean },
		options?: { includeSecured?: boolean },
	) {
		const builder = new QueryBuilder<T>(
			this.schemaCore,
			this.adapter,
			this._appCore,
			this,
		);
		return (builder.select as any)(selectorOrOptions, options);
	}

	public update(data: Partial<T>) {
		const builder = new QueryBuilder<T>(
			this.schemaCore,
			this.adapter,
			this._appCore,
			this,
		);
		return builder.update(data);
	}

	public delete() {
		const builder = new QueryBuilder<T>(
			this.schemaCore,
			this.adapter,
			this._appCore,
			this,
		);
		return builder.delete();
	}

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
	@Profiler.Profile(__filename)
	async transaction<R>(callback: (tx: ITransaction) => Promise<R>): Promise<R> {
		const txAdapter = await this.adapter.beginTransaction();
		try {
			// Initialize RepoManager BEFORE creating txContext to avoid ! assertion
			const txRepoManager = new RepoManager(this._appCore, txAdapter);

			const txContext: ITransaction = {
				get: <U extends AnyModel>(type: new () => U) =>
					txRepoManager.get(type),
			};

			// Set the transaction context on the repo manager
			(txRepoManager as any)._tx = txContext;

			const result = await callback(txContext);
			await txAdapter.commit();
			return result;
		} catch (err) {
			await txAdapter.rollback();
			throw err;
		}
	}
}
