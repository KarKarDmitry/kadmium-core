import { SchemaRegistry } from "./schema-core";
import { FieldValidator } from "../validation/engine/field-validator";
import { ModelValidationRule } from "../model/types";
import {
	ValidationAdapter,
	ValidationResult,
	ValidationError,
} from "../validation/types/adapter";
import { ValField } from "../validation/val-struct";

export type ValidationMode = "strict" | "strip" | "passthrough";

export class ValidationCore {
	private fieldValidators: Map<string, FieldValidator>;
	private compiled = false;

	constructor(
		private registry: SchemaRegistry,
		private adapter: ValidationAdapter,
		private mode: ValidationMode = "strict",
		private rules: ModelValidationRule[] = [],
	) {
		this.fieldValidators = this.buildFieldValidators();
	}

	/**
	 * Компиляция схемы через адаптер
	 */
	private async ensureCompiled() {
		if (this.compiled) return;

		await this.adapter.compile({
			registry: this.registry,
			mode: this.mode,
			rules: this.rules,
		});

		this.compiled = true;
	}

	private buildFieldValidators() {
		const map = new Map<string, FieldValidator>();

		for (const [name, field] of this.registry.fieldsByName.entries()) {
			map.set(name, new FieldValidator(field));
		}

		return map;
	}

	/**
	 * Полная валидация через адаптер
	 */
	async validate(data: Record<string, unknown>): Promise<ValidationResult> {
		await this.ensureCompiled();
		return this.adapter.validate(data);
	}

	/**
	 * Валидация одного поля (standalone логика)
	 */
	validateField(name: string, value: unknown) {
		const validator = this.fieldValidators.get(name);

		if (!validator) {
			return {
				success: false,
				errors: [
					{
						path: name,
						message: `Field "${name}" not found in schema`,
					},
				],
			};
		}

		const errors = validator.validate(value);

		return {
			success: errors.length === 0,
			errors: errors.map((e) => ({
				path: e.field,
				message: e.message,
			})),
		};
	}

	getFieldValidator(name: string) {
		return this.fieldValidators.get(name);
	}

	/**
	 * Validates data against a ValStruct definition via the adapter.
	 */
	async validateValStruct(
		fields: ValField[],
		data: unknown,
	): Promise<ValidationResult> {
		if (this.adapter.validateValStruct) {
			return this.adapter.validateValStruct(fields, data);
		}
		// Fallback: validate field-by-field
		const errors: ValidationError[] = [];
		for (const field of fields) {
			const result = this.validateField(field.name, (data as any)?.[field.name]);
			if (!result.success && result.errors) {
				errors.push(...result.errors);
			}
		}
		return errors.length === 0
			? { success: true, data }
			: { success: false, errors };
	}
}
