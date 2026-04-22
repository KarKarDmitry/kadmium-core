import { AppCore } from "../core/app-core";
import { DbAdapter } from "../sqb/adapters/adapter";
import { KadmiumRepo } from "./repo";
import { AnyModel } from "../model/model";
import { AliasesMap, FilterProxy, ITransaction, Public } from "./types/query";
import { MultiQueryBuilder } from "./builders/builder.multi-query";
import { WhereCondition } from "../sqb/kadmium-sqb";
export declare class RepoManager {
    private appCore;
    private dbAdapter;
    private _tx?;
    private repoCache;
    constructor(appCore: AppCore, dbAdapter: DbAdapter, _tx?: ITransaction | undefined);
    /**
     * Gets a repository instance for a given schema.
     * Caches instances to avoid re-creating them.
     * Binds the model class to SchemaCore to load _conf_.hooks.
     * @param schema The schema class (e.g., User).
     */
    get<T extends AnyModel>(schema: new () => T): KadmiumRepo<T>;
    findById<T extends AnyModel>(schema: new () => T, id: string | number): Promise<Public<Public<T>> | undefined>;
    count<T extends AnyModel>(schema: new () => T, clause?: (fields: FilterProxy<T>) => WhereCondition): Promise<number>;
    /**
     * Creates a multi-table query builder.
     * @param aliases A map of aliases to schema classes.
     */
    query<T extends AliasesMap>(aliases: T): MultiQueryBuilder<T>;
    /**
     * Executes a raw SQL query.
     * @param sql The SQL query string with placeholders ($1, $2, etc.).
     * @param params An array of parameters to substitute into the query.
     */
    raw(sql: string, params?: unknown[]): {
        go: <T = unknown>() => Promise<T[]>;
    };
}
//# sourceMappingURL=repo-manager.d.ts.map