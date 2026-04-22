import { AnyModel } from "../model/model";
import { ControllerInstance } from "./types/controller";
import {
	RouteDefinition,
} from "../route/types/route";
import type { RouteMiddleware } from "../route/types/adapter";
import type { ControllerContext } from "../route/types/context";
import {
	FieldValidator,
	ObjectValidator,
	InferValStruct,
} from "../validation/val-struct";

type ValSchema = Record<string, FieldValidator<any> | ObjectValidator<any>>;

/* ── Route options type ── */

export interface RouteOptions<T extends AnyModel = any> {
	validation?: {
		params?: ValSchema;
		query?: ValSchema;
		body?: ValSchema;
	};
	before?: RouteMiddleware<T>[];
	after?: RouteMiddleware<T>[];
	transactional?: boolean;
}

/* ── Type inference helpers ── */

type InferParams<O> = O extends { validation?: { params?: infer P } }
	? P extends ValSchema ? InferValStruct<P> : unknown
	: unknown;

type InferQuery<O> = O extends { validation?: { query?: infer Q } }
	? Q extends ValSchema ? InferValStruct<Q> : unknown
	: unknown;

type InferBody<T, O> = O extends { validation?: object }
	? Partial<T>
	: unknown;

/* ── DSL ── */

export function controller<T extends AnyModel>(
	schemaClass: new () => T,
	routes: RouteDefinition<T, any, any, any>[],
): ControllerInstance<T> {
	return {
		_meta: "controller",
		schemaClass,
		routes: routes as unknown as RouteDefinition<any>[],
	};
}

/* ── Factory for HTTP method route creators ── */

function createRouteMethod(method: string, defaults?: { transactional?: boolean }) {
	return function routeMethod<T extends AnyModel>(
		path: string,
		optionsOrHandler: RouteOptions<T> | ((ctx: ControllerContext<T>) => Promise<any> | any),
		handler?: (ctx: ControllerContext<T>, req: any) => Promise<any> | any,
	): RouteDefinition<T> {
		if (typeof optionsOrHandler === "function") {
			// No options provided — use defaults only if defined
			const options = defaults ? { ...defaults } : undefined;
			return { method, path, handler: optionsOrHandler as any, options };
		}
		// Options provided — merge with defaults
		const mergedOptions = defaults
			? { ...defaults, ...optionsOrHandler }
			: optionsOrHandler;
		return {
			method,
			path,
			handler: handler!,
			options: mergedOptions,
		};
	};
}

/* ── GET ── */

export const get = createRouteMethod("get");

/* ── POST ── */

export const post = createRouteMethod("post", { transactional: true });

/* ── PUT ── */

export const put = createRouteMethod("put", { transactional: true });

/* ── DEL ── */

export const del = createRouteMethod("delete", { transactional: true });

/* ── PATCH ── */

export const patch = createRouteMethod("patch", { transactional: true });
