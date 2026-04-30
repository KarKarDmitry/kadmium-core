import type { AppCore } from '../core/app-core.js';

export interface AuthServiceConfig {
    authServiceUrl: string;
    appId: string;
    callbackUrl: string;
    clusterKey: string;
    jwksCacheTtl?: number; // NEW: cache TTL for JWKS keys in seconds (default 3600)
}

export interface ServiceRegistrationResult {
    app_id: string;
    access_key: string;
    refresh_key: string;
    expires_in: number;
}

export class AuthClient {
    private config: AuthServiceConfig;
    private appCore: AppCore;

    constructor(appCore: AppCore, config: AuthServiceConfig) {
        this.appCore = appCore;
        this.config = config;
    }

    /**
     * Register service with the central auth service
     */
    async registerService(): Promise<ServiceRegistrationResult> {
        if (!this.appCore.app.use_auth) {
            console.log('Auth is disabled, skipping service registration');
            return {
                app_id: this.config.appId,
                access_key: 'disabled',
                refresh_key: 'disabled',
                expires_in: 0,
            };
        }

        try {
            const response = await fetch(
                `${this.config.authServiceUrl}/auth/register`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        app_id: this.config.appId,
                        callback_url: this.config.callbackUrl,
                        cluster_key: this.config.clusterKey,
                    }),
                },
            );

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(
                    `Failed to register service: ${response.status} ${errorText}`,
                );
            }

            const result: any = await response.json();

            if (result.success && result.data) {
                console.log(
                    `Service ${this.config.appId} registered successfully with auth service`,
                );
                return result.data;
            } else {
                throw new Error('Invalid response from auth service');
            }
        } catch (error) {
            console.error('Failed to register with auth service:', error);
            throw error;
        }
    }

    /**
     * Unregister service from the central auth service
     */
    async unregisterService(): Promise<void> {
        if (!this.appCore.app.use_auth) {
            console.log('Auth is disabled, skipping service unregistration');
            return;
        }

        try {
            const response = await fetch(
                `${this.config.authServiceUrl}/auth/unregister`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        app_id: this.config.appId,
                        cluster_key: this.config.clusterKey,
                    }),
                },
            );

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(
                    `Failed to unregister service: ${response.status} ${errorText}`,
                );
            }

            console.log(
                `Service ${this.config.appId} unregistered successfully`,
            );
        } catch (error) {
            console.error('Failed to unregister from auth service:', error);
            throw error;
        }
    }

    /**
     * Check if auth is enabled
     */
    isAuthEnabled(): boolean {
        return this.appCore.app.use_auth;
    }

    /**
     * Get auth service URL
     */
    getAuthServiceUrl(): string {
        return this.config.authServiceUrl;
    }

    /**
     * Get app ID
     */
    getAppId(): string {
        return this.config.appId;
    }

    /**
     * Get cluster key for server-to-server authentication
     */
    getClusterKey(): string {
        return this.config.clusterKey;
    }
}
