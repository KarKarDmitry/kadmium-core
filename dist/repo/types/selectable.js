"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SelectableField = void 0;
class SelectableField {
    constructor(source, alias) {
        this.source = source;
        this.alias = alias;
        this.fieldType = "selectable-field";
    }
    as(alias) {
        return new SelectableField(this.source, alias);
    }
}
exports.SelectableField = SelectableField;
//# sourceMappingURL=selectable.js.map