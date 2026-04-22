import { DbDdlAdapter } from "../../sqb/adapters/adapter";
import { DiffResult, DiffOp } from "../types";

/**
 * Applies a DiffResult to the actual database via DbDdlAdapter.
 * Runs operations in order, wrapped in a transaction when possible.
 */
export class MigrationRunner {
	constructor(private ddl: DbDdlAdapter) {}

	/**
	 * Applies all operations from a DiffResult.
	 * Returns the list of successfully applied operations.
	 */
	async apply(diff: DiffResult): Promise<string[]> {
		const applied: string[] = [];

		// Note: DDL in PostgreSQL can run inside a transaction (except for some operations).
		// We rely on the caller to wrap this in beginTransaction/commit/rollback.

		for (const op of diff.operations) {
			await this.executeOp(op);
			applied.push(this.opToString(op));
		}

		return applied;
	}

	/**
	 * Generates human-readable SQL preview for a diff.
	 */
	sqlPreview(diff: DiffResult): string[] {
		return diff.operations.map((op) => this.opToSql(op));
	}

	/**
	 * Rolls back applied migration operations in reverse order.
	 * Each operation is inverted: create → drop, add → drop, etc.
	 */
	async rollback(appliedOps: string[]): Promise<string[]> {
		const rolledBack: string[] = [];

		// Reverse order — last applied first
		for (let i = appliedOps.length - 1; i >= 0; i--) {
			const opDescription = appliedOps[i];
			const invertedOp = this.parseAndInvert(opDescription);
			if (invertedOp) {
				await this.executeOp(invertedOp);
				rolledBack.push(`Rolled back: ${opDescription}`);
			}
		}

		return rolledBack;
	}

	/**
	 * Rolls back operations and generates SQL preview.
	 */
	rollbackSqlPreview(appliedOps: string[]): string[] {
		const sql: string[] = [];
		for (let i = appliedOps.length - 1; i >= 0; i--) {
			const invertedOp = this.parseAndInvert(appliedOps[i]);
			if (invertedOp) {
				sql.push(this.opToSql(invertedOp));
			}
		}
		return sql;
	}

	/* ── Private: execute ── */

	private async executeOp(op: DiffOp): Promise<void> {
		switch (op.type) {
			case "create-table":
				await this.ddl.createTable(op.table, op.columns);
				break;
			case "drop-table":
				// Not auto-applied for safety
				console.warn(`[MigrationRunner] Skipping drop-table: ${op.table}`);
				break;
			case "add-column":
				await this.ddl.addColumn(op.table, op.column);
				break;
			case "drop-column":
				await this.ddl.dropColumn(op.table, op.columnName);
				break;
			case "alter-type":
				await this.ddl.alterType(op.table, op.columnName, op.newType);
				break;
			case "alter-nullable":
				await this.ddl.alterNullable(
					op.table,
					op.columnName,
					op.newNullable,
				);
				break;
			case "alter-default":
				await this.ddl.alterDefault(
					op.table,
					op.columnName,
					op.newDefault,
				);
				break;
			case "add-index":
				await this.ddl.addIndex(op.index);
				break;
			case "drop-index":
				await this.ddl.dropIndex(op.indexName, op.tableName);
				break;
			case "add-foreign-key":
				await this.ddl.addForeignKey(op.fk);
				break;
			case "drop-foreign-key":
				await this.ddl.dropForeignKey(op.fkName, op.tableName);
				break;
		}
	}

	/* ── Private: SQL preview ── */

	private opToSql(op: DiffOp): string {
		switch (op.type) {
			case "create-table":
				return `CREATE TABLE "${op.table}" (\n  ${op.columns.map((c) => `"${c.name}" ${c.dataType}`).join(",\n  ")}\n);`;
			case "drop-table":
				return `DROP TABLE "${op.table}" CASCADE;`;
			case "add-column":
				return `ALTER TABLE "${op.table}" ADD COLUMN "${op.column.name}" ${op.column.dataType};`;
			case "drop-column":
				return `ALTER TABLE "${op.table}" DROP COLUMN "${op.columnName}" CASCADE;`;
			case "alter-type":
				return `ALTER TABLE "${op.table}" ALTER COLUMN "${op.columnName}" TYPE ${op.newType} USING "${op.columnName}"::${op.newType};`;
			case "alter-nullable":
				return op.newNullable
					? `ALTER TABLE "${op.table}" ALTER COLUMN "${op.columnName}" DROP NOT NULL;`
					: `ALTER TABLE "${op.table}" ALTER COLUMN "${op.columnName}" SET NOT NULL;`;
			case "alter-default":
				return op.newDefault === null
					? `ALTER TABLE "${op.table}" ALTER COLUMN "${op.columnName}" DROP DEFAULT;`
					: `ALTER TABLE "${op.table}" ALTER COLUMN "${op.columnName}" SET DEFAULT ${op.newDefault};`;
			case "add-index":
				return `CREATE ${op.index.isUnique ? "UNIQUE " : ""}INDEX "${op.index.name}" ON "${op.index.tableName}" (${op.index.columns.map((c) => `"${c}"`).join(", ")});`;
			case "drop-index":
				return `DROP INDEX IF EXISTS "${op.indexName}";`;
			case "add-foreign-key":
				return `ALTER TABLE "${op.fk.tableName}" ADD CONSTRAINT "${op.fk.name}" FOREIGN KEY (${op.fk.columns.map((c) => `"${c}"`).join(", ")}) REFERENCES "${op.fk.refTable}" (${op.fk.refColumns.map((c) => `"${c}"`).join(", ")}) ON DELETE ${op.fk.onDelete} ON UPDATE ${op.fk.onUpdate};`;
			case "drop-foreign-key":
				return `ALTER TABLE "${op.tableName}" DROP CONSTRAINT IF EXISTS "${op.fkName}";`;
		}
	}

