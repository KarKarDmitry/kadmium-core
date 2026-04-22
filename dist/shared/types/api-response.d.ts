/**
 * A standard wrapper for successful data responses.
 */
export interface DataResponse<T> {
    type: "data";
    data: T;
}
/**
 * A command for the client to display a form, e.g., in a modal.
 */
export interface FormResponse<T> {
    type: "form";
    form: {
        type: "modal";
        data: T;
    };
}
export type ApiResponse<T> = DataResponse<T> | FormResponse<T>;
//# sourceMappingURL=api-response.d.ts.map