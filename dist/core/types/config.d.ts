import { DbAdapter } from "../../sqb/adapters/adapter";
import { DbAdapterConfig } from "../../sqb/types/config";
import { ValidationAdapter } from "../../validation/types/adapter";
export interface AppConfig {
    host: string;
    port: number;
    service_login: string;
    service_pass: string;
    use_auth: boolean;
}
export interface ClusterNodeConfig {
    name: string;
    host: string;
    port: number;
    service_login: string;
    service_pass: string;
}
/**
 * Конфигурация генератора моделей.
 */
export interface GenConfig {
    /**
     * Базовая папка для вывода моделей.
     * По умолчанию: "models" → src/models/
     * Пример: "src/domain/models"
     */
    models_output?: string;
}
export type AdapterRegistry = {
    validation: {
        schema: new () => ValidationAdapter;
    };
    route?: {
        http?: any;
    };
    db?: new (config: DbAdapterConfig) => DbAdapter;
};
//# sourceMappingURL=config.d.ts.map