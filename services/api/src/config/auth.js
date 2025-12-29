/**
 * Authentication Configuration
 */

export const authConfig = {
    // JWT settings
    jwt: {
        accessTokenSecret: process.env.JWT_ACCESS_SECRET || 'pc-access-secret-change-in-production-2025',
        refreshTokenSecret: process.env.JWT_REFRESH_SECRET || 'pc-refresh-secret-change-in-production-2025',
        accessTokenExpiry: '15m',      // Short-lived access token
        refreshTokenExpiry: '7d',       // Longer-lived refresh token
    },
    
    // Password settings
    password: {
        saltRounds: 10,
        minLength: 8,
    },
    
    // Session settings
    session: {
        maxPerUser: 5,  // Max active sessions per user
    },
    
    // Cookie settings
    cookies: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
    }
};

export default authConfig;
