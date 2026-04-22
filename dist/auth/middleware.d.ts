import type { Request, Response, NextFunction } from 'express';
import type { AppCore } from '../core/app-core';
import type { AuthClient } from './auth-client';
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
 * Create authentication middleware for Express
 */
export declare function createAuthMiddleware(appCore: AppCore, authClient: AuthClient): (options?: AuthMiddlewareOptions) => (req: AuthRequest, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
/**
 * Helper middleware to require authentication
 */
export declare function requireAuth(appCore: AppCore, authClient: AuthClient): (req: AuthRequest, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
/**
 * Helper middleware to require specific roles
 */
export declare function requireRoles(roles: string[], appCore: AppCore, authClient: AuthClient): (req: AuthRequest, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
/**
 * Helper middleware to require specific groups
 */
export declare function requireGroups(groups: string[], appCore: AppCore, authClient: AuthClient): (req: AuthRequest, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
/**
 * Get user from request (type guard)
 */
export declare function getUser(req: Request): AuthUser | undefined;
/**
 * Check if request has authentication error
 */
export declare function hasAuthError(req: Request): boolean;
/**
 * Get authentication error message
 */
export declare function getAuthError(req: Request): string | undefined;
//# sourceMappingURL=middleware.d.ts.map