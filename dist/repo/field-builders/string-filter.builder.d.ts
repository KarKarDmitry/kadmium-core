import { AnyModel } from "../../model/model";
import { WhereCondition } from "../../sqb/kadmium-sqb";
import { BaseFilterBuilder } from "./base-filter.builder";
import { Comparable, InOperable } from "../types/query";
export declare class StringFilterBuilder<T extends AnyModel, K extends keyof T> extends BaseFilterBuilder<T, K> {
    eq(value: Comparable<T[K]>): WhereCondition;
    neq(value: Comparable<T[K]>): WhereCondition;
    like(value: string): WhereCondition;
    ilike(value: string): WhereCondition;
    start(value: string): WhereCondition;
    istart(value: string): WhereCondition;
    end(value: string): WhereCondition;
    iend(value: string): WhereCondition;
    in(values: InOperable<string>): WhereCondition;
}
//# sourceMappingURL=string-filter.builder.d.ts.map