"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNormalizedSections = getNormalizedSections;
function getNormalizedSections(sections) {
    return sections.map(normalizeSection);
}
function normalizeSection(section) {
    const base = {
        _meta: section._meta,
        key: section.key,
        type: section.type,
        title: section.title,
        order: section.order,
        disabled: section.disabled,
    };
    switch (section.type) {
        case "orientation":
        case "grid":
        case "block":
        case "inline-block":
            return {
                ...base,
                sections: section.sections
                    ? section.sections.map(normalizeSection)
                    : undefined,
            };
        case "tabs":
            return {
                ...base,
                sections: section.tabs.map((tab) => normalizeSection(tab.content)),
            };
        case "accordion":
            return {
                ...base,
                sections: section.items.flatMap((item) => item.sections.map(normalizeSection)),
            };
        case "accordion-item":
            return {
                ...base,
                sections: section.sections.map(normalizeSection),
            };
        case "table":
            return base;
        default:
            return base;
    }
}
//# sourceMappingURL=sections.js.map