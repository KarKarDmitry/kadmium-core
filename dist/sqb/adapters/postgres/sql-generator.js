"use strict";
/**
 * SqlGenerator — строит SQL для SELECT/UPDATE/DELETE.
 * Включает: SELECT с INCLUDE, JOIN-логика, WHERE, GROUP BY, ORDER BY, LIMIT/OFFSET.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqlGenerator = void 0;
const symbols_1 = require("../../../repo/symbols");
const field_reference_builder_1 = require("../../../repo/field-builders/field-reference.builder");
const errors_1 = require("../../../core/errors");
const utils_1 = require("../../utils");
class SqlGenerator {
    // ═══ JOIN helpers ═══
    _buildJoinGraph(joins) {
        const graph = new Map();
        for (const join of joins) {
            if (!graph.has(join.left))
                graph.set(join.left, []);
            if (!graph.has(join.right))
                graph.set(join.right, []);
            graph.get(join.left).push(join.right);
            graph.get(join.right).push(join.left);
        }
        return graph;
    }
    _findJoinIslands(graph, allAliases) {
        const visited = new Set();
        const islands = [];
        for (const alias of allAliases) {
            if (visited.has(alias))
                continue;
            const island = new Set();
            const queue = [alias];
            visited.add(alias);
            island.add(alias);
            while (queue.length > 0) {
                const current = queue.shift();
                for (const neighbor of graph.get(current) || []) {
                    if (!visited.has(neighbor)) {
                        visited.add(neighbor);
                        island.add(neighbor);
                        queue.push(neighbor);
                    }
                }
            }
            islands.push(island);
        }
        return islands;
    }
    // ═══ Subquery helpers ═══
    _buildSubquerySelectClause(alias, relatedSqb, relatedSchemaCore, values, paramIndex) {
        if (relatedSqb._selects && relatedSqb._selects.length > 0) {
            return relatedSqb._selects
                .map((sel) => {
                if (typeof sel === "string")
                    return `"${sel}"`;
                if (sel.fieldType === "selectable-field") {
                    const s = sel;
                    return `"${alias}"."${String(s.source.fieldName)}" AS "${s.alias || String(s.source.fieldName)}"`;
                }
                if (sel.fieldType === "aggregate-field") {
                    const a = sel;
                    if (!a.alias)
                        throw errors_1.Errors.query.error(`Aggregate '${a.func}' must have an alias in a subquery.`);
                    let inner = a.field !== "*"
                        ? `"${alias}"."${String(a.field.source.fieldName)}"`
                        : "*";
                    return `${a.func.toUpperCase()}(${inner}) AS "${a.alias}"`;
                }
                return String(sel);
            })
                .join(", ");
        }
        const publicFields = [...relatedSchemaCore.registry.fieldsByName.values()]
            .filter((f) => f.persist !== false && !this.securedTypes.has(f.type))
            .map((f) => `"${alias}"."${f.name}" AS "${f.name}"`);
        if (publicFields.length === 0) {
            return `"${alias}"."${relatedSchemaCore.normalized.primary.name}" AS "${relatedSchemaCore.normalized.primary.name}"`;
        }
        return publicFields.join(", ");
    }
    _buildSubqueryNestedIncludes(relatedSqb, alias, values, paramIndex) {
        let nested = "";
        for (const rel of relatedSqb._includes) {
            const cond = {
                alias: rel.propertyName,
                field: rel.childField,
                op: "=",
                value: new field_reference_builder_1.FieldReferenceBuilder(relatedSqb, rel.parentField, alias),
            };
            nested += `, ${this._buildIncludeSubquery(rel, cond, values, paramIndex)}`;
        }
        return nested;
    }
    _buildSubqueryModifiers(alias, relatedSqb, values, paramIndex) {
        let groupBy = "";
        if (relatedSqb._groupBy.length > 0) {
            groupBy = `GROUP BY ${relatedSqb._groupBy.map((f) => `"${alias}"."${String(f.source.fieldName)}"`).join(", ")}`;
        }
        let orderBy = "";
        if (relatedSqb._orders.length > 0) {
            orderBy = `ORDER BY ${relatedSqb._orders.map((o) => `"${alias}"."${String(o.by.source.fieldName)}" ${o.direction.toUpperCase()}`).join(", ")}`;
        }
        let limit = "";
        if (relatedSqb._limit !== null) {
            limit = `LIMIT $${paramIndex.p++}`;
            values.push(relatedSqb._limit);
        }
        let offset = "";
        if (relatedSqb._skip !== null) {
            offset = `OFFSET $${paramIndex.p++}`;
            values.push(relatedSqb._skip);
        }
        return { groupBy, orderBy, limit, offset };
    }
    _buildIncludeSubquery(includedRelation, correlationCondition, values, paramIndex) {
        const alias = includedRelation.propertyName;
        const relatedSqb = includedRelation.internalSqb;
        const relatedSchemaCore = includedRelation.relatedSchemaCore;
        const selectClause = this._buildSubquerySelectClause(alias, relatedSqb, relatedSchemaCore, values, paramIndex);
        const nestedSelects = this._buildSubqueryNestedIncludes(relatedSqb, alias, values, paramIndex);
        const subqueryWheres = (0, utils_1.cloneWhereGroup)(relatedSqb._wheres);
        subqueryWheres.conditions.push(correlationCondition);
        const whereClause = this._buildWhereClause(subqueryWheres, values, paramIndex, []);
        const modifiers = this._buildSubqueryModifiers(alias, relatedSqb, values, paramIndex);
        const subQueryText = `SELECT ${selectClause}${nestedSelects} FROM "${relatedSchemaCore.collection}" AS "${alias}" ${whereClause} ${modifiers.groupBy} ${modifiers.orderBy} ${modifiers.limit} ${modifiers.offset}`
            .trim()
            .replace(/\s+/g, " ");
        return ((includedRelation.relationType === "one-to-many"
            ? `(SELECT COALESCE(json_agg(subq), '[]') FROM (${subQueryText}) AS subq)`
            : `(SELECT row_to_json(subq) FROM (${subQueryText}) AS subq)`) +
            ` AS "${alias}"`);
    }
    // ═══ Query builders ═══
    toSql(sqb) {
        return this._buildQuery(sqb);
    }
    _buildQuery(sqb) {
        switch (sqb._operation) {
            case "select":
                return this._buildSelectQuery(sqb);
            case "update":
                return this._buildUpdateQuery(sqb);
            case "delete":
                return this._buildDeleteQuery(sqb);
            default:
                throw errors_1.Errors.query.unsupportedOp(sqb._operation);
        }
    }
    _buildSelectQuery(sqb) {
        const values = [];
        return { text: this._buildSelectQueryText(sqb, values, { p: 1 }), values };
    }
    _buildSelectQueryText(sqb, values, paramIndex) {
        const mainTableAlias = sqb._tableContext.keys().next().value;
        if (!mainTableAlias)
            throw errors_1.Errors.query.noTableContext();
        let selectClause = "";
        if (sqb._selects?.length) {
            const isMultiTable = sqb._tableContext.size > 1;
            selectClause = sqb._selects
                .map((sel) => {
                if (typeof sel === "string")
                    return `"${sel}"`;
                if (sel.fieldType === "selectable-field") {
                    const s = sel;
                    const id = s.source.tableAlias
                        ? `"${s.source.tableAlias}"."${String(s.source.fieldName)}"`
                        : `"${String(s.source.fieldName)}"`;
                    if (s.alias)
                        return `${id} AS "${s.alias}"`;
                    if (isMultiTable && s.source.tableAlias)
                        return `${id} AS "${s.source.tableAlias}.${String(s.source.fieldName)}"`;
                    return `${id} AS "${String(s.source.fieldName)}"`;
                }
                if (sel.fieldType === "aggregate-field") {
                    const a = sel;
                    if (!a.alias)
                        throw errors_1.Errors.query.error(`Aggregate '${a.func}' must have an alias.`);
                    const inner = a.field !== "*"
                        ? a.field.source.tableAlias
                            ? `"${a.field.source.tableAlias}"."${String(a.field.source.fieldName)}"`
                            : `"${String(a.field.source.fieldName)}"`
                        : "*";
                    return `${a.func.toUpperCase()}(${inner}) AS "${a.alias}"`;
                }
                return String(sel);
            })
                .join(", ");
        }
        else {
            selectClause = `"${mainTableAlias}".*`;
        }
        for (const rel of sqb._includes) {
            const cond = {
                alias: rel.propertyName,
                field: rel.childField,
                op: "=",
                value: new field_reference_builder_1.FieldReferenceBuilder(sqb, rel.parentField, mainTableAlias),
            };
            selectClause += `, ${this._buildIncludeSubquery(rel, cond, values, paramIndex)}`;
        }
        const allAliases = Array.from(sqb._tableContext.keys());
        const joinGraph = this._buildJoinGraph(sqb._joins);
        const joinIslands = this._findJoinIslands(joinGraph, allAliases);
        let fromClause = "";
        const extraWhereConditions = [];
        for (const island of joinIslands) {
            const islandAliases = Array.from(island);
            let islandFromClause = "";
            const islandTablesInFrom = new Set();
            let joinsForIsland = sqb._joins.filter((j) => island.has(j.left) && island.has(j.right));
            const processedJoins = new Set();
            const firstAlias = islandAliases[0];
            islandFromClause = `FROM "${sqb._tableContext.get(firstAlias)}" AS "${firstAlias}"`;
            islandTablesInFrom.add(firstAlias);
            let tablesAddedInPass = true;
            while (tablesAddedInPass) {
                tablesAddedInPass = false;
                for (const join of joinsForIsland) {
                    if (processedJoins.has(join))
                        continue;
                    let newAlias;
                    if (islandTablesInFrom.has(join.left) &&
                        !islandTablesInFrom.has(join.right))
                        newAlias = join.right;
                    else if (!islandTablesInFrom.has(join.left) &&
                        islandTablesInFrom.has(join.right))
                        newAlias = join.left;
                    else if (islandTablesInFrom.has(join.left) &&
                        islandTablesInFrom.has(join.right)) {
                        extraWhereConditions.push(this._buildConditionSql(join.on, values, paramIndex));
                        processedJoins.add(join);
                        continue;
                    }
                    if (newAlias) {
                        const onSql = this._buildConditionSql(join.on, values, paramIndex);
                        islandFromClause += ` ${join.direction.toUpperCase()} JOIN "${sqb._tableContext.get(newAlias)}" AS "${newAlias}" ON ${onSql}`;
                        islandTablesInFrom.add(newAlias);
                        processedJoins.add(join);
                        tablesAddedInPass = true;
                    }
                }
            }
            if (!fromClause)
                fromClause = islandFromClause.substring(5);
            else
                fromClause += `, ${islandFromClause.substring(5)}`;
        }
        const whereClause = this._buildWhereClause(sqb._wheres, values, paramIndex, extraWhereConditions);
        let groupByClause = "";
        if (sqb._groupBy.length > 0) {
            groupByClause = `GROUP BY ${sqb._groupBy.map((f) => (f.source.tableAlias ? `"${f.source.tableAlias}"."${String(f.source.fieldName)}"` : `"${String(f.source.fieldName)}"`)).join(", ")}`;
        }
        let orderByClause = "";
        if (sqb._orders.length > 0) {
            orderByClause = `ORDER BY ${sqb._orders
                .map((o) => o.by.source.tableAlias
                ? `"${o.by.source.tableAlias}"."${String(o.by.source.fieldName)}"`
                : `"${String(o.by.source.fieldName)}"`)
                .map((f, i) => `${f} ${sqb._orders[i].direction.toUpperCase()}`)
                .join(", ")}`;
        }
        let limitClause = "";
        if (sqb._limit !== null) {
            limitClause = `LIMIT $${paramIndex.p++}`;
            values.push(sqb._limit);
        }
        let offsetClause = "";
        if (sqb._skip !== null) {
            offsetClause = `OFFSET $${paramIndex.p++}`;
            values.push(sqb._skip);
        }
        return `SELECT ${selectClause} FROM ${fromClause} ${whereClause} ${groupByClause} ${orderByClause} ${limitClause} ${offsetClause}`
            .trim()
            .replace(/\s+/g, " ");
    }
    _buildUpdateQuery(sqb) {
        if (sqb._tableContext.size !== 1)
            throw errors_1.Errors.query.singleTableOnly("UPDATE");
        const collectionName = sqb._tableContext.values().next().value;
        const values = [];
        const paramIndex = { p: 1 };
        const data = sqb._updateData;
        if (!data || Object.keys(data).length === 0)
            throw errors_1.Errors.query.updateNoData();
        const setClause = Object.keys(data)
            .map((key) => {
            values.push(data[key]);
            return `"${key}" = $${paramIndex.p++}`;
        })
            .join(", ");
        const whereClause = this._buildWhereClause(sqb._wheres, values, paramIndex, []);
        return {
            text: `UPDATE "${collectionName}" SET ${setClause} ${whereClause} RETURNING *`
                .trim()
                .replace(/\s+/g, " "),
            values,
        };
    }
    _buildDeleteQuery(sqb) {
        if (sqb._tableContext.size !== 1)
            throw errors_1.Errors.query.singleTableOnly("DELETE");
        const collectionName = sqb._tableContext.values().next().value;
        const values = [];
        const paramIndex = { p: 1 };
        const whereClause = this._buildWhereClause(sqb._wheres, values, paramIndex, []);
        return {
            text: `DELETE FROM "${collectionName}" ${whereClause}`
                .trim()
                .replace(/\s+/g, " "),
            values,
        };
    }
    // ═══ WHERE ═══
    _buildWhereClause(rootGroup, values, paramIndex, extraConditions) {
        const mainSql = this._buildWhereGroupSql(rootGroup, values, paramIndex);
        const all = [mainSql, ...extraConditions].filter(Boolean);
        return all.length === 0 ? "" : `WHERE ${all.join(" AND ")}`;
    }
    _buildWhereGroupSql(group, values, paramIndex) {
        if (group.conditions.length === 0)
            return "";
        const conditions = group.conditions.map((w) => {
            if ("conditions" in w)
                return `(${this._buildWhereGroupSql(w, values, paramIndex)})`;
            const left = w.alias ? `"${w.alias}"."${w.field}"` : `"${w.field}"`;
            if (w.value && w.value[symbols_1.IS_FILTER_BUILDER])
                return `${left} ${w.op} ${w.value.getIdentifierForSql()}`;
            if (w.value && w.value[symbols_1.IS_QUERY_BUILDER]) {
                return `${left} ${w.op} (${this._buildSelectQueryText(w.value.sqb, values, paramIndex)})`;
            }
            if (w.value === null || w.value === undefined) {
                const op = w.op === "IS" || w.op === "IS NOT"
                    ? w.op
                    : w.op === "="
                        ? "IS"
                        : "IS NOT";
                return `${left} ${op} NULL`;
            }
            if (w.op === "IN") {
                if (!Array.isArray(w.value) || w.value.length === 0)
                    return "1=0";
                const vals = w.value.map(() => `$${paramIndex.p++}`).join(", ");
                values.push(...w.value);
                return `${left} IN (${vals})`;
            }
            values.push(w.value);
            return `${left} ${w.op} $${paramIndex.p++}`;
        });
        return conditions.join(` ${group.op} `);
    }
    _buildConditionSql(w, values, paramIndex) {
        const left = w.alias ? `"${w.alias}"."${w.field}"` : `"${w.field}"`;
        if (w.value && w.value[symbols_1.IS_FILTER_BUILDER])
            return `${left} ${w.op} ${w.value.getIdentifierForSql()}`;
        if (w.value === null || w.value === undefined)
            return `${left} ${w.op === "=" ? "IS" : "IS NOT"} NULL`;
        if (w.op === "IN") {
            if (!Array.isArray(w.value) || w.value.length === 0)
                return "1=0";
            const vals = w.value.map(() => `$${paramIndex.p++}`).join(", ");
            values.push(...w.value);
            return `${left} IN (${vals})`;
        }
        values.push(w.value);
        return `${left} ${w.op} $${paramIndex.p++}`;
    }
}
exports.SqlGenerator = SqlGenerator;
//# sourceMappingURL=sql-generator.js.map