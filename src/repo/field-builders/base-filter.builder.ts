import { AnyModel } from "../../model/model.js";
import { KadmiumSqb, WhereCondition } from "../../sqb/kadmium-sqb.js";
import { IS_FILTER_BUILDER } from "../symbols.js";

/**
 * The abstract base class for all field-specific filter builders.
 */
export abstract class BaseFilterBuilder<
	T extends AnyModel,
	K extends keyof T,
> {
	constructor(
		public readonly sqb: KadmiumSqb<T>,
		public readonly field: K,
		public readonly alias?: string,
	) { }

	public readonly [IS_FILTER_BUILDER] = true;

	public getIdentifierForSql(): string {
		const field = `"${this.field as string}"`;
		return this.alias ? `"${this.alias}".${field}` : field;
	}
}
