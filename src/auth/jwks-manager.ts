// Dynamic import for jose (ESM-only package in CJS context)
type CryptoKey = any;

interface JwksKey {
    kty: string;
    kid?: string;
    use?: string;
    alg?: string;
    n?: string;
    e?: string;
    [key: string]: unknown;
}

interface JwksResponse {
    keys: JwksKey[];
}

export class JwksManager {
    private jwksUrl: string;
    private publicKey: CryptoKey | null = null;
    private kid: string | null = null;
    private cacheTtlMs: number;
    private refreshTimer: ReturnType<typeof setInterval> | null = null;
    private lastFetchTime = 0;

    constructor(options?: { jwksUrl?: string; cacheTtlSeconds?: number }) {
        this.jwksUrl =
            options?.jwksUrl ?? 'https://auth.mettem.local/.well-known/jwks';
        this.cacheTtlMs = (options?.cacheTtlSeconds ?? 3600) * 1000;
    }

    /**
     * Initialize: fetch JWKS and start auto-refresh.
     */
    async init(): Promise<void> {
        await this.fetchJwks();
        this.startAutoRefresh();
    }

    /**
     * Get the public key. Will try to fetch if cache is expired.
     */
    async getPublicKey(kid?: string): Promise<CryptoKey> {
        // If cache is expired, try to refresh
        if (Date.now() - this.lastFetchTime > this.cacheTtlMs) {
            try {
                await this.fetchJwks();
            } catch {
                // If refresh fails, use cached key (if any)
                if (!this.publicKey)
                    throw new Error('No cached public key available');
            }
        }

        if (!this.publicKey) {
            throw new Error('Public key not loaded. Call init() first.');
        }

        return this.publicKey;
    }

    /**
     * Fetch JWKS from the auth service and import the first suitable key.
     */
    private async fetchJwks(): Promise<void> {
        const response = await fetch(this.jwksUrl);
        if (!response.ok) {
            throw new Error(
                `Failed to fetch JWKS: ${response.status} ${response.statusText}`,
            );
        }

        const jwks = (await response.json()) as JwksResponse;

        // Find the first key with 'sig' use or any key
        const keyData = jwks.keys.find((k) => k.use === 'sig') ?? jwks.keys[0];
        if (!keyData) {
            throw new Error('No keys found in JWKS response');
        }

        // Import the key using jose (dynamic import for ESM-only package)
        const { importJWK } = await import('jose');
        this.publicKey = (await importJWK(
            keyData as any,
            'RS256',
        )) as CryptoKey;
        this.kid = keyData.kid ?? null;
        this.lastFetchTime = Date.now();
    }

    /**
     * Start periodic auto-refresh of the JWKS.
     */
    private startAutoRefresh(): void {
        if (this.refreshTimer) return;

        this.refreshTimer = setInterval(() => {
            this.fetchJwks().catch((err) => {
                console.error('[JwksManager] Failed to refresh JWKS:', err);
            });
        }, this.cacheTtlMs);

        // Allow process to exit even with timer running
        if (this.refreshTimer && typeof this.refreshTimer === 'object') {
            this.refreshTimer.unref?.();
        }
    }

    /**
     * Stop auto-refresh (useful for testing).
     */
    stop(): void {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
    }

    /**
     * Get the KID of the currently loaded key.
     */
    getKid(): string | null {
        return this.kid;
    }
}
