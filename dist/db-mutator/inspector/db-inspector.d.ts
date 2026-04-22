import { DbDdlAdapter } from "../../sqb/adapters/adapter";
import { DbSchema } from "../types";
/**
 * Inspects the actual database schema via DbDdlAdapter.
 * Adapter-agnostic — works with any DbDdlAdapter implementation.
 */
export declare class DbInspector {
    private ddl;
    constructor(ddl: DbDdlAdapter);
    /**
     * Reads the full database schema into a DbSchema object.
     */
    inspect(): Promise<DbSchema>;
    /**
     * Checks if a specific table exists in the database.
     */
    tableExists(tableName: string): Promise<boolean>;
}
//# sourceMappingURL=db-inspector.d.ts.map