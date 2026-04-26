import { AnyModel } from '../../model/model.js';
import { RouteHandler, RouteMiddleware } from './adapter.js';
import { FieldValidator, ObjectValidator } from '../../validation/index.js';
import { ControllerContext } from './context.js';

type ValSchema = Record<string, FieldValidator<any> | ObjectValidator<any>>;

/**
 * Validation schemas for route parameters.
 * Each field is a ValStruct definition (e.g., { id: v.string.uuid() }).
 */
export interface RouteValidation {
    /** URL path parameters validation */
    params?: ValSchema;
    /** Query string validation */
    query?: ValSchema;
    /** Request body validation */
    body?: ValSchema;
}

/**
 * Validated request data with inferred types.
 */
export interface ValidatedRequest<P, Q, B> {
    params: P;
    query: Q;
    body: B;
}

/**
 * Options that control how a route handler is executed.
 */
export interface HandlerOptions<
    T extends AnyModel,
    P = unknown,
    Q = unknown,
    B = unknown,
> {
    /**
     * If true, the handler is wrapped in a database transaction.
     * If the handler throws, the transaction is rolled back.
     * @default true for POST/PUT/DELETE, false for GET
     */
    transactional?: boolean;

    /**
     * Middleware functions that run BEFORE the handler.
     * If any middleware throws, the handler is not executed.
     */
    before?: RouteMiddleware<T>[];

    /**
     * Middleware functions that run AFTER the handler (on success).
     */
    after?: RouteMiddleware<T>[];

    /**
     * Validation schemas for params, query, and body.
     * If validation fails, a 400 response is returned automatically.
     */
    validation?: RouteValidation;
}

/**
 * Describes a single route bound to a schema.
 * @typeparam T - The generated schema type.
 * @typeparam P - Inferred params type.
 * @typeparam Q - Inferred query type.
 * @typeparam B - Inferred body type.
 */
export interface RouteDefinition<
    T extends AnyModel,
    P = unknown,
    Q = unknown,
    B = unknown,
> {
    /** HTTP method (lowercase): get, post, put, delete, patch */
    method: string;
    /** URL path with parameters (e.g., "/users/:id") */
    path: string;
    /** The route handler function */
    handler: (
        ctx: ControllerContext<T>,
        req: ValidatedRequest<P, Q, B>,
    ) => Promise<any> | any;
    /** Optional execution options */
    options?: HandlerOptions<T, P, Q, B>;
}
