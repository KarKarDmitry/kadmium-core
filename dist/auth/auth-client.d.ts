import type { AppCore } from "../core/app-core";
export interface AuthServiceConfig {
    authServiceUrl: string;
    appId: string;
    callbackUrl: string;
    clusterKey: string;
}
export interface ServiceRegistrationResult {
    app_id: string;
    access_key: string;
    refresh_key: string;
    expires_in: number;
}
export interface AuthTokens {
    accessToken?: string;
    refreshToken?: string;
}
export declare class AuthClient {
    private config;
    private appCore;
    private tokens;
    constructor(appCore: AppCore, config: AuthServiceConfig);
    /**
     * Register service with the central auth service
     */
    registerService(): Promise<ServiceRegistrationResult>;
    /**
     * Unregister service from the central auth service
     */
    unregisterService(): Promise<void>;
    /**
     * Verify access token with auth service
     */
    verifyToken(token: string): Promise<boolean>;
    /**
     * Refresh access token using refresh token
     */
    refreshToken(refreshToken: string): Promise<string | null>;
    /**
     * Set tokens for the service
     */
    setTokens(tokens: AuthTokens): void;
    /**
     * Get current tokens
     */
    getTokens(): AuthTokens;
    /**
     * Check if auth is enabled
     */
    isAuthEnabled(): boolean;
    /**
     * Get auth service URL
     */
    getAuthServiceUrl(): string;
    /**
     * Get app ID
     */
    getAppId(): string;
}
//# sourceMappingURL=auth-client.d.ts.map