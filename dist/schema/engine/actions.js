"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFormActions = getFormActions;
exports.getNormalizedActions = getNormalizedActions;
const walker_1 = require("./walker");
function getFormActions(form) {
    if (!form.actions)
        return [];
    return normalizeActionsChunk(form.actions, []);
}
function getNormalizedActions(sections) {
    const actions = [];
    (0, walker_1.walkSections)(sections, {
        onSection(section, path) {
            const sectionKey = path.join(":");
            // 🔹 table actions
            if (section.type === "table" && section.actions) {
                const tableActions = [
                    ...(section.actions.row ?? []),
                    ...(section.actions.bulk ?? []),
                ];
                actions.push(...normalizeActionsChunk(tableActions, path));
            }
            // 🔹 обычные section actions
            if (section.type !== "table" &&
                "actions" in section &&
                Array.isArray(section.actions)) {
                actions.push(...normalizeActionsChunk(section.actions, path));
            }
        },
    });
    return actions;
}
function normalizeActionsChunk(actions, path) {
    const sectionKey = path.join(":");
    const result = [];
    for (const action of actions) {
        if (action._meta === "action-group") {
            result.push(...normalizeActionsChunk(action.actions, path));
            continue;
        }
        result.push({
            ...action,
            section: sectionKey,
            path: Object.freeze([...path]),
        });
    }
    return result;
}
//# sourceMappingURL=actions.js.map