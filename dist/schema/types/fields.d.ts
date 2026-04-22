export interface UIElementBase {
    order?: number;
}
export interface DbOptions {
    index?: boolean;
    unique?: boolean;
    nullable?: boolean;
}
export interface Base_OPT<T = unknown> extends UIElementBase {
    _meta: "field";
    name: string;
    label: string;
    placeholder?: string;
    info?: string;
    required?: boolean;
    default?: T;
    disabled?: boolean;
    validate?: (value: any) => string | void;
    db?: DbOptions;
    persist?: boolean;
}
export interface String_OPT extends Base_OPT<string> {
    type: "string";
    min?: number;
    max?: number;
}
export interface Primary_OPT extends Base_OPT<number | string> {
    type: "primary";
    db_type: "number" | "uuid" | "string";
    auto_increment?: boolean;
}
export interface Password_OPT extends Omit<String_OPT, "type"> {
    type: "password";
}
export interface Email_OPT extends Omit<String_OPT, "type"> {
    type: "email";
}
export interface Textarea_OPT extends Base_OPT<string> {
    type: "text-area";
    min?: number;
    max?: number;
    max_lines?: number;
    min_lines?: number;
    allow_formatting?: boolean;
}
export interface Number_OPT extends Base_OPT<number> {
    type: "number";
    min?: number;
    max?: number;
    step?: number;
}
export interface Select_OPT extends Base_OPT<string> {
    type: "select";
    options: {
        value: string;
        label: string;
    }[];
}
export interface Boolean_OPT extends Base_OPT<boolean> {
    type: "boolean";
    default?: boolean;
    variant?: "checkbox" | "switch" | "toggle";
}
export interface Time_OPT extends Base_OPT<string> {
    type: "time";
    min?: string;
    max?: string;
    step?: string;
}
export interface TimeRange_OPT extends Base_OPT<string> {
    type: "time-range";
    min?: string;
    max?: string;
    step?: string;
}
export interface Date_OPT extends Base_OPT<string> {
    type: "date";
    min?: string;
    max?: string;
}
export interface DateRange_OPT extends Base_OPT<string> {
    type: "date-range";
    min?: string;
    max?: string;
}
export type DateTimeValue = string | number | {
    date: string;
    time: string;
};
export interface DateConfig {
    min?: string;
    max?: string;
}
export interface TimeConfig {
    min?: string;
    max?: string;
    step?: string;
}
export interface DateTime_OPT extends Base_OPT<DateTimeValue> {
    type: "datetime";
    date?: DateConfig;
    time?: TimeConfig;
    storage?: "iso" | "timestamp" | "split";
}
export interface Ref_OPT extends Base_OPT<string | number> {
    type: "ref";
    ref: string;
    alias?: string;
    relation?: {
        type: "many-to-one" | "one-to-one";
    };
}
export interface DisplayOnly extends UIElementBase {
    readonly displayOnly: true;
}
export interface PlaneText_OPT extends DisplayOnly {
    type: "plane-text";
    allow_formatting?: boolean;
    text: string;
}
export interface HidableText_OPT extends Omit<PlaneText_OPT, "type"> {
    type: "hidable-text";
    label: string;
}
export interface HintCard_OPT extends DisplayOnly {
    type: "hint-card";
    title?: string;
    variant?: "info" | "warning" | "error" | "success" | "plane";
}
export interface Jsonb_OPT extends Base_OPT<any> {
    type: "jsonb";
}
export type InputField_OPT = Primary_OPT | String_OPT | Password_OPT | Email_OPT | Textarea_OPT | Number_OPT | Select_OPT | Boolean_OPT | Time_OPT | TimeRange_OPT | Date_OPT | DateRange_OPT | DateTime_OPT | Ref_OPT | Jsonb_OPT;
export type DisplayField_OPT = PlaneText_OPT | HidableText_OPT | HintCard_OPT;
export type Field_OPT = InputField_OPT | DisplayField_OPT;
export type NormalizedField_OPT = Field_OPT & {
    section: string;
    path: readonly string[];
};
export type NormalizedInputField_OPT = InputField_OPT & {
    section: string;
    path: readonly string[];
};
//# sourceMappingURL=fields.d.ts.map