/**
 * Единая иерархия ошибок Kadmium.
 *
 * Все ошибки фреймворка наследуют KadmiumError и содержат:
 * - module: какой модуль выбросил ошибку
 * - code: машиночитаемый код ошибки
 * - context: дополнительный контекст
 * - timestamp: когда произошла
 * - cause: оригинальная ошибка (если обернули)
 *
 * Использование:
 *   throw Errors.schema.notFound("User");
 *   catch (err) { if (err instanceof SchemaNotFoundError) ... }
 *   catch (err) { if (Errors.is(err, "SCHEMA_NOT_FOUND")) ... }
 */

// ═══ Базовый класс ═══

export class KadmiumError extends Error {
    readonly module: string;
    readonly code: string;
    readonly context?: Record<string, any>;
    readonly timestamp: string;
    readonly cause?: Error;

    constructor(
        module: string,
        code: string,
        message: string,
        context?: Record<string, any>,
        cause?: Error,
    ) {
        super(message);
        this.name = 'KadmiumError';
        this.module = module;
        this.code = code;
        this.context = context;
        this.timestamp = new Date().toISOString();
        this.cause = cause;
    }
}

// ═══ Schema errors ═══

export class SchemaNotFoundError extends KadmiumError {
    constructor(collection: string, cause?: Error) {
        super(
            'schema',
            'SCHEMA_NOT_FOUND',
            `Schema "${collection}" not found`,
            { collection },
            cause,
        );
        this.name = 'SchemaNotFoundError';
    }
}

export class DuplicateFieldError extends KadmiumError {
    constructor(field: string, schema: string, cause?: Error) {
        super(
            'schema',
            'DUPLICATE_FIELD',
            `Duplicate field "${field}" in schema "${schema}"`,
            { field, schema },
            cause,
        );
        this.name = 'DuplicateFieldError';
    }
}

export class ModelMismatchError extends KadmiumError {
    constructor(
        modelName: string,
        modelCollection: string,
        schemaCollection: string,
        cause?: Error,
    ) {
        super(
            'schema',
            'MODEL_MISMATCH',
            `Model "${modelName}" has _collection "${modelCollection}" but expected "${schemaCollection}"`,
            { modelName, modelCollection, schemaCollection },
            cause,
        );
        this.name = 'ModelMismatchError';
    }
}

export class MissingCollectionError extends KadmiumError {
    constructor(cause?: Error) {
        super(
            'schema',
            'MISSING_COLLECTION',
            'Schema must have a "collection" property',
            undefined,
            cause,
        );
        this.name = 'MissingCollectionError';
    }
}

export class MissingPrimaryError extends KadmiumError {
    constructor(collection: string, cause?: Error) {
        super(
            'schema',
            'MISSING_PRIMARY',
            `Schema "${collection}" must have a "primary" field`,
            { collection },
            cause,
        );
        this.name = 'MissingPrimaryError';
    }
}

export class MissingPrimaryNameError extends KadmiumError {
    constructor(collection: string, cause?: Error) {
        super(
            'schema',
            'MISSING_PRIMARY_NAME',
            `Schema "${collection}" primary field must have a "name"`,
            { collection },
            cause,
        );
        this.name = 'MissingPrimaryNameError';
    }
}

export class MissingPrimaryDbTypeError extends KadmiumError {
    constructor(collection: string, cause?: Error) {
        super(
            'schema',
            'MISSING_PRIMARY_DB_TYPE',
            `Schema "${collection}" primary field must have "db_type" ("uuid" | "number" | "string")`,
            { collection },
            cause,
        );
        this.name = 'MissingPrimaryDbTypeError';
    }
}

export class MissingFormError extends KadmiumError {
    constructor(collection: string, cause?: Error) {
        super(
            'schema',
            'MISSING_FORM',
            `Schema "${collection}" must have a "form" property`,
            { collection },
            cause,
        );
        this.name = 'MissingFormError';
    }
}

// ═══ Repo errors ═══

export class RepoNotFoundError extends KadmiumError {
    constructor(schema: string, cause?: Error) {
        super(
            'repo',
            'REPO_NOT_FOUND',
            `Repository for "${schema}" not found`,
            { schema },
            cause,
        );
        this.name = 'RepoNotFoundError';
    }
}

// ═══ Query errors ═══

export class QueryError extends KadmiumError {
    constructor(message: string, context?: Record<string, any>, cause?: Error) {
        super('sqb', 'QUERY_ERROR', message, context, cause);
        this.name = 'QueryError';
    }
}

export class UnsupportedOperationError extends KadmiumError {
    constructor(op: string, cause?: Error) {
        super(
            'sqb',
            'UNSUPPORTED_OPERATION',
            `Unsupported operation: ${op}`,
            { operation: op },
            cause,
        );
        this.name = 'UnsupportedOperationError';
    }
}

