import { AnyModel } from '../../model/model.js';
import { AppCore } from '../../core/app-core.js';
import { SchemaCore } from '../../core/schema-core.js';
import { KadmiumRepo } from '../../repo/repo.js';
import { RepoManager } from '../../repo/repo-manager.js';
import { ControllerContext, RequestData } from '../../route/types/context.js';
import { ControllerInstance } from '../types/controller.js';
import { RouteDefinition, ValidatedRequest } from '../../route/types/route.js';
import { compileValStruct } from '../../validation/val-struct.js';
import { Errors } from '../../core/errors.js';

/**
 * Internal representation of a registered controller.
 * Resolves the schema class to its SchemaCore and provides
 * wrapped handler execution with transaction/middleware support.
 */
export class ControllerCore<T extends AnyModel> {
    public readonly schemaCore: SchemaCore;

    constructor(
        public readonly instance: ControllerInstance<T>,
        private appCore: AppCore,
        private repoManager: RepoManager,
    ) {
        const schemaName = instance.schemaClass.name;
        const found = appCore.schemas.find((s) => s.collection === schemaName);
        if (!found) {
            throw Errors.repo.notFound(
                schemaName,
                new Error(
                    'Perhaps the class name does not match the value of `collection`',
                ),
            );
        }
        this.schemaCore = found;
    }

    /**
     * Gets the typed repository for this controller's schema.
     */
    public get repo(): KadmiumRepo<T> {
        return this.repoManager.get(this.instance.schemaClass);
    }

    /**
     * Validates a single part of the request (params, query, or body).
     * Returns the validated data or throws a 400 error.
     */
    private async _validatePart(
        part: string,
        data: any,
        valStruct: any,
    ): Promise<any> {
        if (!valStruct) return data;
        const fields = compileValStruct(valStruct);
        const result = await this.schemaCore.validation.validateValStruct(
            fields,
            data,
        );
        if (!result.success) {
            const msg = result.errors
                ?.map((e) => `${part}.${e.path}: ${e.message}`)
                .join('; ');
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
    public wrapRoute(
        route: RouteDefinition<T>,
    ): (req: any, res: any, next: any) => Promise<void> {
        return async (req: any, res: any, next: any): Promise<void> => {
            try {
                const requestData: RequestData = {
                    params: req.params || {},
                    query: req.query || {},
                    body: req.body,
                    headers: req.headers || {},
                    method: req.method?.toLowerCase() || route.method,
                    url: req.url || route.path,
                };

                const ctx = new ControllerContext<T>(
                    this.repo,
                    this.schemaCore.validation,
                    requestData,
                );

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
                const validated: ValidatedRequest<unknown, unknown, unknown> = {
                    params: requestData.params,
                    query: requestData.query,
                    body: rawBody,
                };

                if (validation) {
                    validated.params = await this._validatePart(
                        'params',
                        requestData.params,
                        validation.params,
                    );
                    validated.query = await this._validatePart(
                        'query',
                        requestData.query,
                        validation.query,
                    );
                    validated.body = await this._validatePart(
                        'body',
                        requestData.body,
                        validation.body,
                    );
                }

                // ── 4. Execute handler ──
                let result: any;
                if (options.transactional === false) {
                    result = await route.handler(ctx, validated);
                } else {
                    result = await this.repo.transaction(async (tx) => {
                        const txCtx = new ControllerContext<T>(
                            tx.get(this.instance.schemaClass),
                            this.schemaCore.validation,
                            requestData,
                        );
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
                if (res.headersSent) return;

                if (result !== undefined) {
                    res.json({ type: 'data', data: result });
                } else {
                    res.status(204).end();
                }
            } catch (err) {
                if (res.headersSent) return;
                const statusCode = (err as any).statusCode ?? 500;
                const message =
                    err instanceof Error ? err.message : String(err);
                res.status(statusCode).json({ type: 'error', message });
            }
        };
    }
}
