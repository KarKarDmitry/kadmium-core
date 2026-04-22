import { AnyModel } from "../../model/model";
import { WhereCondition } from "../../sqb/kadmium-sqb";
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
 * Создаёт Proxy для типобезопасного выбора полей и вызова фильтров.
 */
export declare function createHookFieldSelector<T extends AnyModel>(alias: string | undefined, wheres: WhereCondition[]): FieldSelector<T>;
//# sourceMappingURL=hook-filter-proxy.d.ts.map