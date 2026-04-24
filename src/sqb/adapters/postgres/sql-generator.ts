/**
 * SqlGenerator — строит SQL для SELECT/UPDATE/DELETE.
 * Включает: SELECT с INCLUDE, JOIN-логика, WHERE, GROUP BY, ORDER BY, LIMIT/OFFSET.
 */

import { Pool, PoolClient } from "pg";
import { AnyModel } from "../../../model/model.js";
import {
	KadmiumSqb,
	WhereCondition,
	WhereGroup,
	IncludedRelation,
} from "../../kadmium-sqb.js";
import { SchemaCore } from "../../../core/schema-core.js";
import { IS_FILTER_BUILDER, IS_QUERY_BUILDER } from "../../../repo/symbols.js";
import { BaseFilterBuilder, FieldReferenceBuilder } from '../../../repo/field-builders/index.js'
import { AggregateField, SelectableField } from "../../../repo/types/index.js";
import { Errors } from "../../../core/errors.js";
import { cloneWhereGroup } from "../../utils.js";
import { ResultReshaper } from "./result-reshaper.js";

export abstract class SqlGenerator {
	protected securedTypes!: Set<string>;

	// ═══ JOIN helpers ═══

	private _buildJoinGraph(
		joins: ReadonlyArray<{ left: string; right: string }>,
	): Map<string, string[]> {
		const graph = new Map<string, string[]>();
		for (const join of joins) {
			if (!graph.has(join.left)) graph.set(join.left, []);
			if (!graph.has(join.right)) graph.set(join.right, []);
			graph.get(join.left)!.push(join.right);
			graph.get(join.right)!.push(join.left);
		}
		return graph;
	}

