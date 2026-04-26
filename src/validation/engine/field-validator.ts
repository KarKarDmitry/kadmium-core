import { NormalizedInputField_OPT } from '../../schema/types/fields.js';

export interface FieldValidationError {
    field: string;
    message: string;
}

export class FieldValidator {
    constructor(private readonly field: NormalizedInputField_OPT) {}

    validate(value: unknown): FieldValidationError[] {
        const errors: FieldValidationError[] = [];

        // required
        if (this.field.required && (value === undefined || value === null)) {
            errors.push({
                field: this.field.name,
                message: 'Field is required',
            });
            return errors;
        }

        // optional & empty
        if (!this.field.required && (value === undefined || value === null)) {
            return [];
        }

        // type validation
        switch (this.field.type) {
            case 'string':
            case 'password':
            case 'email':
                if (typeof value !== 'string') {
                    errors.push({
                        field: this.field.name,
                        message: 'Must be a string',
                    });
                    return errors;
                }

                if (this.field.type === 'email') {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

                    if (!emailRegex.test(value)) {
                        errors.push({
                            field: this.field.name,
                            message: 'Invalid email format',
                        });
                    }
                }

                if ('min' in this.field && this.field.min !== undefined) {
                    if (value.length < this.field.min) {
                        errors.push({
                            field: this.field.name,
                            message: `Minimum length is ${this.field.min}`,
                        });
                    }
                }

                if ('max' in this.field && this.field.max !== undefined) {
                    if (value.length > this.field.max) {
                        errors.push({
                            field: this.field.name,
                            message: `Maximum length is ${this.field.max}`,
                        });
                    }
                }

                break;

            case 'number':
                if (typeof value !== 'number') {
                    errors.push({
                        field: this.field.name,
                        message: 'Must be a number',
                    });
                    return errors;
                }

                if ('min' in this.field && this.field.min !== undefined) {
                    if (value < this.field.min) {
                        errors.push({
                            field: this.field.name,
                            message: `Minimum value is ${this.field.min}`,
                        });
                    }
                }

                if ('max' in this.field && this.field.max !== undefined) {
                    if (value > this.field.max) {
                        errors.push({
                            field: this.field.name,
                            message: `Maximum value is ${this.field.max}`,
                        });
                    }
                }

                break;

            case 'boolean':
                if (typeof value !== 'boolean') {
                    errors.push({
                        field: this.field.name,
                        message: 'Must be a boolean',
                    });
                }
                break;

            default:
                break;
        }

        // custom validator
        if (this.field.validate) {
            const customError = this.field.validate(value);

            if (customError) {
                errors.push({
                    field: this.field.name,
                    message: customError,
                });
            }
        }

        return errors;
    }
}
