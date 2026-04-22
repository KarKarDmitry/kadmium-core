import { ActionGroup_OPT, FormAction_OPT, HrefAction_OPT, SectionActions_OPT } from "./types/actions";
import { Field_OPT, String_OPT, Number_OPT, Boolean_OPT, Date_OPT, DateTime_OPT, Time_OPT, TimeRange_OPT, DateRange_OPT, Ref_OPT, Jsonb_OPT, PlaneText_OPT, HidableText_OPT, HintCard_OPT, Password_OPT, Email_OPT, Primary_OPT } from "./types/fields";
import { Form_OPT } from "./types/form";
import { Schema_OPT } from "./types/schema";
import { Accordion_OPT, Block_OPT, Grid_OPT, InlineSection_OPT, Orientation_OPT, Section_OPT, Table_OPT, Tabs_OPT } from "./types/sections";
import { KadmiumFeature } from "../features/types/base.feature";
import { SchemaCore } from "../core/schema-core";
export declare function schema(opt: {
    collection: string;
    version: string;
    form: Form_OPT;
    is_active?: boolean;
    primary?: Primary_OPT;
    features?: (new (core: SchemaCore) => KadmiumFeature<any>)[];
    folder?: string;
}): Schema_OPT;
export declare function form(opt: {
    sections: Section_OPT[];
    actions?: SectionActions_OPT[];
}): Form_OPT;
export declare const sections: {
    block(opt: Omit<Block_OPT, "_meta" | "type">): Block_OPT;
    inline_block(opt: Omit<InlineSection_OPT, "_meta" | "type" | "variant">): InlineSection_OPT;
    orientation(opt: Omit<Orientation_OPT, "_meta" | "type">): Orientation_OPT;
    grid(opt: Omit<Grid_OPT, "_meta" | "type">): Grid_OPT;
    tabs(opt: Omit<Tabs_OPT, "_meta" | "type">): Tabs_OPT;
    accordion(opt: Omit<Accordion_OPT, "_meta" | "type">): Accordion_OPT;
    table(opt: Omit<Table_OPT, "_meta" | "type">): Table_OPT;
};
export declare function baseField<T extends Field_OPT>(type: T["type"], opt: Omit<T, "_meta" | "type">): T;
export declare const string: (opt: Omit<String_OPT, "_meta" | "type">) => String_OPT;
export declare const primary: (opt: Omit<Primary_OPT, "_meta" | "type">) => Primary_OPT;
export declare const password: (opt: Omit<Password_OPT, "_meta" | "type">) => Password_OPT;
export declare const email: (opt: Omit<Email_OPT, "_meta" | "type">) => Email_OPT;
export declare const number: (opt: Omit<Number_OPT, "_meta" | "type">) => Number_OPT;
export declare const boolean: (opt: Omit<Boolean_OPT, "_meta" | "type">) => Boolean_OPT;
export declare const date: (opt: Omit<Date_OPT, "_meta" | "type">) => Date_OPT;
export declare const datetime: (opt: Omit<DateTime_OPT, "_meta" | "type">) => DateTime_OPT;
export declare const time: (opt: Omit<Time_OPT, "_meta" | "type">) => Time_OPT;
export declare const time_range: (opt: Omit<TimeRange_OPT, "_meta" | "type">) => TimeRange_OPT;
export declare const date_range: (opt: Omit<DateRange_OPT, "_meta" | "type">) => DateRange_OPT;
export declare const ref: (opt: Omit<Ref_OPT, "_meta" | "type">) => Ref_OPT;
export declare const jsonb: (opt: Omit<Jsonb_OPT, "_meta" | "type">) => Jsonb_OPT;
export declare const plane: {
    text: (opt: Omit<PlaneText_OPT, "_meta" | "type">) => PlaneText_OPT;
    hidable: (opt: Omit<HidableText_OPT, "_meta" | "type">) => HidableText_OPT;
    hint_card: (opt: Omit<HintCard_OPT, "_meta" | "type">) => HintCard_OPT;
};
export declare function action(opt: Omit<FormAction_OPT, "_meta">): FormAction_OPT;
export declare function href(opt: Omit<HrefAction_OPT, "_meta">): HrefAction_OPT;
export declare function action_group(opt: Omit<ActionGroup_OPT, "_meta">): ActionGroup_OPT;
//# sourceMappingURL=init.d.ts.map