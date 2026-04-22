import { ValidationAdapter, ValidationResult } from "../types/adapter";
import { SchemaRegistry } from "../../core/schema-core";
import { ValidationMode } from "../../core/validation-core";
import { ModelValidationRule } from "../../model/types";
import { ValField } from "../val-struct";
export declare class ZodValidationAdapter implements ValidationAdapter {
    private schema;
    private compiled;
    constructor();
    compile(opt: {
        registry: SchemaRegistry;
        mode: ValidationMode;
        rules: ModelValidationRule[];
    }): Promise<void>;
    validate(data: unknown): ValidationResult;
    validateField(field: string, value: unknown): ValidationResult;
    private formatErrors;
    /**
     * Validates data against a ValStruct definition (array of ValField).
     * Compiles fields to Zod schema on the fly and validates.
     */
    validateValStruct(fields: ValField[], data: unknown): ValidationResult;
}
//# sourceMappingURL=zod.adapter.d.ts.map