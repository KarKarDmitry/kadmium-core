import { WhereGroup } from './kadmium-sqb.js';

/**
 * Deep clones a WhereGroup while preserving objects with Symbol properties
 * (IS_FILTER_BUILDER, IS_QUERY_BUILDER). JSON.stringify would destroy them.
 *
 * Used by:
 * - KadmiumSqb.clone()
 * - SqlGenerator._cloneWhereGroup() (include subquery WHERE cloning)
 */
export function cloneWhereGroup(group: WhereGroup): WhereGroup {
    return {
        op: group.op,
        conditions: group.conditions.map((cond) => {
            if ('conditions' in cond) {
                return cloneWhereGroup(cond);
            }
            return { ...cond };
        }),
    };
}
