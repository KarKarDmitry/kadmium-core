import { AppCore } from "../core/app-core";
import { SchemaCore } from "../core/schema-core";
import { DbAdapter } from "../sqb/adapters/adapter";
import { Profiler } from "../core/profiling/profiler";
import { KadmiumRepo } from "./repo";
import { AnyModel } from "../model/model";
import { AliasesMap, FilterProxy, ITransaction, Public } from "./types/query";
import { MultiQueryBuilder } from "./builders/builder.multi-query";
import { WhereCondition } from "../sqb/kadmium-sqb";
import { Errors } from "../core/errors";

export class RepoManager {
  private repoCache: Map<string, KadmiumRepo<any>> = new Map();

  constructor(
    private appCore: AppCore,
    private dbAdapter: DbAdapter,
    private _tx?: ITransaction,
  ) { }

  /**
   * Gets a repository instance for a given schema.
   * Caches instances to avoid re-creating them.
   * Binds the model class to SchemaCore to load _conf_.hooks.
   * @param schema The schema class (e.g., User).
   */
  @Profiler.Profile(__filename)
  public get<T extends AnyModel>(
    schema: new () => T,
  ): KadmiumRepo<T> {
    const schemaName = (schema as any)._collection ?? schema.name.toLowerCase();
    if (this.repoCache.has(schemaName)) {
      return this.repoCache.get(schemaName) as unknown as KadmiumRepo<T>;
    }

    const schemaCore = this.appCore.schemas.find(
      (s) => s.collection === schemaName,
    );

    if (!schemaCore) {
      throw Errors.repo.notFound(schemaName);
    }

    // Bind model class to SchemaCore to load _conf_.hooks
    schemaCore.bindModelClass(schema);

    const repo = new KadmiumRepo<T>(
      schemaCore,
      this.dbAdapter,
      this.appCore,
      this._tx,
    );
    this.repoCache.set(schemaName, repo as any);
    return repo;
  }

  public findById<T extends AnyModel>(
    schema: new () => T,
    id: string | number,
  ) {
    return this.get(schema).findById(id);
  }

  public count<T extends AnyModel>(
    schema: new () => T,
    clause?: (fields: FilterProxy<T>) => WhereCondition,
  ): Promise<number> {
    const repo = this.get(schema);
    if (clause) {
      return repo.where(clause).count().go();
    }
    return repo.countAll().go();
  }

  /**
   * Creates a multi-table query builder.
   * @param aliases A map of aliases to schema classes.
   */
  public query<T extends AliasesMap>(aliases: T): MultiQueryBuilder<T> {
    if (Object.keys(aliases).length === 0) {
      throw Errors.query.error("query() must be called with a non-empty object of aliases.");
    }

    const schemaCores = new Map<string, SchemaCore>();
    for (const alias in aliases) {
      const modelClass = aliases[alias] as new () => AnyModel;
      const schemaName = modelClass.name;

      const schemaCore = this.appCore.schemas.find(
        (s) => s.collection === schemaName.toLowerCase(),
      );

      if (!schemaCore) {
        throw Errors.repo.notFound(schemaName);
      }
      schemaCores.set(alias, schemaCore);
    }

    return new MultiQueryBuilder<T>(schemaCores, this.dbAdapter, this.appCore);
  }

  /**
   * Executes a raw SQL query.
   * @param sql The SQL query string with placeholders ($1, $2, etc.).
   * @param params An array of parameters to substitute into the query.
   */
  public raw(sql: string, params: unknown[] = []) {
    return {
      go: async <T = unknown>(): Promise<T[]> => {
        return this.dbAdapter.raw(sql, params);
      },
    };
  }
}
