"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cloneWhereGroup = cloneWhereGroup;
/**
 * Deep clones a WhereGroup while preserving objects with Symbol properties
 * (IS_FILTER_BUILDER, IS_QUERY_BUILDER). JSON.stringify would destroy them.
 *
 * Used by:
 * - KadmiumSqb.clone()
 * - SqlGenerator._cloneWhereGroup() (include subquery WHERE cloning)
 */
function cloneWhereGroup(group) {
    return {
        op: group.op,
        conditions: group.conditions.map((cond) => {
            if ("conditions" in cond) {
                return cloneWhereGroup(cond);
            }
            return { ...cond };
        }),
    };
}
//# sourceMappingURL=utils.js.map