import express = require("express");
import { IRouteAdapter } from "../types/adapter";
import { RouteDefinition } from "../types/route";
import { Errors } from "../../core/errors";

/**
 * Express.js implementation of IRouteAdapter.
 *
 * This adapter bridges Kadmium's route definitions to Express.js.
 * If you want to switch to Fastify, Koa, or another framework,
 * create a new adapter implementing IRouteAdapter — no core changes needed.
 */
export class ExpressRouteAdapter implements IRouteAdapter {
	private app: express.Application;

	constructor(expressApp: express.Application) {
		this.app = expressApp;
		// Ensure JSON body parsing is enabled
		this.app.use(express.json());
		this.app.use(express.urlencoded({ extended: true }));
	}

	/**
	 * Registers a route with Express.
	 * The handler is already wrapped by ControllerCore.wrapRoute().
	 */
	registerRoute(route: RouteDefinition<any>): void {
		const method = route.method.toLowerCase();
		// The handler is a wrapped Express-compatible handler from ControllerCore
		const handler = route.handler as unknown as (
			req: express.Request,
			res: express.Response,
			next: express.NextFunction,
		) => Promise<void>;

		const routeHandler =
			this.app[method as keyof express.Application];
		if (typeof routeHandler !== "function") {
			throw Errors.route.unsupportedMethod(method);
		}

		(this.app as any)[method](route.path, handler);
	}

	/**
	 * Starts listening on the given port.
	 */
	async start(port: number, host?: string): Promise<void> {
		return new Promise((resolve) => {
			const h = host || "0.0.0.0";
			this.app.listen(port, h, () => {
				console.log(
					`[ExpressRouteAdapter] Server listening on http://${h}:${port}`,
				);
				resolve();
			});
		});
	}
}
