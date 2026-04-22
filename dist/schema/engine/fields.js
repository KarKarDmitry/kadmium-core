"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNormalizedFields = getNormalizedFields;
const walker_1 = require("./walker");
function getNormalizedFields(sections) {
    const fields = [];
    (0, walker_1.walkSections)(sections, {
        onSection(section, path) {
            if (!("fields" in section) || !section.fields)
                return;
            const sectionKey = path.join(":");
            for (const field of section.fields) {
                fields.push({
                    ...field,
                    section: sectionKey,
                    path: Object.freeze([...path]),
                });
            }
        },
    });
    return fields;
}
//# sourceMappingURL=fields.js.map