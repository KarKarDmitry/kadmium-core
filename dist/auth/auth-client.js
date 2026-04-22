"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthClient = void 0;
class AuthClient {
    constructor(appCore, config) {
        this.tokens = {};
        this.appCore = appCore;
        this.config = config;
    }
    /**
     * Register service with the central auth service
     */
    async registerService() {
        if (!this.appCore.app.use_auth) {
            console.log("Auth is disabled, skipping service registration");
            return {
                app_id: this.config.appId,
                access_key: "disabled",
                refresh_key: "disabled",
                expires_in: 0,
            };
        }
        try {
            const response = await fetch(`${this.config.authServiceUrl}/auth/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    app_id: this.config.appId,
                    callback_url: this.config.callbackUrl,
                    cluster_key: this.config.clusterKey,
                }),
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to register service: ${response.status} ${errorText}`);
            }
            const result = await response.json();
            if (result.success && result.data) {
                console.log(`Service ${this.config.appId} registered successfully with auth service`);
                return result.data;
            }
            else {
                throw new Error("Invalid response from auth service");
            }
        }
        catch (error) {
            console.error("Failed to register with auth service:", error);
            throw error;
        }
    }
    /**
     * Unregister service from the central auth service
     */
    async unregisterService() {
        if (!this.appCore.app.use_auth) {
            console.log("Auth is disabled, skipping service unregistration");
            return;
        }
        try {
            const response = await fetch(`${this.config.authServiceUrl}/auth/unregister`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    app_id: this.config.appId,
                    cluster_key: this.config.clusterKey,
                }),
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to unregister service: ${response.status} ${errorText}`);
            }
            console.log(`Service ${this.config.appId} unregistered successfully`);
        }
        catch (error) {
            console.error("Failed to unregister from auth service:", error);
            throw error;
        }
    }
    /**
     * Verify access token with auth service
     */
    async verifyToken(token) {
        if (!this.appCore.app.use_auth) {
            return true; // Auth disabled, always valid
        }
        try {
            const response = await fetch(`${this.config.authServiceUrl}/auth/verify`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });
            return response.ok;
        }
        catch (error) {
            console.error("Failed to verify token:", error);
            return false;
        }
    }
    /**
     * Refresh access token using refresh token
     */
    async refreshToken(refreshToken) {
        if (!this.appCore.app.use_auth) {
            return null; // Auth disabled, no refresh needed
        }
        try {
            const response = await fetch(`${this.config.authServiceUrl}/auth/refresh`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    refresh_token: refreshToken,
                    app_id: this.config.appId,
                }),
            });
            if (!response.ok) {
                return null;
            }
            const result = await response.json();
            return result.access_token || null;
        }
        catch (error) {
            console.error("Failed to refresh token:", error);
            return null;
        }
    }
    /**
     * Set tokens for the service
     */
    setTokens(tokens) {
        this.tokens = tokens;
    }
    /**
     * Get current tokens
     */
    getTokens() {
        return { ...this.tokens };
    }
    /**
     * Check if auth is enabled
     */
    isAuthEnabled() {
        return this.appCore.app.use_auth;
    }
    /**
     * Get auth service URL
     */
    getAuthServiceUrl() {
        return this.config.authServiceUrl;
    }
    /**
     * Get app ID
     */
    getAppId() {
        return this.config.appId;
    }
}
exports.AuthClient = AuthClient;
//# sourceMappingURL=auth-client.js.map