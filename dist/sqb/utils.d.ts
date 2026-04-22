import { WhereGroup } from "./kadmium-sqb";
/**
 * Deep clones a WhereGroup while preserving objects with Symbol properties
 * (IS_FILTER_BUILDER, IS_QUERY_BUILDER). JSON.stringify would destroy them.
 *
 * Used by:
 * - KadmiumSqb.clone()
 * - SqlGenerator._cloneWhereGroup() (include subquery WHERE cloning)
 */
export declare function cloneWhereGroup(group: WhereGroup): WhereGroup;
//# sourceMappingURL=utils.d.ts.map