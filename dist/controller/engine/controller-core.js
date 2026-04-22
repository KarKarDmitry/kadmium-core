"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ControllerCore = void 0;
const context_1 = require("../../route/types/context");
const val_struct_1 = require("../../validation/val-struct");
const errors_1 = require("../../core/errors");
/**
 * Internal representation of a registered controller.
 * Resolves the schema class to its SchemaCore and provides
 * wrapped handler execution with transaction/middleware support.
 */
class ControllerCore {
    constructor(instance, appCore, repoManager) {
        this.instance = instance;
        this.appCore = appCore;
        this.repoManager = repoManager;
        const schemaName = instance.schemaClass.name.toLowerCase();
        const found = appCore.schemas.find((s) => s.collection === schemaName);
        if (!found) {
            throw errors_1.Errors.repo.notFound(schemaName);
        }
        this.schemaCore = found;
    }
    /**
     * Gets the typed repository for this controller's schema.
     */
    get repo() {
        return this.repoManager.get(this.instance.schemaClass);
    }
    /**
     * Validates a single part of the request (params, query, or body).
     * Returns the validated data or throws a 400 error.
     */
    async _validatePart(part, data, valStruct) {
        if (!valStruct)
            return data;
        const fields = (0, val_struct_1.compileValStruct)(valStruct);
        const result = await this.schemaCore.validation.validateValStruct(fields, data);
        if (!result.success) {
            const msg = result.errors
                ?.map((e) => `${part}.${e.path}: ${e.message}`)
                .join("; ");
            throw Object.assign(new Error(msg), { statusCode: 400 });
        }
        return result.data;
    }
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
    wrapRoute(route) {
        return async (req, res, next) => {
            try {
                const requestData = {
                    params: req.params || {},
                    query: req.query || {},
                    body: req.body,
                    headers: req.headers || {},
                    method: req.method?.toLowerCase() || route.method,
                    url: req.url || route.path,
                };
                const ctx = new context_1.ControllerContext(this.repo, this.schemaCore.validation, requestData);
                const options = route.options || {};
                const validation = options.validation;
                // ── 1. Run before middleware ──
                if (options.before) {
                    for (const mw of options.before) {
                        await mw(ctx);
                    }
                }
                // ── 3. Validation ──
                const rawBody = requestData.body ?? {};
                const validated = {
                    params: requestData.params,
                    query: requestData.query,
                    body: rawBody,
                };
                if (validation) {
                    validated.params = await this._validatePart("params", requestData.params, validation.params);
                    validated.query = await this._validatePart("query", requestData.query, validation.query);
                    validated.body = await this._validatePart("body", requestData.body, validation.body);
                }
                // ── 4. Execute handler ──
                let result;
                if (options.transactional === false) {
                    result = await route.handler(ctx, validated);
                }
                else {
                    result = await this.repo.transaction(async (tx) => {
                        const txCtx = new context_1.ControllerContext(tx.get(this.instance.schemaClass), this.schemaCore.validation, requestData);
                        return route.handler(txCtx, validated);
                    });
                }
                // ── 5. Run after middleware ──
                if (options.after) {
                    for (const mw of options.after) {
                        await mw(ctx);
                    }
                }
                // ── 6. Send response ──
                if (res.headersSent)
                    return;
                if (result !== undefined) {
                    res.json({ type: "data", data: result });
                }
                else {
                    res.status(204).end();
                }
            }
            catch (err) {
                if (res.headersSent)
                    return;
                const statusCode = err.statusCode ?? 500;
                const message = err instanceof Error ? err.message : String(err);
                res.status(statusCode).json({ type: "error", message });
            }
        };
    }
}
exports.ControllerCore = ControllerCore;
//# sourceMappingURL=controller-core.js.map