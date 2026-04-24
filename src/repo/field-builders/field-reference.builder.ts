import { AnyModel } from "../../model/model.js";
import { KadmiumSqb } from "../../sqb/kadmium-sqb.js";
import { Errors } from "../../core/errors.js";
import { BaseFilterBuilder } from "./base-filter.builder.js";

/**
 * A concrete implementation of BaseFilterBuilder used specifically to reference
 * a field from another table in a WHERE condition. This builder does not
 * provide any filtering methods (eq, gt, etc.) but correctly generates
 * the SQL identifier for the referenced field.
 */
export class FieldReferenceBuilder<
	T extends AnyModel,
	K extends keyof T,
> extends BaseFilterBuilder<T, K> {
	constructor(
		public readonly sqb: KadmiumSqb<T>,
		public readonly field: K,
		public readonly alias: string, // Alias is mandatory for referencing fields
	) {
		super(sqb, field, alias);
		if (!alias) {
			throw Errors.query.noAliasForTable();
		}
	}
}
