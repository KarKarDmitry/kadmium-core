import { DbDdlAdapter } from "../../sqb/adapters/adapter.js";
import { DbSchema } from "../types/index.js";

/**
 * Inspects the actual database schema via DbDdlAdapter.
 * Adapter-agnostic — works with any DbDdlAdapter implementation.
 */
export class DbInspector {
	constructor(private ddl: DbDdlAdapter) {}

	/**
	 * Reads the full database schema into a DbSchema object.
	 */
	async inspect(): Promise<DbSchema> {
		const tables = await this.ddl.inspectTables();
		const columns = new Map<string, any[]>();
		const indexes = new Map<string, any[]>();
		const foreignKeys = new Map<string, any[]>();

		for (const table of tables) {
			columns.set(table.name, await this.ddl.inspectColumns(table.name));
			indexes.set(table.name, await this.ddl.inspectIndexes(table.name));
			foreignKeys.set(
				table.name,
				await this.ddl.inspectForeignKeys(table.name),
			);
		}

		return { tables, columns, indexes, foreignKeys };
	}

	/**
	 * Checks if a specific table exists in the database.
	 */
	async tableExists(tableName: string): Promise<boolean> {
		const tables = await this.ddl.inspectTables();
		return tables.some((t) => t.name === tableName);
	}
}
