import * as dotenv from 'dotenv';
dotenv.config();

import { AppCore } from './core/app-core.js';
import { Errors } from './core/errors.js';
import { RepoManager } from './repo/repo-manager.js';
import { ValidationManager } from './validation/validation-manager.js';
import { RouteManager } from './route/route-manager.js';
import { DbAdapter } from './sqb/adapters/adapter.js';
import { Schema } from './schema/engine/schema.js';
import { globSync } from 'glob';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import {
    AdapterRegistry,
    AppConfig,
    ClusterNodeConfig,
    GenConfig,
} from './core/types/config.js';

import pluralize from 'pluralize';
const { plural, singular } = pluralize;
import { RelationMetadata } from './repo/types/relations.js';
import { Ref_OPT } from './schema/types/fields.js';
import { DbConfig, DbAdapterConfig } from './sqb/types/config.js';
import { ControllerInstance } from './controller/types/controller.js';
import { IRouteAdapter } from './route/types/adapter.js';
import { DbMutator } from './db-mutator/db-mutator.js';
import { HealthCheckResult } from './db-mutator/types/index.js';
import { AuthClient, AuthServiceConfig } from './auth/auth-client.js';
import path from 'node:path';

export type KadmiumConfig = {
    adapters?: Partial<AdapterRegistry>;
    app?: Partial<AppConfig>;
    db?: Partial<DbConfig>;
    cluster?: ClusterNodeConfig[];
    schemaSources?: string[];
    controllerSources?: string[];
    checkDbOnStart?: boolean; // New: check DB schema on startup
    gen?: GenConfig;
    auth?: AuthServiceConfig;
};

export class KadmiumApp {
    // Public API for managers
    public Repo: RepoManager;
    public Validation: ValidationManager;
    public Route: RouteManager;

    // Auth client
    public Auth?: AuthClient;

    // Internal state
    public readonly appCore: AppCore;
    private dbAdapter: DbAdapter;
    private dbMutator?: DbMutator;

    constructor(config?: KadmiumConfig) {
        this.appCore = new AppCore();

        if (config) {
            this.configure(config);
        }

        if (!this.appCore.adapters.db) {
            throw Errors.config.noDbAdapter();
        }
        this.dbAdapter = new this.appCore.adapters.db({
            connection: this.appCore.db,
            securedTypes: this.appCore.securedTypes,
        });

        // Create managers and inject dependencies
        this.Repo = new RepoManager(this.appCore, this.dbAdapter);
        this.Validation = new ValidationManager(this.appCore);
        this.Route = new RouteManager(this.appCore, this.Repo);

        // Initialize auth client if config provided
        if (config?.auth && this.appCore.app.use_auth) {
            this.Auth = new AuthClient(this.appCore, config.auth);
        }
    }

    public configure(config: KadmiumConfig): void {
        this.appCore.configure(config);

        if (!this.appCore.adapters.db) {
            throw Errors.config.noDbAdapterConfigured();
        }

        // If the DB adapter class or DB config has changed, create a new instance
        if (config.adapters?.db || config.db) {
            this.dbAdapter = new this.appCore.adapters.db({
                connection: this.appCore.db,
                securedTypes: this.appCore.securedTypes,
            });
            // Re-create managers that depend on the db adapter
            this.Repo = new RepoManager(this.appCore, this.dbAdapter);
            this.Route = new RouteManager(this.appCore, this.Repo);
        }

        // Re-create validation manager if its adapter changes
        if (config.adapters?.validation) {
            this.Validation = new ValidationManager(this.appCore);
        }

        // Initialize or reinitialize auth client
        if (config.auth && this.appCore.app.use_auth) {
            this.Auth = new AuthClient(this.appCore, config.auth);
        } else if (!this.appCore.app.use_auth) {
            this.Auth = undefined;
        }
    }

    public async setConfig(configPath?: string) {
        const targetPath = configPath
            ? path.resolve(configPath)
            : path.join(process.cwd(), 'kadmium.config.ts');

        console.log(`[Kadmium] Loading config from ${targetPath}`);
        try {
            const configModule = await this._loadModule(targetPath);
            // Модуль может экспортировать default или именованный экспорт
            const config = (configModule as any).config ?? configModule;
            if (typeof config !== 'object' || config === null) {
                throw new Error('Config file must export a config constant.');
            }
            this.configure(config as KadmiumConfig);
            console.log(`[Kadmium] Config loaded successfully.`);
        } catch (err) {
            console.error(
                `[Kadmium] Failed to load config from ${targetPath}:`,
                err,
            );
            throw err; // Генератор должен упасть, если конфиг критичен
        }
    }

