"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RepoManager = void 0;
const profiler_1 = require("../core/profiling/profiler");
const repo_1 = require("./repo");
const builder_multi_query_1 = require("./builders/builder.multi-query");
const errors_1 = require("../core/errors");
class RepoManager {
    constructor(appCore, dbAdapter, _tx) {
        this.appCore = appCore;
        this.dbAdapter = dbAdapter;
        this._tx = _tx;
        this.repoCache = new Map();
    }
    /**
     * Gets a repository instance for a given schema.
     * Caches instances to avoid re-creating them.
     * Binds the model class to SchemaCore to load _conf_.hooks.
     * @param schema The schema class (e.g., User).
     */
    get(schema) {
        const schemaName = schema._collection ?? schema.name.toLowerCase();
        if (this.repoCache.has(schemaName)) {
            return this.repoCache.get(schemaName);
        }
        const schemaCore = this.appCore.schemas.find((s) => s.collection === schemaName);
        if (!schemaCore) {
            throw errors_1.Errors.repo.notFound(schemaName);
        }
        // Bind model class to SchemaCore to load _conf_.hooks
        schemaCore.bindModelClass(schema);
        const repo = new repo_1.KadmiumRepo(schemaCore, this.dbAdapter, this.appCore, this._tx);
        this.repoCache.set(schemaName, repo);
        return repo;
    }
    findById(schema, id) {
        return this.get(schema).findById(id);
    }
    count(schema, clause) {
        const repo = this.get(schema);
        if (clause) {
            return repo.where(clause).count().go();
        }
        return repo.countAll().go();
    }
    /**
     * Creates a multi-table query builder.
     * @param aliases A map of aliases to schema classes.
     */
    query(aliases) {
        if (Object.keys(aliases).length === 0) {
            throw errors_1.Errors.query.error("query() must be called with a non-empty object of aliases.");
        }
        const schemaCores = new Map();
        for (const alias in aliases) {
            const modelClass = aliases[alias];
            const schemaName = modelClass.name;
            const schemaCore = this.appCore.schemas.find((s) => s.collection === schemaName.toLowerCase());
            if (!schemaCore) {
                throw errors_1.Errors.repo.notFound(schemaName);
            }
            schemaCores.set(alias, schemaCore);
        }
        return new builder_multi_query_1.MultiQueryBuilder(schemaCores, this.dbAdapter, this.appCore);
    }
    /**
     * Executes a raw SQL query.
     * @param sql The SQL query string with placeholders ($1, $2, etc.).
     * @param params An array of parameters to substitute into the query.
     */
    raw(sql, params = []) {
        return {
            go: async () => {
                return this.dbAdapter.raw(sql, params);
            },
        };
    }
}
exports.RepoManager = RepoManager;
__decorate([
    profiler_1.Profiler.Profile(__filename),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Function]),
    __metadata("design:returntype", repo_1.KadmiumRepo)
], RepoManager.prototype, "get", null);
//# sourceMappingURL=repo-manager.js.map