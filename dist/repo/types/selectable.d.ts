import { AnyModel } from "../../model/model";
export declare class SelectableField<TOrigin extends AnyModel, TKey extends keyof TOrigin, TAlias extends string | undefined = undefined> {
    readonly source: {
        tableAlias: TAlias;
        fieldName: TKey;
        initialType: TOrigin[TKey];
    };
    readonly alias?: string | undefined;
    readonly fieldType: "selectable-field";
    constructor(source: {
        tableAlias: TAlias;
        fieldName: TKey;
        initialType: TOrigin[TKey];
    }, alias?: string | undefined);
    as<T extends string>(alias: T): SelectableField<TOrigin, TKey, TAlias> & {
        alias: T;
    };
}
//# sourceMappingURL=selectable.d.ts.map