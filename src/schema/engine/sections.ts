import { SectionActions_OPT } from '../types/actions.js';
import { Field_OPT, NormalizedField_OPT } from '../types/fields.js';
import {
    BaseSection_OPT,
    FieldHandler,
    NormalizedSection_OPT,
    Section_OPT,
} from '../types/sections.js';

export function getNormalizedSections(
    sections: Section_OPT[],
): NormalizedSection_OPT[] {
    return sections.map(normalizeSection);
}

function normalizeSection(section: Section_OPT): NormalizedSection_OPT {
    const base: NormalizedSection_OPT = {
        _meta: section._meta,
        key: section.key,
        type: section.type,
        title: section.title,
        order: section.order,
        disabled: section.disabled,
    };

    switch (section.type) {
        case 'orientation':
        case 'grid':
        case 'block':
        case 'inline-block':
            return {
                ...base,
                sections: section.sections
                    ? section.sections.map(normalizeSection)
                    : undefined,
            };

        case 'tabs':
            return {
                ...base,
                sections: section.tabs.map((tab) =>
                    normalizeSection(tab.content),
                ),
            };

        case 'accordion':
            return {
                ...base,
                sections: section.items.flatMap((item) =>
                    item.sections.map(normalizeSection),
                ),
            };

        case 'accordion-item':
            return {
                ...base,
                sections: section.sections.map(normalizeSection),
            };

        case 'table':
            return base;

        default:
            return base;
    }
}
