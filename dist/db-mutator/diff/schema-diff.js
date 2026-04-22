"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaDiff = void 0;
/**
 * Maps Kadmium field types to PostgreSQL data type names (as returned by information_schema).
 */
function fieldTypeToPgDataType(field, schemaCore, appCore) {
    const f = field;
    const type = f.type;
    const dbType = f.db_type;
    switch (type) {
        case "primary":
            if (dbType === "uuid")
                return "uuid";
            if (dbType === "string")
                return "character varying";
            return "integer";
        case "string":
        case "email":
        case "password":
            return "character varying";
        case "number":
            return "integer";
        case "boolean":
            return "boolean";
        case "date":
            return "date";
        case "time":
            return "time without time zone";
        case "datetime":
            return "timestamp without time zone";
        case "jsonb":
            return "jsonb";
        case "ref": {
            // Resolve the referenced PK type
            const refFieldName = f.ref || f.ref;
            const targetSchema = appCore.schemas.find((s) => s.collection === refFieldName);
            if (targetSchema) {
                const pkType = targetSchema.normalized.primary.db_type;
                if (pkType === "uuid")
                    return "uuid";
                if (pkType === "string")
                    return "character varying";
                return "integer";
            }
            return "integer"; // fallback
        }
        default:
            return "text";
    }
}
/**
 * Compares SchemaCore definitions vs actual DB schema.
 * Produces a DiffResult with operations to sync them.
 */
