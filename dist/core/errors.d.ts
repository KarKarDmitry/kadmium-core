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
export declare class KadmiumError extends Error {
    readonly module: string;
    readonly code: string;
    readonly context?: Record<string, any>;
    readonly timestamp: string;
    readonly cause?: Error;
    constructor(module: string, code: string, message: string, context?: Record<string, any>, cause?: Error);
}
export declare class SchemaNotFoundError extends KadmiumError {
    constructor(collection: string, cause?: Error);
}
export declare class DuplicateFieldError extends KadmiumError {
    constructor(field: string, schema: string, cause?: Error);
}
export declare class ModelMismatchError extends KadmiumError {
    constructor(modelName: string, modelCollection: string, schemaCollection: string, cause?: Error);
}
export declare class MissingCollectionError extends KadmiumError {
    constructor(cause?: Error);
}
export declare class MissingPrimaryError extends KadmiumError {
    constructor(collection: string, cause?: Error);
}
export declare class MissingPrimaryNameError extends KadmiumError {
    constructor(collection: string, cause?: Error);
}
export declare class MissingPrimaryDbTypeError extends KadmiumError {
    constructor(collection: string, cause?: Error);
}
export declare class MissingFormError extends KadmiumError {
    constructor(collection: string, cause?: Error);
}
export declare class RepoNotFoundError extends KadmiumError {
    constructor(schema: string, cause?: Error);
}
export declare class QueryError extends KadmiumError {
    constructor(message: string, context?: Record<string, any>, cause?: Error);
}
export declare class UnsupportedOperationError extends KadmiumError {
    constructor(op: string, cause?: Error);
}
export declare class NoTableContextError extends KadmiumError {
    constructor(cause?: Error);
}
export declare class UpdateNoDataError extends KadmiumError {
    constructor(cause?: Error);
}
export declare class SingleTableOnlyError extends KadmiumError {
    constructor(op: "UPDATE" | "DELETE", cause?: Error);
}
export declare class RecordNotFoundError extends KadmiumError {
    constructor(collection: string, cause?: Error);
}
export declare class RelationNotFoundError extends KadmiumError {
    constructor(relation: string, schema: string, cause?: Error);
}
export declare class RelatedSchemaNotFoundError extends KadmiumError {
    constructor(relation: string, toSchema: string, cause?: Error);
}
export declare class ValidationError extends KadmiumError {
    readonly details: {
        path: string;
        message: string;
    }[];
    constructor(details: {
        path: string;
        message: string;
    }[], cause?: Error);
}
export declare class FeatureAbortError extends KadmiumError {
    constructor(operation: string, reason?: string, cause?: Error);
}
export declare class DuplicateSectionError extends KadmiumError {
    constructor(key: string, location: string, cause?: Error);
}
export declare class NoDbAdapterError extends KadmiumError {
    constructor(cause?: Error);
}
export declare class NoDbAdapterConfiguredError extends KadmiumError {
    constructor(cause?: Error);
}
export declare class UnsupportedMethodError extends KadmiumError {
    constructor(method: string, cause?: Error);
}
export declare class InvalidAliasError extends KadmiumError {
    constructor(alias: string, cause?: Error);
}
export declare class EmptyAliasesError extends KadmiumError {
    constructor(cause?: Error);
}
export declare class AdapterNotCompiledError extends KadmiumError {
    constructor(cause?: Error);
}
export declare class NestedTransactionError extends KadmiumError {
    constructor(cause?: Error);
}
export declare class NoAliasForTableError extends KadmiumError {
    constructor(cause?: Error);
}
export declare const Errors: {
    schema: {
        notFound: (collection: string, cause?: Error) => SchemaNotFoundError;
        duplicateField: (field: string, schema: string, cause?: Error) => DuplicateFieldError;
        duplicateSection: (key: string, location: string, cause?: Error) => DuplicateSectionError;
        modelMismatch: (modelName: string, modelCollection: string, schemaCollection: string, cause?: Error) => ModelMismatchError;
        missingCollection: (cause?: Error) => MissingCollectionError;
        missingPrimary: (collection: string, cause?: Error) => MissingPrimaryError;
        missingPrimaryName: (collection: string, cause?: Error) => MissingPrimaryNameError;
        missingPrimaryDbType: (collection: string, cause?: Error) => MissingPrimaryDbTypeError;
        missingForm: (collection: string, cause?: Error) => MissingFormError;
    };
    repo: {
        notFound: (schema: string, cause?: Error) => RepoNotFoundError;
        relationNotFound: (relation: string, schema: string, cause?: Error) => RelationNotFoundError;
        relatedSchemaNotFound: (relation: string, toSchema: string, cause?: Error) => RelatedSchemaNotFoundError;
    };
    query: {
        error: (message: string, context?: Record<string, any>, cause?: Error) => QueryError;
        unsupportedOp: (op: string, cause?: Error) => UnsupportedOperationError;
        noTableContext: (cause?: Error) => NoTableContextError;
        updateNoData: (cause?: Error) => UpdateNoDataError;
        singleTableOnly: (op: "UPDATE" | "DELETE", cause?: Error) => SingleTableOnlyError;
        notFound: (collection: string, cause?: Error) => RecordNotFoundError;
        invalidAlias: (alias: string, cause?: Error) => InvalidAliasError;
        emptyAliases: (cause?: Error) => EmptyAliasesError;
        noAliasForTable: (cause?: Error) => NoAliasForTableError;
        nestedTransaction: (cause?: Error) => NestedTransactionError;
    };
    validation: {
        failed: (details: {
            path: string;
            message: string;
        }[], cause?: Error) => ValidationError;
        adapterNotCompiled: (cause?: Error) => AdapterNotCompiledError;
    };
    feature: {
        abort: (operation: string, reason?: string, cause?: Error) => FeatureAbortError;
    };
    config: {
        noDbAdapter: (cause?: Error) => NoDbAdapterError;
        noDbAdapterConfigured: (cause?: Error) => NoDbAdapterConfiguredError;
    };
    route: {
        unsupportedMethod: (method: string, cause?: Error) => UnsupportedMethodError;
    };
    /** Проверить, является ли ошибка KadmiumError с указанным кодом */
    is: (err: unknown, code: string) => err is KadmiumError;
};
//# sourceMappingURL=errors.d.ts.map