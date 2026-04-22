import { AnyModel } from "../../model/model";
import { WhereCondition } from "../../sqb/kadmium-sqb";
import { BaseFilterBuilder } from "./base-filter.builder";
import { Comparable } from "../types/query";
export declare class BooleanFilterBuilder<T extends AnyModel, K extends keyof T> extends BaseFilterBuilder<T, K> {
    eq(value: Comparable<T[K]>): WhereCondition;
    neq(value: Comparable<T[K]>): WhereCondition;
    true(): WhereCondition;
    false(): WhereCondition;
}
//# sourceMappingURL=boolean-filter.builder.d.ts.map