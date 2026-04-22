import { NormalizedInputField_OPT } from "../../schema/types/fields";
export interface FieldValidationError {
    field: string;
    message: string;
}
export declare class FieldValidator {
    private readonly field;
    constructor(field: NormalizedInputField_OPT);
    validate(value: unknown): FieldValidationError[];
}
//# sourceMappingURL=field-validator.d.ts.map