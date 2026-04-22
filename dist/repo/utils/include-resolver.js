"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveInclude = resolveInclude;
exports.updateWhereAlias = updateWhereAlias;
exports.updateJoinAliases = updateJoinAliases;
const errors_1 = require("../../core/errors");
/**
 * Resolves include metadata from a relation builder into an IncludedRelation.
 *
 * @param parentKey - The key to look up the relation in the relation map.
 *   For single-table queries this is `parentAlias`, for multi-table it's `parentCollectionName`.
 */
function resolveInclude(relBuilder, parentCollectionName, appCore, 
/** SchemaCore of the model that owns the relation (the "parent" in the include chain) */
parentSchemaCore) {
    const relationMetadata = appCore.relationMap.get(`${parentCollectionName}:${relBuilder.originalName}`);
    if (!relationMetadata) {
        throw errors_1.Errors.repo.relationNotFound(relBuilder.originalName, relBuilder.parentCollectionName);
    }
    const relatedSchemaCore = appCore.schemas.find((s) => s.collection === relationMetadata.toSchema);
    if (!relatedSchemaCore) {
        throw errors_1.Errors.repo.relatedSchemaNotFound(relBuilder.originalName, relationMetadata.toSchema);
    }
    const { parentField, childField } = resolveJoinFields(relationMetadata, parentSchemaCore, relatedSchemaCore);
    return {
        parentAlias: relBuilder.parentAlias,
        propertyName: relBuilder.alias,
        relationType: relationMetadata.type,
        internalSqb: relBuilder.internalSqb,
        relatedSchemaCore,
        parentField,
        childField,
    };
}
/**
 * Updates table alias references in a WhereGroup tree.
 * Used when re-aliasing a cloned SQB.
 */
function updateWhereAlias(group, oldAlias, newAlias) {
    group.conditions.forEach((condition) => {
        if ("conditions" in condition) {
            updateWhereAlias(condition, oldAlias, newAlias);
        }
        else if (condition.alias === oldAlias) {
            condition.alias = newAlias;
        }
    });
}
/**
 * Updates table alias references in JoinOptions[].on conditions.
 * Used alongside updateWhereAlias when cloning a relation builder via .as().
 */
function updateJoinAliases(joins, oldAlias, newAlias) {
    for (const join of joins) {
        if (!join.on)
            continue;
        const on = join.on;
        if (on.alias === oldAlias) {
            on.alias = newAlias;
        }
        // Recursively update nested where groups in join.on
        if (on.conditions) {
            updateWhereAlias(on, oldAlias, newAlias);
        }
    }
}
/**
 * Determines the join fields based on relation type.
 */
function resolveJoinFields(relationMetadata, parentSchemaCore, relatedSchemaCore) {
    if (relationMetadata.type === "many-to-one" ||
        relationMetadata.type === "one-to-one") {
        return {
            parentField: relationMetadata.fromField,
            childField: relatedSchemaCore.normalized.primary.name,
        };
    }
    // one-to-many (inverse)
    return {
        parentField: parentSchemaCore.normalized.primary.name,
        childField: relationMetadata.inverseName,
    };
}
//# sourceMappingURL=include-resolver.js.map