import type { Request, Response, NextFunction } from 'express';
import type { AppCore } from '../core/app-core.js';
import type { AuthClient } from './auth-client.js';
import { jwtVerify } from 'jose';
import type { JwksManager } from './jwks-manager.js';

export interface AuthMiddlewareOptions {
    requireAuth?: boolean;
    allowedRoles?: string[];
    allowedGroups?: string[];
}

export interface AuthUser {
    userId: string;
    username: string;
    roles: string[];
    groups: string[];
    appId: string;
    type: 'access';
}

export interface AuthRequest extends Request {
    user?: AuthUser;
    authError?: string;
}

/**
 * Create authentication middleware for Express.
 * Uses local JWT verification via JWKS instead of HTTP calls to auth service.
 */
export function createAuthMiddleware(
    appCore: AppCore,
    authClient: AuthClient,
    jwksManager?: JwksManager,
) {
    return (options: AuthMiddlewareOptions = {}) => {
        const {
            requireAuth = true,
            allowedRoles = [],
            allowedGroups = [],
        } = options;

        return async (req: AuthRequest, res: Response, next: NextFunction) => {
            // Skip auth if disabled
            if (!appCore.app.use_auth) {
                return next();
            }

            // Get authorization header
            const authHeader = req.headers.authorization;

            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                if (requireAuth) {
                    req.authError = 'Missing or invalid authorization header';
                    return res.status(401).json({
                        error: 'Unauthorized',
                        message: 'Missing or invalid authorization header',
                    });
                }
                return next();
            }

            const token = authHeader.substring(7); // Remove 'Bearer ' prefix

            try {
                // Verify token locally using JWKS public key
                if (!jwksManager) {
                    throw new Error('JWKS Manager not configured');
                }

                const publicKey = await jwksManager.getPublicKey();
                const { payload } = await jwtVerify(token, publicKey, {
                    algorithms: ['RS256'],
                    audience: authClient.getAppId(),
                });

                // Build AuthUser from verified payload
                const authUser: AuthUser = {
                    userId: payload.sub!,
                    username: (payload as any).username as string,
                    roles: ((payload as any).roles as string[]) || [],
                    groups: ((payload as any).groups as string[]) || [],
                    appId: authClient.getAppId(),
                    type: 'access',
                };

                // Check roles if specified
                if (allowedRoles.length > 0) {
                    const hasRole = allowedRoles.some((role) =>
                        authUser.roles.includes(role),
                    );
                    if (!hasRole) {
                        req.authError = 'Insufficient permissions';
                        return res.status(403).json({
                            error: 'Forbidden',
                            message: 'Insufficient permissions',
                        });
                    }
                }

                // Check groups if specified
                if (allowedGroups.length > 0) {
                    const hasGroup = allowedGroups.some((group) =>
                        authUser.groups.includes(group),
                    );
                    if (!hasGroup) {
                        req.authError = 'User not in required groups';
                        return res.status(403).json({
                            error: 'Forbidden',
                            message: 'User not in required groups',
                        });
                    }
                }

                // Attach user to request
                req.user = authUser;
                next();
            } catch (err) {
                console.error('Auth verification error:', err);
                if (requireAuth) {
                    req.authError = 'Invalid or expired token';
                    return res.status(401).json({
                        error: 'Unauthorized',
                        message: 'Invalid or expired token',
                    });
                }
                next();
            }
        };
    };
}

/**
 * Helper middleware to require authentication
 */
export function requireAuth(
    appCore: AppCore,
    authClient: AuthClient,
    jwksManager?: JwksManager,
) {
    return createAuthMiddleware(
        appCore,
        authClient,
        jwksManager,
    )({
        requireAuth: true,
    });
}

/**
 * Helper middleware to require specific roles
 */
export function requireRoles(
    roles: string[],
    appCore: AppCore,
    authClient: AuthClient,
    jwksManager?: JwksManager,
) {
    return createAuthMiddleware(
        appCore,
        authClient,
        jwksManager,
    )({
        requireAuth: true,
        allowedRoles: roles,
    });
}

/**
 * Helper middleware to require specific groups
 */
export function requireGroups(
    groups: string[],
    appCore: AppCore,
    authClient: AuthClient,
    jwksManager?: JwksManager,
) {
    return createAuthMiddleware(
        appCore,
        authClient,
        jwksManager,
    )({
        requireAuth: true,
        allowedGroups: groups,
    });
}

/**
 * Get user from request (type guard)
 */
export function getUser(req: Request): AuthUser | undefined {
    const authReq = req as AuthRequest;
    return authReq.user;
}

/**
 * Check if request has authentication error
 */
export function hasAuthError(req: Request): boolean {
    const authReq = req as AuthRequest;
    return !!authReq.authError;
}

/**
 * Get authentication error message
 */
export function getAuthError(req: Request): string | undefined {
    const authReq = req as AuthRequest;
    return authReq.authError;
}
