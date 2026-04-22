import { AnyModel } from "../../model/model";
import { KadmiumSqb } from "../../sqb/kadmium-sqb";
import { BaseFilterBuilder } from "./base-filter.builder";
/**
 * A concrete implementation of BaseFilterBuilder used specifically to reference
 * a field from another table in a WHERE condition. This builder does not
 * provide any filtering methods (eq, gt, etc.) but correctly generates
 * the SQL identifier for the referenced field.
 */
export declare class FieldReferenceBuilder<T extends AnyModel, K extends keyof T> extends BaseFilterBuilder<T, K> {
    readonly sqb: KadmiumSqb<T>;
    readonly field: K;
    readonly alias: string;
    constructor(sqb: KadmiumSqb<T>, field: K, alias: string);
}
//# sourceMappingURL=field-reference.builder.d.ts.map