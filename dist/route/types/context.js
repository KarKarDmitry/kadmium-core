"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ControllerContext = void 0;
const errors_1 = require("../../core/errors");
/**
 * The context object passed to every route handler.
 * Provides typed access to the repository, validation, and request data.
 * @typeparam T - The generated schema type this controller is bound to.
 */
class ControllerContext {
    constructor(
    /** Typed repository for the schema T */
    repo, 
    /** Validation core for the schema */
    validation, 
    /** Wrapped request data */
    request) {
        this.repo = repo;
        this.validation = validation;
        this.request = request;
    }
    /**
     * Validates the request body against the schema T.
     * Throws if validation fails (in strict mode).
     */
    async validateBody() {
        const result = await this.validation.validate(this.request.body);
        if (!result.success) {
            const errors = result.errors
                ?.map((e) => `${e.path}: ${e.message}`)
                .join("; ");
            throw errors_1.Errors.validation.failed([{ path: "", message: `Validation failed: ${errors}` }]);
        }
        return result.data;
    }
}
exports.ControllerContext = ControllerContext;
//# sourceMappingURL=context.js.map