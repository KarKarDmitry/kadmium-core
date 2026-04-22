import { z, ZodObject, ZodRawShape, ZodType, ZodTypeAny, ZodIssue } from "zod";
import { Errors } from "../../core/errors";
import {
	ValidationAdapter,
	ValidationResult,
	ValidationError,
} from "../types/adapter";
import { SchemaRegistry } from "../../core/schema-core";
import { ValidationMode } from "../../core/validation-core";
import { ModelValidationRule } from "../../model/types";
import { ValField } from "../val-struct";

export class ZodValidationAdapter implements ValidationAdapter {
	private schema!: ZodTypeAny; // Changed to allow ZodEffects
	private compiled = false;

	constructor() {}

	async compile(opt: {
		registry: SchemaRegistry;
		mode: ValidationMode;
		rules: ModelValidationRule[];
	}): Promise<void> {
		if (this.compiled) return;

		const shape: { [key: string]: ZodTypeAny } = {};

		for (const field of opt.registry.fieldsByName.values()) {
			let validator: ZodTypeAny;

			switch (field.type) {
				case "email":
				case "password":
				case "string": {
					let strValidator: z.ZodString;
					if (field.type === "email") {
						strValidator = z.string().email(); // Changed to modern API
					} else {
						strValidator = z.string();
					}

					const minLength = field.min ?? (field.required ? 1 : 0);
					if (minLength > 0) {
						strValidator = strValidator.min(
							minLength,
							`${field.label} must be at least ${minLength} characters`,
						);
					}

					if (field.max) {
						strValidator = strValidator.max(field.max);
					}
					validator = strValidator;
					break;
				}

				case "number": {
					let numValidator = z.number();
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
					validator = z.boolean();
					break;
				}

				default:
					validator = z.any();
					break;
			}

			if (!field.required) {
				validator = validator.optional();
			}

			shape[field.name] = validator;
		}

		let finalSchema: ZodTypeAny;
		if (opt.mode === "strict") {
			finalSchema = z.strictObject(shape);
		} else {
			finalSchema = z.object(shape);
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

	validate(data: unknown): ValidationResult {
		if (!this.compiled) {
			throw Errors.validation.adapterNotCompiled();
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

	validateField(field: string, value: unknown): ValidationResult {
		if (!this.compiled) {
			throw Errors.validation.adapterNotCompiled();
		}

		// Correctly get the inner object shape, even if it's wrapped in ZodEffects
		const objectSchema = this.schema instanceof z.ZodEffects
			? (this.schema._def as any).schema
			: this.schema;
		
		const shape = (objectSchema as ZodObject<any>).shape as ZodRawShape;

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

		const fieldSchema = shape[field] as ZodType;

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

	private formatErrors(issues: ZodIssue[]): ValidationError[] {
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
	validateValStruct(
		fields: ValField[],
		data: unknown,
	): ValidationResult {
		const shape: { [key: string]: ZodTypeAny } = {};

		for (const f of fields) {
			let validator: ZodTypeAny;

			switch (f.type) {
				case "email": {
					let v = z.string().email();
					if (f.min && typeof f.min === "number") v = v.min(f.min);
					if (f.max && typeof f.max === "number") v = v.max(f.max);
					validator = v;
					break;
				}
				case "string": {
					let v = z.string();
					if (f.required && (!f.min || f.min === 0)) {
						v = v.min(1);
					}
					if (typeof f.min === "number") v = v.min(f.min);
					if (typeof f.max === "number") v = v.max(f.max);
					validator = v;
					break;
				}
				case "number": {
					// Coerce: "10" → 10, then validate range
					let v = z.coerce.number();
					if (typeof f.min === "number") v = v.min(f.min);
					if (typeof f.max === "number") v = v.max(f.max);
					validator = v;
					break;
				}
				case "boolean": {
					// Smart coercion: "true"/"1"/"yes" → true, "false"/"0"/"no" → false
					const boolCoercer = z.preprocess((val) => {
						if (typeof val === "boolean") return val;
						if (typeof val === "string") {
							const lower = val.toLowerCase().trim();
							if (["true", "1", "yes", "on"].includes(lower)) return true;
							if (["false", "0", "no", "off"].includes(lower)) return false;
						}
						return val; // let zod.boolean() handle the error
					}, z.boolean());
					validator = boolCoercer;
					break;
				}
				case "date": {
					validator = z.coerce.date();
					break;
				}
				default:
					validator = z.any();
			}

			if (!f.required) {
				validator = validator.optional();
			}

			shape[f.name] = validator;
		}

		const schema = z.object(shape).passthrough();
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
