import { IS_FILTER_BUILDER } from "../symbols";
import { WhereCondition } from "../../sqb/kadmium-sqb";
import { BaseFilterBuilder } from "./base-filter.builder";

// This is a common TypeScript pattern for mixins.
// It defines a generic type for a class constructor.
type GConstructor<T = {}> = new (...args: any[]) => T;

/**
 * A mixin function that takes a filter builder class and extends it
 * with `null()` and `notNull()` methods.
 */
export function NullableMixin<
	TBase extends GConstructor<BaseFilterBuilder<any, any>>,
>(Base: TBase) {
	return class Nullable extends Base {
		public readonly [IS_FILTER_BUILDER] = true;
		public get null(): WhereCondition {
			return {
				field: this.field as string,
				alias: this.alias,
				op: "IS",
				value: null,
			};
		}

		public get notNull(): WhereCondition {
			return {
				field: this.field as string,
				alias: this.alias,
				op: "IS NOT",
				value: null,
			};
		}
	};
}