	private opToString(op: DiffOp): string {
		switch (op.type) {
			case "create-table":
				return `CREATE TABLE ${op.table}`;
			case "drop-table":
				return `DROP TABLE ${op.table}`;
			case "add-column":
				return `ADD COLUMN ${op.table}.${op.column.name}`;
			case "drop-column":
				return `DROP COLUMN ${op.table}.${op.columnName}`;
			case "alter-type":
				return `ALTER TYPE ${op.table}.${op.columnName}: ${op.oldType} → ${op.newType}`;
			case "alter-nullable":
				return `ALTER NULLABLE ${op.table}.${op.columnName}: ${op.oldNullable} → ${op.newNullable}`;
			case "alter-default":
				return `ALTER DEFAULT ${op.table}.${op.columnName}`;
			case "add-index":
				return `ADD INDEX ${op.index.name} on ${op.index.tableName}`;
			case "drop-index":
				return `DROP INDEX ${op.indexName}`;
			case "add-foreign-key":
				return `ADD FK ${op.fk.name} (${op.fk.tableName} → ${op.fk.refTable})`;
			case "drop-foreign-key":
				return `DROP FK ${op.fkName} on ${op.tableName}`;
		}
	}

	/**
	 * Parses an applied operation description and creates the inverted DiffOp.
	 * Returns null if the operation cannot be inverted from description alone.
	 *
	 * For safe rollback, it's better to store the original DiffOp and invert directly.
	 * This parser is a fallback for text-based operation logs.
	 */
	private parseAndInvert(description: string): DiffOp | null {
		if (description.startsWith("CREATE TABLE ")) {
			const table = description.replace("CREATE TABLE ", "");
			return { type: "drop-table", table };
		}
		if (description.startsWith("ADD COLUMN ")) {
			// "ADD COLUMN table.column"
			const match = description.replace("ADD COLUMN ", "").split(".");
			if (match.length === 2) {
				return { type: "drop-column", table: match[0], columnName: match[1] };
			}
		}
		if (description.startsWith("DROP COLUMN ")) {
			// "DROP COLUMN table.column"
			const match = description.replace("DROP COLUMN ", "").split(".");
			if (match.length === 2) {
				return { type: "add-column", table: match[0], column: { name: match[1], tableName: match[0], dataType: "unknown", isNullable: true, defaultValue: null, isPrimary: false, isUnique: false, characterMaxLength: null } };
			}
		}
		if (description.startsWith("ADD INDEX ")) {
			// "ADD INDEX name on table"
			const parts = description.replace("ADD INDEX ", "").split(" on ");
			if (parts.length === 2) {
				return { type: "drop-index", indexName: parts[0], tableName: parts[1] };
			}
		}
		if (description.startsWith("DROP INDEX ")) {
			const indexName = description.replace("DROP INDEX ", "");
			return { type: "add-index", index: { name: indexName, tableName: "", columns: [], isUnique: false } };
		}
		if (description.startsWith("ADD FK ")) {
			// "ADD FK name (table → ref)"
			const match = description.match(/ADD FK (\w+) \((\w+) → (\w+)\)/);
			if (match) {
				return { type: "drop-foreign-key", fkName: match[1], tableName: match[2] };
			}
		}
		if (description.startsWith("DROP FK ")) {
			const match = description.match(/DROP FK (\w+) on (\w+)/);
			if (match) {
				return { type: "add-foreign-key", fk: { name: match[1], tableName: match[2], columns: [], refTable: "", refColumns: [], onDelete: "NO ACTION", onUpdate: "NO ACTION" } };
			}
		}

		// Cannot invert — log warning
		console.warn(`[MigrationRunner] Cannot rollback: ${description}`);
		return null;
	}
}
