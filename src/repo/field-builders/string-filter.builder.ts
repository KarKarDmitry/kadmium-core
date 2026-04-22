import { AnyModel } from "../../model/model";
import { WhereCondition } from "../../sqb/kadmium-sqb";
import { BaseFilterBuilder } from "./base-filter.builder";
import { Comparable, InOperable } from "../types/query";

export class StringFilterBuilder<
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

	like(value: string): WhereCondition {
		return {
			field: this.field as string,
			alias: this.alias,
			op: "LIKE",
			value: `%${value}%`,
		};
	}

	ilike(value: string): WhereCondition {
		return {
			field: this.field as string,
			alias: this.alias,
			op: "ILIKE",
			value: `%${value}%`,
		};
	}

	start(value: string): WhereCondition {
		return {
			field: this.field as string,
			alias: this.alias,
			op: "LIKE",
			value: `${value}%`,
		};
	}

	istart(value: string): WhereCondition {
		return {
			field: this.field as string,
			alias: this.alias,
			op: "ILIKE",
			value: `${value}%`,
		};
	}

	end(value: string): WhereCondition {
		return {
			field: this.field as string,
			alias: this.alias,
			op: "LIKE",
			value: `%${value}`,
		};
	}

	iend(value: string): WhereCondition {
		return {
			field: this.field as string,
			alias: this.alias,
			op: "ILIKE",
			value: `%${value}`,
		};
	}

	in(values: InOperable<string>): WhereCondition {
		return {
			field: this.field as string,
			alias: this.alias,
			op: "IN",
			value: values,
		};
	}
}
