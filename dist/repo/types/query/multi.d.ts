import { AnyModel } from "../../../model/model";
import { WhereCondition } from "../../../sqb/kadmium-sqb";
import { AggregateField } from "../aggregate";
import { SelectableField } from "../selectable";
import { AnySelectable, FilterProxy, GetFieldName, GetFieldType, BuildIncludedResult, FilterByParentAlias } from "./common";
import { IRelationBuilder } from "../../field-builders/relation-builder";
export type AnyModelClass = new (...args: any[]) => AnyModel;
export type AliasesMap = Record<string, AnyModelClass>;
export type ShapeFromAliases<T extends AliasesMap> = {
    [K in keyof T]: InstanceType<T[K]>;
};
export type MultiFilterProxy<T extends AliasesMap> = {
    [K in keyof T]: FilterProxy<InstanceType<T[K]>>;
};
export type MultiSelectProxy<T extends AliasesMap> = {
    [TAlias in keyof T & string]: {
        [TField in keyof InstanceType<T[TAlias]>]: SelectableField<InstanceType<T[TAlias]>, TField, TAlias>;
    };
};
export type JoinOptions = {
    left: string;
    right: string;
    direction: "inner" | "left" | "right" | "outer";
    on: WhereCondition;
};
export type GetTableAlias<S extends AnySelectable> = S extends SelectableField<any, any, any> ? S["source"]["tableAlias"] : undefined;
export type AllTableAliases<T extends readonly AnySelectable[]> = GetTableAlias<T[number]>;
export type FieldsForAlias<T extends readonly AnySelectable[], A extends string> = Extract<T[number], {
    source: {
        tableAlias: A;
    };
}>;
export type ObjectForAlias<T extends readonly AnySelectable[], A extends string> = {
    [S in FieldsForAlias<T, A> as GetFieldName<S>]: GetFieldType<S>;
} extends infer O ? {
    [K in keyof O]: O[K];
} : never;
export type FinalResult<S extends readonly AnySelectable[], T extends AliasesMap = {}, R extends readonly IRelationBuilder<any, any, any, any, any>[] = []> = {
    [A in AllTableAliases<S> & string]: ObjectForAlias<S, A> & BuildIncludedResult<InstanceType<T[A]>, FilterByParentAlias<R, A>>;
} & {
    [Sel in Extract<S[number], AggregateField<any>> as GetFieldName<Sel>]: GetFieldType<Sel>;
};
//# sourceMappingURL=multi.d.ts.map