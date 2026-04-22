import { DbDdlAdapter } from "../../sqb/adapters/adapter";
import { DiffResult } from "../types";
/**
 * Applies a DiffResult to the actual database via DbDdlAdapter.
 * Runs operations in order, wrapped in a transaction when possible.
 */
export declare class MigrationRunner {
    private ddl;
    constructor(ddl: DbDdlAdapter);
    /**
     * Applies all operations from a DiffResult.
     * Returns the list of successfully applied operations.
     */
    apply(diff: DiffResult): Promise<string[]>;
    /**
     * Generates human-readable SQL preview for a diff.
     */
    sqlPreview(diff: DiffResult): string[];
    /**
     * Rolls back applied migration operations in reverse order.
     * Each operation is inverted: create → drop, add → drop, etc.
     */
    rollback(appliedOps: string[]): Promise<string[]>;
    /**
     * Rolls back operations and generates SQL preview.
     */
    rollbackSqlPreview(appliedOps: string[]): string[];
    private executeOp;
    private opToSql;
    private opToString;
    /**
     * Parses an applied operation description and creates the inverted DiffOp.
     * Returns null if the operation cannot be inverted from description alone.
     *
     * For safe rollback, it's better to store the original DiffOp and invert directly.
     * This parser is a fallback for text-based operation logs.
     */
    private parseAndInvert;
}
//# sourceMappingURL=migration-runner.d.ts.map