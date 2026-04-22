"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Errors = exports.NoAliasForTableError = exports.NestedTransactionError = exports.AdapterNotCompiledError = exports.EmptyAliasesError = exports.InvalidAliasError = exports.UnsupportedMethodError = exports.NoDbAdapterConfiguredError = exports.NoDbAdapterError = exports.DuplicateSectionError = exports.FeatureAbortError = exports.ValidationError = exports.RelatedSchemaNotFoundError = exports.RelationNotFoundError = exports.RecordNotFoundError = exports.SingleTableOnlyError = exports.UpdateNoDataError = exports.NoTableContextError = exports.UnsupportedOperationError = exports.QueryError = exports.RepoNotFoundError = exports.MissingFormError = exports.MissingPrimaryDbTypeError = exports.MissingPrimaryNameError = exports.MissingPrimaryError = exports.MissingCollectionError = exports.ModelMismatchError = exports.DuplicateFieldError = exports.SchemaNotFoundError = exports.KadmiumError = void 0;
// ═══ Базовый класс ═══
class KadmiumError extends Error {
    constructor(module, code, message, context, cause) {
        super(message);
        this.name = "KadmiumError";
        this.module = module;
        this.code = code;
        this.context = context;
        this.timestamp = new Date().toISOString();
        this.cause = cause;
    }
}
exports.KadmiumError = KadmiumError;
// ═══ Schema errors ═══
class SchemaNotFoundError extends KadmiumError {
    constructor(collection, cause) {
        super("schema", "SCHEMA_NOT_FOUND", `Schema "${collection}" not found`, { collection }, cause);
        this.name = "SchemaNotFoundError";
    }
}
exports.SchemaNotFoundError = SchemaNotFoundError;
class DuplicateFieldError extends KadmiumError {
    constructor(field, schema, cause) {
        super("schema", "DUPLICATE_FIELD", `Duplicate field "${field}" in schema "${schema}"`, { field, schema }, cause);
        this.name = "DuplicateFieldError";
    }
}
exports.DuplicateFieldError = DuplicateFieldError;
class ModelMismatchError extends KadmiumError {
    constructor(modelName, modelCollection, schemaCollection, cause) {
        super("schema", "MODEL_MISMATCH", `Model "${modelName}" has _collection "${modelCollection}" but expected "${schemaCollection}"`, { modelName, modelCollection, schemaCollection }, cause);
        this.name = "ModelMismatchError";
    }
}
exports.ModelMismatchError = ModelMismatchError;
class MissingCollectionError extends KadmiumError {
    constructor(cause) {
        super("schema", "MISSING_COLLECTION", 'Schema must have a "collection" property', undefined, cause);
        this.name = "MissingCollectionError";
    }
}
exports.MissingCollectionError = MissingCollectionError;
class MissingPrimaryError extends KadmiumError {
    constructor(collection, cause) {
        super("schema", "MISSING_PRIMARY", `Schema "${collection}" must have a "primary" field`, { collection }, cause);
        this.name = "MissingPrimaryError";
    }
}
exports.MissingPrimaryError = MissingPrimaryError;
class MissingPrimaryNameError extends KadmiumError {
    constructor(collection, cause) {
        super("schema", "MISSING_PRIMARY_NAME", `Schema "${collection}" primary field must have a "name"`, { collection }, cause);
        this.name = "MissingPrimaryNameError";
    }
}
exports.MissingPrimaryNameError = MissingPrimaryNameError;
class MissingPrimaryDbTypeError extends KadmiumError {
    constructor(collection, cause) {
        super("schema", "MISSING_PRIMARY_DB_TYPE", `Schema "${collection}" primary field must have "db_type" ("uuid" | "number" | "string")`, { collection }, cause);
        this.name = "MissingPrimaryDbTypeError";
    }
}
exports.MissingPrimaryDbTypeError = MissingPrimaryDbTypeError;
class MissingFormError extends KadmiumError {
    constructor(collection, cause) {
        super("schema", "MISSING_FORM", `Schema "${collection}" must have a "form" property`, { collection }, cause);
        this.name = "MissingFormError";
    }
}
exports.MissingFormError = MissingFormError;
// ═══ Repo errors ═══
class RepoNotFoundError extends KadmiumError {
    constructor(schema, cause) {
        super("repo", "REPO_NOT_FOUND", `Repository for "${schema}" not found`, { schema }, cause);
        this.name = "RepoNotFoundError";
    }
}
exports.RepoNotFoundError = RepoNotFoundError;
// ═══ Query errors ═══
class QueryError extends KadmiumError {
    constructor(message, context, cause) {
        super("sqb", "QUERY_ERROR", message, context, cause);
        this.name = "QueryError";
    }
}
exports.QueryError = QueryError;
class UnsupportedOperationError extends KadmiumError {
    constructor(op, cause) {
        super("sqb", "UNSUPPORTED_OPERATION", `Unsupported operation: ${op}`, { operation: op }, cause);
        this.name = "UnsupportedOperationError";
    }
}
exports.UnsupportedOperationError = UnsupportedOperationError;
class NoTableContextError extends KadmiumError {
    constructor(cause) {
        super("sqb", "NO_TABLE_CONTEXT", "Cannot build query with no table in context", undefined, cause);
        this.name = "NoTableContextError";
    }
}
exports.NoTableContextError = NoTableContextError;
class UpdateNoDataError extends KadmiumError {
    constructor(cause) {
        super("sqb", "UPDATE_NO_DATA", "Update operation requires data", undefined, cause);
        this.name = "UpdateNoDataError";
    }
}
exports.UpdateNoDataError = UpdateNoDataError;
class SingleTableOnlyError extends KadmiumError {
    constructor(op, cause) {
        super("sqb", "SINGLE_TABLE_ONLY", `${op} statements currently support only a single table.`, { operation: op }, cause);
        this.name = "SingleTableOnlyError";
    }
}
exports.SingleTableOnlyError = SingleTableOnlyError;
class RecordNotFoundError extends KadmiumError {
    constructor(collection, cause) {
        super("sqb", "RECORD_NOT_FOUND", `Record not found in "${collection}"`, { collection }, cause);
        this.name = "RecordNotFoundError";
    }
}
exports.RecordNotFoundError = RecordNotFoundError;
// ═══ Relation errors ═══
class RelationNotFoundError extends KadmiumError {
    constructor(relation, schema, cause) {
        super("repo", "RELATION_NOT_FOUND", `Relation "${relation}" not found for schema "${schema}"`, { relation, schema }, cause);
        this.name = "RelationNotFoundError";
    }
}
exports.RelationNotFoundError = RelationNotFoundError;
class RelatedSchemaNotFoundError extends KadmiumError {
    constructor(relation, toSchema, cause) {
        super("repo", "RELATED_SCHEMA_NOT_FOUND", `Related schema "${toSchema}" not found for relation "${relation}"`, { relation, toSchema }, cause);
        this.name = "RelatedSchemaNotFoundError";
    }
}
exports.RelatedSchemaNotFoundError = RelatedSchemaNotFoundError;
// ═══ Validation errors ═══
class ValidationError extends KadmiumError {
    constructor(details, cause) {
        const message = `Validation failed: ${details.map(d => d.message).join("; ")}`;
        super("validation", "VALIDATION_FAILED", message, { details }, cause);
        this.name = "ValidationError";
        this.details = details;
    }
}
exports.ValidationError = ValidationError;
// ═══ Feature errors ═══
class FeatureAbortError extends KadmiumError {
    constructor(operation, reason, cause) {
        super("feature", "FEATURE_ABORT", `Operation "${operation}" aborted by feature hook: ${reason ?? "no reason provided"}`, { operation, reason }, cause);
        this.name = "FeatureAbortError";
    }
}
exports.FeatureAbortError = FeatureAbortError;
// ═══ Schema engine errors ═══
class DuplicateSectionError extends KadmiumError {
    constructor(key, location, cause) {
        super("schema", "DUPLICATE_SECTION", `Duplicate section key "${key}" detected in "${location}"`, { key, location }, cause);
        this.name = "DuplicateSectionError";
    }
}
exports.DuplicateSectionError = DuplicateSectionError;
// ═══ Config errors ═══
class NoDbAdapterError extends KadmiumError {
    constructor(cause) {
        super("config", "NO_DB_ADAPTER", "No default database adapter has been configured.", undefined, cause);
        this.name = "NoDbAdapterError";
    }
}
exports.NoDbAdapterError = NoDbAdapterError;
class NoDbAdapterConfiguredError extends KadmiumError {
    constructor(cause) {
        super("config", "NO_DB_ADAPTER_CONFIGURED", "No database adapter has been configured.", undefined, cause);
        this.name = "NoDbAdapterConfiguredError";
    }
}
exports.NoDbAdapterConfiguredError = NoDbAdapterConfiguredError;
// ═══ Route errors ═══
class UnsupportedMethodError extends KadmiumError {
    constructor(method, cause) {
        super("route", "UNSUPPORTED_METHOD", `Express does not support method "${method}". Supported: get, post, put, delete, patch.`, { method }, cause);
        this.name = "UnsupportedMethodError";
    }
}
exports.UnsupportedMethodError = UnsupportedMethodError;
// ═══ Query alias errors ═══
class InvalidAliasError extends KadmiumError {
    constructor(alias, cause) {
        super("sqb", "INVALID_ALIAS", `Invalid alias "${alias}" used in query.`, { alias }, cause);
        this.name = "InvalidAliasError";
    }
}
exports.InvalidAliasError = InvalidAliasError;
class EmptyAliasesError extends KadmiumError {
    constructor(cause) {
        super("sqb", "EMPTY_ALIASES", "query() must be called with a non-empty object of aliases.", undefined, cause);
        this.name = "EmptyAliasesError";
    }
}
exports.EmptyAliasesError = EmptyAliasesError;
// ═══ Adapter errors ═══
class AdapterNotCompiledError extends KadmiumError {
    constructor(cause) {
        super("validation", "ADAPTER_NOT_COMPILED", "Adapter not compiled. Call core.init() first.", undefined, cause);
        this.name = "AdapterNotCompiledError";
    }
}
exports.AdapterNotCompiledError = AdapterNotCompiledError;
class NestedTransactionError extends KadmiumError {
    constructor(cause) {
        super("sqb", "NESTED_TRANSACTION", "Cannot begin a transaction within another transaction.", undefined, cause);
        this.name = "NestedTransactionError";
    }
}
exports.NestedTransactionError = NestedTransactionError;
class NoAliasForTableError extends KadmiumError {
    constructor(cause) {
        super("sqb", "NO_ALIAS_FOR_TABLE", "FieldReferenceBuilder requires an alias to specify the table.", undefined, cause);
        this.name = "NoAliasForTableError";
    }
}
exports.NoAliasForTableError = NoAliasForTableError;
// ═══ Фабрика-хелпер ═══
exports.Errors = {
    schema: {
        notFound: (collection, cause) => new SchemaNotFoundError(collection, cause),
        duplicateField: (field, schema, cause) => new DuplicateFieldError(field, schema, cause),
        duplicateSection: (key, location, cause) => new DuplicateSectionError(key, location, cause),
        modelMismatch: (modelName, modelCollection, schemaCollection, cause) => new ModelMismatchError(modelName, modelCollection, schemaCollection, cause),
        missingCollection: (cause) => new MissingCollectionError(cause),
        missingPrimary: (collection, cause) => new MissingPrimaryError(collection, cause),
        missingPrimaryName: (collection, cause) => new MissingPrimaryNameError(collection, cause),
        missingPrimaryDbType: (collection, cause) => new MissingPrimaryDbTypeError(collection, cause),
        missingForm: (collection, cause) => new MissingFormError(collection, cause),
    },
    repo: {
        notFound: (schema, cause) => new RepoNotFoundError(schema, cause),
        relationNotFound: (relation, schema, cause) => new RelationNotFoundError(relation, schema, cause),
        relatedSchemaNotFound: (relation, toSchema, cause) => new RelatedSchemaNotFoundError(relation, toSchema, cause),
    },
    query: {
        error: (message, context, cause) => new QueryError(message, context, cause),
        unsupportedOp: (op, cause) => new UnsupportedOperationError(op, cause),
        noTableContext: (cause) => new NoTableContextError(cause),
        updateNoData: (cause) => new UpdateNoDataError(cause),
        singleTableOnly: (op, cause) => new SingleTableOnlyError(op, cause),
        notFound: (collection, cause) => new RecordNotFoundError(collection, cause),
        invalidAlias: (alias, cause) => new InvalidAliasError(alias, cause),
        emptyAliases: (cause) => new EmptyAliasesError(cause),
        noAliasForTable: (cause) => new NoAliasForTableError(cause),
        nestedTransaction: (cause) => new NestedTransactionError(cause),
    },
    validation: {
        failed: (details, cause) => new ValidationError(details, cause),
        adapterNotCompiled: (cause) => new AdapterNotCompiledError(cause),
    },
    feature: {
        abort: (operation, reason, cause) => new FeatureAbortError(operation, reason, cause),
    },
    config: {
        noDbAdapter: (cause) => new NoDbAdapterError(cause),
        noDbAdapterConfigured: (cause) => new NoDbAdapterConfiguredError(cause),
    },
    route: {
        unsupportedMethod: (method, cause) => new UnsupportedMethodError(method, cause),
    },
    /** Проверить, является ли ошибка KadmiumError с указанным кодом */
    is: (err, code) => err instanceof KadmiumError && err.code === code,
};
//# sourceMappingURL=errors.js.map