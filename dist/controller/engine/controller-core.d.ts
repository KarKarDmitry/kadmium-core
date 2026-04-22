import { AnyModel } from "../../model/model";
import { AppCore } from "../../core/app-core";
import { SchemaCore } from "../../core/schema-core";
import { KadmiumRepo } from "../../repo/repo";
import { RepoManager } from "../../repo/repo-manager";
import { ControllerInstance } from "../types/controller";
import { RouteDefinition } from "../../route/types/route";
/**
 * Internal representation of a registered controller.
 * Resolves the schema class to its SchemaCore and provides
 * wrapped handler execution with transaction/middleware support.
 */
export declare class ControllerCore<T extends AnyModel> {
    readonly instance: ControllerInstance<T>;
    private appCore;
    private repoManager;
    readonly schemaCore: SchemaCore;
    constructor(instance: ControllerInstance<T>, appCore: AppCore, repoManager: RepoManager);
    /**
     * Gets the typed repository for this controller's schema.
     */
    get repo(): KadmiumRepo<T>;
    /**
     * Validates a single part of the request (params, query, or body).
     * Returns the validated data or throws a 400 error.
     */
    private _validatePart;
    /**
     * Wraps a route handler with middleware chain, validation, feature hooks, and optional transaction.
     * Pipeline:
     *   1. Feature.beforeHandle()
     *   2. before middleware
     *   3. Validation
     *   4. Handler (possibly in transaction)
     *   5. after middleware
     *   6. Feature.afterHandle()
     *   7. Response
     */
    wrapRoute(route: RouteDefinition<T>): (req: any, res: any, next: any) => Promise<void>;
}
//# sourceMappingURL=controller-core.d.ts.map