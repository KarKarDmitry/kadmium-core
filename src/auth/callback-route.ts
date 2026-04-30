import { Router, type Request, type Response } from 'express';
import type { AuthClient } from './auth-client.js';

interface TokenResponse {
    access_token: string;
    token_type?: string;
    expires_in?: number;
}

/**
 * Create the POST /auth/callback route for SPA OAuth callback.
 * SPA sends authorization_code, this route exchanges it for an access_token
 * by calling the Auth service's POST /auth/token endpoint.
 */
export function createCallbackRoute(authClient: AuthClient): Router {
    const router = Router();

    router.post('/auth/callback', async (req: Request, res: Response) => {
        try {
            const { code } = req.body;

            if (!code) {
                return res.status(400).json({
                    error: 'Bad Request',
                    message: 'code is required',
                });
            }

            // Exchange authorization_code for access_token
            const response = await fetch(
                `${authClient.getAuthServiceUrl()}/auth/token`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        grant_type: 'authorization_code',
                        code,
                        app_id: authClient.getAppId(),
                        cluster_key: authClient.getClusterKey(),
                    }),
                },
            );

            if (!response.ok) {
                const errorText = await response.text();
                return res.status(response.status).json({
                    error: 'Token exchange failed',
                    message: errorText,
                });
            }

            const result = (await response.json()) as TokenResponse;

            // Return access_token to the SPA
            return res.json({
                access_token: result.access_token,
                token_type: result.token_type || 'Bearer',
                expires_in: result.expires_in,
            });
        } catch (err) {
            console.error('[Auth Callback] Error:', err);
            return res.status(500).json({
                error: 'Internal Server Error',
                message: 'Failed to exchange authorization code',
            });
        }
    });

    return router;
}
