"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Kadmium = exports.KadmiumApp = void 0;
const app_core_1 = require("./core/app-core");
const errors_1 = require("./core/errors");
const repo_manager_1 = require("./repo/repo-manager");
const validation_manager_1 = require("./validation/validation-manager");
const route_manager_1 = require("./route/route-manager");
const schema_1 = require("./schema/engine/schema");
const glob_1 = require("glob");
const node_url_1 = require("node:url");
const node_module_1 = require("node:module");
const pluralize_1 = require("pluralize"); // Импортируем pluralize
const db_mutator_1 = require("./db-mutator/db-mutator");
const auth_client_1 = require("./auth/auth-client");
class KadmiumApp {
    constructor(config) {
        this.appCore = new app_core_1.AppCore();
        if (config) {
            this.configure(config);
        }
        if (!this.appCore.adapters.db) {
            throw errors_1.Errors.config.noDbAdapter();
        }
        this.dbAdapter = new this.appCore.adapters.db({
            connection: this.appCore.db,
            securedTypes: this.appCore.securedTypes,
        });
        // Create managers and inject dependencies
        this.Repo = new repo_manager_1.RepoManager(this.appCore, this.dbAdapter);
        this.Validation = new validation_manager_1.ValidationManager(this.appCore);
        this.Route = new route_manager_1.RouteManager(this.appCore, this.Repo);
        // Initialize auth client if config provided
        if (config?.auth && this.appCore.app.use_auth) {
            this.Auth = new auth_client_1.AuthClient(this.appCore, config.auth);
        }
    }
    configure(config) {
        this.appCore.configure(config);
        if (!this.appCore.adapters.db) {
            throw errors_1.Errors.config.noDbAdapterConfigured();
        }
        // If the DB adapter class or DB config has changed, create a new instance
        if (config.adapters?.db || config.db) {
            this.dbAdapter = new this.appCore.adapters.db({
                connection: this.appCore.db,
                securedTypes: this.appCore.securedTypes,
            });
            // Re-create managers that depend on the db adapter
            this.Repo = new repo_manager_1.RepoManager(this.appCore, this.dbAdapter);
            this.Route = new route_manager_1.RouteManager(this.appCore, this.Repo);
        }
        // Re-create validation manager if its adapter changes
        if (config.adapters?.validation) {
            this.Validation = new validation_manager_1.ValidationManager(this.appCore);
        }
        // Initialize or reinitialize auth client
        if (config.auth && this.appCore.app.use_auth) {
            this.Auth = new auth_client_1.AuthClient(this.appCore, config.auth);
        }
        else if (!this.appCore.app.use_auth) {
            this.Auth = undefined;
        }
    }
    registerSchema(schema) {
        const core = schema_1.Schema.from(schema).core;
        core.init(this.appCore); // <-- DI happens here
    }
    /**
     * Preheats the application: loads schemas, builds relation map.
     * Does NOT connect to DB or load controllers.
     * Used by the schema generator.
     */
    async preheat() {
        await this.loadSchemasFromSource();
        this._buildRelationMap();
    }
    async start() {
        // If preheat wasn't called yet, do the minimal setup
        if (this.appCore.schemas.length === 0) {
            await this.preheat();
        }
        await this.loadControllersFromSource();
        this._registerFeatureControllers();
        await this._checkSchemaVsDb();
        // Register with auth service if enabled
        if (this.appCore.app.use_auth && this.Auth) {
            try {
                await this.Auth.registerService();
                console.log(`[Kadmium] Service registered with auth service`);
            }
            catch (error) {
                console.error(`[Kadmium] Failed to register with auth service:`, error);
                // Don't fail startup, but log warning
            }
        }
        // Seal configuration — no more configure() calls allowed
        this.appCore.seal();
    }
    /**
     * Connects registered controllers to a route adapter and starts listening.
     * @param adapter - An IRouteAdapter implementation (e.g., ExpressRouteAdapter).
     * @param port - The port to listen on.
     * @param host - Optional host (default: "0.0.0.0").
     */
    async listen(adapter, port = 3000, host) {
        this.Route.connect(adapter);
        await adapter.start(port, host);
    }
    _buildRelationMap() {
        const schemas = this.appCore.schemas;
        this.appCore.relationMap.clear();
        // Helper maps for inverse relation calculation
        const directRelations = new Map(); // Key: fromSchema:fromField
        const inverseCandidates = new Map(); // Key: toSchema -> list of relations pointing to it
        // 1. First pass: Collect all direct `ref` relations
        for (const schemaCore of schemas) {
            const fields = [
                schemaCore.normalized.primary,
                ...schemaCore.normalized.form.fields,
            ];
            for (const field of fields) {
                if (field.type === "ref") {
                    const refField = field;
                    const relationType = refField.relation?.type ?? "many-to-one";
                    // Direct relation name is either explicit alias or stripped _id from field name
                    const directName = refField.alias ?? refField.name.replace(/_id$/, "");
                    const metadata = {
                        type: relationType,
                        fromSchema: schemaCore.collection,
                        fromField: refField.name, // The actual foreign key field
                        toSchema: refField.ref,
                        inverseName: directName, // This will be the name on the source model
                    };
                    this.appCore.relationMap.set(`${schemaCore.collection}:${directName}`, metadata);
                    directRelations.set(`${schemaCore.collection}:${refField.name}`, metadata);
                    // Store for inverse calculation
                    if (!inverseCandidates.has(refField.ref)) {
                        inverseCandidates.set(refField.ref, []);
                    }
                    inverseCandidates.get(refField.ref).push(metadata);
                }
            }
        }
        // 2. Second pass: Calculate inverse relations (one-to-many, one-to-one)
        for (const schemaCore of schemas) {
            const targetSchemaName = schemaCore.collection;
            const relationsPointingToMe = inverseCandidates.get(targetSchemaName);
            if (!relationsPointingToMe)
                continue;
            // Keep track of names already used on the target schema
            const usedNames = new Set();
            schemaCore.registry.fieldsByName.forEach((_, name) => usedNames.add(name));
            // Also add direct relation names if they are already computed and clash
            relationsPointingToMe.forEach((rel) => {
                const directRelationKey = `${targetSchemaName}:${rel.inverseName}`;
                if (this.appCore.relationMap.has(directRelationKey)) {
                    usedNames.add(rel.inverseName);
                }
            });
            const inverseRelationsMap = new Map(); // to detect conflicts within inverse relations
            for (const rel of relationsPointingToMe) {
                let inverseType;
                let inverseNameBase;
                switch (rel.type) {
                    case "many-to-one":
                        inverseType = "one-to-many";
                        inverseNameBase = (0, pluralize_1.plural)(rel.fromSchema); // Используем pluralize
                        break;
                    case "one-to-one":
                        inverseType = "one-to-one";
                        inverseNameBase = (0, pluralize_1.singular)(rel.fromSchema); // Используем pluralize
                        break;
                    default:
                        continue; // Should not happen
                }
                let inverseName = inverseNameBase;
                let counter = 0;
                // Resolve naming conflicts for inverse relations
                while (usedNames.has(inverseName) ||
                    inverseRelationsMap.has(inverseName)) {
                    // Append numerical suffix if conflict, or _rel / _inv
                    if (counter === 0) {
                        // First conflict, try _rel / _inv
                        if (inverseType === "one-to-many") {
                            inverseName = `${inverseNameBase}_rel`;
                        }
                        else {
                            // one-to-one
                            inverseName = `${inverseNameBase}_inv`;
                        }
                    }
                    else {
                        // Subsequent conflicts, use number
                        inverseName = `${inverseNameBase}_${counter}`;
                    }
                    counter++;
                }
                usedNames.add(inverseName);
                inverseRelationsMap.set(inverseName, {
                    type: inverseType,
                    fromSchema: targetSchemaName, // From perspective of the target schema
                    fromField: inverseName, // This is the 'virtual' field name
                    toSchema: rel.fromSchema,
                    inverseName: rel.fromField, // The foreign key field on the related model
                });
            }
            // Add resolved inverse relations to the main map
            inverseRelationsMap.forEach((metadata, name) => {
                this.appCore.relationMap.set(`${targetSchemaName}:${name}`, metadata);
            });
        }
    }
    /**
     * Loads a module with ESM-first approach, falling back to require() for .ts files.
     * This handles both ESM (.mjs) and ts-node (.ts) environments.
     */
    async _loadModule(absolutePath) {
        try {
            // Try ESM import first (requires file:// URL on Windows)
            const fileUrl = (0, node_url_1.pathToFileURL)(absolutePath).href;
            return await Promise.resolve(`${fileUrl}`).then(s => __importStar(require(s)));
        }
        catch {
            // Fallback to require for .ts files (ts-node compatibility)
            const req = (0, node_module_1.createRequire)(__filename);
            return req(absolutePath);
        }
    }
    async loadSchemasFromSource() {
        const allPaths = new Set();
        for (const source of this.appCore.schemaSources) {
            const foundFiles = (0, glob_1.globSync)(source, { absolute: true });
            for (const file of foundFiles) {
                allPaths.add(file);
            }
        }
        for (const absolutePath of allPaths) {
            const module = await this._loadModule(absolutePath);
            for (const key in module) {
                const exported = module[key];
                if (exported && exported._meta === "schema") {
                    this.registerSchema(exported);
                }
            }
        }
    }
    async loadControllersFromSource() {
        const allPaths = new Set();
        for (const source of this.appCore.controllerSources) {
            const foundFiles = (0, glob_1.globSync)(source, { absolute: true });
            for (const file of foundFiles) {
                allPaths.add(file);
            }
        }
        for (const absolutePath of allPaths) {
            const module = await this._loadModule(absolutePath);
            for (const key in module) {
                const exported = module[key];
                if (exported && exported._meta === "controller") {
                    this.Route.register(exported);
                }
            }
        }
        if (this.Route.controllerCount > 0) {
            console.log(`[Kadmium] Loaded ${this.Route.controllerCount} controller(s).`);
        }
    }
    /**
     * Checks if the database schema matches the defined schemas.
     * Stores result for later retrieval; doesn't print by default.
     */
    async _checkSchemaVsDb() {
        try {
            this.dbMutator = new db_mutator_1.DbMutator(this.appCore, this.dbAdapter.ddl, this.dbAdapter);
            this._healthCheck = await this.dbMutator.checkHealth();
        }
        catch (err) {
            // Don't fail startup on DB check errors — just note
            this._healthCheckError = err.message;
        }
    }
    /**
     * Registers controllers provided by features of all registered schemas.
     */
    _registerFeatureControllers() {
        let count = 0;
        for (const schemaCore of this.appCore.schemas) {
            for (const feature of schemaCore.features) {
                for (const ctrl of feature.controllers ?? []) {
                    this.Route.register(ctrl);
                    count++;
                }
            }
        }
        if (count > 0) {
            console.log(`[Kadmium] Loaded ${count} feature controller(s).`);
        }
    }
    /**
     * Returns the health check result from startup.
     * If check failed, returns unhealthy result with error message.
     */
    getHealthCheck() {
        if (this._healthCheckError) {
            return {
                isHealthy: false,
                issues: [`DB check failed: ${this._healthCheckError}`],
                summary: {
                    totalTables: 0,
                    expectedTables: this.appCore.schemas.length,
                    matchingTables: 0,
                },
            };
        }
        return (this._healthCheck ?? {
            isHealthy: true,
            issues: [],
            summary: {
                totalTables: 0,
                expectedTables: this.appCore.schemas.length,
                matchingTables: this.appCore.schemas.length,
            },
        });
    }
    /**
     * Returns DbMutator for advanced database operations.
     * Returns null if start() hasn't been called yet.
     */
    getDbMutator() {
        return this.dbMutator ?? null;
    }
}
exports.KadmiumApp = KadmiumApp;
exports.Kadmium = new KadmiumApp();
//# sourceMappingURL=kadmium-app.js.map