	private _findJoinIslands(
		graph: Map<string, string[]>,
		allAliases: string[],
	): Set<string>[] {
		const visited = new Set<string>();
		const islands: Set<string>[] = [];
		for (const alias of allAliases) {
			if (visited.has(alias)) continue;
			const island = new Set<string>();
			const queue = [alias];
			visited.add(alias);
			island.add(alias);
			while (queue.length > 0) {
				const current = queue.shift()!;
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

	protected _buildSubquerySelectClause<T extends AnyModel>(
		alias: string,
		relatedSqb: KadmiumSqb<T>,
		relatedSchemaCore: SchemaCore,
		values: any[],
		paramIndex: { p: number },
	): string {
		if (relatedSqb._selects && relatedSqb._selects.length > 0) {
			return relatedSqb._selects
				.map((sel: any) => {
					if (typeof sel === "string") return `"${sel}"`;
					if (sel.fieldType === "selectable-field") {
						const s = sel as SelectableField<any, any>;
						return `"${alias}"."${String(s.source.fieldName)}" AS "${s.alias || String(s.source.fieldName)}"`;
					}
					if (sel.fieldType === "aggregate-field") {
						const a = sel as AggregateField<any>;
						if (!a.alias)
							throw Errors.query.error(`Aggregate '${a.func}' must have an alias in a subquery.`);
						let inner =
							a.field !== "*"
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

	protected _buildSubqueryNestedIncludes<T extends AnyModel>(
		relatedSqb: KadmiumSqb<T>,
		alias: string,
		values: any[],
		paramIndex: { p: number },
	): string {
		let nested = "";
		for (const rel of relatedSqb._includes) {
			const cond: WhereCondition = {
				alias: rel.propertyName,
				field: rel.childField,
				op: "=",
				value: new FieldReferenceBuilder<any, any>(
					relatedSqb,
					rel.parentField,
					alias,
				),
			};
			nested += `, ${this._buildIncludeSubquery(rel, cond, values, paramIndex)}`;
		}
		return nested;
	}

	protected _buildSubqueryModifiers<T extends AnyModel>(
		alias: string,
		relatedSqb: KadmiumSqb<T>,
		values: any[],
		paramIndex: { p: number },
	): { groupBy: string; orderBy: string; limit: string; offset: string } {
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

	protected _buildIncludeSubquery<T extends AnyModel>(
		includedRelation: IncludedRelation,
		correlationCondition: WhereCondition,
		values: any[],
		paramIndex: { p: number },
	): string {
		const alias = includedRelation.propertyName;
		const relatedSqb = includedRelation.internalSqb;
		const relatedSchemaCore = includedRelation.relatedSchemaCore;

		const selectClause = this._buildSubquerySelectClause(
			alias,
			relatedSqb,
			relatedSchemaCore,
			values,
			paramIndex,
		);
		const nestedSelects = this._buildSubqueryNestedIncludes(
			relatedSqb,
			alias,
			values,
			paramIndex,
		);

		const subqueryWheres = cloneWhereGroup(relatedSqb._wheres);
		subqueryWheres.conditions.push(correlationCondition);
		const whereClause = this._buildWhereClause(
			subqueryWheres,
			values,
			paramIndex,
			[],
		);
		const modifiers = this._buildSubqueryModifiers(
			alias,
			relatedSqb,
			values,
			paramIndex,
		);

		const subQueryText =
			`SELECT ${selectClause}${nestedSelects} FROM "${relatedSchemaCore.collection}" AS "${alias}" ${whereClause} ${modifiers.groupBy} ${modifiers.orderBy} ${modifiers.limit} ${modifiers.offset}`
				.trim()
				.replace(/\s+/g, " ");

		return (
			(includedRelation.relationType === "one-to-many"
				? `(SELECT COALESCE(json_agg(subq), '[]') FROM (${subQueryText}) AS subq)`
				: `(SELECT row_to_json(subq) FROM (${subQueryText}) AS subq)`) +
			` AS "${alias}"`
		);
	}

	// ═══ Query builders ═══

	public toSql<T extends AnyModel>(
		sqb: KadmiumSqb<T>,
	): { text: string; values: any[] } {
		return this._buildQuery(sqb);
	}

	private _buildQuery<T extends AnyModel>(
		sqb: KadmiumSqb<T>,
	): { text: string; values: any[] } {
		switch (sqb._operation) {
			case "select":
				return this._buildSelectQuery(sqb);
			case "update":
				return this._buildUpdateQuery(sqb);
			case "delete":
				return this._buildDeleteQuery(sqb);
			default:
				throw Errors.query.unsupportedOp(sqb._operation);
		}
	}

	private _buildSelectQuery<T extends AnyModel>(
		sqb: KadmiumSqb<T>,
	): { text: string; values: any[] } {
		const values: any[] = [];
		return { text: this._buildSelectQueryText(sqb, values, { p: 1 }), values };
	}

	private _buildSelectQueryText<T extends AnyModel>(
		sqb: KadmiumSqb<T>,
		values: any[],
		paramIndex: { p: number },
	): string {
		const mainTableAlias = sqb._tableContext.keys().next().value;
		if (!mainTableAlias)
			throw Errors.query.noTableContext();

		let selectClause = "";
		if (sqb._selects?.length) {
			const isMultiTable = sqb._tableContext.size > 1;
			selectClause = sqb._selects
				.map((sel: any) => {
					if (typeof sel === "string") return `"${sel}"`;
					if (sel.fieldType === "selectable-field") {
						const s = sel as SelectableField<any, any>;
						const id = s.source.tableAlias
							? `"${s.source.tableAlias}"."${String(s.source.fieldName)}"`
							: `"${String(s.source.fieldName)}"`;
						if (s.alias) return `${id} AS "${s.alias}"`;
						if (isMultiTable && s.source.tableAlias)
							return `${id} AS "${s.source.tableAlias}.${String(s.source.fieldName)}"`;
						return `${id} AS "${String(s.source.fieldName)}"`;
					}
					if (sel.fieldType === "aggregate-field") {
						const a = sel as AggregateField<any>;
						if (!a.alias)
							throw Errors.query.error(`Aggregate '${a.func}' must have an alias.`);
						const inner =
							a.field !== "*"
								? a.field.source.tableAlias
									? `"${a.field.source.tableAlias}"."${String(a.field.source.fieldName)}"`
									: `"${String(a.field.source.fieldName)}"`
								: "*";
						return `${a.func.toUpperCase()}(${inner}) AS "${a.alias}"`;
					}
					return String(sel);
				})
				.join(", ");
		} else {
			selectClause = `"${mainTableAlias}".*`;
		}

		for (const rel of sqb._includes) {
			const cond: WhereCondition = {
				alias: rel.propertyName,
				field: rel.childField,
				op: "=",
				value: new FieldReferenceBuilder<any, any>(
					sqb,
					rel.parentField,
					mainTableAlias,
				),
			};
			selectClause += `, ${this._buildIncludeSubquery(rel, cond, values, paramIndex)}`;
		}

		const allAliases = Array.from(sqb._tableContext.keys());
		const joinGraph = this._buildJoinGraph(sqb._joins);
		const joinIslands = this._findJoinIslands(joinGraph, allAliases);
		let fromClause = "";
		const extraWhereConditions: string[] = [];

		for (const island of joinIslands) {
			const islandAliases = Array.from(island);
			let islandFromClause = "";
			const islandTablesInFrom = new Set<string>();
			let joinsForIsland = sqb._joins.filter(
				(j) => island.has(j.left) && island.has(j.right),
			);
			const processedJoins = new Set<object>();

			const firstAlias = islandAliases[0];
			islandFromClause = `FROM "${sqb._tableContext.get(firstAlias)}" AS "${firstAlias}"`;
			islandTablesInFrom.add(firstAlias);

			let tablesAddedInPass = true;
			while (tablesAddedInPass) {
				tablesAddedInPass = false;
				for (const join of joinsForIsland) {
					if (processedJoins.has(join)) continue;
					let newAlias: string | undefined;
					if (
						islandTablesInFrom.has(join.left) &&
						!islandTablesInFrom.has(join.right)
					)
						newAlias = join.right;
					else if (
						!islandTablesInFrom.has(join.left) &&
						islandTablesInFrom.has(join.right)
					)
						newAlias = join.left;
					else if (
						islandTablesInFrom.has(join.left) &&
						islandTablesInFrom.has(join.right)
					) {
						extraWhereConditions.push(
							this._buildConditionSql(join.on, values, paramIndex),
						);
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
			if (!fromClause) fromClause = islandFromClause.substring(5);
			else fromClause += `, ${islandFromClause.substring(5)}`;
		}

		const whereClause = this._buildWhereClause(
			sqb._wheres,
			values,
			paramIndex,
			extraWhereConditions,
		);

		let groupByClause = "";
		if (sqb._groupBy.length > 0) {
			groupByClause = `GROUP BY ${sqb._groupBy.map((f) => (f.source.tableAlias ? `"${f.source.tableAlias}"."${String(f.source.fieldName)}"` : `"${String(f.source.fieldName)}"`)).join(", ")}`;
		}
		let orderByClause = "";
		if (sqb._orders.length > 0) {
			orderByClause = `ORDER BY ${sqb._orders
				.map((o) =>
					o.by.source.tableAlias
						? `"${o.by.source.tableAlias}"."${String(o.by.source.fieldName)}"`
						: `"${String(o.by.source.fieldName)}"`,
				)
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

	private _buildUpdateQuery<T extends AnyModel>(
		sqb: KadmiumSqb<T>,
	): { text: string; values: any[] } {
		if (sqb._tableContext.size !== 1)
			throw Errors.query.singleTableOnly("UPDATE");
		const collectionName = sqb._tableContext.values().next().value;
		const values: any[] = [];
		const paramIndex = { p: 1 };
		const data = sqb._updateData;
		if (!data || Object.keys(data).length === 0)
			throw Errors.query.updateNoData();
		const setClause = Object.keys(data)
			.map((key) => {
				values.push((data as any)[key]);
				return `"${key}" = $${paramIndex.p++}`;
			})
			.join(", ");
		const whereClause = this._buildWhereClause(
			sqb._wheres,
			values,
			paramIndex,
			[],
		);
		return {
			text: `UPDATE "${collectionName}" SET ${setClause} ${whereClause} RETURNING *`
				.trim()
				.replace(/\s+/g, " "),
			values,
		};
	}

	private _buildDeleteQuery<T extends AnyModel>(
		sqb: KadmiumSqb<T>,
	): { text: string; values: any[] } {
		if (sqb._tableContext.size !== 1)
			throw Errors.query.singleTableOnly("DELETE");
		const collectionName = sqb._tableContext.values().next().value;
		const values: any[] = [];
		const paramIndex = { p: 1 };
		const whereClause = this._buildWhereClause(
			sqb._wheres,
			values,
			paramIndex,
			[],
		);
		return {
			text: `DELETE FROM "${collectionName}" ${whereClause}`
				.trim()
				.replace(/\s+/g, " "),
			values,
		};
	}

	// ═══ WHERE ═══

	private _buildWhereClause(
		rootGroup: WhereGroup,
		values: any[],
		paramIndex: { p: number },
		extraConditions: string[],
	): string {
		const mainSql = this._buildWhereGroupSql(rootGroup, values, paramIndex);
		const all = [mainSql, ...extraConditions].filter(Boolean);
		return all.length === 0 ? "" : `WHERE ${all.join(" AND ")}`;
	}

	private _buildWhereGroupSql(
		group: WhereGroup,
		values: any[],
		paramIndex: { p: number },
	): string {
		if (group.conditions.length === 0) return "";
		const conditions = group.conditions.map((w) => {
			if ("conditions" in w)
				return `(${this._buildWhereGroupSql(w, values, paramIndex)})`;
			const left = w.alias ? `"${w.alias}"."${w.field}"` : `"${w.field}"`;
			if (w.value && w.value[IS_FILTER_BUILDER])
				return `${left} ${w.op} ${(w.value as BaseFilterBuilder<any, any>).getIdentifierForSql()}`;
			if (w.value && w.value[IS_QUERY_BUILDER]) {
				return `${left} ${w.op} (${this._buildSelectQueryText(w.value.sqb, values, paramIndex)})`;
			}
			if (w.value === null || w.value === undefined) {
				const op =
					w.op === "IS" || w.op === "IS NOT"
						? w.op
						: w.op === "="
							? "IS"
							: "IS NOT";
				return `${left} ${op} NULL`;
			}
			if (w.op === "IN") {
				if (!Array.isArray(w.value) || w.value.length === 0) return "1=0";
				const vals = w.value.map(() => `$${paramIndex.p++}`).join(", ");
				values.push(...w.value);
				return `${left} IN (${vals})`;
			}
			values.push(w.value);
			return `${left} ${w.op} $${paramIndex.p++}`;
		});
		return conditions.join(` ${group.op} `);
	}

	private _buildConditionSql(
		w: WhereCondition,
		values: any[],
		paramIndex: { p: number },
	): string {
		const left = w.alias ? `"${w.alias}"."${w.field}"` : `"${w.field}"`;
		if (w.value && w.value[IS_FILTER_BUILDER])
			return `${left} ${w.op} ${(w.value as BaseFilterBuilder<any, any>).getIdentifierForSql()}`;
		if (w.value === null || w.value === undefined)
			return `${left} ${w.op === "=" ? "IS" : "IS NOT"} NULL`;
		if (w.op === "IN") {
			if (!Array.isArray(w.value) || w.value.length === 0) return "1=0";
			const vals = w.value.map(() => `$${paramIndex.p++}`).join(", ");
			values.push(...w.value);
			return `${left} IN (${vals})`;
		}
		values.push(w.value);
		return `${left} ${w.op} $${paramIndex.p++}`;
	}
}
