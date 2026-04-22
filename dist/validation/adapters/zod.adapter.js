"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZodValidationAdapter = void 0;
const zod_1 = require("zod");
const errors_1 = require("../../core/errors");
class ZodValidationAdapter {
    constructor() {
        this.compiled = false;
    }
    async compile(opt) {
        if (this.compiled)
            return;
        const shape = {};
        for (const field of opt.registry.fieldsByName.values()) {
            let validator;
            switch (field.type) {
                case "email":
                case "password":
                case "string": {
                    let strValidator;
                    if (field.type === "email") {
                        strValidator = zod_1.z.string().email(); // Changed to modern API
                    }
                    else {
                        strValidator = zod_1.z.string();
                    }
                    const minLength = field.min ?? (field.required ? 1 : 0);
                    if (minLength > 0) {
                        strValidator = strValidator.min(minLength, `${field.label} must be at least ${minLength} characters`);
                    }
                    if (field.max) {
                        strValidator = strValidator.max(field.max);
                    }
                    validator = strValidator;
                    break;
                }
                case "number": {
                    let numValidator = zod_1.z.number();
                    if (typeof field.min === "number") {
                        numValidator = numValidator.min(field.min);
                    }
                    if (typeof field.max === "number") {
                        numValidator = numValidator.max(field.max);
                    }
                    validator = numValidator;
                    break;
                }
                case "boolean": {
                    validator = zod_1.z.boolean();
                    break;
                }
                default:
                    validator = zod_1.z.any();
                    break;
            }
            if (!field.required) {
                validator = validator.optional();
            }
            shape[field.name] = validator;
        }
        let finalSchema;
        if (opt.mode === "strict") {
            finalSchema = zod_1.z.strictObject(shape);
        }
        else {
            finalSchema = zod_1.z.object(shape);
        }
        if (opt.rules) {
            for (const rule of opt.rules) {
                finalSchema = finalSchema.superRefine((data, ctx) => {
                    rule.refine(data, {
                        addIssue: (path, message) => {
                            ctx.addIssue({
                                code: "custom",
                                path,
                                message,
                            });
                        },
                    });
                });
            }
        }
        this.schema = finalSchema;
        this.compiled = true;
    }
    validate(data) {
        if (!this.compiled) {
            throw errors_1.Errors.validation.adapterNotCompiled();
        }
        const result = this.schema.safeParse(data);
        if (result.success) {
            return {
                success: true,
                data: result.data,
            };
        }
        return {
            success: false,
            errors: this.formatErrors(result.error.issues),
        };
    }
    validateField(field, value) {
        if (!this.compiled) {
            throw errors_1.Errors.validation.adapterNotCompiled();
        }
        // Correctly get the inner object shape, even if it's wrapped in ZodEffects
        const objectSchema = this.schema instanceof zod_1.z.ZodEffects
            ? this.schema._def.schema
            : this.schema;
        const shape = objectSchema.shape;
        if (!(field in shape)) {
            return {
                success: false,
                errors: [
                    {
                        path: field,
                        message: "Unknown field",
                        code: "invalid_key",
                    },
                ],
            };
        }
        const fieldSchema = shape[field];
        const result = fieldSchema.safeParse(value);
        if (result.success) {
            return {
                success: true,
                data: result.data,
            };
        }
        return {
            success: false,
            errors: this.formatErrors(result.error.issues),
        };
    }
    formatErrors(issues) {
        return issues.map((e) => ({
            path: e.path.join("."),
            message: e.message,
            code: String(e.code),
        }));
    }
    /**
     * Validates data against a ValStruct definition (array of ValField).
     * Compiles fields to Zod schema on the fly and validates.
     */
    validateValStruct(fields, data) {
        const shape = {};
        for (const f of fields) {
            let validator;
            switch (f.type) {
                case "email": {
                    let v = zod_1.z.string().email();
                    if (f.min && typeof f.min === "number")
                        v = v.min(f.min);
                    if (f.max && typeof f.max === "number")
                        v = v.max(f.max);
                    validator = v;
                    break;
                }
                case "string": {
                    let v = zod_1.z.string();
                    if (f.required && (!f.min || f.min === 0)) {
                        v = v.min(1);
                    }
                    if (typeof f.min === "number")
                        v = v.min(f.min);
                    if (typeof f.max === "number")
                        v = v.max(f.max);
                    validator = v;
                    break;
                }
                case "number": {
                    // Coerce: "10" → 10, then validate range
                    let v = zod_1.z.coerce.number();
                    if (typeof f.min === "number")
                        v = v.min(f.min);
                    if (typeof f.max === "number")
                        v = v.max(f.max);
                    validator = v;
                    break;
                }
                case "boolean": {
                    // Smart coercion: "true"/"1"/"yes" → true, "false"/"0"/"no" → false
                    const boolCoercer = zod_1.z.preprocess((val) => {
                        if (typeof val === "boolean")
                            return val;
                        if (typeof val === "string") {
                            const lower = val.toLowerCase().trim();
                            if (["true", "1", "yes", "on"].includes(lower))
                                return true;
                            if (["false", "0", "no", "off"].includes(lower))
                                return false;
                        }
                        return val; // let zod.boolean() handle the error
                    }, zod_1.z.boolean());
                    validator = boolCoercer;
                    break;
                }
                case "date": {
                    validator = zod_1.z.coerce.date();
                    break;
                }
                default:
                    validator = zod_1.z.any();
            }
            if (!f.required) {
                validator = validator.optional();
            }
            shape[f.name] = validator;
        }
        const schema = zod_1.z.object(shape).passthrough();
        const result = schema.safeParse(data);
        if (result.success) {
            return { success: true, data: result.data };
        }
        return {
            success: false,
            errors: this.formatErrors(result.error.issues),
        };
    }
}
exports.ZodValidationAdapter = ZodValidationAdapter;
//# sourceMappingURL=zod.adapter.js.map