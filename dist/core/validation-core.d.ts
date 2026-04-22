import { SchemaRegistry } from "./schema-core";
import { FieldValidator } from "../validation/engine/field-validator";
import { ModelValidationRule } from "../model/types";
import { ValidationAdapter, ValidationResult } from "../validation/types/adapter";
import { ValField } from "../validation/val-struct";
export type ValidationMode = "strict" | "strip" | "passthrough";
export declare class ValidationCore {
    private registry;
    private adapter;
    private mode;
    private rules;
    private fieldValidators;
    private compiled;
    constructor(registry: SchemaRegistry, adapter: ValidationAdapter, mode?: ValidationMode, rules?: ModelValidationRule[]);
    /**
     * Компиляция схемы через адаптер
     */
    private ensureCompiled;
    private buildFieldValidators;
    /**
     * Полная валидация через адаптер
     */
    validate(data: Record<string, unknown>): Promise<ValidationResult>;
    /**
     * Валидация одного поля (standalone логика)
     */
    validateField(name: string, value: unknown): {
        success: boolean;
        errors: {
            path: string;
            message: string;
        }[];
    };
    getFieldValidator(name: string): FieldValidator | undefined;
    /**
     * Validates data against a ValStruct definition via the adapter.
     */
    validateValStruct(fields: ValField[], data: unknown): Promise<ValidationResult>;
}
//# sourceMappingURL=validation-core.d.ts.map