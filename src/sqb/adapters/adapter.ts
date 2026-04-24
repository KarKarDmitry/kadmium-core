import { AnyModel } from "../../model/model.js";
import { KadmiumSqb } from "../kadmium-sqb.js";
import {
  DbColumn,
  DbForeignKey,
  DbIndex,
  DbSchema,
  DbTable,
} from "../../db-mutator/types/index.js";

/**
 * DDL (Data Definition Language) adapter interface.
 * Used by DB Mutator to inspect and modify database schema.
 * Each adapter implements its own SQL dialect for DDL operations.
 */
export interface DbDdlAdapter {
  // ── Inspect DB structure ──
  inspectTables(): Promise<DbTable[]>;
  inspectColumns(tableName: string): Promise<DbColumn[]>;
  inspectIndexes(tableName: string): Promise<DbIndex[]>;
  inspectForeignKeys(tableName: string): Promise<DbForeignKey[]>;

  // ── Modify DB structure ──
  createTable(tableName: string, columns: DbColumn[]): Promise<void>;
  addColumn(table: string, col: DbColumn): Promise<void>;
  dropColumn(table: string, colName: string): Promise<void>;
  alterType(table: string, colName: string, newType: string): Promise<void>;
  alterNullable(
    table: string,
    colName: string,
    nullable: boolean,
  ): Promise<void>;
  alterDefault(
    table: string,
    colName: string,
    defaultValue: string | null,
  ): Promise<void>;
  addIndex(idx: DbIndex): Promise<void>;
  dropIndex(indexName: string, tableName: string): Promise<void>;
  addForeignKey(fk: DbForeignKey): Promise<void>;
  dropForeignKey(fkName: string, tableName: string): Promise<void>;
}

/**
 * An adapter that is bound to a specific database transaction.
 * It has methods to commit or roll back the transaction.
 */
export interface TransactionalDbAdapter extends DbAdapter {
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

/**
 * The interface that all database adapters must implement.
 */
export interface DbAdapter {
  /**
   * DDL operations for schema inspection and modification.
   */
  ddl: DbDdlAdapter;

  /**
   * Starts a new database transaction.
   * @returns A new adapter instance that is bound to the transaction.
   */
  beginTransaction(): Promise<TransactionalDbAdapter>;

  /**
   * Takes a KadmiumSqb instance (containing the query state) and executes it,
   * returning the raw data from the database.
   * @param sqb The KadmiumSqb instance holding the query state.
   */
  execute<T extends AnyModel>(sqb: KadmiumSqb<T>): Promise<any[]>;

  /**
   * Takes a KadmiumSqb instance and returns the generated SQL string and parameters
   * without executing the query. Useful for debugging.
   * @param sqb The KadmiumSqb instance holding the query state.
   */
  toSql<T extends AnyModel>(
    sqb: KadmiumSqb<T>,
  ): { text: string; values: any[] };

  /**
   * Inserts a new record into the database.
   * @param collectionName The name of the table to insert into.
   * @param data The data for the new record.
   */
  create<T extends AnyModel>(
    collectionName: string,
    data: Partial<T>,
  ): Promise<T>;

  /**
   * Inserts multiple records into the database in a single query.
   * @param collectionName The name of the table to insert into.
   * @param data An array of data for the new records.
   */
  createMany<T extends AnyModel>(
    collectionName: string,
    data: Partial<T>[],
  ): Promise<T[]>;

  /**
   * Executes a raw SQL query.
   * @param sql The SQL query string.
   * @param params An array of parameters for the query.
   */
  raw(sql: string, params: any[]): Promise<any[]>;
}
