"use strict";
/**
 * PostgreSQL адаптер — фасад.
 *
 * Структура:
 * - sql-generator.ts  — генерация SQL (SELECT/UPDATE/DELETE, WHERE, JOIN, INCLUDE)
 * - result-reshaper.ts — трансформация flat-результатов в nested
 * - this file        — подключение, транзакции, execute, create, raw
 */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodePostgresAdapter = void 0;
const pg_1 = require("pg");
const kadmium_sqb_1 = require("../../kadmium-sqb");
const profiler_1 = require("../../../core/profiling/profiler");
const ddl_adapter_1 = require("./ddl.adapter");
const sql_generator_1 = require("./sql-generator");
const result_reshaper_1 = require("./result-reshaper");
const errors_1 = require("../../../core/errors");
// ═══ Transactional Adapter ═══
class TransactionalNodePostgresAdapter extends sql_generator_1.SqlGenerator {
    constructor(client) {
        super();
        this.client = client;
        this.ddl = new ddl_adapter_1.PostgresDdlAdapter(this.client);
    }
    beginTransaction() {
        throw errors_1.Errors.query.nestedTransaction();
    }
    async commit() {
        try {
            await this.client.query("COMMIT");
        }
        catch {
        }
        finally {
            this.client.release();
        }
    }
    async rollback() {
        try {
            await this.client.query("ROLLBACK");
        }
        catch {
        }
        finally {
            this.client.release();
        }
    }
    async execute(sqb) {
        const { text, values } = this.toSql(sqb);
        const result = await this.client.query(text, values);
        if (sqb._operation !== "select" || sqb._tableContext.size <= 1)
            return result.rows;
        return result_reshaper_1.ResultReshaper.reshape(result.rows, (sqb._selects || []), [
            ...sqb._includes,
        ]);
    }
    async create(collectionName, data) {
        const keys = Object.keys(data);
        const columns = keys.map((k) => `"${k}"`).join(", ");
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
        const values = keys.map((key) => data[key]);
        const text = `INSERT INTO "${collectionName}" (${columns}) VALUES (${placeholders}) RETURNING *`
            .trim()
            .replace(/\s+/g, " ");
        const result = await this.client.query(text, values);
        return result.rows[0];
    }
    async createMany(collectionName, data) {
        if (data.length === 0)
            return [];
        // Collect ALL unique keys from ALL elements to avoid data loss
        const keysSet = new Set();
        for (const item of data) {
            for (const key of Object.keys(item)) {
                keysSet.add(key);
            }
        }
        const keys = Array.from(keysSet);
        const columns = keys.map((k) => `"${k}"`).join(", ");
        const allValues = [];
        let paramIndex = 1;
        const placeholders = data
            .map((item) => `(${keys
            .map((key) => {
            allValues.push(item[key] ?? null); // null for missing fields
            return `$${paramIndex++}`;
        })
            .join(", ")})`)
            .join(", ");
        const text = `INSERT INTO "${collectionName}" (${columns}) VALUES ${placeholders} RETURNING *`
            .trim()
            .replace(/\s+/g, " ");
        const result = await this.client.query(text, allValues);
        return result.rows;
    }
    async raw(sql, params) {
        return (await this.client.query(sql, params)).rows;
    }
}
__decorate([
    profiler_1.Profiler.Profile(__filename),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [kadmium_sqb_1.KadmiumSqb]),
    __metadata("design:returntype", Promise)
], TransactionalNodePostgresAdapter.prototype, "execute", null);
__decorate([
    profiler_1.Profiler.Profile(__filename),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], TransactionalNodePostgresAdapter.prototype, "create", null);
__decorate([
    profiler_1.Profiler.Profile(__filename),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Array]),
    __metadata("design:returntype", Promise)
], TransactionalNodePostgresAdapter.prototype, "createMany", null);
__decorate([
    profiler_1.Profiler.Profile(__filename),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Array]),
    __metadata("design:returntype", Promise)
], TransactionalNodePostgresAdapter.prototype, "raw", null);
// ═══ Main Adapter ═══
class NodePostgresAdapter extends sql_generator_1.SqlGenerator {
    constructor(config) {
        super();
        this.securedTypes = config.securedTypes;
        this.pool = new pg_1.Pool({
            host: config.connection.host,
            port: config.connection.port,
            user: config.connection.login,
            password: config.connection.pass,
            database: config.connection.database,
        });
        this.ddl = new ddl_adapter_1.PostgresDdlAdapter(this.pool);
    }
    async beginTransaction() {
        const client = await this.pool.connect();
        await client.query("BEGIN");
        return new TransactionalNodePostgresAdapter(client);
    }
    async execute(sqb) {
        const { text, values } = this.toSql(sqb);
        const result = await this.pool.query(text, values);
        if (sqb._operation !== "select" || sqb._tableContext.size <= 1)
            return result.rows;
        return result_reshaper_1.ResultReshaper.reshape(result.rows, (sqb._selects || []), [
            ...sqb._includes,
        ]);
    }
    async create(collectionName, data) {
        const keys = Object.keys(data);
        const columns = keys.map((k) => `"${k}"`).join(", ");
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
        const values = keys.map((key) => data[key]);
        const text = `INSERT INTO "${collectionName}" (${columns}) VALUES (${placeholders}) RETURNING *`
            .trim()
            .replace(/\s+/g, " ");
        return (await this.pool.query(text, values)).rows[0];
    }
    async createMany(collectionName, data) {
        if (data.length === 0)
            return [];
        // Collect ALL unique keys from ALL elements to avoid data loss
        const keysSet = new Set();
        for (const item of data) {
            for (const key of Object.keys(item)) {
                keysSet.add(key);
            }
        }
        const keys = Array.from(keysSet);
        const columns = keys.map((k) => `"${k}"`).join(", ");
        const allValues = [];
        let paramIndex = 1;
        const placeholders = data
            .map((item) => `(${keys
            .map((key) => {
            allValues.push(item[key] ?? null); // null for missing fields
            return `$${paramIndex++}`;
        })
            .join(", ")})`)
            .join(", ");
        const text = `INSERT INTO "${collectionName}" (${columns}) VALUES ${placeholders} RETURNING *`
            .trim()
            .replace(/\s+/g, " ");
        return (await this.pool.query(text, allValues)).rows;
    }
    async raw(sql, params) {
        return (await this.pool.query(sql, params)).rows;
    }
}
exports.NodePostgresAdapter = NodePostgresAdapter;
__decorate([
    profiler_1.Profiler.Profile(__filename),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [kadmium_sqb_1.KadmiumSqb]),
    __metadata("design:returntype", Promise)
], NodePostgresAdapter.prototype, "execute", null);
__decorate([
    profiler_1.Profiler.Profile(__filename),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], NodePostgresAdapter.prototype, "create", null);
__decorate([
    profiler_1.Profiler.Profile(__filename),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Array]),
    __metadata("design:returntype", Promise)
], NodePostgresAdapter.prototype, "createMany", null);
__decorate([
    profiler_1.Profiler.Profile(__filename),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Array]),
    __metadata("design:returntype", Promise)
], NodePostgresAdapter.prototype, "raw", null);
//# sourceMappingURL=index.js.map