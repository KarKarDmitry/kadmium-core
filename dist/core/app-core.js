"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppCore = void 0;
const validation_1 = require("../validation");
const postgres_1 = require("../sqb/adapters/postgres");
// --- AppCore Class ---
class AppCore {
    constructor() {
        // --- Properties with Defaults ---
        this.schemas = [];
        this.relationMap = new Map(); // Добавляем relationMap
        this.adapters = {
            validation: { schema: validation_1.ZodValidationAdapter },
            db: postgres_1.NodePostgresAdapter,
        };
        this.app = {
            host: "localhost",
            port: 3000,
            service_login: "-",
            service_pass: "-",
            use_auth: true,
        };
        this.db = {
            host: "-",
            port: 0,
            database: "-",
            login: "-",
            pass: "-",
        };
        this.cluster = [];
        this.schemaSources = [];
        this.controllerSources = [];
        this.securedTypes = new Set(["password"]);
        this.gen = {
            models_output: "models",
        };
        /** Флаг: конфигурация заблокирована после seal() */
        this._sealed = false;
    }
    /**
     * Блокирует конфигурацию. После вызова configure() выбросит ошибку.
     * Вызывается автоматически в Kadmium.start().
     */
    seal() {
        this._sealed = true;
    }
    /** Проверить, заблокирована ли конфигурация */
    get isSealed() {
        return this._sealed;
    }
    /**
     * Merges the provided configuration with the existing one.
     * @param config - The configuration object. Can be partial.
     */
    configure(config) {
        if (this._sealed) {
            throw new Error("AppCore configuration is sealed. Call configure() before start().");
        }
        if (config.adapters) {
            this.adapters = { ...this.adapters, ...config.adapters };
        }
        if (config.app) {
            this.app = { ...this.app, ...config.app };
        }
        if (config.db) {
            this.db = { ...this.db, ...config.db };
        }
        if (config.cluster) {
            this.cluster = config.cluster;
        }
        if (config.schemaSources) {
            this.schemaSources = config.schemaSources;
        }
        if (config.controllerSources) {
            this.controllerSources = config.controllerSources;
        }
        if (config.secured) {
            this.securedTypes = new Set(config.secured.types);
        }
        if (config.gen) {
            this.gen = { ...this.gen, ...config.gen };
        }
    }
    /**
     * Registers an already initialized SchemaCore instance with the application.
     */
    registerSchema(schemaCore) {
        if (!this.schemas.some((s) => s === schemaCore)) {
            this.schemas.push(schemaCore);
        }
    }
}
exports.AppCore = AppCore;
//# sourceMappingURL=app-core.js.map