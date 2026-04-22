import { NormalizedSection_OPT, Section_OPT } from "./sections";
import { SectionActions_OPT } from "./actions";
export interface Form_OPT {
    _meta: "form";
    sections: Section_OPT[];
    actions?: SectionActions_OPT[];
}
export interface NormalizedForm_OPT {
    _meta: "form";
    sections: NormalizedSection_OPT[];
}
//# sourceMappingURL=form.d.ts.map