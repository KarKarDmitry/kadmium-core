export interface DbConfig {
    host: string;
    port: number;
    database: string;
    login: string;
    pass: string;
}

/**
 * Конфигурация для создания экземпляра DbAdapter.
 * Включает connection settings + параметры безопасности.
 */
export interface DbAdapterConfig {
    connection: DbConfig;
    /** Типы полей, которые не должны попадать в публичный вывод (по умолчанию Set(["password"])) */
    securedTypes: Set<string>;
}
