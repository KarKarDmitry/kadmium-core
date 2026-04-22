import { AppCore } from "./core/app-core";
import { RepoManager } from "./repo/repo-manager";
import { ValidationManager } from "./validation/validation-manager";
import { RouteManager } from "./route/route-manager";
import { Schema } from "./schema/engine/schema";
import { AdapterRegistry, AppConfig, ClusterNodeConfig, GenConfig } from "./core/types/config";
import { DbConfig } from "./sqb/types/config";
import { IRouteAdapter } from "./route/types/adapter";
import { DbMutator } from "./db-mutator/db-mutator";
import { HealthCheckResult } from "./db-mutator/types";
import { AuthClient, AuthServiceConfig } from "./auth/auth-client";
type InitialConfig = {
    adapters?: Partial<AdapterRegistry>;
    app?: Partial<AppConfig>;
    db?: Partial<DbConfig>;
    cluster?: ClusterNodeConfig[];
    schemaSources?: string[];
    controllerSources?: string[];
    checkDbOnStart?: boolean;
    gen?: GenConfig;
    auth?: AuthServiceConfig;
};
export declare class KadmiumApp {
    Repo: RepoManager;
    Validation: ValidationManager;
    Route: RouteManager;
    Auth?: AuthClient;
    readonly appCore: AppCore;
    private dbAdapter;
    private dbMutator?;
    constructor(config?: InitialConfig);
    configure(config: InitialConfig): void;
    registerSchema(schema: Schema): void;
    /**
     * Preheats the application: loads schemas, builds relation map.
     * Does NOT connect to DB or load controllers.
     * Used by the schema generator.
     */
    preheat(): Promise<void>;
    start(): Promise<void>;
    /**
     * Connects registered controllers to a route adapter and starts listening.
     * @param adapter - An IRouteAdapter implementation (e.g., ExpressRouteAdapter).
     * @param port - The port to listen on.
     * @param host - Optional host (default: "0.0.0.0").
     */
    listen(adapter: IRouteAdapter, port?: number, host?: string): Promise<void>;
    private _buildRelationMap;
    /**
     * Loads a module with ESM-first approach, falling back to require() for .ts files.
     * This handles both ESM (.mjs) and ts-node (.ts) environments.
     */
    private _loadModule;
    private loadSchemasFromSource;
    private loadControllersFromSource;
    /**
     * Checks if the database schema matches the defined schemas.
     * Stores result for later retrieval; doesn't print by default.
     */
    private _checkSchemaVsDb;
    /**
     * Registers controllers provided by features of all registered schemas.
     */
    private _registerFeatureControllers;
    /** Health check result from startup. Available via getHealthCheck(). */
    private _healthCheck?;
    private _healthCheckError?;
    /**
     * Returns the health check result from startup.
     * If check failed, returns unhealthy result with error message.
     */
    getHealthCheck(): HealthCheckResult;
    /**
     * Returns DbMutator for advanced database operations.
     * Returns null if start() hasn't been called yet.
     */
    getDbMutator(): DbMutator | null;
}
export declare const Kadmium: KadmiumApp;
export {};
//# sourceMappingURL=kadmium-app.d.ts.map