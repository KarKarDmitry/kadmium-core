import { ZodValidationAdapter } from "../validation/index.js";
import { SchemaCore } from "./schema-core.js";

import { NodePostgresAdapter } from "../sqb/adapters/postgres/index.js";
import { InputField_OPT } from "../schema/types/fields.js";

import {
  AppConfig,
  ClusterNodeConfig,
  AdapterRegistry,
  GenConfig,
} from "./types/config.js";
import { DbConfig } from "../sqb/types/config.js";
import { RelationMetadata } from "../repo/types/relations.js"; // Импортируем RelationMetadata

// --- AppCore Class ---

export class AppCore {
  // --- Properties with Defaults ---
  public schemas: SchemaCore[] = [];
  public relationMap: Map<string, RelationMetadata> = new Map(); // Добавляем relationMap
  public adapters: AdapterRegistry = {
    validation: { schema: ZodValidationAdapter },
    db: NodePostgresAdapter,
  };
  public app: AppConfig = {
    host: "localhost",
    port: 3000,
    service_login: "-",
    service_pass: "-",
    use_auth: true,
  };
  public db: DbConfig = {
    host: "-",
    port: 0,
    database: "-",
    login: "-",
    pass: "-",
  };
  public cluster: ClusterNodeConfig[] = [];
  public schemaSources: string[] = [];
  public controllerSources: string[] = [];
  public securedTypes: Set<InputField_OPT["type"]> = new Set(["password"]);
  public gen: GenConfig = {
    models_output: "models",
  };

  /** Флаг: конфигурация заблокирована после seal() */
  private _sealed = false;

  public constructor() {}

  /**
   * Блокирует конфигурацию. После вызова configure() выбросит ошибку.
   * Вызывается автоматически в Kadmium.start().
   */
  public seal(): void {
    this._sealed = true;
  }

  /** Проверить, заблокирована ли конфигурация */
  public get isSealed(): boolean {
    return this._sealed;
  }

  /**
   * Merges the provided configuration with the existing one.
   * @param config - The configuration object. Can be partial.
   */
  public configure(config: {
    adapters?: Partial<AdapterRegistry>;
    app?: Partial<AppConfig>;
    db?: Partial<DbConfig>;
    cluster?: ClusterNodeConfig[];
    schemaSources?: string[];
    controllerSources?: string[];
    secured?: { types: InputField_OPT["type"][] };
    gen?: GenConfig;
  }): void {
    if (this._sealed) {
      throw new Error(
        "AppCore configuration is sealed. Call configure() before start().",
      );
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
  public registerSchema(schemaCore: SchemaCore): void {
    if (!this.schemas.some((s) => s === schemaCore)) {
      this.schemas.push(schemaCore);
    }
  }
}