class SchemaDiff {
    constructor(appCore, dbSchema) {
        this.appCore = appCore;
        this.dbSchema = dbSchema;
    }
    /**
     * Computes the diff between schema definitions and the actual DB.
     */
    computeDiff() {
        const operations = [];
        const summary = {
            addedTables: 0,
            droppedTables: 0,
            addedColumns: 0,
            droppedColumns: 0,
            alteredColumns: 0,
            addedIndexes: 0,
            droppedIndexes: 0,
            addedForeignKeys: 0,
            droppedForeignKeys: 0,
        };
        const schemaTables = new Set(this.appCore.schemas.map((s) => s.collection));
        const dbTables = new Set(this.dbSchema.tables.map((t) => t.name));
        // ── Table-level diff ──
        // New tables in schema (need to create)
        for (const tableName of schemaTables) {
            if (!dbTables.has(tableName)) {
                const schemaCore = this.appCore.schemas.find((s) => s.collection === tableName);
                const columns = this._schemaToColumns(schemaCore);
                operations.push({ type: "create-table", table: tableName, columns });
                summary.addedTables++;
            }
        }
        // Tables in DB but not in schema (orphaned — could drop, but we just note them)
        for (const tableName of dbTables) {
            if (!schemaTables.has(tableName)) {
                // Don't auto-drop — just note
                // operations.push({ type: "drop-table", table: tableName });
                // summary.droppedTables++;
            }
        }
        // ── Column, Index, FK diff for existing tables ──
        for (const schemaCore of this.appCore.schemas) {
            const tableName = schemaCore.collection;
            if (!dbTables.has(tableName))
                continue; // handled above
            const dbColumns = this.dbSchema.columns.get(tableName) ?? [];
            const dbIndexes = this.dbSchema.indexes.get(tableName) ?? [];
            const dbFks = this.dbSchema.foreignKeys.get(tableName) ?? [];
            const dbColMap = new Map(dbColumns.map((c) => [c.name, c]));
            // Column diff
            const allInputFields = [
                schemaCore.normalized.primary,
                ...schemaCore.normalized.form.fields,
            ].filter((f) => f.displayOnly !== true);
            for (const field of allInputFields) {
                if (field.persist === false)
                    continue;
                const dbCol = dbColMap.get(field.name);
                if (!dbCol) {
                    // New column
                    const col = this._fieldToColumn(field, schemaCore);
                    operations.push({ type: "add-column", table: tableName, column: col });
                    summary.addedColumns++;
                }
                else {
                    // Check type / nullable changes
                    const expectedType = fieldTypeToPgDataType({
                        type: field.type,
                        db_type: field.db_type,
                        ref: field.ref,
                        name: field.name,
                    }, schemaCore, this.appCore);
                    // Normalize PG types for comparison
                    const normalizedExpected = this._normalizePgType(expectedType);
                    const normalizedActual = this._normalizePgType(dbCol.dataType);
                    if (normalizedActual !== normalizedExpected) {
                        operations.push({
                            type: "alter-type",
                            table: tableName,
                            columnName: field.name,
                            oldType: dbCol.dataType,
                            newType: expectedType,
                        });
                        summary.alteredColumns++;
                    }
                    const expectedNullable = !field.required && field.db?.nullable !== false;
                    if (dbCol.isNullable !== expectedNullable) {
                        operations.push({
                            type: "alter-nullable",
                            table: tableName,
                            columnName: field.name,
                            oldNullable: dbCol.isNullable,
                            newNullable: expectedNullable,
                        });
                        summary.alteredColumns++;
                    }
                }
            }
            // Dropped columns (in DB but not in schema)
            for (const dbCol of dbColumns) {
                const schemaField = allInputFields.find((f) => f.name === dbCol.name);
                if (!schemaField) {
                    operations.push({
                        type: "drop-column",
                        table: tableName,
                        columnName: dbCol.name,
                    });
                    summary.droppedColumns++;
                }
            }
            // Index diff
            const expectedIndexes = this._expectedIndexes(schemaCore, dbColMap);
            const expectedIdxNames = new Set(expectedIndexes.map((i) => i.name));
            const dbIdxNames = new Set(dbIndexes.map((i) => i.name));
            // Skip auto-generated PK indexes and UNIQUE constraint indexes (they end with _key or _pkey)
            const nonSystemDbIdx = dbIndexes.filter((i) => !i.name.endsWith("_pkey") &&
                !i.name.endsWith("_key"));
            for (const idx of expectedIndexes) {
                if (!dbIdxNames.has(idx.name)) {
                    operations.push({ type: "add-index", index: idx });
                    summary.addedIndexes++;
                }
            }
            for (const idx of nonSystemDbIdx) {
                if (!expectedIdxNames.has(idx.name)) {
                    operations.push({
                        type: "drop-index",
                        indexName: idx.name,
                        tableName,
                    });
                    summary.droppedIndexes++;
                }
            }
            // FK diff
            const expectedFks = this._expectedForeignKeys(schemaCore);
            const expectedFkNames = new Set(expectedFks.map((f) => f.name));
            const dbFkNames = new Set(dbFks.map((f) => f.name));
            for (const fk of expectedFks) {
                if (!dbFkNames.has(fk.name)) {
                    operations.push({ type: "add-foreign-key", fk });
                    summary.addedForeignKeys++;
                }
            }
            for (const fk of dbFks) {
                if (!expectedFkNames.has(fk.name)) {
                    operations.push({
                        type: "drop-foreign-key",
                        fkName: fk.name,
                        tableName,
                    });
                    summary.droppedForeignKeys++;
                }
            }
        }
        return { operations, hasChanges: operations.length > 0, summary };
    }
    /**
     * Health check — returns whether DB matches schema definitions.
     */
    checkHealth() {
        const diff = this.computeDiff();
        const issues = [];
        if (diff.summary.addedTables > 0) {
            issues.push(`${diff.summary.addedTables} table(s) missing from database`);
        }
        if (diff.summary.addedColumns > 0) {
            issues.push(`${diff.summary.addedColumns} column(s) missing`);
        }
        if (diff.summary.droppedColumns > 0) {
            issues.push(`${diff.summary.droppedColumns} extra column(s) in database`);
        }
        if (diff.summary.alteredColumns > 0) {
            issues.push(`${diff.summary.alteredColumns} column(s) have type/nullability changes`);
        }
        if (diff.summary.addedIndexes > 0) {
            issues.push(`${diff.summary.addedIndexes} index(es) missing`);
        }
        if (diff.summary.addedForeignKeys > 0) {
            issues.push(`${diff.summary.addedForeignKeys} foreign key(s) missing`);
        }
        return {
            isHealthy: issues.length === 0,
            issues,
            summary: {
                totalTables: this.dbSchema.tables.length,
                expectedTables: this.appCore.schemas.length,
                matchingTables: this.appCore.schemas.length - diff.summary.addedTables,
            },
        };
    }
    /* ── Private helpers ── */
    _schemaToColumns(schemaCore) {
        const fields = [
            schemaCore.normalized.primary,
            ...schemaCore.normalized.form.fields,
        ];
        return fields
            .filter((f) => f.persist !== false && f.displayOnly !== true)
            .map((f) => this._fieldToColumn(f, schemaCore));
    }
    _fieldToColumn(field, schemaCore) {
        const dataType = fieldTypeToPgDataType({
            type: field.type,
            db_type: field.db_type,
            ref: field.ref,
            name: field.name,
        }, schemaCore, this.appCore);
        const nullable = !field.required && field.db?.nullable !== false;
        let defaultValue = null;
        if (field.type === "primary" && field.db_type === "uuid") {
            defaultValue = "gen_random_uuid()";
        }
        else if (field.type === "primary" && field.auto_increment && field.db_type === "number") {
            defaultValue = "nextval(pg_get_serial_sequence('" + schemaCore.collection + "', '" + field.name + "'))";
        }
        else if (field.default !== undefined) {
            defaultValue = typeof field.default === "string" ? `'${field.default}'` : String(field.default);
        }
        const isPrimary = field.type === "primary";
        const isUnique = !!field.db?.unique;
        const autoIncrement = field.type === "primary" && field.auto_increment === true;
        return {
            name: field.name,
            tableName: schemaCore.collection,
            dataType,
            isNullable: nullable,
            defaultValue,
            isPrimary,
            isUnique,
            characterMaxLength: null,
            autoIncrement,
        };
    }
    _expectedIndexes(schemaCore, _dbColMap) {
        const indexes = [];
        const tableName = schemaCore.collection;
        const allInputFields = [
            schemaCore.normalized.primary,
            ...schemaCore.normalized.form.fields,
        ].filter((f) => f.displayOnly !== true);
        for (const field of allInputFields) {
            if (field.db?.index || field.db?.unique) {
                indexes.push({
                    name: `idx_${tableName}_${field.name}`,
                    tableName,
                    columns: [field.name],
                    isUnique: !!field.db.unique,
                });
            }
        }
        return indexes;
    }
    _expectedForeignKeys(schemaCore) {
        const fks = [];
        const tableName = schemaCore.collection;
        const inputFields = schemaCore.normalized.form.fields.filter((f) => f.displayOnly !== true);
        for (const field of inputFields) {
            if (field.type !== "ref")
                continue;
            // At this point, field is narrowed to Ref_OPT & NormalizedInputField_OPT
            const refField = field;
            const targetSchema = this.appCore.schemas.find((s) => s.collection === refField.ref);
            if (!targetSchema)
                continue;
            const targetPk = targetSchema.normalized.primary;
            fks.push({
                name: `fk_${tableName}_${field.name}`,
                tableName,
                columns: [field.name],
                refTable: refField.ref,
                refColumns: [targetPk.name],
                onDelete: "NO ACTION",
                onUpdate: "NO ACTION",
            });
        }
        return fks;
    }
    /**
     * Normalizes PostgreSQL type names for comparison.
     * e.g., "character varying" → "varchar", "timestamp without time zone" → "timestamp"
     */
    _normalizePgType(type) {
        const t = type.toLowerCase().trim();
        if (t === "character varying")
            return "varchar";
        if (t === "timestamp without time zone")
            return "timestamp";
        if (t === "time without time zone")
            return "time";
        if (t === "double precision")
            return "float8";
        if (t === "integer" || t === "int" || t === "int4")
            return "integer";
        if (t.startsWith("varchar"))
            return "varchar";
        return t;
    }
}
exports.SchemaDiff = SchemaDiff;
//# sourceMappingURL=schema-diff.js.map