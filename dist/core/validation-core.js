"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationCore = void 0;
const field_validator_1 = require("../validation/engine/field-validator");
class ValidationCore {
    constructor(registry, adapter, mode = "strict", rules = []) {
        this.registry = registry;
        this.adapter = adapter;
        this.mode = mode;
        this.rules = rules;
        this.compiled = false;
        this.fieldValidators = this.buildFieldValidators();
    }
    /**
     * Компиляция схемы через адаптер
     */
    async ensureCompiled() {
        if (this.compiled)
            return;
        await this.adapter.compile({
            registry: this.registry,
            mode: this.mode,
            rules: this.rules,
        });
        this.compiled = true;
    }
    buildFieldValidators() {
        const map = new Map();
        for (const [name, field] of this.registry.fieldsByName.entries()) {
            map.set(name, new field_validator_1.FieldValidator(field));
        }
        return map;
    }
    /**
     * Полная валидация через адаптер
     */
    async validate(data) {
        await this.ensureCompiled();
        return this.adapter.validate(data);
    }
    /**
     * Валидация одного поля (standalone логика)
     */
    validateField(name, value) {
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
    getFieldValidator(name) {
        return this.fieldValidators.get(name);
    }
    /**
     * Validates data against a ValStruct definition via the adapter.
     */
    async validateValStruct(fields, data) {
        if (this.adapter.validateValStruct) {
            return this.adapter.validateValStruct(fields, data);
        }
        // Fallback: validate field-by-field
        const errors = [];
        for (const field of fields) {
            const result = this.validateField(field.name, data?.[field.name]);
            if (!result.success && result.errors) {
                errors.push(...result.errors);
            }
        }
        return errors.length === 0
            ? { success: true, data }
            : { success: false, errors };
    }
}
exports.ValidationCore = ValidationCore;
//# sourceMappingURL=validation-core.js.map