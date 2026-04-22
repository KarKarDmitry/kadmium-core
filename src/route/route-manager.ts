import { AnyModel } from "../model/model";
import { AppCore } from "../core/app-core";
import { RepoManager } from "../repo/repo-manager";
import { ControllerInstance } from "../controller/types/controller";
import { ControllerCore } from "../controller/engine/controller-core";
import { IRouteAdapter } from "./types/adapter";
import { RouteDefinition } from "./types/route";

/**
 * Manages controller registration and connects them to a route adapter.
 *
 * Acts as the bridge between the controller layer (DSL + ControllerCore)
 * and the HTTP framework layer (IRouteAdapter implementations).
 */
export class RouteManager {
	private controllers: ControllerCore<any>[] = [];

	constructor(
		private appCore: AppCore,
		private repoManager: RepoManager,
	) { }

	/**
	 * Registers a controller instance.
	 * Creates a ControllerCore that resolves the schema and wraps handlers.
	 * @param instance - The ControllerInstance from the DSL.
	 */
	public register<T extends AnyModel>(
		instance: ControllerInstance<T>,
	): void {
		const core = new ControllerCore<T>(instance, this.appCore, this.repoManager);
		this.controllers.push(core as unknown as ControllerCore<any>);
	}

	/**
	 * Connects all registered controllers to a route adapter.
	 * Each route from each controller is registered with the adapter.
	 * @param adapter - An implementation of IRouteAdapter (e.g., ExpressRouteAdapter).
	 */
	public connect(adapter: IRouteAdapter): void {
		for (const controllerCore of this.controllers) {
			for (const route of controllerCore.instance.routes) {
				const wrappedHandler = controllerCore.wrapRoute(route);
				const routeDef: RouteDefinition<any> = {
					method: route.method,
					path: route.path,
					handler: wrappedHandler as any,
					options: route.options,
				};
				adapter.registerRoute(routeDef);
			}
		}
	}

	/**
	 * Returns the number of registered controllers.
	 */
	public get controllerCount(): number {
		return this.controllers.length;
	}
}
