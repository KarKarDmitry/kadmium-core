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
export function createAuthMiddleware(
  appCore: AppCore,
  authClient: AuthClient
) {
  return (options: AuthMiddlewareOptions = {}) => {
    const { requireAuth = true, allowedRoles = [], allowedGroups = [] } = options;

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
            message: 'Missing or invalid authorization header'
          });
        }
        return next();
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      try {
        // Verify token with auth service
        const isValid = await authClient.verifyToken(token);

        if (!isValid) {
          if (requireAuth) {
            req.authError = 'Invalid or expired token';
            return res.status(401).json({
              error: 'Unauthorized',
              message: 'Invalid or expired token'
            });
          }
          return next();
        }

        // Parse JWT payload (assuming standard JWT format)
        try {
          const payload = JSON.parse(
            Buffer.from(token.split('.')[1], 'base64').toString()
          ) as AuthUser;

          // Validate appId matches
          if (payload.appId !== authClient.getAppId()) {
            req.authError = 'Token issued for different application';
            return res.status(403).json({
              error: 'Forbidden',
              message: 'Token issued for different application'
            });
          }

          // Check roles if specified
          if (allowedRoles.length > 0) {
            const hasRole = allowedRoles.some(role => payload.roles.includes(role));
            if (!hasRole) {
              req.authError = 'Insufficient permissions';
              return res.status(403).json({
                error: 'Forbidden',
                message: 'Insufficient permissions'
              });
            }
          }

          // Check groups if specified
          if (allowedGroups.length > 0) {
            const hasGroup = allowedGroups.some(group => payload.groups.includes(group));
            if (!hasGroup) {
              req.authError = 'User not in required groups';
              return res.status(403).json({
                error: 'Forbidden',
                message: 'User not in required groups'
              });
            }
          }

          // Attach user to request
          req.user = payload;
          next();
        } catch (parseError) {
          console.error('Failed to parse JWT token:', parseError);
          if (requireAuth) {
            req.authError = 'Invalid token format';
            return res.status(401).json({
              error: 'Unauthorized',
              message: 'Invalid token format'
            });
          }
          next();
        }
      } catch (error) {
        console.error('Auth verification error:', error);
        if (requireAuth) {
          req.authError = 'Authentication service error';
          return res.status(500).json({
            error: 'Internal Server Error',
            message: 'Authentication service error'
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
export function requireAuth(appCore: AppCore, authClient: AuthClient) {
  return createAuthMiddleware(appCore, authClient)({ requireAuth: true });
}

/**
 * Helper middleware to require specific roles
 */
export function requireRoles(roles: string[], appCore: AppCore, authClient: AuthClient) {
  return createAuthMiddleware(appCore, authClient)({
    requireAuth: true,
    allowedRoles: roles
  });
}

/**
 * Helper middleware to require specific groups
 */
export function requireGroups(groups: string[], appCore: AppCore, authClient: AuthClient) {
  return createAuthMiddleware(appCore, authClient)({
    requireAuth: true,
    allowedGroups: groups
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
