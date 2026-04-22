import { AppCore } from "../../core/app-core";
import { SchemaCore } from "../../core/schema-core";
import { IncludedRelation, WhereGroup } from "../../sqb/kadmium-sqb";
import { JoinOptions } from "../types/query";
import { IRelationBuilder } from "../field-builders/relation-builder";
/**
 * Resolves include metadata from a relation builder into an IncludedRelation.
 *
 * @param parentKey - The key to look up the relation in the relation map.
 *   For single-table queries this is `parentAlias`, for multi-table it's `parentCollectionName`.
 */
export declare function resolveInclude(relBuilder: IRelationBuilder<any, any, any, any, any>, parentCollectionName: string, appCore: AppCore, 
/** SchemaCore of the model that owns the relation (the "parent" in the include chain) */
parentSchemaCore: SchemaCore): IncludedRelation;
/**
 * Updates table alias references in a WhereGroup tree.
 * Used when re-aliasing a cloned SQB.
 */
export declare function updateWhereAlias(group: WhereGroup, oldAlias: string, newAlias: string): void;
/**
 * Updates table alias references in JoinOptions[].on conditions.
 * Used alongside updateWhereAlias when cloning a relation builder via .as().
 */
export declare function updateJoinAliases(joins: JoinOptions[], oldAlias: string, newAlias: string): void;
//# sourceMappingURL=include-resolver.d.ts.map