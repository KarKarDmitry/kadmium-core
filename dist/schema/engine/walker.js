"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.walkSections = walkSections;
const errors_1 = require("../../core/errors");
function walkSections(sections, visitor, parentPath = []) {
    // 🔐 проверка уникальности на текущем уровне
    const keys = new Set();
    for (const section of sections) {
        if (keys.has(section.key)) {
            const location = parentPath.length ? parentPath.join(":") : "root";
            throw errors_1.Errors.schema.duplicateSection(section.key, location);
        }
        keys.add(section.key);
    }
    for (const section of sections) {
        const currentPath = [...parentPath, section.key];
        visitor.onSection?.(section, currentPath);
        // обычные вложенные sections
        if ("sections" in section && section.sections) {
            walkSections(section.sections, visitor, currentPath);
        }
        // tabs
        if (section.type === "tabs") {
            for (const tab of section.tabs) {
                walkSections([tab.content], visitor, currentPath);
            }
        }
        // accordion
        if (section.type === "accordion") {
            for (const item of section.items) {
                walkSections(item.sections, visitor, currentPath);
            }
        }
    }
}
//# sourceMappingURL=walker.js.map