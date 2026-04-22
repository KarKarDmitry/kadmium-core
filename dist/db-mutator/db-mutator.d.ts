import { AppCore } from "../core/app-core";
import { DbAdapter, DbDdlAdapter, TransactionalDbAdapter } from "../sqb/adapters/adapter";
import { DbSchema, DiffResult, HealthCheckResult } from "./types";
/**
 * Facade for database schema management.
 * Provides clean API for health checks, diff inspection, and migrations.
 */
export declare class DbMutator {
    private appCore;
    private ddlAdapter;
    private dbAdapter?;
    private inspector;
    constructor(appCore: AppCore, ddlAdapter: DbDdlAdapter, dbAdapter?: DbAdapter | undefined);
    /**
     * Checks if database schema matches application schemas.
     * Cached during Kadmium.start(), use getDiff() for fresh check.
     */
    checkHealth(): Promise<HealthCheckResult>;
    /**
     * Gets detailed diff between schema definitions and actual DB.
     */
    getDiff(): Promise<DiffResult>;
    /**
     * Applies pending migrations.
     * Uses a two-phase approach with automatic transaction management:
     * 1. Create tables in first transaction, then commit.
     * 2. Re-inspect DB, begin new transaction, apply indexes and FKs, then commit.
     *
     * This is necessary because PostgreSQL information_schema doesn't show
     * uncommitted tables within the same transaction.
     *
     * NOTE: This method manages its own transactions. The caller should NOT
     * commit or rollback — the method handles everything.
     *
     * Returns list of applied operations.
     */
    applyMigrations(txAdapter: TransactionalDbAdapter): Promise<string[]>;
    /**
     * Gets SQL preview for pending migrations.
     */
    getMigrationPreview(): Promise<string[]>;
    /**
     * Checks if a specific table exists in the database.
     */
    tableExists(tableName: string): Promise<boolean>;
    /**
     * Gets full database schema structure.
     */
    inspectSchema(): Promise<DbSchema>;
}
//# sourceMappingURL=db-mutator.d.ts.map