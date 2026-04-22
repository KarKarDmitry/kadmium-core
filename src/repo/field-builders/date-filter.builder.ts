import { AnyModel } from "../../model/model";
import { WhereCondition } from "../../sqb/kadmium-sqb";
import { BaseFilterBuilder } from "./base-filter.builder";
import { Comparable, InOperable } from "../types/query";

export class DateFilterBuilder<
	T extends AnyModel,
	K extends keyof T,
> extends BaseFilterBuilder<T, K> {
	eq(value: Comparable<T[K]>): WhereCondition {
		return {
			field: this.field as string,
			alias: this.alias,
			op: "=",
			value: value,
		};
	}

	neq(value: Comparable<T[K]>): WhereCondition {
		return {
			field: this.field as string,
			alias: this.alias,
			op: "!=",
			value: value,
		};
	}

	after(value: string | Date): WhereCondition {
		return {
			field: this.field as string,
			alias: this.alias,
			op: ">",
			value: value,
		};
	}

	afterEq(value: string | Date): WhereCondition {
		return {
			field: this.field as string,
			alias: this.alias,
			op: ">=",
			value: value,
		};
	}

	before(value: string | Date): WhereCondition {
		return {
			field: this.field as string,
			alias: this.alias,
			op: "<",
			value: value,
		};
	}

	beforeEq(value: string | Date): WhereCondition {
		return {
			field: this.field as string,
			alias: this.alias,
			op: "<=",
			value: value,
		};
	}

	// Note: The 'BETWEEN' operator may require special handling in the adapter.
	between(start: string | Date, end: string | Date): WhereCondition {
		return {
			field: this.field as string,
			alias: this.alias,
			op: "BETWEEN",
			value: [start, end],
		};
	}

	in(values: InOperable<string | Date>): WhereCondition {
		return {
			field: this.field as string,
			alias: this.alias,
			op: "IN",
			value: values,
		};
	}
}