export class NoTableContextError extends KadmiumError {
    constructor(cause?: Error) {
        super(
            'sqb',
            'NO_TABLE_CONTEXT',
            'Cannot build query with no table in context',
            undefined,
            cause,
        );
        this.name = 'NoTableContextError';
    }
}

export class UpdateNoDataError extends KadmiumError {
    constructor(cause?: Error) {
        super(
            'sqb',
            'UPDATE_NO_DATA',
            'Update operation requires data',
            undefined,
            cause,
        );
        this.name = 'UpdateNoDataError';
    }
}

export class SingleTableOnlyError extends KadmiumError {
    constructor(op: 'UPDATE' | 'DELETE', cause?: Error) {
        super(
            'sqb',
            'SINGLE_TABLE_ONLY',
            `${op} statements currently support only a single table.`,
            { operation: op },
            cause,
        );
        this.name = 'SingleTableOnlyError';
    }
}

export class RecordNotFoundError extends KadmiumError {
    constructor(collection: string, cause?: Error) {
        super(
            'sqb',
            'RECORD_NOT_FOUND',
            `Record not found in "${collection}"`,
            { collection },
            cause,
        );
        this.name = 'RecordNotFoundError';
    }
}

// ═══ Relation errors ═══

export class RelationNotFoundError extends KadmiumError {
    constructor(relation: string, schema: string, cause?: Error) {
        super(
            'repo',
            'RELATION_NOT_FOUND',
            `Relation "${relation}" not found for schema "${schema}"`,
            { relation, schema },
            cause,
        );
        this.name = 'RelationNotFoundError';
    }
}

export class RelatedSchemaNotFoundError extends KadmiumError {
    constructor(relation: string, toSchema: string, cause?: Error) {
        super(
            'repo',
            'RELATED_SCHEMA_NOT_FOUND',
            `Related schema "${toSchema}" not found for relation "${relation}"`,
            { relation, toSchema },
            cause,
        );
        this.name = 'RelatedSchemaNotFoundError';
    }
}

// ═══ Validation errors ═══

export class ValidationError extends KadmiumError {
    readonly details: { path: string; message: string }[];

    constructor(details: { path: string; message: string }[], cause?: Error) {
        const message = `Validation failed: ${details.map((d) => d.message).join('; ')}`;
        super('validation', 'VALIDATION_FAILED', message, { details }, cause);
        this.name = 'ValidationError';
        this.details = details;
    }
}

// ═══ Feature errors ═══

export class FeatureAbortError extends KadmiumError {
    constructor(operation: string, reason?: string, cause?: Error) {
        super(
            'feature',
            'FEATURE_ABORT',
            `Operation "${operation}" aborted by feature hook: ${reason ?? 'no reason provided'}`,
            { operation, reason },
            cause,
        );
        this.name = 'FeatureAbortError';
    }
}

// ═══ Schema engine errors ═══

export class DuplicateSectionError extends KadmiumError {
    constructor(key: string, location: string, cause?: Error) {
        super(
            'schema',
            'DUPLICATE_SECTION',
            `Duplicate section key "${key}" detected in "${location}"`,
            { key, location },
            cause,
        );
        this.name = 'DuplicateSectionError';
    }
}

// ═══ Config errors ═══

export class NoDbAdapterError extends KadmiumError {
    constructor(cause?: Error) {
        super(
            'config',
            'NO_DB_ADAPTER',
            'No default database adapter has been configured.',
            undefined,
            cause,
        );
        this.name = 'NoDbAdapterError';
    }
}

export class NoDbAdapterConfiguredError extends KadmiumError {
    constructor(cause?: Error) {
        super(
            'config',
            'NO_DB_ADAPTER_CONFIGURED',
            'No database adapter has been configured.',
            undefined,
            cause,
        );
        this.name = 'NoDbAdapterConfiguredError';
    }
}

export class canNotLoadConfig extends KadmiumError {
    constructor(cause?: Error) {
        super(
            'config',
            'CANT_LOAD_APP_CONFIG',
            'Cant load Kadmium config.',
            undefined,
            cause,
        );
        this.name = 'canNotLoadConfig';
    }
}

// ═══ Route errors ═══

export class UnsupportedMethodError extends KadmiumError {
    constructor(method: string, cause?: Error) {
        super(
            'route',
            'UNSUPPORTED_METHOD',
            `Express does not support method "${method}". Supported: get, post, put, delete, patch.`,
            { method },
            cause,
        );
        this.name = 'UnsupportedMethodError';
    }
}

// ═══ Query alias errors ═══

export class InvalidAliasError extends KadmiumError {
    constructor(alias: string, cause?: Error) {
        super(
            'sqb',
            'INVALID_ALIAS',
            `Invalid alias "${alias}" used in query.`,
            { alias },
            cause,
        );
        this.name = 'InvalidAliasError';
    }
}

