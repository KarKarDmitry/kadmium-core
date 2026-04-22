/**
 * ValStruct — lightweight, adapter-agnostic validation DSL.
 * Compiles to field metadata that any ValidationAdapter can process.
 */
export interface ValField {
    name: string;
    type: "string" | "number" | "boolean" | "email" | "date";
    required?: boolean;
    min?: number | string;
    max?: number | string;
}
/** A single field validator */
export declare class FieldValidator<T> {
    private _type;
    private _required;
    private _min?;
    private _max?;
    constructor(_type: ValField["type"], _required?: boolean, _min?: number | string | undefined, _max?: number | string | undefined);
    get req(): this;
    get opt(): FieldValidator<T | undefined>;
    min(n: number): this;
    max(n: number): this;
    _toField(name: string): ValField;
}
export declare const v: {
    string: FieldValidator<string>;
    readonly email: FieldValidator<string>;
    number: FieldValidator<number>;
    boolean: FieldValidator<boolean>;
    date: FieldValidator<string>;
    readonly uuid: FieldValidator<string>;
    optional<T>(inner: FieldValidator<T>): FieldValidator<T | undefined>;
    object<S extends Record<string, FieldValidator<any> | ObjectValidator<any>>>(schema: S): ObjectValidator<S>;
};
export declare class ObjectValidator<S extends Record<string, FieldValidator<any> | ObjectValidator<any>>> {
    readonly schema: S;
    constructor(schema: S);
    _toFields(prefix?: string): ValField[];
}
export type InferValStruct<T> = T extends FieldValidator<infer R> ? R : T extends ObjectValidator<infer S> ? {
    [K in keyof S]: InferValStruct<S[K]>;
} : T extends Record<string, FieldValidator<any> | ObjectValidator<any>> ? {
    [K in keyof T]: InferValStruct<T[K]>;
} : never;
export declare function compileValStruct(schema: Record<string, FieldValidator<any> | ObjectValidator<any>>): ValField[];
//# sourceMappingURL=val-struct.d.ts.map