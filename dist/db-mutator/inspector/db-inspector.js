"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DbInspector = void 0;
/**
 * Inspects the actual database schema via DbDdlAdapter.
 * Adapter-agnostic — works with any DbDdlAdapter implementation.
 */
class DbInspector {
    constructor(ddl) {
        this.ddl = ddl;
    }
    /**
     * Reads the full database schema into a DbSchema object.
     */
    async inspect() {
        const tables = await this.ddl.inspectTables();
        const columns = new Map();
        const indexes = new Map();
        const foreignKeys = new Map();
        for (const table of tables) {
            columns.set(table.name, await this.ddl.inspectColumns(table.name));
            indexes.set(table.name, await this.ddl.inspectIndexes(table.name));
            foreignKeys.set(table.name, await this.ddl.inspectForeignKeys(table.name));
        }
        return { tables, columns, indexes, foreignKeys };
    }
    /**
     * Checks if a specific table exists in the database.
     */
    async tableExists(tableName) {
        const tables = await this.ddl.inspectTables();
        return tables.some((t) => t.name === tableName);
    }
}
exports.DbInspector = DbInspector;
//# sourceMappingURL=db-inspector.js.map