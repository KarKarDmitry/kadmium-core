import { KadmiumSqb, WhereCondition, WhereGroup } from "../../sqb/kadmium-sqb";
export declare abstract class BaseWhereBuilder<TProxy, TThis extends BaseWhereBuilder<TProxy, TThis>> {
    protected _sqb: KadmiumSqb<any>;
    protected _proxy: TProxy;
    protected _group: WhereGroup;
    constructor(_sqb: KadmiumSqb<any>, _proxy: TProxy, _group: WhereGroup);
    private _add;
    /**
     * Adds a nested where group (parenthesized conditions).
     * @example repo.where(e => e.active.eq(true)).group(q => q.where(e => e.name.eq("A")).or(e => e.name.eq("B")))
     */
    group(callback: (group: TThis) => void): TThis;
    where(clause: (fields: TProxy) => WhereCondition): TThis;
    /**
     * @deprecated Use .group() instead: repo.group(q => q.where(...).or(...))
     */
    where(clause: [(group: TThis) => void]): TThis;
    and(clause: (fields: TProxy) => WhereCondition): TThis;
    and(clause: [(group: TThis) => void]): TThis;
    or(clause: (fields: TProxy) => WhereCondition): TThis;
    or(clause: [(group: TThis) => void]): TThis;
}
//# sourceMappingURL=builder.base.d.ts.map