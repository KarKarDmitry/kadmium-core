import { AnyModel } from "../../model/model.js";

export class SelectableField<
  TOrigin extends AnyModel,
  TKey extends keyof TOrigin,
  TAlias extends string | undefined = undefined,
> {
  public readonly fieldType: "selectable-field" = "selectable-field";

  constructor(
    public readonly source: {
      tableAlias: TAlias;
      fieldName: TKey;
      initialType: TOrigin[TKey];
    },
    public readonly alias?: string,
  ) { }

  public as<T extends string>(
    alias: T,
  ): SelectableField<TOrigin, TKey, TAlias> & { alias: T } {
    return new SelectableField(this.source, alias) as any;
  }
}
