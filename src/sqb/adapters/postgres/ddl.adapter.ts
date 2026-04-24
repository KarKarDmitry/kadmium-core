import { Pool, PoolClient } from "pg";
import {
	DbColumn,
	DbForeignKey,
	DbIndex,
	DbTable,
} from "../../../db-mutator/index.js";
import { DbDdlAdapter } from "../adapter.js";

/**
 * Maps Kadmium field types to PostgreSQL column types.
 */
function kadmiumTypeToPgType(
	type: string,
	isPrimary: boolean,
	dbType?: string,
	charMaxLen?: number | null,
): string {
	switch (type) {
		case "primary":
			return dbType === "uuid"
				? "uuid"
				: dbType === "string"
					? "varchar"
					: "integer";
		case "string":
		case "email":
		case "password":
			return `varchar(${charMaxLen ?? 255})`;
		case "number":
			return "integer";
		case "boolean":
			return "boolean";
		case "date":
			return "date";
		case "time":
			return "time";
		case "datetime":
			return "timestamp";
		case "ref":
			// Will be resolved by caller based on referenced PK type
			return "integer";
		default:
			return "text";
	}
}

/**
 * PostgreSQL-specific DDL adapter.
 * Works with both Pool and PoolClient for transactional support.
 */
export class PostgresDdlAdapter implements DbDdlAdapter {
	constructor(private client: Pool | PoolClient) {}

	// ── Inspect ──

	async inspectTables(): Promise<DbTable[]> {
		const result = await this.client.query<{ table_name: string }>(`
			SELECT table_name
			FROM information_schema.tables
			WHERE table_schema = 'public'
			ORDER BY table_name;
		`);
		return result.rows.map((r) => ({ name: r.table_name }));
	}

	async inspectColumns(tableName: string): Promise<DbColumn[]> {
		const result = await this.client.query<{
			column_name: string;
			data_type: string;
			is_nullable: string;
			column_default: string | null;
			is_primary: boolean;
			is_unique: boolean;
			character_maximum_length: number | null;
		}>(
			`
			SELECT
				c.column_name,
				c.data_type,
				c.is_nullable,
				c.column_default,
				c.character_maximum_length,
				COALESCE(pk.is_primary, false) AS is_primary,
				COALESCE(uc.is_unique, false) AS is_unique
			FROM information_schema.columns c
			LEFT JOIN (
				SELECT ku.column_name, true AS is_primary
				FROM information_schema.table_constraints tc
				JOIN information_schema.key_column_usage ku
					ON tc.constraint_name = ku.constraint_name
				WHERE tc.constraint_type = 'PRIMARY KEY'
					AND tc.table_name = $1
			) pk ON c.column_name = pk.column_name
			LEFT JOIN (
				SELECT ku.column_name, true AS is_unique
				FROM information_schema.table_constraints tc
				JOIN information_schema.key_column_usage ku
					ON tc.constraint_name = ku.constraint_name
				WHERE tc.constraint_type = 'UNIQUE'
					AND tc.table_name = $1
			) uc ON c.column_name = uc.column_name
			WHERE c.table_schema = 'public'
				AND c.table_name = $1
			ORDER BY c.ordinal_position;
		`,
			[tableName],
		);

		return result.rows.map((r) => ({
			name: r.column_name,
			tableName,
			dataType: r.data_type,
			isNullable: r.is_nullable === "YES",
			defaultValue: r.column_default,
			isPrimary: r.is_primary,
			isUnique: r.is_unique,
			characterMaxLength: r.character_maximum_length,
		}));
	}

	async inspectIndexes(tableName: string): Promise<DbIndex[]> {
		const result = await this.client.query<{
			index_name: string;
			column_name: string;
			is_unique: boolean;
		}>(
			`
			SELECT
				ic.relname AS index_name,
				a.attname AS column_name,
				i.indisunique AS is_unique
			FROM pg_index i
			JOIN pg_class ic ON i.indexrelid = ic.oid
			JOIN pg_class tc ON i.indrelid = tc.oid
			JOIN pg_namespace n ON tc.relnamespace = n.oid
			JOIN pg_attribute a ON a.attrelid = tc.oid AND a.attnum = ANY(i.indkey)
			WHERE n.nspname = 'public'
				AND tc.relname = $1
				AND NOT i.indisprimary
			ORDER BY ic.relname, a.attnum;
		`,
			[tableName],
		);

		// Group by index name
		const indexMap = new Map<
			string,
			{ columns: string[]; isUnique: boolean }
		>();
		for (const r of result.rows) {
			if (!indexMap.has(r.index_name)) {
				indexMap.set(r.index_name, { columns: [], isUnique: r.is_unique });
			}
			indexMap.get(r.index_name)!.columns.push(r.column_name);
		}

		return Array.from(indexMap.entries()).map(([name, data]) => ({
			name,
			tableName,
			columns: data.columns,
			isUnique: data.isUnique,
		}));
	}

