/**
 * PostgreSQL адаптер — фасад.
 *
 * Структура:
 * - sql-generator.ts  — генерация SQL (SELECT/UPDATE/DELETE, WHERE, JOIN, INCLUDE)
 * - result-reshaper.ts — трансформация flat-результатов в nested
 * - this file        — подключение, транзакции, execute, create, raw
 */
import { AnyModel } from "../../../model/model";
import { DbAdapterConfig } from "../../types/config";
import { KadmiumSqb } from "../../kadmium-sqb";
import { DbAdapter, TransactionalDbAdapter } from "../adapter";
import { PostgresDdlAdapter } from "./ddl.adapter";
import { SqlGenerator } from "./sql-generator";
export declare class NodePostgresAdapter extends SqlGenerator implements DbAdapter {
    private pool;
    ddl: PostgresDdlAdapter;
    constructor(config: DbAdapterConfig);
    beginTransaction(): Promise<TransactionalDbAdapter>;
    execute<T extends AnyModel>(sqb: KadmiumSqb<T>): Promise<any[]>;
    create<T extends AnyModel>(collectionName: string, data: Partial<T>): Promise<T>;
    createMany<T extends AnyModel>(collectionName: string, data: Partial<T>[]): Promise<T[]>;
    raw(sql: string, params: any[]): Promise<any[]>;
}
//# sourceMappingURL=index.d.ts.map