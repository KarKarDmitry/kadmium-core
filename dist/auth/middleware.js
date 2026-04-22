"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuthMiddleware = createAuthMiddleware;
exports.requireAuth = requireAuth;
exports.requireRoles = requireRoles;
exports.requireGroups = requireGroups;
exports.getUser = getUser;
exports.hasAuthError = hasAuthError;
exports.getAuthError = getAuthError;
/**
 * Create authentication middleware for Express
 */
function createAuthMiddleware(appCore, authClient) {
    return (options = {}) => {
        const { requireAuth = true, allowedRoles = [], allowedGroups = [] } = options;
        return async (req, res, next) => {
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
                    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
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
                }
                catch (parseError) {
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
            }
            catch (error) {
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
function requireAuth(appCore, authClient) {
    return createAuthMiddleware(appCore, authClient)({ requireAuth: true });
}
/**
 * Helper middleware to require specific roles
 */
function requireRoles(roles, appCore, authClient) {
    return createAuthMiddleware(appCore, authClient)({
        requireAuth: true,
        allowedRoles: roles
    });
}
/**
 * Helper middleware to require specific groups
 */
function requireGroups(groups, appCore, authClient) {
    return createAuthMiddleware(appCore, authClient)({
        requireAuth: true,
        allowedGroups: groups
    });
}
/**
 * Get user from request (type guard)
 */
function getUser(req) {
    const authReq = req;
    return authReq.user;
}
/**
 * Check if request has authentication error
 */
function hasAuthError(req) {
    const authReq = req;
    return !!authReq.authError;
}
/**
 * Get authentication error message
 */
function getAuthError(req) {
    const authReq = req;
    return authReq.authError;
}
//# sourceMappingURL=middleware.js.map