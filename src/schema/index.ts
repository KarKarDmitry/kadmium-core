import {
  ActionGroup_OPT,
  BaseAction_OPT,
  FormAction_OPT,
  HrefAction_OPT,
  SectionActions_OPT,
} from "./types/actions.js";
import {
  Field_OPT,
  String_OPT,
  Number_OPT,
  Boolean_OPT,
  Date_OPT,
  DateTime_OPT,
  Time_OPT,
  TimeRange_OPT,
  DateRange_OPT,
  Ref_OPT,
  Jsonb_OPT,
  PlaneText_OPT,
  HidableText_OPT,
  HintCard_OPT,
  Password_OPT,
  Email_OPT,
  Primary_OPT,
} from "./types/fields.js";
import { Form_OPT } from "./types/form.js";
import { Schema_OPT } from "./types/schema.js";
import {
  Accordion_OPT,
  Block_OPT,
  Grid_OPT,
  InlineSection_OPT,
  Orientation_OPT,
  Section_OPT,
  Table_OPT,
  Tabs_OPT,
} from "./types/sections.js";
import { KadmiumFeature } from "../features/types/base.feature.js";
import { SchemaCore } from "../core/schema-core.js";
import { FeatureModel } from "../model/types.js";

export function schema(opt: {
  collection: string;
  version: string;
  form: Form_OPT;
  is_active?: boolean;
  primary?: Primary_OPT;
  features?: (new (core: SchemaCore) => KadmiumFeature<any>)[];
  folder?: string;
}): Schema_OPT {
  // Use the provided primary key or create a default one.
  const primaryKey =
    opt.primary ??
    primary({
      name: "id",
      label: "ID",
      required: true,
      db_type: "number",
      auto_increment: true,
      db: { nullable: false },
    });

  return {
    _meta: "schema",
    is_active: true,
    collection: opt.collection,
    version: opt.version,
    form: opt.form,
    primary: primaryKey, // Always assign the primary key
    features: opt.features,
    folder: opt.folder,
  };
}

export function form(opt: {
  sections: Section_OPT[];
  actions?: SectionActions_OPT[];
}): Form_OPT {
  return {
    _meta: "form",
    actions: opt.actions ?? [],
    sections: opt.sections,
  };
}

// sections
//

function baseSection<T extends Section_OPT>(
  type: T["type"],
  opt: Omit<T, "_meta" | "type" | "key" | "variant"> & { key: string },
): T {
  return {
    _meta: "section",
    type,
    ...opt,
    title: opt.title ?? opt.key,
    order: opt.order ?? 0,
    disabled: opt.disabled ?? false,
  } as T;
}

export const sections = {
  block(opt: Omit<Block_OPT, "_meta" | "type">): Block_OPT {
    return baseSection("block", opt);
  },

  inline_block(
    opt: Omit<InlineSection_OPT, "_meta" | "type" | "variant">,
  ): InlineSection_OPT {
    return baseSection("inline-block", opt);
  },

  orientation(opt: Omit<Orientation_OPT, "_meta" | "type">): Orientation_OPT {
    return baseSection("orientation", opt);
  },

  grid(opt: Omit<Grid_OPT, "_meta" | "type">): Grid_OPT {
    return baseSection("grid", opt);
  },

  tabs(opt: Omit<Tabs_OPT, "_meta" | "type">): Tabs_OPT {
    return baseSection("tabs", opt);
  },

  accordion(opt: Omit<Accordion_OPT, "_meta" | "type">): Accordion_OPT {
    return baseSection("accordion", opt);
  },

  table(opt: Omit<Table_OPT, "_meta" | "type">): Table_OPT {
    return baseSection("table", opt);
  },
};

// fields
//

export function baseField<T extends Field_OPT>(
  type: T["type"],
  opt: Omit<T, "_meta" | "type">,
): T {
  return {
    _meta: "field",
    type,
    required: false,
    disabled: false,
    order: 0,
    ...opt,
  } as T;
}

export const string = (opt: Omit<String_OPT, "_meta" | "type">) =>
  baseField<String_OPT>("string", opt);

export const primary = (opt: Omit<Primary_OPT, "_meta" | "type">) => {
  const field = baseField<Primary_OPT>("primary", opt);
  // Primary keys should always be required.
  field.required = true;
  return field;
};

export const password = (opt: Omit<Password_OPT, "_meta" | "type">) =>
  baseField<Password_OPT>("password", opt);

export const email = (opt: Omit<Email_OPT, "_meta" | "type">) =>
  baseField<Email_OPT>("email", opt);

export const number = (opt: Omit<Number_OPT, "_meta" | "type">) =>
  baseField<Number_OPT>("number", opt);

export const boolean = (opt: Omit<Boolean_OPT, "_meta" | "type">) =>
  baseField<Boolean_OPT>("boolean", opt);

export const date = (opt: Omit<Date_OPT, "_meta" | "type">) =>
  baseField<Date_OPT>("date", opt);

export const datetime = (opt: Omit<DateTime_OPT, "_meta" | "type">) => {
  // Provide default empty objects for date and time configs if they are not provided.
  const optionsWithDefaults = {
    ...opt,
    date: opt.date || {},
    time: opt.time || {},
    storage: opt.storage || "iso",
  };
  return baseField<DateTime_OPT>("datetime", optionsWithDefaults);
};

export const time = (opt: Omit<Time_OPT, "_meta" | "type">) =>
  baseField<Time_OPT>("time", opt);

export const time_range = (opt: Omit<TimeRange_OPT, "_meta" | "type">) =>
  baseField<TimeRange_OPT>("time-range", opt);

export const date_range = (opt: Omit<DateRange_OPT, "_meta" | "type">) =>
  baseField<DateRange_OPT>("date-range", opt);

export const ref = (opt: Omit<Ref_OPT, "_meta" | "type">) =>
  baseField<Ref_OPT>("ref", opt);

export const jsonb = (opt: Omit<Jsonb_OPT, "_meta" | "type">) =>
  baseField<Jsonb_OPT>("jsonb", opt);

export const plane = {
  text: (opt: Omit<PlaneText_OPT, "_meta" | "type">) =>
    baseField<PlaneText_OPT>("plane-text", opt),

  hidable: (opt: Omit<HidableText_OPT, "_meta" | "type">) =>
    baseField<HidableText_OPT>("hidable-text", opt),

  hint_card: (opt: Omit<HintCard_OPT, "_meta" | "type">) =>
    baseField<HintCard_OPT>("hint-card", opt),
};

// actions
//

function baseAction<T extends BaseAction_OPT>(
  typeDefaults: Partial<T>,
  opt: Omit<T, "_meta">,
): T {
  return {
    _meta: "action",
    ...typeDefaults,
    ...opt,
  } as T;
}

export function action(opt: Omit<FormAction_OPT, "_meta">) {
  return baseAction<FormAction_OPT>(
    { position: "standard", align: "right", variant: "primary" },
    opt,
  );
}

export function href(opt: Omit<HrefAction_OPT, "_meta">): HrefAction_OPT {
  return baseAction<HrefAction_OPT>(
    { position: "standard", align: "right" },
    opt,
  );
}

export function action_group(
  opt: Omit<ActionGroup_OPT, "_meta">,
): ActionGroup_OPT {
  return {
    _meta: "action-group",
    variant: "primary",
    position: "standard",
    align: "right",
    ...opt,
  };
}
