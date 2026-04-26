import { Field_OPT } from './fields.js';
import { NormalizedSection_OPT, Section_OPT } from './sections.js';
import { ActionGroup_OPT, SectionActions_OPT } from './actions.js';

export interface Form_OPT {
    _meta: 'form';
    sections: Section_OPT[];
    actions?: SectionActions_OPT[];
}

export interface NormalizedForm_OPT {
    _meta: 'form';
    sections: NormalizedSection_OPT[];
}
