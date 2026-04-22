import { AnyModel } from "../model/model";
import { AppCore } from "../core/app-core";
import { RepoManager } from "../repo/repo-manager";
import { ControllerInstance } from "../controller/types/controller";
import { IRouteAdapter } from "./types/adapter";
/**
 * Manages controller registration and connects them to a route adapter.
 *
 * Acts as the bridge between the controller layer (DSL + ControllerCore)
 * and the HTTP framework layer (IRouteAdapter implementations).
 */
export declare class RouteManager {
    private appCore;
    private repoManager;
    private controllers;
    constructor(appCore: AppCore, repoManager: RepoManager);
    /**
     * Registers a controller instance.
     * Creates a ControllerCore that resolves the schema and wraps handlers.
     * @param instance - The ControllerInstance from the DSL.
     */
    register<T extends AnyModel>(instance: ControllerInstance<T>): void;
    /**
     * Connects all registered controllers to a route adapter.
     * Each route from each controller is registered with the adapter.
     * @param adapter - An implementation of IRouteAdapter (e.g., ExpressRouteAdapter).
     */
    connect(adapter: IRouteAdapter): void;
    /**
     * Returns the number of registered controllers.
     */
    get controllerCount(): number;
}
//# sourceMappingURL=route-manager.d.ts.map