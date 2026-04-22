import { IS_FILTER_BUILDER } from "../symbols";
import { WhereCondition } from "../../sqb/kadmium-sqb";
import { BaseFilterBuilder } from "./base-filter.builder";
type GConstructor<T = {}> = new (...args: any[]) => T;
/**
 * A mixin function that takes a filter builder class and extends it
 * with `null()` and `notNull()` methods.
 */
export declare function NullableMixin<TBase extends GConstructor<BaseFilterBuilder<any, any>>>(Base: TBase): {
    new (...args: any[]): {
        get null(): WhereCondition;
        get notNull(): WhereCondition;
        readonly [IS_FILTER_BUILDER]: true;
        readonly sqb: import("../../sqb/kadmium-sqb").KadmiumSqb<any>;
        readonly field: any;
        readonly alias?: string | undefined;
        getIdentifierForSql(): string;
    };
} & TBase;
export {};
//# sourceMappingURL=nullable.mixin.d.ts.map