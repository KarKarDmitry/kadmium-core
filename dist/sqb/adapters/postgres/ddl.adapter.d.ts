import { Pool, PoolClient } from "pg";
import { DbColumn, DbForeignKey, DbIndex, DbTable } from "../../../db-mutator/types";
import { DbDdlAdapter } from "../adapter";
/**
 * PostgreSQL-specific DDL adapter.
 * Works with both Pool and PoolClient for transactional support.
 */
export declare class PostgresDdlAdapter implements DbDdlAdapter {
    private client;
    constructor(client: Pool | PoolClient);
    inspectTables(): Promise<DbTable[]>;
    inspectColumns(tableName: string): Promise<DbColumn[]>;
    inspectIndexes(tableName: string): Promise<DbIndex[]>;
    inspectForeignKeys(tableName: string): Promise<DbForeignKey[]>;
    createTable(tableName: string, columns: DbColumn[]): Promise<void>;
    addColumn(table: string, col: DbColumn): Promise<void>;
    dropColumn(table: string, colName: string): Promise<void>;
    alterType(table: string, colName: string, newType: string): Promise<void>;
    alterNullable(table: string, colName: string, nullable: boolean): Promise<void>;
    alterDefault(table: string, colName: string, defaultValue: string | null): Promise<void>;
    addIndex(idx: DbIndex): Promise<void>;
    dropIndex(indexName: string, tableName: string): Promise<void>;
    addForeignKey(fk: DbForeignKey): Promise<void>;
    dropForeignKey(fkName: string, tableName: string): Promise<void>;
}
//# sourceMappingURL=ddl.adapter.d.ts.map