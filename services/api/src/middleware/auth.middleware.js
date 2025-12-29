/**
 * Authentication Middleware
 * JWT verification and role-based access control
 */

import authService from '../services/auth.service.js';

export function authenticate(req, res, next) {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.substring(7);
    
    // Verify token
    const decoded = authService.verifyAccessToken(token);
    
    if (!decoded) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    // Attach user info to request
    req.user = decoded;
    next();
}

export function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        
        next();
    };
}

export function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const decoded = authService.verifyAccessToken(token);
        if (decoded) {
            req.user = decoded;
        }
    }
    
    next();
}

export default { authenticate, requireRole, optionalAuth };
