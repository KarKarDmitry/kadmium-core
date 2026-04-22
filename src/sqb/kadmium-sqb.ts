import { AnyModel } from "../model/model";

import { Profiler } from "../core/profiling/profiler";
import { SchemaCore } from "../core/schema-core"; // Import SchemaCore
import { DbAdapter } from "./adapters/adapter";

import { SelectableField } from "../repo/types/selectable";
import { JoinOptions } from "../repo/types/query";
import { cloneWhereGroup } from "./utils";

// --- Types for WHERE clause tree structure ---
export type WhereCondition = {
	alias?: string;
	field: string;
	op: string;
	value: any;
};

export type WhereGroup = {
	op: "AND" | "OR";
	conditions: Array<WhereCondition | WhereGroup>;
};
// --- End of types ---

// --- Types for Included Relations ---
export interface IncludedRelation<T extends AnyModel = any> {
	parentAlias: string; // The alias of the table this include hangs off of (e.g., 'u')
	propertyName: string; // The name of the property in the result object (could be aliased)
	relationType: "one-to-one" | "one-to-many" | "many-to-one"; // The type of relation being included
	internalSqb: KadmiumSqb<T>; // The SQB for the subquery (for ToMany/ToOne with where/select)
	relatedSchemaCore: SchemaCore; // The SchemaCore of the related model
	parentField: string; // The foreign key field on the parent model (e.g., author_id for Post)
	childField: string; // The primary key field on the child model (e.g., id for User)
}

/**
 * The internal, stateful query builder.
 * It accumulates query state and passes it to a DB adapter for execution.
 */
export class KadmiumSqb<T extends AnyModel> {
	// Internal state of the query
	public _operation: "select" | "update" | "delete" = "select";
	public _tableContext: Map<string, string> = new Map();
	public _joins: JoinOptions[] = [];
	public _updateData: Partial<T> | null = null;
	public _wheres: WhereGroup = { op: "AND", conditions: [] };
	public _selects: readonly any[] | null = null;
	public _orders: { by: SelectableField<any, any, any>; direction: "asc" | "desc" }[] =
		[];
	public _includes: IncludedRelation[] = []; // Using the new interface
	public _limit: number | null = null;
	public _skip: number | null = null;
	public _groupBy: SelectableField<any, any, any>[] = [];

	constructor(private schemaCore: SchemaCore) { }

	/**
	 * Creates a shallow copy of this SQB with deep-copied mutable state.
	 * Used when cloning a relation builder via .as().
	 */
	public clone(): KadmiumSqb<T> {
		const copy = new KadmiumSqb<T>(this.schemaCore);
		copy._operation = this._operation;
		copy._tableContext = new Map(this._tableContext);
		copy._joins = [...this._joins];
		copy._updateData = this._updateData;
		copy._wheres = cloneWhereGroup(this._wheres);
		copy._selects = this._selects;
		copy._orders = [...this._orders];
		copy._includes = [...this._includes];
		copy._limit = this._limit;
		copy._skip = this._skip;
		copy._groupBy = [...this._groupBy];
		return copy;
	}

	/**
	 * Delegates execution of the accumulated query state to a DB adapter.
	 * @param adapter The database adapter that will generate and run the query.
	 * @param collectionName The name of the table/collection to query.
	 */
	@Profiler.Profile(__filename)
	public async execute(adapter: DbAdapter): Promise<Partial<T>[]> {
		return adapter.execute(this);
	}
}
