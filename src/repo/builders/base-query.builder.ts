import { SelectableField } from "../types/selectable.js";
import { BaseWhereBuilder } from "../types/builder.base.js";
import { KadmiumSqb, WhereGroup } from "../../sqb/kadmium-sqb.js";
import { DbAdapter } from "../../sqb/adapters/adapter.js";

/**
 * Formats a KadmiumSqb instance into a human-readable SQL string with parameters.
 */
export function toSqlString(sqb: KadmiumSqb<any>, adapter: DbAdapter): string {
  const { text, values } = adapter.toSql(sqb);
  return `SQL: ${text}\nVALUES: [${values.join(", ")}]`;
}

export abstract class BaseQueryBuilder<
  TProxy,
  TSelectProxy,
  TThis extends BaseQueryBuilder<TProxy, TSelectProxy, TThis>,
> extends BaseWhereBuilder<TProxy, TThis> {
  // The constructor is identical to BaseWhereBuilder, so we just call super.
  constructor(
    protected _sqb: KadmiumSqb<any>,
    protected _proxy: TProxy,
    protected _group: WhereGroup,
  ) {
    super(_sqb, _proxy, _group);
  }

  protected abstract selectProxy: TSelectProxy;

  public limit(count: number): TThis {
    this._sqb._limit = count;
    return this as any;
  }

  public offset(count: number): TThis {
    this._sqb._skip = count;
    return this as any;
  }

  public page(page: number, size: number): TThis {
    const pageNumber = Math.max(1, page);
    const pageSize = Math.max(1, size);
    this.limit(pageSize);
    this.offset((pageNumber - 1) * pageSize);
    return this as any;
  }

  public order(
    selector: (fields: TSelectProxy) => SelectableField<any, any, any>,
    direction: "asc" | "desc" = "asc",
  ): TThis {
    const field = selector(this.selectProxy);
    this._sqb._orders.push({ by: field, direction });
    return this as any;
  }

  public groupBy(
    selector: (
      fields: TSelectProxy,
    ) => SelectableField<any, any, any> | SelectableField<any, any, any>[],
  ): TThis {
    const selected = selector(this.selectProxy);
    const fields = Array.isArray(selected) ? selected : [selected];
    this._sqb._groupBy.push(...fields);
    return this as any;
  }
}
