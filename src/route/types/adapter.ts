import { AnyModel } from "../../model/model";
import { ControllerContext } from "./context";
import { RouteDefinition } from "./route";

/**
 * Interface that all route adapters must implement.
 * This allows swapping Express for Fastify, Koa, or any other HTTP framework
 * without changing the controller/core layer.
 */
export interface IRouteAdapter {
	/**
	 * Registers a route with the underlying HTTP framework.
	 * @param route - The route definition containing method, path, and handler.
	 */
	registerRoute(route: RouteDefinition<any>): void;

	/**
	 * Starts listening for incoming connections.
	 * @param port - The port to listen on.
	 * @param host - The host to bind to (optional).
	 */
	start(port: number, host?: string): Promise<void>;
}

/**
 * A handler function that processes a request within a typed context.
 */
export type RouteHandler<T extends AnyModel> = (
	ctx: ControllerContext<T>,
) => Promise<any> | any;

/**
 * Middleware function that runs before or after a route handler.
 */
export type RouteMiddleware<T extends AnyModel> = (
	ctx: ControllerContext<T>,
) => Promise<void> | void;
