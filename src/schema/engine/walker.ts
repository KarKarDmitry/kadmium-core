import { Section_OPT } from '../types/sections.js';
import { Errors } from '../../core/errors.js';

export interface SectionVisitor {
    onSection?(section: Section_OPT, path: string[]): void;
}

export function walkSections(
    sections: Section_OPT[],
    visitor: SectionVisitor,
    parentPath: string[] = [],
) {
    // 🔐 проверка уникальности на текущем уровне
    const keys = new Set<string>();

    for (const section of sections) {
        if (keys.has(section.key)) {
            const location = parentPath.length ? parentPath.join(':') : 'root';
            throw Errors.schema.duplicateSection(section.key, location);
        }

        keys.add(section.key);
    }

    for (const section of sections) {
        const currentPath = [...parentPath, section.key];

        visitor.onSection?.(section, currentPath);

        // обычные вложенные sections
        if ('sections' in section && section.sections) {
            walkSections(section.sections, visitor, currentPath);
        }

        // tabs
        if (section.type === 'tabs') {
            for (const tab of section.tabs) {
                walkSections([tab.content], visitor, currentPath);
            }
        }

        // accordion
        if (section.type === 'accordion') {
            for (const item of section.items) {
                walkSections(item.sections, visitor, currentPath);
            }
        }
    }
}
