import { AnyModel } from "../../model/model";
import { KadmiumSqb } from "../../sqb/kadmium-sqb";
import { IS_FILTER_BUILDER } from "../symbols";
/**
 * The abstract base class for all field-specific filter builders.
 */
export declare abstract class BaseFilterBuilder<T extends AnyModel, K extends keyof T> {
    readonly sqb: KadmiumSqb<T>;
    readonly field: K;
    readonly alias?: string | undefined;
    constructor(sqb: KadmiumSqb<T>, field: K, alias?: string | undefined);
    readonly [IS_FILTER_BUILDER] = true;
    getIdentifierForSql(): string;
}
//# sourceMappingURL=base-filter.builder.d.ts.map