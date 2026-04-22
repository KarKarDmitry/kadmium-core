"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNormalizedForm = getNormalizedForm;
const sections_1 = require("./sections");
function getNormalizedForm(form) {
    return {
        _meta: form._meta,
        sections: (0, sections_1.getNormalizedSections)(form.sections),
    };
}
//# sourceMappingURL=form.js.map