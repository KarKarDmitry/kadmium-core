import { Section_OPT } from "../types/sections";
export interface SectionVisitor {
    onSection?(section: Section_OPT, path: string[]): void;
}
export declare function walkSections(sections: Section_OPT[], visitor: SectionVisitor, parentPath?: string[]): void;
//# sourceMappingURL=walker.d.ts.map