import { AnyModel } from "../../model/model";
import { KadmiumRepo } from "../../repo/repo";
import { ValidationCore } from "../../core/validation-core";
/**
 * Wrapped request data extracted from the HTTP framework.
 */
export interface RequestData {
    /** URL path parameters (e.g., { id: "42" }) */
    params: Record<string, string>;
    /** Query string parameters */
    query: Record<string, string | string[] | undefined>;
    /** Parsed request body */
    body: unknown;
    /** Request headers */
    headers: Record<string, string | undefined>;
    /** HTTP method */
    method: string;
    /** Request URL path */
    url: string;
}
/**
 * The context object passed to every route handler.
 * Provides typed access to the repository, validation, and request data.
 * @typeparam T - The generated schema type this controller is bound to.
 */
export declare class ControllerContext<T extends AnyModel> {
    /** Typed repository for the schema T */
    readonly repo: KadmiumRepo<T>;
    /** Validation core for the schema */
    readonly validation: ValidationCore;
    /** Wrapped request data */
    readonly request: RequestData;
    constructor(
    /** Typed repository for the schema T */
    repo: KadmiumRepo<T>, 
    /** Validation core for the schema */
    validation: ValidationCore, 
    /** Wrapped request data */
    request: RequestData);
    /**
     * Validates the request body against the schema T.
     * Throws if validation fails (in strict mode).
     */
    validateBody(): Promise<T>;
}
//# sourceMappingURL=context.d.ts.map