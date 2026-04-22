"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.patch = exports.del = exports.put = exports.post = exports.get = void 0;
exports.controller = controller;
/* ── DSL ── */
function controller(schemaClass, routes) {
    return {
        _meta: "controller",
        schemaClass,
        routes: routes,
    };
}
/* ── Factory for HTTP method route creators ── */
function createRouteMethod(method, defaults) {
    return function routeMethod(path, optionsOrHandler, handler) {
        if (typeof optionsOrHandler === "function") {
            // No options provided — use defaults only if defined
            const options = defaults ? { ...defaults } : undefined;
            return { method, path, handler: optionsOrHandler, options };
        }
        // Options provided — merge with defaults
        const mergedOptions = defaults
            ? { ...defaults, ...optionsOrHandler }
            : optionsOrHandler;
        return {
            method,
            path,
            handler: handler,
            options: mergedOptions,
        };
    };
}
/* ── GET ── */
exports.get = createRouteMethod("get");
/* ── POST ── */
exports.post = createRouteMethod("post", { transactional: true });
/* ── PUT ── */
exports.put = createRouteMethod("put", { transactional: true });
/* ── DEL ── */
exports.del = createRouteMethod("delete", { transactional: true });
/* ── PATCH ── */
exports.patch = createRouteMethod("patch", { transactional: true });
//# sourceMappingURL=init.js.map