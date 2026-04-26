import { AnyModel } from '../../model/model.js';
import { AppCore } from '../../core/app-core.js';
import { SchemaCore } from '../../core/schema-core.js';
import { KadmiumSqb } from '../../sqb/kadmium-sqb.js';
import { FilterProxy } from '../types/query/index.js';
import { Ref_OPT } from '../../schema/types/fields.js';
import { BaseFilterBuilder } from '../field-builders/base-filter.builder.js';
import { NullableMixin } from '../field-builders/nullable.mixin.js';
import { BooleanFilterBuilder } from '../field-builders/boolean-filter.builder.js';
import { DateFilterBuilder } from '../field-builders/date-filter.builder.js';
import { NumberFilterBuilder } from '../field-builders/number-filter.builder.js';
import { StringFilterBuilder } from '../field-builders/string-filter.builder.js';

/**
 * Determines the correct filter builder class for a field definition.
 */
function getFilterBuilderClass(
    fieldDef: ReturnType<SchemaCore['registry']['fieldsByName']['get']>,
    appCore: AppCore,
): new (
    sqb: KadmiumSqb<any>,
    field: any,
    alias?: string,
) => BaseFilterBuilder<any, any> {
    if (!fieldDef) return StringFilterBuilder;

    switch (fieldDef.type) {
        case 'primary':
            return fieldDef.db_type === 'number'
                ? NumberFilterBuilder
                : StringFilterBuilder;
        case 'date':
        case 'datetime':
        case 'time':
            return DateFilterBuilder;
        case 'boolean':
            return BooleanFilterBuilder;
        case 'ref': {
            const refCollectionName = (fieldDef as Ref_OPT).ref;
            const refSchema = appCore.schemas.find(
                (s) => s.collection === refCollectionName,
            );
            if (!refSchema) return StringFilterBuilder;
            return refSchema.normalized.primary.db_type === 'number'
                ? NumberFilterBuilder
                : StringFilterBuilder;
        }
        default:
            return StringFilterBuilder;
    }
}

/**
 * Creates a Proxy-based FilterProxy<T> that returns appropriately-typed
 * filter builder instances for each field access.
 */
export function createFilterProxy<T extends AnyModel>(
    sqb: KadmiumSqb<any>,
    schemaCore: SchemaCore,
    appCore: AppCore,
    alias: string,
): FilterProxy<T> {
    return new Proxy(
        {},
        {
            get: (_target: {}, prop: string | symbol) => {
                if (typeof prop === 'symbol') return undefined;
                const fieldName = prop as keyof T;
                const fieldDef = schemaCore.registry.fieldsByName.get(
                    fieldName as string,
                );
                if (!fieldDef) return {};

                const builderClass = getFilterBuilderClass(fieldDef, appCore);
                const isNullable =
                    fieldDef.required === false ||
                    fieldDef.db?.nullable === true;

                if (isNullable) {
                    const NullableBuilder = NullableMixin(builderClass);
                    return new NullableBuilder(sqb, fieldName, alias);
                }

                return new builderClass(sqb, fieldName, alias);
            },
        },
    ) as FilterProxy<T>;
}
