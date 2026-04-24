import { AnyModel } from "../../model/model.js";
import { SchemaCore } from "../../core/schema-core.js";
import { WhereCondition } from "../../sqb/kadmium-sqb.js";
import { Ref_OPT } from "../../schema/types/fields.js";

/**
 * Типобезопасный helper для HookContext.where().
 * Создаёт WhereCondition с правильным alias и полем.
 *
 * Использование:
 *   ctx.where((f) => f("deleted_at").isNull());
 *   ctx.where((f) => f("status").eq("active"));
 *   ctx.where((f) => f("age").gt(18));
 */
export type FieldSelector<T> = {
  [K in keyof T & string]: {
    eq: (v: T[K]) => void;
    ne: (v: T[K]) => void;
    gt: (v: NonNullable<T[K]>) => void;
    gte: (v: NonNullable<T[K]>) => void;
    lt: (v: NonNullable<T[K]>) => void;
    lte: (v: NonNullable<T[K]>) => void;
    in: (vals: T[K][]) => void;
    between: (min: NonNullable<T[K]>, max: NonNullable<T[K]>) => void;
    contains: (v: string) => void;
    startsWith: (v: string) => void;
    endsWith: (v: string) => void;
    like: (pattern: string) => void;
    ilike: (pattern: string) => void;
    get null(): void;
    get notNull(): void;
  };
};

/**
 * Определяет тип поля из метаданных схемы.
 */
function getFieldKind(
  fieldDef: ReturnType<SchemaCore["registry"]["fieldsByName"]["get"]>,
): "string" | "number" | "date" | "boolean" {
  if (!fieldDef) return "string";
  switch (fieldDef.type) {
    case "primary":
      return fieldDef.db_type === "number" ? "number" : "string";
    case "number":
      return "number";
    case "date":
    case "datetime":
    case "time":
      return "date";
    case "boolean":
      return "boolean";
    case "ref":
      return "string"; // ref определяется по типу PK связанной схемы
    default:
      return "string";
  }
}

/**
 * Создаёт Proxy для типобезопасного выбора полей и вызова фильтров.
 */
export function createHookFieldSelector<T extends AnyModel>(
  alias: string | undefined,
  wheres: WhereCondition[],
): FieldSelector<T> {
  return new Proxy({} as FieldSelector<T>, {
    get(_target, prop: string | symbol) {
      if (typeof prop === "symbol") return;
      const fieldName = prop as keyof T & string;

      return new Proxy({} as any, {
        get(_target2, method: string | symbol) {
          if (typeof method === "symbol") return;

          // null / notNull getters
          if (method === "null") {
            wheres.push({ alias, field: fieldName, op: "IS", value: null });
            return undefined;
          }
          if (method === "notNull") {
            wheres.push({ alias, field: fieldName, op: "IS NOT", value: null });
            return undefined;
          }

          // Methods that take values
          return (v1: any, v2?: any) => {
            let op: string;
            let value: any;

            switch (method) {
              case "eq": op = "="; value = v1; break;
              case "ne": op = "!="; value = v1; break;
              case "gt": op = ">"; value = v1; break;
              case "gte": op = ">="; value = v1; break;
              case "lt": op = "<"; value = v1; break;
              case "lte": op = "<="; value = v1; break;
              case "in": op = "IN"; value = v1; break;
              case "like": op = "LIKE"; value = v1; break;
              case "ilike": op = "ILIKE"; value = v1; break;
              case "between":
                op = "BETWEEN";
                value = [v1, v2];
                break;
              case "contains":
                op = "LIKE";
                value = `%${v1}%`;
                break;
              case "startsWith":
                op = "LIKE";
                value = `${v1}%`;
                break;
              case "endsWith":
                op = "LIKE";
                value = `%${v1}`;
                break;
              default:
                op = method;
                value = v1;
            }

            wheres.push({ alias, field: fieldName, op, value });
          };
        },
      });
    },
  });
}