export class EmptyAliasesError extends KadmiumError {
    constructor(cause?: Error) {
        super(
            'sqb',
            'EMPTY_ALIASES',
            'query() must be called with a non-empty object of aliases.',
            undefined,
            cause,
        );
        this.name = 'EmptyAliasesError';
    }
}

// ═══ Adapter errors ═══

export class AdapterNotCompiledError extends KadmiumError {
    constructor(cause?: Error) {
        super(
            'validation',
            'ADAPTER_NOT_COMPILED',
            'Adapter not compiled. Call core.init() first.',
            undefined,
            cause,
        );
        this.name = 'AdapterNotCompiledError';
    }
}

export class NestedTransactionError extends KadmiumError {
    constructor(cause?: Error) {
        super(
            'sqb',
            'NESTED_TRANSACTION',
            'Cannot begin a transaction within another transaction.',
            undefined,
            cause,
        );
        this.name = 'NestedTransactionError';
    }
}

export class NoAliasForTableError extends KadmiumError {
    constructor(cause?: Error) {
        super(
            'sqb',
            'NO_ALIAS_FOR_TABLE',
            'FieldReferenceBuilder requires an alias to specify the table.',
            undefined,
            cause,
        );
        this.name = 'NoAliasForTableError';
    }
}

// ═══ Фабрика-хелпер ═══

export const Errors = {
    schema: {
        notFound: (collection: string, cause?: Error) =>
            new SchemaNotFoundError(collection, cause),
        duplicateField: (field: string, schema: string, cause?: Error) =>
            new DuplicateFieldError(field, schema, cause),
        duplicateSection: (key: string, location: string, cause?: Error) =>
            new DuplicateSectionError(key, location, cause),
        modelMismatch: (
            modelName: string,
            modelCollection: string,
            schemaCollection: string,
            cause?: Error,
        ) =>
            new ModelMismatchError(
                modelName,
                modelCollection,
                schemaCollection,
                cause,
            ),
        missingCollection: (cause?: Error) => new MissingCollectionError(cause),
        missingPrimary: (collection: string, cause?: Error) =>
            new MissingPrimaryError(collection, cause),
        missingPrimaryName: (collection: string, cause?: Error) =>
            new MissingPrimaryNameError(collection, cause),
        missingPrimaryDbType: (collection: string, cause?: Error) =>
            new MissingPrimaryDbTypeError(collection, cause),
        missingForm: (collection: string, cause?: Error) =>
            new MissingFormError(collection, cause),
    },
    repo: {
        notFound: (schema: string, cause?: Error) =>
            new RepoNotFoundError(schema, cause),
        relationNotFound: (relation: string, schema: string, cause?: Error) =>
            new RelationNotFoundError(relation, schema, cause),
        relatedSchemaNotFound: (
            relation: string,
            toSchema: string,
            cause?: Error,
        ) => new RelatedSchemaNotFoundError(relation, toSchema, cause),
    },
    query: {
        error: (
            message: string,
            context?: Record<string, any>,
            cause?: Error,
        ) => new QueryError(message, context, cause),
        unsupportedOp: (op: string, cause?: Error) =>
            new UnsupportedOperationError(op, cause),
        noTableContext: (cause?: Error) => new NoTableContextError(cause),
        updateNoData: (cause?: Error) => new UpdateNoDataError(cause),
        singleTableOnly: (op: 'UPDATE' | 'DELETE', cause?: Error) =>
            new SingleTableOnlyError(op, cause),
        notFound: (collection: string, cause?: Error) =>
            new RecordNotFoundError(collection, cause),
        invalidAlias: (alias: string, cause?: Error) =>
            new InvalidAliasError(alias, cause),
        emptyAliases: (cause?: Error) => new EmptyAliasesError(cause),
        noAliasForTable: (cause?: Error) => new NoAliasForTableError(cause),
        nestedTransaction: (cause?: Error) => new NestedTransactionError(cause),
    },
    validation: {
        failed: (details: { path: string; message: string }[], cause?: Error) =>
            new ValidationError(details, cause),
        adapterNotCompiled: (cause?: Error) =>
            new AdapterNotCompiledError(cause),
    },
    feature: {
        abort: (operation: string, reason?: string, cause?: Error) =>
            new FeatureAbortError(operation, reason, cause),
    },
    config: {
        noDbAdapter: (cause?: Error) => new NoDbAdapterError(cause),
        noDbAdapterConfigured: (cause?: Error) =>
            new NoDbAdapterConfiguredError(cause),
        canNotLoadConfig: (cause?: any) => new canNotLoadConfig(cause),
    },
    route: {
        unsupportedMethod: (method: string, cause?: Error) =>
            new UnsupportedMethodError(method, cause),
    },

    /** Проверить, является ли ошибка KadmiumError с указанным кодом */
    is: (err: unknown, code: string): err is KadmiumError =>
        err instanceof KadmiumError && err.code === code,
};
