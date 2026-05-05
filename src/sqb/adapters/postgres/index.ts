/**
 * PostgreSQL адаптер — фасад.
 *
 * Структура:
 * - sql-generator.ts  — генерация SQL (SELECT/UPDATE/DELETE, WHERE, JOIN, INCLUDE)
 * - result-reshaper.ts — трансформация flat-результатов в nested
 * - this file        — подключение, транзакции, execute, create, raw
 */

import { Pool, PoolClient } from 'pg';
import { AnyModel } from '../../../model/model.js';
import { DbAdapterConfig } from '../../types/config.js';
import { KadmiumSqb } from '../../kadmium-sqb.js';
import { DbAdapter, TransactionalDbAdapter } from '../adapter.js';
import { Profiler } from '../../../core/profiling/profiler.js';
import { PostgresDdlAdapter } from './ddl.adapter.js';
import { SqlGenerator } from './sql-generator.js';
import { ResultReshaper } from './result-reshaper.js';
import { Errors } from '../../../core/errors.js';

// ═══ Transactional Adapter ═══

class TransactionalNodePostgresAdapter
    extends SqlGenerator
    implements TransactionalDbAdapter
{
    public ddl: PostgresDdlAdapter;

    constructor(private client: PoolClient) {
        super();
        this.ddl = new PostgresDdlAdapter(this.client);
    }

    beginTransaction(): Promise<TransactionalDbAdapter> {
        throw Errors.query.nestedTransaction();
    }

    async commit(): Promise<void> {
        try {
            await this.client.query('COMMIT');
        } catch {
        } finally {
            this.client.release();
        }
    }

    async rollback(): Promise<void> {
        try {
            await this.client.query('ROLLBACK');
        } catch {
        } finally {
            this.client.release();
        }
    }

    @Profiler.Profile(__filename)
    async execute<T extends AnyModel>(sqb: KadmiumSqb<T>): Promise<any[]> {
        const { text, values } = this.toSql(sqb);
        const result = await this.client.query(text, values);
        if (sqb._operation !== 'select' || sqb._tableContext.size <= 1)
            return result.rows;
        return ResultReshaper.reshape(
            result.rows,
            (sqb._selects || []) as any[],
            [...sqb._includes],
        );
    }

    @Profiler.Profile(__filename)
    async create<T extends AnyModel>(
        collectionName: string,
        data: Partial<T>,
    ): Promise<T> {
        const keys = Object.keys(data);
        const columns = keys.map((k) => `"${k}"`).join(', ');
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
        const values = keys.map((key) => (data as any)[key]);
        const text =
            `INSERT INTO "${collectionName}" (${columns}) VALUES (${placeholders}) RETURNING *`
                .trim()
                .replace(/\s+/g, ' ');
        const result = await this.client.query(text, values);
        return result.rows[0];
    }

    @Profiler.Profile(__filename)
    async createMany<T extends AnyModel>(
        collectionName: string,
        data: Partial<T>[],
    ): Promise<T[]> {
        if (data.length === 0) return [];
        // Collect ALL unique keys from ALL elements to avoid data loss
        const keysSet = new Set<string>();
        for (const item of data) {
            for (const key of Object.keys(item)) {
                keysSet.add(key);
            }
        }
        const keys = Array.from(keysSet);
        const columns = keys.map((k) => `"${k}"`).join(', ');
        const allValues: any[] = [];
        let paramIndex = 1;
        const placeholders = data
            .map(
                (item) =>
                    `(${keys
                        .map((key) => {
                            allValues.push((item as any)[key] ?? null); // null for missing fields
                            return `$${paramIndex++}`;
                        })
                        .join(', ')})`,
            )
            .join(', ');
        const text =
            `INSERT INTO "${collectionName}" (${columns}) VALUES ${placeholders} RETURNING *`
                .trim()
                .replace(/\s+/g, ' ');
        const result = await this.client.query(text, allValues);
        return result.rows;
    }

    @Profiler.Profile(__filename)
    async raw(sql: string, params: any[]): Promise<any[]> {
        return (await this.client.query(sql, params)).rows;
    }
}

// ═══ Main Adapter ═══

export class NodePostgresAdapter extends SqlGenerator implements DbAdapter {
    private pool: Pool;
    public ddl: PostgresDdlAdapter;

    constructor(config: DbAdapterConfig) {
        super();
        this.securedTypes = config.securedTypes;
        this.pool = new Pool({
            host: config.connection.host,
            port: config.connection.port,
            user: config.connection.login,
            password: config.connection.pass,
            database: config.connection.database,
        });
        this.ddl = new PostgresDdlAdapter(this.pool);
    }

    async beginTransaction(): Promise<TransactionalDbAdapter> {
        const client = await this.pool.connect();
        await client.query('BEGIN');
        return new TransactionalNodePostgresAdapter(client);
    }

    @Profiler.Profile(__filename)
    async execute<T extends AnyModel>(sqb: KadmiumSqb<T>): Promise<any[]> {
        const { text, values } = this.toSql(sqb);
        const result = await this.pool.query(text, values);
        if (sqb._operation !== 'select' || sqb._tableContext.size <= 1)
            return result.rows;
        return ResultReshaper.reshape(
            result.rows,
            (sqb._selects || []) as any[],
            [...sqb._includes],
        );
    }

    @Profiler.Profile(__filename)
    async create<T extends AnyModel>(
        collectionName: string,
        data: Partial<T>,
    ): Promise<T> {
        const keys = Object.keys(data);
        const columns = keys.map((k) => `"${k}"`).join(', ');
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
        const values = keys.map((key) => (data as any)[key]);
        const text =
            `INSERT INTO "${collectionName}" (${columns}) VALUES (${placeholders}) RETURNING *`
                .trim()
                .replace(/\s+/g, ' ');
        return (await this.pool.query(text, values)).rows[0];
    }

    @Profiler.Profile(__filename)
    async createMany<T extends AnyModel>(
        collectionName: string,
        data: Partial<T>[],
    ): Promise<T[]> {
        if (data.length === 0) return [];
        // Collect ALL unique keys from ALL elements to avoid data loss
        const keysSet = new Set<string>();
        for (const item of data) {
            for (const key of Object.keys(item)) {
                keysSet.add(key);
            }
        }
        const keys = Array.from(keysSet);
        const columns = keys.map((k) => `"${k}"`).join(', ');
        const allValues: any[] = [];
        let paramIndex = 1;
        const placeholders = data
            .map(
                (item) =>
                    `(${keys
                        .map((key) => {
                            allValues.push((item as any)[key] ?? null); // null for missing fields
                            return `$${paramIndex++}`;
                        })
                        .join(', ')})`,
            )
            .join(', ');
        const text =
            `INSERT INTO "${collectionName}" (${columns}) VALUES ${placeholders} RETURNING *`
                .trim()
                .replace(/\s+/g, ' ');
        return (await this.pool.query(text, allValues)).rows;
    }

    @Profiler.Profile(__filename)
    async raw(sql: string, params: any[]): Promise<any[]> {
        return (await this.pool.query(sql, params)).rows;
    }
}
