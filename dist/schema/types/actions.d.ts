export interface BaseAction_OPT {
    _meta: "action";
    name: string;
    label: string;
    variant?: "primary" | "secondary" | "tertiary" | "warning" | "danger";
    hint?: string;
}
export interface FormAction_OPT extends BaseAction_OPT {
    position?: "standard" | "sticky" | "floating" | "inline";
    align?: "top" | "bottom" | "left" | "right";
    source: string;
}
export interface HrefAction_OPT extends BaseAction_OPT {
    position?: "standard" | "sticky" | "floating" | "inline";
    align?: "top" | "bottom" | "left" | "right";
    href: string;
}
export interface ActionGroup_OPT {
    _meta: "action-group";
    name: string;
    label: string;
    variant?: "primary" | "secondary" | "tertiary" | "warning" | "danger";
    position?: "standard" | "sticky" | "floating" | "inline";
    align?: "top" | "bottom" | "left" | "right";
    actions: SectionActions_OPT[];
}
export type SectionActions_OPT = FormAction_OPT | ActionGroup_OPT | HrefAction_OPT;
export type NormalizedAction_OPT = SectionActions_OPT & {
    section?: string;
    path: readonly string[];
};
//# sourceMappingURL=actions.d.ts.map