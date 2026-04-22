// Describes the standard envelope for API responses

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
		type: "modal"; // Can be extended with other types like 'page', 'drawer', etc.
		data: T;
	};
}

export type ApiResponse<T> = DataResponse<T> | FormResponse<T>;
