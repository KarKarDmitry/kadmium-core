import { SectionActions_OPT } from "./actions";
import { Field_OPT } from "./fields";
export interface BaseSection_OPT {
    _meta: "section";
    key: string;
    title?: string;
    order?: number;
    disabled?: boolean;
}
export interface SectionHandler {
    sections?: Section_OPT[];
}
export interface FieldHandler {
    fields?: Field_OPT[];
}
export interface ActionHandler {
    actions?: SectionActions_OPT[];
}
export interface Block_OPT extends BaseSection_OPT, SectionHandler, FieldHandler, ActionHandler {
    type: "block";
    variant?: "elevated" | "filled" | "outlined";
}
export interface InlineSection_OPT extends Omit<Block_OPT, "type" | "variant"> {
    type: "inline-block";
    variant: "inline";
}
export interface Orientation_OPT extends BaseSection_OPT, SectionHandler {
    type: "orientation";
    variant?: "horizontal" | "vertical";
    on_mobile?: "horizontal" | "vertical";
    sections: Section_OPT[];
}
export interface Grid_OPT extends BaseSection_OPT, SectionHandler, FieldHandler {
    type: "grid";
    columns?: number;
    on_mobile_columns?: number;
}
export interface Tab {
    key: string;
    title: string;
    content: InlineSection_OPT;
}
export interface Tabs_OPT extends BaseSection_OPT, SectionHandler {
    type: "tabs";
    variant?: "horizontal" | "vertical";
    on_mobile?: "horizontal" | "vertical";
    tabs: Tab[];
}
export interface AccordionItem_OPT extends BaseSection_OPT, ActionHandler {
    type: "accordion-item";
    title: string;
    sections: InlineSection_OPT[];
}
export interface Accordion_OPT extends BaseSection_OPT {
    type: "accordion";
    mode?: "multi" | "single";
    variant?: "standard" | "filled" | "inline";
    chevron?: "left" | "right" | "none";
    items: AccordionItem_OPT[];
}
export interface Column_OPT extends BaseSection_OPT {
    type: "table-column";
    sortable: boolean;
    align?: "left" | "center" | "right";
}
export interface TablePagination {
    pageable: boolean;
    virtual?: boolean;
    page_chunk?: number;
}
export interface TableActions {
    row?: SectionActions_OPT[];
    bulk?: SectionActions_OPT[];
}
export interface Table_OPT extends BaseSection_OPT {
    type: "table";
    columns: Column_OPT[];
    pagination?: TablePagination;
    actions?: TableActions;
}
export type Section_OPT = Block_OPT | InlineSection_OPT | Orientation_OPT | Grid_OPT | Tabs_OPT | Accordion_OPT | AccordionItem_OPT | Table_OPT;
export interface NormalizedSection_OPT {
    _meta: "section";
    key: string;
    type: string;
    title?: string;
    order?: number;
    disabled?: boolean;
    sections?: NormalizedSection_OPT[];
}
//# sourceMappingURL=sections.d.ts.map