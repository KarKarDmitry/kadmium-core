import { AnyModel } from "../../model/model.js";
import { WhereCondition } from "../../sqb/kadmium-sqb.js";
import { BaseFilterBuilder } from "./base-filter.builder.js";
import { Comparable, InOperable } from "../types/query/index.js";

export class NumberFilterBuilder<
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

	gt(value: number): WhereCondition {
		return {
			field: this.field as string,
			alias: this.alias,
			op: ">",
			value: value,
		};
	}

	gte(value: number): WhereCondition {
		return {
			field: this.field as string,
			alias: this.alias,
			op: ">=",
			value: value,
		};
	}

	lt(value: number): WhereCondition {
		return {
			field: this.field as string,
			alias: this.alias,
			op: "<",
			value: value,
		};
	}

	lte(value: number): WhereCondition {
		return {
			field: this.field as string,
			alias: this.alias,
			op: "<=",
			value: value,
		};
	}

	between(start: number, end: number): WhereCondition {
		return {
			field: this.field as string,
			alias: this.alias,
			op: 'BETWEEN',
			value: `${start} AND ${end}`,
		}
	}

	in(values: InOperable<number>): WhereCondition {
		return {
			field: this.field as string,
			alias: this.alias,
			op: "IN",
			value: values,
		};
	}
}
