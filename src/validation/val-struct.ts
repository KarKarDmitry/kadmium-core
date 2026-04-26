/**
 * ValStruct — lightweight, adapter-agnostic validation DSL.
 * Compiles to field metadata that any ValidationAdapter can process.
 */

export interface ValField {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'email' | 'date';
    required?: boolean;
    min?: number | string;
    max?: number | string;
}

/** A single field validator */
export class FieldValidator<T> {
    constructor(
        private _type: ValField['type'],
        private _required: boolean = true,
        private _min?: number | string,
        private _max?: number | string,
    ) {}

    get req(): this {
        return new FieldValidator(
            this._type,
            true,
            this._min,
            this._max,
        ) as this;
    }

    get opt(): FieldValidator<T | undefined> {
        return new FieldValidator(
            this._type,
            false,
            this._min,
            this._max,
        ) as any;
    }

    min(n: number): this {
        return new FieldValidator(
            this._type,
            this._required,
            n,
            this._max,
        ) as this;
    }

    max(n: number): this {
        return new FieldValidator(
            this._type,
            this._required,
            this._min,
            n,
        ) as this;
    }

    _toField(name: string): ValField {
        return {
            name,
            type: this._type,
            required: this._required,
            min: this._min,
            max: this._max,
        };
    }
}

/* ── Pre-built validators ── */

export const v = {
    string: new FieldValidator<string>('string'),
    get email(): FieldValidator<string> {
        return new FieldValidator('email');
    },
    number: new FieldValidator<number>('number'),
    boolean: new FieldValidator<boolean>('boolean'),
    date: new FieldValidator<string>('date'),
    get uuid(): FieldValidator<string> {
        return new FieldValidator('string');
    },
    optional<T>(inner: FieldValidator<T>): FieldValidator<T | undefined> {
        return inner.opt as any;
    },
    object<
        S extends Record<string, FieldValidator<any> | ObjectValidator<any>>,
    >(schema: S): ObjectValidator<S> {
        return new ObjectValidator(schema);
    },
};

/* ── Object validator ── */

export class ObjectValidator<
    S extends Record<string, FieldValidator<any> | ObjectValidator<any>>,
> {
    constructor(public readonly schema: S) {}

    _toFields(prefix = ''): ValField[] {
        const fields: ValField[] = [];
        for (const key in this.schema) {
            const val = this.schema[key];
            const name = prefix ? `${prefix}.${key}` : key;
            if (val instanceof ObjectValidator) {
                fields.push(...val._toFields(name));
            } else {
                fields.push((val as FieldValidator<any>)._toField(name));
            }
        }
        return fields;
    }
}

/* ── Type inference ── */

export type InferValStruct<T> =
    T extends FieldValidator<infer R>
        ? R
        : T extends ObjectValidator<infer S>
          ? { [K in keyof S]: InferValStruct<S[K]> }
          : T extends Record<string, FieldValidator<any> | ObjectValidator<any>>
            ? { [K in keyof T]: InferValStruct<T[K]> }
            : never;

/* ── Compile to ValField[] ── */

export function compileValStruct(
    schema: Record<string, FieldValidator<any> | ObjectValidator<any>>,
): ValField[] {
    const fields: ValField[] = [];
    for (const key in schema) {
        const val = schema[key];
        if (val instanceof ObjectValidator) {
            fields.push(...val._toFields(key));
        } else {
            fields.push((val as FieldValidator<any>)._toField(key));
        }
    }
    return fields;
}
