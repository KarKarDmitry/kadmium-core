import { AnyModel } from "../../model/model";
import { WhereCondition } from "../../sqb/kadmium-sqb";
import { BaseFilterBuilder } from "./base-filter.builder";
import { Comparable, InOperable } from "../types/query";
export declare class DateFilterBuilder<T extends AnyModel, K extends keyof T> extends BaseFilterBuilder<T, K> {
    eq(value: Comparable<T[K]>): WhereCondition;
    neq(value: Comparable<T[K]>): WhereCondition;
    after(value: string | Date): WhereCondition;
    afterEq(value: string | Date): WhereCondition;
    before(value: string | Date): WhereCondition;
    beforeEq(value: string | Date): WhereCondition;
    between(start: string | Date, end: string | Date): WhereCondition;
    in(values: InOperable<string | Date>): WhereCondition;
}
//# sourceMappingURL=date-filter.builder.d.ts.map