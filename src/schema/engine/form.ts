import { Form_OPT, NormalizedForm_OPT } from "../types/form";
import { getNormalizedSections } from "./sections";

export function getNormalizedForm(form: Form_OPT): NormalizedForm_OPT {
	return {
		_meta: form._meta,
		sections: getNormalizedSections(form.sections),
	};
}
