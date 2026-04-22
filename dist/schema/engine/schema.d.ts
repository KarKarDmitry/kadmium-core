import { SchemaCore } from "../../core/schema-core";
import { Form_OPT } from "../types/form";
import { Primary_OPT } from "../types/fields";
import { Schema_OPT } from "../types/schema";
import { KadmiumFeature } from "../../features/types/base.feature";
export declare class Schema implements Schema_OPT {
    form: Form_OPT;
    collection: string;
    version: string;
    is_active: boolean;
    readonly _meta: "schema";
    primary: Primary_OPT;
    features?: (new (core: SchemaCore) => KadmiumFeature<any>)[];
    folder?: string;
    constructor(form: Form_OPT, collection: string, version: string, is_active: boolean, primary: Primary_OPT, features?: (new (core: SchemaCore) => KadmiumFeature<any>)[], folder?: string);
    initialized: boolean;
    core: SchemaCore;
    static from(opt: Omit<Schema_OPT, "_meta">, init?: boolean): Schema;
}
//# sourceMappingURL=schema.d.ts.map