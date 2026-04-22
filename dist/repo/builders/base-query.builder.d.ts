import { SelectableField } from "../types/selectable";
import { BaseWhereBuilder } from "../types/builder.base";
import { KadmiumSqb, WhereGroup } from "../../sqb/kadmium-sqb";
import { DbAdapter } from "../../sqb/adapters/adapter";
/**
 * Formats a KadmiumSqb instance into a human-readable SQL string with parameters.
 */
export declare function toSqlString(sqb: KadmiumSqb<any>, adapter: DbAdapter): string;
export declare abstract class BaseQueryBuilder<TProxy, TSelectProxy, TThis extends BaseQueryBuilder<TProxy, TSelectProxy, TThis>> extends BaseWhereBuilder<TProxy, TThis> {
    protected _sqb: KadmiumSqb<any>;
    protected _proxy: TProxy;
    protected _group: WhereGroup;
    constructor(_sqb: KadmiumSqb<any>, _proxy: TProxy, _group: WhereGroup);
    protected abstract selectProxy: TSelectProxy;
    limit(count: number): TThis;
    offset(count: number): TThis;
    page(page: number, size: number): TThis;
    order(selector: (fields: TSelectProxy) => SelectableField<any, any, any>, direction?: "asc" | "desc"): TThis;
    groupBy(selector: (fields: TSelectProxy) => SelectableField<any, any, any> | SelectableField<any, any, any>[]): TThis;
}
//# sourceMappingURL=base-query.builder.d.ts.map