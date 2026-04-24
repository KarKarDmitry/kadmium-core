import { Form_OPT, NormalizedForm_OPT } from "../types/form.js";
import { getNormalizedSections } from "./sections.js";

export function getNormalizedForm(form: Form_OPT): NormalizedForm_OPT {
	return {
		_meta: form._meta,
		sections: getNormalizedSections(form.sections),
	};
}
