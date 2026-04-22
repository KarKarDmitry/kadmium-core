import express = require("express");
import { IRouteAdapter } from "../types/adapter";
import { RouteDefinition } from "../types/route";
/**
 * Express.js implementation of IRouteAdapter.
 *
 * This adapter bridges Kadmium's route definitions to Express.js.
 * If you want to switch to Fastify, Koa, or another framework,
 * create a new adapter implementing IRouteAdapter — no core changes needed.
 */
export declare class ExpressRouteAdapter implements IRouteAdapter {
    private app;
    constructor(expressApp: express.Application);
    /**
     * Registers a route with Express.
     * The handler is already wrapped by ControllerCore.wrapRoute().
     */
    registerRoute(route: RouteDefinition<any>): void;
    /**
     * Starts listening on the given port.
     */
    start(port: number, host?: string): Promise<void>;
}
//# sourceMappingURL=rest.adapter.d.ts.map