"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.plane = exports.jsonb = exports.ref = exports.date_range = exports.time_range = exports.time = exports.datetime = exports.date = exports.boolean = exports.number = exports.email = exports.password = exports.primary = exports.string = exports.sections = void 0;
exports.schema = schema;
exports.form = form;
exports.baseField = baseField;
exports.action = action;
exports.href = href;
exports.action_group = action_group;
function schema(opt) {
    // Use the provided primary key or create a default one.
    const primaryKey = opt.primary ??
        (0, exports.primary)({
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
function form(opt) {
    return {
        _meta: "form",
        actions: opt.actions ?? [],
        sections: opt.sections,
    };
}
// sections
//
function baseSection(type, opt) {
    return {
        _meta: "section",
        type,
        ...opt,
        title: opt.title ?? opt.key,
        order: opt.order ?? 0,
        disabled: opt.disabled ?? false,
    };
}
exports.sections = {
    block(opt) {
        return baseSection("block", opt);
    },
    inline_block(opt) {
        return baseSection("inline-block", opt);
    },
    orientation(opt) {
        return baseSection("orientation", opt);
    },
    grid(opt) {
        return baseSection("grid", opt);
    },
    tabs(opt) {
        return baseSection("tabs", opt);
    },
    accordion(opt) {
        return baseSection("accordion", opt);
    },
    table(opt) {
        return baseSection("table", opt);
    },
};
// fields
//
function baseField(type, opt) {
    return {
        _meta: "field",
        type,
        required: false,
        disabled: false,
        order: 0,
        ...opt,
    };
}
const string = (opt) => baseField("string", opt);
exports.string = string;
const primary = (opt) => {
    const field = baseField("primary", opt);
    // Primary keys should always be required.
    field.required = true;
    return field;
};
exports.primary = primary;
const password = (opt) => baseField("password", opt);
exports.password = password;
const email = (opt) => baseField("email", opt);
exports.email = email;
const number = (opt) => baseField("number", opt);
exports.number = number;
const boolean = (opt) => baseField("boolean", opt);
exports.boolean = boolean;
const date = (opt) => baseField("date", opt);
exports.date = date;
const datetime = (opt) => {
    // Provide default empty objects for date and time configs if they are not provided.
    const optionsWithDefaults = {
        ...opt,
        date: opt.date || {},
        time: opt.time || {},
        storage: opt.storage || "iso",
    };
    return baseField("datetime", optionsWithDefaults);
};
exports.datetime = datetime;
const time = (opt) => baseField("time", opt);
exports.time = time;
const time_range = (opt) => baseField("time-range", opt);
exports.time_range = time_range;
const date_range = (opt) => baseField("date-range", opt);
exports.date_range = date_range;
const ref = (opt) => baseField("ref", opt);
exports.ref = ref;
const jsonb = (opt) => baseField("jsonb", opt);
exports.jsonb = jsonb;
exports.plane = {
    text: (opt) => baseField("plane-text", opt),
    hidable: (opt) => baseField("hidable-text", opt),
    hint_card: (opt) => baseField("hint-card", opt),
};
// actions
//
function baseAction(typeDefaults, opt) {
    return {
        _meta: "action",
        ...typeDefaults,
        ...opt,
    };
}
function action(opt) {
    return baseAction({ position: "standard", align: "right", variant: "primary" }, opt);
}
function href(opt) {
    return baseAction({ position: "standard", align: "right" }, opt);
}
function action_group(opt) {
    return {
        _meta: "action-group",
        variant: "primary",
        position: "standard",
        align: "right",
        ...opt,
    };
}
//# sourceMappingURL=init.js.map