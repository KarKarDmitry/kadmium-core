import { DbAdapter } from '../../sqb/adapters/adapter.js';
import { DbAdapterConfig } from '../../sqb/types/config.js';
import { ValidationAdapter } from '../../validation/types/adapter.js';

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
// src/gen/types.ts (или где у тебя определён GenConfig)
export interface GenConfig {
    /**
     * Папка для вывода сгенерированных моделей.
     * По умолчанию: "models" → src/models/
     */
    models_output?: string;

    /**
     * Базовый путь для импорта системных классов Kadmium (Model, ModelConfig и т.п.).
     * Обычно это имя npm-пакета, например: "@karkardmitry/kadmium-core".
     * Если не указан, используется значение по умолчанию: "@karkardmitry/kadmium-core".
     */
    importBase?: string;
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
