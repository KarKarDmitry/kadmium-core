import { AnyModel } from "../../model/model";
import { AppCore } from "../../core/app-core";
import { SchemaCore } from "../../core/schema-core";
import { KadmiumSqb } from "../../sqb/kadmium-sqb";
import { FilterProxy } from "../types/query";
/**
 * Creates a Proxy-based FilterProxy<T> that returns appropriately-typed
 * filter builder instances for each field access.
 */
export declare function createFilterProxy<T extends AnyModel>(sqb: KadmiumSqb<any>, schemaCore: SchemaCore, appCore: AppCore, alias: string): FilterProxy<T>;
//# sourceMappingURL=filter-proxy.d.ts.map