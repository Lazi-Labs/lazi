/**
 * Authentication Service
 * Handles user authentication, sessions, and password management
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import pg from 'pg';
import config from '../config/index.js';
import { authConfig } from '../config/auth.js';

const { Pool } = pg;

// Database pool for auth queries
let pool = null;

function getPool() {
    if (!pool) {
        pool = new Pool({
            connectionString: config.database.url,
            max: 10,
            ssl: {
                rejectUnauthorized: false
            }
        });
    }
    return pool;
}

export const authService = {
    // ─────────────────────────────────────────────────────────────────────────
    // PASSWORD UTILITIES
    // ─────────────────────────────────────────────────────────────────────────
    
    async hashPassword(password) {
        return bcrypt.hash(password, authConfig.password.saltRounds);
    },
    
    async verifyPassword(password, hash) {
        return bcrypt.compare(password, hash);
    },
    
    generateRandomToken() {
        return crypto.randomBytes(32).toString('hex');
    },
    
    hashToken(token) {
        return crypto.createHash('sha256').update(token).digest('hex');
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // JWT UTILITIES
    // ─────────────────────────────────────────────────────────────────────────
    
    generateAccessToken(user) {
        return jwt.sign(
            {
                userId: user.id,
                email: user.email,
                role: user.role,
                permissions: user.permissions || [],
            },
            authConfig.jwt.accessTokenSecret,
            { expiresIn: authConfig.jwt.accessTokenExpiry }
        );
    },
    
    generateRefreshToken() {
        return this.generateRandomToken();
    },
    
    verifyAccessToken(token) {
        try {
            return jwt.verify(token, authConfig.jwt.accessTokenSecret);
        } catch (error) {
            return null;
        }
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // USER OPERATIONS
    // ─────────────────────────────────────────────────────────────────────────
    
    async findUserByEmail(email) {
        const db = getPool();
        const result = await db.query(
            'SELECT * FROM public.app_users WHERE email = $1 AND is_active = true',
            [email.toLowerCase()]
        );
        return result.rows[0] || null;
    },
    
    async findUserById(id) {
        const db = getPool();
        const result = await db.query(
            `SELECT id, email, first_name, last_name, phone, avatar_url, role, permissions, employee_id, is_active, created_at, last_login_at 
             FROM public.app_users WHERE id = $1`,
            [id]
        );
        return result.rows[0] || null;
    },
    
    async createUser({ email, password, firstName, lastName, role = 'user', phone = null }) {
        const db = getPool();
        const passwordHash = await this.hashPassword(password);
        
        const result = await db.query(`
            INSERT INTO public.app_users (email, password_hash, first_name, last_name, phone, role)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, email, first_name, last_name, phone, role, created_at
        `, [email.toLowerCase(), passwordHash, firstName, lastName, phone, role]);
        
        return result.rows[0];
    },
    
    async updateUser(id, updates) {
        const db = getPool();
        const allowedFields = ['first_name', 'last_name', 'phone', 'avatar_url', 'role', 'is_active'];
        const fields = [];
        const values = [id];
        let paramIndex = 2;
        
        for (const [key, value] of Object.entries(updates)) {
            const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            if (allowedFields.includes(snakeKey)) {
                fields.push(`${snakeKey} = $${paramIndex}`);
                values.push(value);
                paramIndex++;
            }
        }
        
        if (fields.length === 0) return null;
        
        fields.push('updated_at = NOW()');
        
        const result = await db.query(`
            UPDATE public.app_users SET ${fields.join(', ')} WHERE id = $1
            RETURNING id, email, first_name, last_name, phone, avatar_url, role, is_active
        `, values);
        
        return result.rows[0];
    },
    
    async updatePassword(userId, newPassword) {
        const db = getPool();
        const passwordHash = await this.hashPassword(newPassword);
        await db.query(
            'UPDATE public.app_users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
            [passwordHash, userId]
        );
    },
    
    async updateLastLogin(userId) {
        const db = getPool();
        await db.query(
            'UPDATE public.app_users SET last_login_at = NOW() WHERE id = $1',
            [userId]
        );
    },
    
    async getAllUsers() {
        const db = getPool();
        const result = await db.query(`
            SELECT id, email, first_name, last_name, phone, role, is_active, created_at, last_login_at
            FROM public.app_users
            ORDER BY created_at DESC
        `);
        return result.rows;
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // SESSION OPERATIONS
    // ─────────────────────────────────────────────────────────────────────────
    
    async createSession(userId, refreshToken, userAgent, ipAddress) {
        const db = getPool();
        const refreshTokenHash = this.hashToken(refreshToken);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        
        // Clean up old sessions if over limit
        await db.query(`
            DELETE FROM public.app_sessions 
            WHERE user_id = $1 
            AND id NOT IN (
                SELECT id FROM public.app_sessions 
                WHERE user_id = $1 
                ORDER BY last_used_at DESC 
                LIMIT $2
            )
        `, [userId, authConfig.session.maxPerUser - 1]);
        
        const result = await db.query(`
            INSERT INTO public.app_sessions (user_id, refresh_token_hash, user_agent, ip_address, expires_at)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
        `, [userId, refreshTokenHash, userAgent, ipAddress, expiresAt]);
        
        return result.rows[0];
    },
    
    async findSessionByToken(refreshToken) {
        const db = getPool();
        const tokenHash = this.hashToken(refreshToken);
        
        const result = await db.query(`
            SELECT s.*, u.id as user_id, u.email, u.role, u.permissions, u.is_active,
                   u.first_name, u.last_name
            FROM public.app_sessions s
            JOIN public.app_users u ON u.id = s.user_id
            WHERE s.refresh_token_hash = $1 
            AND s.expires_at > NOW()
            AND u.is_active = true
        `, [tokenHash]);
        
        return result.rows[0] || null;
    },
    
    async updateSessionLastUsed(sessionId) {
        const db = getPool();
        await db.query(
            'UPDATE public.app_sessions SET last_used_at = NOW() WHERE id = $1',
            [sessionId]
        );
    },
    
    async deleteSession(sessionId) {
        const db = getPool();
        await db.query('DELETE FROM public.app_sessions WHERE id = $1', [sessionId]);
    },
    
    async deleteAllUserSessions(userId) {
        const db = getPool();
        await db.query('DELETE FROM public.app_sessions WHERE user_id = $1', [userId]);
    },
    
    async deleteExpiredSessions() {
        const db = getPool();
        await db.query('DELETE FROM public.app_sessions WHERE expires_at < NOW()');
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // PASSWORD RESET
    // ─────────────────────────────────────────────────────────────────────────
    
    async createPasswordResetToken(userId) {
        const db = getPool();
        const token = this.generateRandomToken();
        const tokenHash = this.hashToken(token);
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        
        await db.query(`
            INSERT INTO public.app_password_reset_tokens (user_id, token, expires_at)
            VALUES ($1, $2, $3)
        `, [userId, tokenHash, expiresAt]);
        
        return token;
    },
    
    async findPasswordResetToken(token) {
        const db = getPool();
        const tokenHash = this.hashToken(token);
        
        const result = await db.query(`
            SELECT pr.*, u.email
            FROM public.app_password_reset_tokens pr
            JOIN public.app_users u ON u.id = pr.user_id
            WHERE pr.token = $1 
            AND pr.expires_at > NOW() 
            AND pr.used_at IS NULL
        `, [tokenHash]);
        
        return result.rows[0] || null;
    },
    
    async markPasswordResetUsed(id) {
        const db = getPool();
        await db.query(
            'UPDATE public.app_password_reset_tokens SET used_at = NOW() WHERE id = $1',
            [id]
        );
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // AUTHENTICATION FLOW
    // ─────────────────────────────────────────────────────────────────────────
    
    async login(email, password, userAgent, ipAddress) {
        // Find user
        const user = await this.findUserByEmail(email);
        if (!user) {
            return { success: false, error: 'Invalid email or password' };
        }
        
        // Verify password
        const validPassword = await this.verifyPassword(password, user.password_hash);
        if (!validPassword) {
            return { success: false, error: 'Invalid email or password' };
        }
        
        // Generate tokens
        const accessToken = this.generateAccessToken(user);
        const refreshToken = this.generateRefreshToken();
        
        // Create session
        await this.createSession(user.id, refreshToken, userAgent, ipAddress);
        
        // Update last login
        await this.updateLastLogin(user.id);
        
        return {
            success: true,
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role,
                permissions: user.permissions,
            }
        };
    },
    
    async refresh(refreshToken, userAgent, ipAddress) {
        // Find session
        const session = await this.findSessionByToken(refreshToken);
        if (!session) {
            return { success: false, error: 'Invalid or expired session' };
        }
        
        // Generate new access token
        const accessToken = this.generateAccessToken({
            id: session.user_id,
            email: session.email,
            role: session.role,
            permissions: session.permissions,
        });
        
        // Update session last used
        await this.updateSessionLastUsed(session.id);
        
        return {
            success: true,
            accessToken,
            user: {
                id: session.user_id,
                email: session.email,
                firstName: session.first_name,
                lastName: session.last_name,
                role: session.role,
                permissions: session.permissions,
            }
        };
    },
    
    async logout(refreshToken) {
        if (!refreshToken) return;
        
        const session = await this.findSessionByToken(refreshToken);
        if (session) {
            await this.deleteSession(session.id);
        }
    },
    
    async logoutAll(userId) {
        await this.deleteAllUserSessions(userId);
    }
};

export default authService;