    public registerSchema(schema: Schema): void {
        const core = Schema.from(schema).core;
        core.init(this.appCore); // <-- DI happens here
    }

    /**
     * Preheats the application: loads schemas, builds relation map.
     * Does NOT connect to DB or load controllers.
     * Used by the schema generator.
     */
    public async preheat(): Promise<void> {
        await this.loadSchemasFromSource();
        this._buildRelationMap();
    }

    public async start(): Promise<void> {
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
            } catch (error) {
                console.error(
                    `[Kadmium] Failed to register with auth service:`,
                    error,
                );
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
    public async listen(
        adapter: IRouteAdapter,
        port: number = 3000,
        host?: string,
    ): Promise<void> {
        this.Route.connect(adapter);
        await adapter.start(port, host);
        process.stdin.resume();
    }

    private _buildRelationMap(): void {
        const schemas = this.appCore.schemas;
        this.appCore.relationMap.clear();

        // Helper maps for inverse relation calculation
        const directRelations = new Map<string, RelationMetadata>(); // Key: fromSchema:fromField
        const inverseCandidates = new Map<string, RelationMetadata[]>(); // Key: toSchema -> list of relations pointing to it

        // 1. First pass: Collect all direct `ref` relations
        for (const schemaCore of schemas) {
            const fields = [
                schemaCore.normalized.primary,
                ...schemaCore.normalized.form.fields,
            ];

            for (const field of fields) {
                if (field.type === 'ref') {
                    const refField = field as Ref_OPT;

                    const relationType =
                        refField.relation?.type ?? 'many-to-one';
                    // Direct relation name is either explicit alias or stripped _id from field name
                    const directName =
                        refField.alias ?? refField.name.replace(/_id$/, '');

                    const metadata: RelationMetadata = {
                        type: relationType,
                        fromSchema: schemaCore.collection,
                        fromField: refField.name, // The actual foreign key field
                        toSchema: refField.ref,
                        inverseName: directName, // This will be the name on the source model
                    };
                    this.appCore.relationMap.set(
                        `${schemaCore.collection}:${directName}`,
                        metadata,
                    );
                    directRelations.set(
                        `${schemaCore.collection}:${refField.name}`,
                        metadata,
                    );

                    // Store for inverse calculation
                    if (!inverseCandidates.has(refField.ref)) {
                        inverseCandidates.set(refField.ref, []);
                    }
                    inverseCandidates.get(refField.ref)!.push(metadata);
                }
            }
        }

        // 2. Second pass: Calculate inverse relations (one-to-many, one-to-one)
        for (const schemaCore of schemas) {
            const targetSchemaName = schemaCore.collection;
            const relationsPointingToMe =
                inverseCandidates.get(targetSchemaName);

            if (!relationsPointingToMe) continue;

            // Keep track of names already used on the target schema
            const usedNames = new Set<string>();
            schemaCore.registry.fieldsByName.forEach((_, name) =>
                usedNames.add(name),
            );
            // Also add direct relation names if they are already computed and clash
            relationsPointingToMe.forEach((rel) => {
                const directRelationKey = `${targetSchemaName}:${rel.inverseName}`;
                if (this.appCore.relationMap.has(directRelationKey)) {
                    usedNames.add(rel.inverseName);
                }
            });

            const inverseRelationsMap = new Map<string, RelationMetadata>(); // to detect conflicts within inverse relations

            for (const rel of relationsPointingToMe) {
                let inverseType: RelationMetadata['type'];
                let inverseNameBase: string;

                switch (rel.type) {
                    case 'many-to-one':
                        inverseType = 'one-to-many';
                        inverseNameBase = plural(rel.fromSchema); // Используем pluralize
                        break;
                    case 'one-to-one':
                        inverseType = 'one-to-one';
                        inverseNameBase = singular(rel.fromSchema); // Используем pluralize
                        break;
                    default:
                        continue; // Should not happen
                }

                let inverseName = inverseNameBase;
                let counter = 0;
                // Resolve naming conflicts for inverse relations
                while (
                    usedNames.has(inverseName) ||
                    inverseRelationsMap.has(inverseName)
                ) {
                    // Append numerical suffix if conflict, or _rel / _inv
                    if (counter === 0) {
                        // First conflict, try _rel / _inv
                        if (inverseType === 'one-to-many') {
                            inverseName = `${inverseNameBase}_rel`;
                        } else {
                            // one-to-one
                            inverseName = `${inverseNameBase}_inv`;
                        }
                    } else {
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
                this.appCore.relationMap.set(
                    `${targetSchemaName}:${name}`,
                    metadata,
                );
            });
        }
    }

    /**
     * Loads a module with ESM-first approach, falling back to require() for .ts files.
     * This handles both ESM (.mjs) and ts-node (.ts) environments.
     */
    private async _loadModule(absolutePath: string): Promise<any> {
        try {
            // Try ESM import first (requires file:// URL on Windows)
            const fileUrl = pathToFileURL(absolutePath).href;
            return await import(fileUrl);
        } catch {
            // Fallback to require for .ts files (ts-node compatibility)
            const req = createRequire(import.meta.url);
            return req(absolutePath);
        }
    }

    private async loadSchemasFromSource(): Promise<void> {
        const allPaths = new Set<string>();

        for (const source of this.appCore.schemaSources) {
            const foundFiles = globSync(source, { absolute: true });
            for (const file of foundFiles) {
                allPaths.add(file);
            }
        }

        for (const absolutePath of allPaths) {
            const module = await this._loadModule(absolutePath);
            for (const key in module) {
                const exported = module[key];
                if (exported && exported._meta === 'schema') {
                    this.registerSchema(exported);
                }
            }
        }
    }

    private async loadControllersFromSource(): Promise<void> {
        const allPaths = new Set<string>();

        for (const source of this.appCore.controllerSources) {
            const foundFiles = globSync(source, { absolute: true });
            for (const file of foundFiles) {
                allPaths.add(file);
            }
        }

        for (const absolutePath of allPaths) {
            const module = await this._loadModule(absolutePath);
            for (const key in module) {
                const exported = module[key];
                if (exported && exported._meta === 'controller') {
                    this.Route.register(exported as ControllerInstance<any>);
                }
            }
        }

        if (this.Route.controllerCount > 0) {
            console.log(
                `[Kadmium] Loaded ${this.Route.controllerCount} controller(s).`,
            );
        }
    }

    private _initDbMutator(): void {
        if (!this.dbAdapter) {
            throw new Error('No database adapter set');
        }
        this.dbMutator = new DbMutator(
            this.appCore,
            this.dbAdapter.ddl,
            this.dbAdapter,
        );
    }

    /**
     * Checks if the database schema matches the defined schemas.
     * Stores result for later retrieval; doesn't print by default.
     */
    private async _checkSchemaVsDb(): Promise<void> {
        try {
            this.dbMutator = new DbMutator(
                this.appCore,
                this.dbAdapter.ddl,
                this.dbAdapter,
            );
            this._healthCheck = await this.dbMutator.checkHealth();
        } catch (err) {
            // Don't fail startup on DB check errors — just note
            this._healthCheckError = (err as Error).message;
        }
    }

    /**
     * Registers controllers provided by features of all registered schemas.
     */
    private _registerFeatureControllers(): void {
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

    /** Health check result from startup. Available via getHealthCheck(). */
    private _healthCheck?: HealthCheckResult;
    private _healthCheckError?: string;

    /**
     * Returns the health check result from startup.
     * If check failed, returns unhealthy result with error message.
     */
    public getHealthCheck(): HealthCheckResult {
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
        return (
            this._healthCheck ?? {
                isHealthy: true,
                issues: [],
                summary: {
                    totalTables: 0,
                    expectedTables: this.appCore.schemas.length,
                    matchingTables: this.appCore.schemas.length,
                },
            }
        );
    }

    /**
     * Returns DbMutator for advanced database operations.
     * Returns null if start() hasn't been called yet.
     */
    public getDbMutator(init: boolean = false): DbMutator | null {
        if (init && !this.dbMutator) {
            this._initDbMutator();
        }
        return this.dbMutator ?? null;
    }
}

export const Kadmium = new KadmiumApp();
