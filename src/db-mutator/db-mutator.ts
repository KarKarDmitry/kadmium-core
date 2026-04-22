import { AppCore } from "../core/app-core";
import { DbAdapter, DbDdlAdapter, TransactionalDbAdapter } from "../sqb/adapters/adapter";
import { DbInspector } from "./inspector/db-inspector";
import { SchemaDiff } from "./diff/schema-diff";
import { MigrationRunner } from "./generator/migration-runner";
import { DbSchema, DiffResult, HealthCheckResult, CreateTableOp } from "./types";

/**
 * Facade for database schema management.
 * Provides clean API for health checks, diff inspection, and migrations.
 */
export class DbMutator {
  private inspector: DbInspector;

  constructor(
    private appCore: AppCore,
    private ddlAdapter: DbDdlAdapter,
    private dbAdapter?: DbAdapter,
  ) {
    this.inspector = new DbInspector(ddlAdapter);
  }

  /**
   * Checks if database schema matches application schemas.
   * Cached during Kadmium.start(), use getDiff() for fresh check.
   */
  async checkHealth(): Promise<HealthCheckResult> {
    const dbSchema = await this.inspector.inspect();
    const diff = new SchemaDiff(this.appCore, dbSchema);
    return diff.checkHealth();
  }

  /**
   * Gets detailed diff between schema definitions and actual DB.
   */
  async getDiff(): Promise<DiffResult> {
    const dbSchema = await this.inspector.inspect();
    const diff = new SchemaDiff(this.appCore, dbSchema);
    return diff.computeDiff();
  }

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
  async applyMigrations(txAdapter: TransactionalDbAdapter): Promise<string[]> {
    const diff = await this.getDiff();

    if (!diff.hasChanges) {
      return [];
    }

    // Check if we have tables to create (need two-phase approach)
    const hasCreateTable = diff.operations.some((op) => op.type === "create-table");

    if (!hasCreateTable) {
      // Simple case: no new tables, apply everything in the provided transaction
      const runner = new MigrationRunner(txAdapter.ddl);
      return runner.apply(diff);
      // Caller will commit
    }

    // Two-phase approach:
    // Phase 1: Create tables in current transaction
    const tableOps = diff.operations.filter((op) => op.type === "create-table");

    const tableDiff: DiffResult = {
      operations: tableOps,
      hasChanges: tableOps.length > 0,
      summary: diff.summary,
    };

    const runner1 = new MigrationRunner(txAdapter.ddl);
    const applied1 = await runner1.apply(tableDiff);

    // Commit tables transaction
    await txAdapter.commit();

    // Phase 2: Re-inspect and apply remaining (indexes, FKs) in a NEW transaction
    const secondDiff = await this.getDiff();
    // Filter out already created tables
    const createdTableNames = new Set(tableOps.map((op) => (op as CreateTableOp).table));
    const filteredOps = secondDiff.operations.filter((op) => {
      if (op.type === "create-table" && createdTableNames.has((op as CreateTableOp).table)) {
        return false;
      }
      return true;
    });

    const filteredDiff: DiffResult = {
      ...secondDiff,
      operations: filteredOps,
      hasChanges: filteredOps.length > 0,
      summary: {
        ...secondDiff.summary,
        addedTables: filteredOps.filter((o) => o.type === "create-table").length,
      },
    };

    if (!filteredDiff.hasChanges) {
      return applied1;
    }

    // Begin new transaction for phase 2
    if (!this.dbAdapter) {
      throw new Error(
        "DbMutator: dbAdapter is required for two-phase migrations. " +
        "Please pass it to the constructor.",
      );
    }

    const txAdapter2 = await this.dbAdapter.beginTransaction();
    try {
      const runner2 = new MigrationRunner(txAdapter2.ddl);
      const applied2 = await runner2.apply(filteredDiff);

      // Commit phase 2
      await txAdapter2.commit();

      return applied1.concat(applied2);
    } catch (err) {
      await txAdapter2.rollback();
      throw err;
    }
  }

  /**
   * Gets SQL preview for pending migrations.
   */
  async getMigrationPreview(): Promise<string[]> {
    const diff = await this.getDiff();
    const runner = new MigrationRunner(this.ddlAdapter);
    return runner.sqlPreview(diff);
  }

  /**
   * Checks if a specific table exists in the database.
   */
  async tableExists(tableName: string): Promise<boolean> {
    return this.inspector.tableExists(tableName);
  }

  /**
   * Gets full database schema structure.
   */
  async inspectSchema(): Promise<DbSchema> {
    return this.inspector.inspect();
  }
}
