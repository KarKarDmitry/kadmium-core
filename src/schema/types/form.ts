import { Field_OPT } from "./fields";
import { NormalizedSection_OPT, Section_OPT } from "./sections";
import { ActionGroup_OPT, SectionActions_OPT } from "./actions";

export interface Form_OPT {
	_meta: "form";
	sections: Section_OPT[];
	actions?: SectionActions_OPT[];
}

export interface NormalizedForm_OPT {
	_meta: "form";
	sections: NormalizedSection_OPT[];
}
