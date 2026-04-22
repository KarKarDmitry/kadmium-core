"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToManyRelationHandle = exports.ToOneRelationHandle = exports.RelationBase = void 0;
const symbols_1 = require("../symbols");
// --- RELATION CLASSES (Future Refactoring) ---
class RelationBase {
}
exports.RelationBase = RelationBase;
class ToOneRelationHandle extends RelationBase {
    constructor(metadata) {
        super();
        this.metadata = metadata;
    }
}
exports.ToOneRelationHandle = ToOneRelationHandle;
class ToManyRelationHandle extends RelationBase {
    constructor(metadata) {
        super();
        this.metadata = metadata;
    }
}
exports.ToManyRelationHandle = ToManyRelationHandle;
//# sourceMappingURL=relations.js.map