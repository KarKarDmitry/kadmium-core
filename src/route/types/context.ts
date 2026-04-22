import { AnyModel } from "../../model/model";
import { KadmiumRepo } from "../../repo/repo";
import { ValidationCore } from "../../core/validation-core";
import { Errors } from "../../core/errors";

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
export class ControllerContext<T extends AnyModel> {
	constructor(
		/** Typed repository for the schema T */
		public readonly repo: KadmiumRepo<T>,
		/** Validation core for the schema */
		public readonly validation: ValidationCore,
		/** Wrapped request data */
		public readonly request: RequestData,
	) { }

	/**
	 * Validates the request body against the schema T.
	 * Throws if validation fails (in strict mode).
	 */
	async validateBody(): Promise<T> {
		const result = await this.validation.validate(
			this.request.body as Record<string, unknown>,
		);
		if (!result.success) {
			const errors = result.errors
				?.map((e) => `${e.path}: ${e.message}`)
				.join("; ");
			throw Errors.validation.failed([{ path: "", message: `Validation failed: ${errors}` }]);
		}
		return result.data as T;
	}
}
