"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseWhereBuilder = void 0;
class BaseWhereBuilder {
    // Each builder instance operates on a specific group within the tree
    constructor(_sqb, _proxy, _group) {
        this._sqb = _sqb;
        this._proxy = _proxy;
        this._group = _group;
    }
    _add(clause, op) {
        // Set operator for the current group if it's the first condition
        if (this._group.conditions.length === 0) {
            this._group.op = op;
        }
        // If operators differ at the same level, we must restructure the tree.
        // This ensures that `where(A).or(B).and(C)` becomes `(A OR B) AND C`.
        else if (this._group.op !== op) {
            const existingGroup = {
                op: this._group.op,
                conditions: this._group.conditions,
            };
            this._group.op = op;
            this._group.conditions = [existingGroup];
        }
        // Handle Grouping: clause is passed as [(group) => void]
        if (Array.isArray(clause)) {
            const newGroup = { op: "AND", conditions: [] };
            // Temporarily swap the group context on the current builder instance
            const originalGroup = this._group;
            this._group = newGroup;
            try {
                clause[0](this);
            }
            finally {
                this._group = originalGroup;
            }
            if (newGroup.conditions.length > 0) {
                this._group.conditions.push(newGroup);
            }
        }
        // Handle Simple Condition: clause is (fields) => WhereCondition
        else {
            const condition = clause(this._proxy);
            this._group.conditions.push(condition);
        }
        return this;
    }
    /**
     * Adds a nested where group (parenthesized conditions).
     * @example repo.where(e => e.active.eq(true)).group(q => q.where(e => e.name.eq("A")).or(e => e.name.eq("B")))
     */
    group(callback) {
        const newGroup = { op: "AND", conditions: [] };
        // Temporarily swap the group context on the current builder instance
        const originalGroup = this._group;
        this._group = newGroup;
        try {
            callback(this);
        }
        finally {
            this._group = originalGroup;
        }
        if (newGroup.conditions.length > 0) {
            this._group.conditions.push(newGroup);
        }
        return this;
    }
    where(clause) {
        if (Array.isArray(clause)) {
            return this.group(clause[0]);
        }
        return this._add(clause, "AND");
    }
    and(clause) {
        return this._add(clause, "AND");
    }
    or(clause) {
        return this._add(clause, "OR");
    }
}
exports.BaseWhereBuilder = BaseWhereBuilder;
//# sourceMappingURL=builder.base.js.map