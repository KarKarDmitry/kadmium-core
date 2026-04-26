import { NormalizedField_OPT } from '../../schema/types/fields.js';
import { ValField } from '../val-struct.js';

export interface ValidationResult<T = any> {
    success: boolean;
    data?: T;
    errors?: ValidationError[];
}

export interface ValidationError {
    path: string;
    message: string;
    code?: string;
}

export interface ValidationAdapter<TSchema = any> {
    /**
     * Compiles the schema into the validator's internal representation.
     * This can be cached by the adapter.
     */
    compile(schema: TSchema): void | Promise<void>;

    /**
     * Performs full validation of the object.
     */
    validate(data: unknown): ValidationResult | Promise<ValidationResult>;

    /**
     * Validates a single field.
     */
    validateField(
        field: string,
        value: unknown,
    ): ValidationResult | Promise<ValidationResult>;

    /**
     * Validates data against a ValStruct definition (array of ValField).
     * Used for route params/query/body validation in controllers.
     */
    validateValStruct?(
        fields: ValField[],
        data: unknown,
    ): ValidationResult | Promise<ValidationResult>;
}
