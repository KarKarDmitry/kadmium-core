import { AppCore } from '../../core/app-core.js';
import { SchemaCore } from '../../core/schema-core.js';
import {
    IncludedRelation,
    WhereCondition,
    WhereGroup,
} from '../../sqb/kadmium-sqb.js';
import { JoinOptions } from '../types/query/index.js';
import { IRelationBuilder } from '../field-builders/relation-builder.js';
import { RelationMetadata } from '../types/relations.js';
import { Errors } from '../../core/errors.js';

/**
 * Resolves include metadata from a relation builder into an IncludedRelation.
 *
 * @param parentKey - The key to look up the relation in the relation map.
 *   For single-table queries this is `parentAlias`, for multi-table it's `parentCollectionName`.
 */
export function resolveInclude(
    relBuilder: IRelationBuilder<any, any, any, any, any>,
    parentCollectionName: string,
    appCore: AppCore,
    /** SchemaCore of the model that owns the relation (the "parent" in the include chain) */
    parentSchemaCore: SchemaCore,
): IncludedRelation {
    const relationMetadata = appCore.relationMap.get(
        `${parentCollectionName}:${relBuilder.originalName}`,
    );

    if (!relationMetadata) {
        throw Errors.repo.relationNotFound(
            relBuilder.originalName,
            relBuilder.parentCollectionName,
        );
    }

    const relatedSchemaCore = appCore.schemas.find(
        (s) => s.collection === relationMetadata.toSchema,
    );

    if (!relatedSchemaCore) {
        throw Errors.repo.relatedSchemaNotFound(
            relBuilder.originalName,
            relationMetadata.toSchema,
        );
    }

    const { parentField, childField } = resolveJoinFields(
        relationMetadata,
        parentSchemaCore,
        relatedSchemaCore,
    );

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
export function updateWhereAlias(
    group: WhereGroup,
    oldAlias: string,
    newAlias: string,
): void {
    group.conditions.forEach((condition) => {
        if ('conditions' in condition) {
            updateWhereAlias(condition, oldAlias, newAlias);
        } else if (condition.alias === oldAlias) {
            condition.alias = newAlias;
        }
    });
}

/**
 * Updates table alias references in JoinOptions[].on conditions.
 * Used alongside updateWhereAlias when cloning a relation builder via .as().
 */
export function updateJoinAliases(
    joins: JoinOptions[],
    oldAlias: string,
    newAlias: string,
): void {
    for (const join of joins) {
        if (!join.on) continue;
        const on = join.on as WhereCondition & {
            conditions?: Array<WhereCondition | WhereGroup>;
        };
        if (on.alias === oldAlias) {
            on.alias = newAlias;
        }
        // Recursively update nested where groups in join.on
        if (on.conditions) {
            updateWhereAlias(on as WhereGroup, oldAlias, newAlias);
        }
    }
}

/**
 * Determines the join fields based on relation type.
 */
function resolveJoinFields(
    relationMetadata: RelationMetadata,
    parentSchemaCore: SchemaCore,
    relatedSchemaCore: SchemaCore,
): { parentField: string; childField: string } {
    if (
        relationMetadata.type === 'many-to-one' ||
        relationMetadata.type === 'one-to-one'
    ) {
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
