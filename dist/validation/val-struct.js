"use strict";
/**
 * ValStruct — lightweight, adapter-agnostic validation DSL.
 * Compiles to field metadata that any ValidationAdapter can process.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObjectValidator = exports.v = exports.FieldValidator = void 0;
exports.compileValStruct = compileValStruct;
/** A single field validator */
class FieldValidator {
    constructor(_type, _required = true, _min, _max) {
        this._type = _type;
        this._required = _required;
        this._min = _min;
        this._max = _max;
    }
    get req() {
        return new FieldValidator(this._type, true, this._min, this._max);
    }
    get opt() {
        return new FieldValidator(this._type, false, this._min, this._max);
    }
    min(n) {
        return new FieldValidator(this._type, this._required, n, this._max);
    }
    max(n) {
        return new FieldValidator(this._type, this._required, this._min, n);
    }
    _toField(name) {
        return {
            name,
            type: this._type,
            required: this._required,
            min: this._min,
            max: this._max,
        };
    }
}
exports.FieldValidator = FieldValidator;
/* ── Pre-built validators ── */
exports.v = {
    string: new FieldValidator("string"),
    get email() {
        return new FieldValidator("email");
    },
    number: new FieldValidator("number"),
    boolean: new FieldValidator("boolean"),
    date: new FieldValidator("date"),
    get uuid() {
        return new FieldValidator("string");
    },
    optional(inner) {
        return inner.opt;
    },
    object(schema) {
        return new ObjectValidator(schema);
    },
};
/* ── Object validator ── */
class ObjectValidator {
    constructor(schema) {
        this.schema = schema;
    }
    _toFields(prefix = "") {
        const fields = [];
        for (const key in this.schema) {
            const val = this.schema[key];
            const name = prefix ? `${prefix}.${key}` : key;
            if (val instanceof ObjectValidator) {
                fields.push(...val._toFields(name));
            }
            else {
                fields.push(val._toField(name));
            }
        }
        return fields;
    }
}
exports.ObjectValidator = ObjectValidator;
/* ── Compile to ValField[] ── */
function compileValStruct(schema) {
    const fields = [];
    for (const key in schema) {
        const val = schema[key];
        if (val instanceof ObjectValidator) {
            fields.push(...val._toFields(key));
        }
        else {
            fields.push(val._toField(key));
        }
    }
    return fields;
}
//# sourceMappingURL=val-struct.js.map