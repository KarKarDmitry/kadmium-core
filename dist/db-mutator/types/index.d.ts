/**
 * Types for the DB Mutator module.
 * Describes database schema objects and diff operations.
 */
export interface DbTable {
    name: string;
}
export interface DbColumn {
    name: string;
    tableName: string;
    dataType: string;
    isNullable: boolean;
    defaultValue: string | null;
    isPrimary: boolean;
    isUnique: boolean;
    characterMaxLength: number | null;
    autoIncrement?: boolean;
}
export interface DbIndex {
    name: string;
    tableName: string;
    columns: string[];
    isUnique: boolean;
}
export interface DbForeignKey {
    name: string;
    tableName: string;
    columns: string[];
    refTable: string;
    refColumns: string[];
    onDelete: "NO ACTION" | "CASCADE" | "SET NULL" | "RESTRICT" | "SET DEFAULT";
    onUpdate: "NO ACTION" | "CASCADE" | "SET NULL" | "RESTRICT" | "SET DEFAULT";
}
/**
 * Full snapshot of the current database schema state.
 */
export interface DbSchema {
    tables: DbTable[];
    columns: Map<string, DbColumn[]>;
    indexes: Map<string, DbIndex[]>;
    foreignKeys: Map<string, DbForeignKey[]>;
}
export interface AddColumnOp {
    type: "add-column";
    table: string;
    column: DbColumn;
}
export interface DropColumnOp {
    type: "drop-column";
    table: string;
    columnName: string;
}
export interface AlterTypeOp {
    type: "alter-type";
    table: string;
    columnName: string;
    oldType: string;
    newType: string;
}
export interface AlterNullableOp {
    type: "alter-nullable";
    table: string;
    columnName: string;
    oldNullable: boolean;
    newNullable: boolean;
}
export interface AlterDefaultOp {
    type: "alter-default";
    table: string;
    columnName: string;
    oldDefault: string | null;
    newDefault: string | null;
}
export interface AddIndexOp {
    type: "add-index";
    index: DbIndex;
}
export interface DropIndexOp {
    type: "drop-index";
    indexName: string;
    tableName: string;
}
export interface AddForeignKeyOp {
    type: "add-foreign-key";
    fk: DbForeignKey;
}
export interface DropForeignKeyOp {
    type: "drop-foreign-key";
    fkName: string;
    tableName: string;
}
export interface CreateTableOp {
    type: "create-table";
    table: string;
    columns: DbColumn[];
}
export interface DropTableOp {
    type: "drop-table";
    table: string;
}
export type DiffOp = AddColumnOp | DropColumnOp | AlterTypeOp | AlterNullableOp | AlterDefaultOp | AddIndexOp | DropIndexOp | AddForeignKeyOp | DropForeignKeyOp | CreateTableOp | DropTableOp;
/**
 * Result of comparing SchemaCore definitions vs actual DB schema.
 */
export interface DiffResult {
    operations: DiffOp[];
    hasChanges: boolean;
    summary: {
        addedTables: number;
        droppedTables: number;
        addedColumns: number;
        droppedColumns: number;
        alteredColumns: number;
        addedIndexes: number;
        droppedIndexes: number;
        addedForeignKeys: number;
        droppedForeignKeys: number;
    };
}
/**
 * Health check result — whether DB matches schema definitions.
 */
export interface HealthCheckResult {
    isHealthy: boolean;
    issues: string[];
    summary: {
        totalTables: number;
        expectedTables: number;
        matchingTables: number;
    };
}
//# sourceMappingURL=index.d.ts.map