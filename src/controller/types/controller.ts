import { AnyModel } from "../../model/model.js";
import { RouteDefinition } from "../../route/types/route.js";

/**
 * The object returned by the `controller()` DSL function.
 * @typeparam T - The generated schema type.
 */
export interface ControllerInstance<T extends AnyModel> {
	_meta: "controller";
	schemaClass: new () => T;
	routes: RouteDefinition<any, any, any, any>[];
}
