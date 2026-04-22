import { AnyModel } from "../../model/model";
import { WhereCondition } from "../../sqb/kadmium-sqb";
import { BaseFilterBuilder } from "./base-filter.builder";
import { Comparable, InOperable } from "../types/query";
export declare class NumberFilterBuilder<T extends AnyModel, K extends keyof T> extends BaseFilterBuilder<T, K> {
    eq(value: Comparable<T[K]>): WhereCondition;
    neq(value: Comparable<T[K]>): WhereCondition;
    gt(value: number): WhereCondition;
    gte(value: number): WhereCondition;
    lt(value: number): WhereCondition;
    lte(value: number): WhereCondition;
    between(start: number, end: number): WhereCondition;
    in(values: InOperable<number>): WhereCondition;
}
//# sourceMappingURL=number-filter.builder.d.ts.map