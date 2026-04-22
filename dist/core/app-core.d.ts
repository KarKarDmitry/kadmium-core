import { SchemaCore } from "./schema-core";
import { InputField_OPT } from "../schema/types/fields";
import { AppConfig, ClusterNodeConfig, AdapterRegistry, GenConfig } from "./types/config";
import { DbConfig } from "../sqb/types/config";
import { RelationMetadata } from "../repo/types/relations";
export declare class AppCore {
    schemas: SchemaCore[];
    relationMap: Map<string, RelationMetadata>;
    adapters: AdapterRegistry;
    app: AppConfig;
    db: DbConfig;
    cluster: ClusterNodeConfig[];
    schemaSources: string[];
    controllerSources: string[];
    securedTypes: Set<InputField_OPT["type"]>;
    gen: GenConfig;
    /** Флаг: конфигурация заблокирована после seal() */
    private _sealed;
    constructor();
    /**
     * Блокирует конфигурацию. После вызова configure() выбросит ошибку.
     * Вызывается автоматически в Kadmium.start().
     */
    seal(): void;
    /** Проверить, заблокирована ли конфигурация */
    get isSealed(): boolean;
    /**
     * Merges the provided configuration with the existing one.
     * @param config - The configuration object. Can be partial.
     */
    configure(config: {
        adapters?: Partial<AdapterRegistry>;
        app?: Partial<AppConfig>;
        db?: Partial<DbConfig>;
        cluster?: ClusterNodeConfig[];
        schemaSources?: string[];
        controllerSources?: string[];
        secured?: {
            types: InputField_OPT["type"][];
        };
        gen?: GenConfig;
    }): void;
    /**
     * Registers an already initialized SchemaCore instance with the application.
     */
    registerSchema(schemaCore: SchemaCore): void;
}
//# sourceMappingURL=app-core.d.ts.map