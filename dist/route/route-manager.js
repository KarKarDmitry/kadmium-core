"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RouteManager = void 0;
const controller_core_1 = require("../controller/engine/controller-core");
/**
 * Manages controller registration and connects them to a route adapter.
 *
 * Acts as the bridge between the controller layer (DSL + ControllerCore)
 * and the HTTP framework layer (IRouteAdapter implementations).
 */
class RouteManager {
    constructor(appCore, repoManager) {
        this.appCore = appCore;
        this.repoManager = repoManager;
        this.controllers = [];
    }
    /**
     * Registers a controller instance.
     * Creates a ControllerCore that resolves the schema and wraps handlers.
     * @param instance - The ControllerInstance from the DSL.
     */
    register(instance) {
        const core = new controller_core_1.ControllerCore(instance, this.appCore, this.repoManager);
        this.controllers.push(core);
    }
    /**
     * Connects all registered controllers to a route adapter.
     * Each route from each controller is registered with the adapter.
     * @param adapter - An implementation of IRouteAdapter (e.g., ExpressRouteAdapter).
     */
    connect(adapter) {
        for (const controllerCore of this.controllers) {
            for (const route of controllerCore.instance.routes) {
                const wrappedHandler = controllerCore.wrapRoute(route);
                const routeDef = {
                    method: route.method,
                    path: route.path,
                    handler: wrappedHandler,
                    options: route.options,
                };
                adapter.registerRoute(routeDef);
            }
        }
    }
    /**
     * Returns the number of registered controllers.
     */
    get controllerCount() {
        return this.controllers.length;
    }
}
exports.RouteManager = RouteManager;
//# sourceMappingURL=route-manager.js.map