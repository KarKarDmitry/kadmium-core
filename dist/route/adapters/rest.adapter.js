"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpressRouteAdapter = void 0;
const express = require("express");
const errors_1 = require("../../core/errors");
/**
 * Express.js implementation of IRouteAdapter.
 *
 * This adapter bridges Kadmium's route definitions to Express.js.
 * If you want to switch to Fastify, Koa, or another framework,
 * create a new adapter implementing IRouteAdapter — no core changes needed.
 */
class ExpressRouteAdapter {
    constructor(expressApp) {
        this.app = expressApp;
        // Ensure JSON body parsing is enabled
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
    }
    /**
     * Registers a route with Express.
     * The handler is already wrapped by ControllerCore.wrapRoute().
     */
    registerRoute(route) {
        const method = route.method.toLowerCase();
        // The handler is a wrapped Express-compatible handler from ControllerCore
        const handler = route.handler;
        const routeHandler = this.app[method];
        if (typeof routeHandler !== "function") {
            throw errors_1.Errors.route.unsupportedMethod(method);
        }
        this.app[method](route.path, handler);
    }
    /**
     * Starts listening on the given port.
     */
    async start(port, host) {
        return new Promise((resolve) => {
            const h = host || "0.0.0.0";
            this.app.listen(port, h, () => {
                console.log(`[ExpressRouteAdapter] Server listening on http://${h}:${port}`);
                resolve();
            });
        });
    }
}
exports.ExpressRouteAdapter = ExpressRouteAdapter;
//# sourceMappingURL=rest.adapter.js.map