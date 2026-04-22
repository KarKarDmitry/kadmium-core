import { AnyModel } from "../model/model";
import { ControllerInstance } from "./types/controller";
import { RouteDefinition } from "../route/types/route";
import type { RouteMiddleware } from "../route/types/adapter";
import type { ControllerContext } from "../route/types/context";
import { FieldValidator, ObjectValidator } from "../validation/val-struct";
type ValSchema = Record<string, FieldValidator<any> | ObjectValidator<any>>;
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
export declare function controller<T extends AnyModel>(schemaClass: new () => T, routes: RouteDefinition<T, any, any, any>[]): ControllerInstance<T>;
export declare const get: <T extends AnyModel>(path: string, optionsOrHandler: RouteOptions<T> | ((ctx: ControllerContext<T>) => Promise<any> | any), handler?: (ctx: ControllerContext<T>, req: any) => Promise<any> | any) => RouteDefinition<T>;
export declare const post: <T extends AnyModel>(path: string, optionsOrHandler: RouteOptions<T> | ((ctx: ControllerContext<T>) => Promise<any> | any), handler?: (ctx: ControllerContext<T>, req: any) => Promise<any> | any) => RouteDefinition<T>;
export declare const put: <T extends AnyModel>(path: string, optionsOrHandler: RouteOptions<T> | ((ctx: ControllerContext<T>) => Promise<any> | any), handler?: (ctx: ControllerContext<T>, req: any) => Promise<any> | any) => RouteDefinition<T>;
export declare const del: <T extends AnyModel>(path: string, optionsOrHandler: RouteOptions<T> | ((ctx: ControllerContext<T>) => Promise<any> | any), handler?: (ctx: ControllerContext<T>, req: any) => Promise<any> | any) => RouteDefinition<T>;
export declare const patch: <T extends AnyModel>(path: string, optionsOrHandler: RouteOptions<T> | ((ctx: ControllerContext<T>) => Promise<any> | any), handler?: (ctx: ControllerContext<T>, req: any) => Promise<any> | any) => RouteDefinition<T>;
export {};
//# sourceMappingURL=init.d.ts.map