	async inspectForeignKeys(tableName: string): Promise<DbForeignKey[]> {
		const result = await this.client.query<{
			fk_name: string;
			column_name: string;
			ref_table: string;
			ref_column: string;
			on_delete: string;
			on_update: string;
		}>(
			`
			SELECT
				tc.constraint_name AS fk_name,
				kcu.column_name,
				ccu.table_name AS ref_table,
				ccu.column_name AS ref_column,
				rc.delete_rule AS on_delete,
				rc.update_rule AS on_update
			FROM information_schema.table_constraints tc
			JOIN information_schema.key_column_usage kcu
				ON tc.constraint_name = kcu.constraint_name
			JOIN information_schema.constraint_column_usage ccu
				ON tc.constraint_name = ccu.constraint_name
			JOIN information_schema.referential_constraints rc
				ON tc.constraint_name = rc.constraint_name
			WHERE tc.constraint_type = 'FOREIGN KEY'
				AND tc.table_name = $1
			ORDER BY tc.constraint_name, kcu.ordinal_position;
		`,
			[tableName],
		);

		// Group by FK name
		const fkMap = new Map<
			string,
			{
				columns: string[];
				refTable: string;
				refColumns: string[];
				onDelete: DbForeignKey["onDelete"];
				onUpdate: DbForeignKey["onUpdate"];
			}
		>();
		for (const r of result.rows) {
			if (!fkMap.has(r.fk_name)) {
				fkMap.set(r.fk_name, {
					columns: [],
					refTable: r.ref_table,
					refColumns: [],
					onDelete: r.on_delete as DbForeignKey["onDelete"],
					onUpdate: r.on_update as DbForeignKey["onUpdate"],
				});
			}
			fkMap.get(r.fk_name)!.columns.push(r.column_name);
			fkMap.get(r.fk_name)!.refColumns.push(r.ref_column);
		}

		return Array.from(fkMap.entries()).map(([name, data]) => ({
			name,
			tableName,
			columns: data.columns,
			refTable: data.refTable,
			refColumns: data.refColumns,
			onDelete: data.onDelete,
			onUpdate: data.onUpdate,
		}));
	}

	// ── Modify ──

	async createTable(tableName: string, columns: DbColumn[]): Promise<void> {
		if (columns.length === 0) return;

		const colDefs = columns
			.map((col) => {
				let type = col.dataType;
				// Auto-increment integer columns use SERIAL type
				if (col.autoIncrement && type === "integer") {
					type = "serial";
				}
				const nullable = col.isNullable ? "NULL" : "NOT NULL";
				const pk = col.isPrimary ? "PRIMARY KEY" : "";
				const uniq = col.isUnique && !col.isPrimary ? "UNIQUE" : "";
				// Don't add DEFAULT for serial columns — SERIAL handles it
				const def = col.autoIncrement
					? ""
					: col.defaultValue !== null
						? `DEFAULT ${col.defaultValue}`
						: "";
				return `"${col.name}" ${type} ${nullable} ${pk} ${uniq} ${def}`.trim();
			})
			.join(",\n  ");

		await this.client.query(`CREATE TABLE "${tableName}" (\n  ${colDefs}\n);`);
	}

	async addColumn(table: string, col: DbColumn): Promise<void> {
		const type = col.dataType;
		const nullable = col.isNullable ? "NULL" : "NOT NULL";
		const def = col.defaultValue !== null ? `DEFAULT ${col.defaultValue}` : "";
		await this.client.query(
			`ALTER TABLE "${table}" ADD COLUMN "${col.name}" ${type} ${nullable} ${def}`.trim(),
		);
	}

	async dropColumn(table: string, colName: string): Promise<void> {
		await this.client.query(
			`ALTER TABLE "${table}" DROP COLUMN "${colName}" CASCADE`,
		);
	}

	async alterType(
		table: string,
		colName: string,
		newType: string,
	): Promise<void> {
		await this.client.query(
			`ALTER TABLE "${table}" ALTER COLUMN "${colName}" TYPE ${newType} USING "${colName}"::${newType}`,
		);
	}

	async alterNullable(
		table: string,
		colName: string,
		nullable: boolean,
	): Promise<void> {
		const action = nullable ? "DROP NOT NULL" : "SET NOT NULL";
		await this.client.query(
			`ALTER TABLE "${table}" ALTER COLUMN "${colName}" ${action}`,
		);
	}

	async alterDefault(
		table: string,
		colName: string,
		defaultValue: string | null,
	): Promise<void> {
		if (defaultValue === null) {
			await this.client.query(
				`ALTER TABLE "${table}" ALTER COLUMN "${colName}" DROP DEFAULT`,
			);
		} else {
			await this.client.query(
				`ALTER TABLE "${table}" ALTER COLUMN "${colName}" SET DEFAULT ${defaultValue}`,
			);
		}
	}

	async addIndex(idx: DbIndex): Promise<void> {
		const cols = idx.columns.map((c) => `"${c}"`).join(", ");
		const unique = idx.isUnique ? "UNIQUE" : "";
		await this.client.query(
			`CREATE ${unique} INDEX "${idx.name}" ON "${idx.tableName}" (${cols})`,
		);
	}

	async dropIndex(indexName: string, tableName: string): Promise<void> {
		await this.client.query(`DROP INDEX IF EXISTS "${indexName}"`);
	}

	async addForeignKey(fk: DbForeignKey): Promise<void> {
		const cols = fk.columns.map((c) => `"${c}"`).join(", ");
		const refCols = fk.refColumns.map((c) => `"${c}"`).join(", ");
		await this.client.query(`
			ALTER TABLE "${fk.tableName}"
			ADD CONSTRAINT "${fk.name}"
			FOREIGN KEY (${cols})
			REFERENCES "${fk.refTable}" (${refCols})
			ON DELETE ${fk.onDelete}
			ON UPDATE ${fk.onUpdate}
		`);
	}

	async dropForeignKey(fkName: string, tableName: string): Promise<void> {
		await this.client.query(
			`ALTER TABLE "${tableName}" DROP CONSTRAINT IF EXISTS "${fkName}"`,
		);
	}
}
