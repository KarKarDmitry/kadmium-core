import { AppCore } from "../../core/app-core";
import { DbSchema, DiffResult, HealthCheckResult } from "../types";
/**
 * Compares SchemaCore definitions vs actual DB schema.
 * Produces a DiffResult with operations to sync them.
 */
export declare class SchemaDiff {
    private appCore;
    private dbSchema;
    constructor(appCore: AppCore, dbSchema: DbSchema);
    /**
     * Computes the diff between schema definitions and the actual DB.
     */
    computeDiff(): DiffResult;
    /**
     * Health check — returns whether DB matches schema definitions.
     */
    checkHealth(): HealthCheckResult;
    private _schemaToColumns;
    private _fieldToColumn;
    private _expectedIndexes;
    private _expectedForeignKeys;
    /**
     * Normalizes PostgreSQL type names for comparison.
     * e.g., "character varying" → "varchar", "timestamp without time zone" → "timestamp"
     */
    private _normalizePgType;
}
//# sourceMappingURL=schema-diff.d.ts.map