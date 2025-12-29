/**
 * Authentication Routes
 * Login, logout, refresh, password reset, user management
 */

import { Router } from 'express';
import authService from '../services/auth.service.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { authConfig } from '../config/auth.js';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }
        
        const userAgent = req.headers['user-agent'];
        const ipAddress = req.ip || req.connection?.remoteAddress;
        
        const result = await authService.login(email, password, userAgent, ipAddress);
        
        if (!result.success) {
            return res.status(401).json({ error: result.error });
        }
        
        // Set refresh token as httpOnly cookie
        res.cookie('refreshToken', result.refreshToken, {
            ...authConfig.cookies,
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
        
        res.json({
            accessToken: result.accessToken,
            user: result.user,
        });
    } catch (error) {
        console.error('Login error:', error);
        next(error);
    }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res, next) => {
    try {
        // Get refresh token from cookie or body
        const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
        
        if (!refreshToken) {
            return res.status(401).json({ error: 'No refresh token' });
        }
        
        const userAgent = req.headers['user-agent'];
        const ipAddress = req.ip || req.connection?.remoteAddress;
        
        const result = await authService.refresh(refreshToken, userAgent, ipAddress);
        
        if (!result.success) {
            res.clearCookie('refreshToken');
            return res.status(401).json({ error: result.error });
        }
        
        res.json({
            accessToken: result.accessToken,
            user: result.user,
        });
    } catch (error) {
        console.error('Refresh error:', error);
        next(error);
    }
});

// POST /api/auth/logout
router.post('/logout', async (req, res, next) => {
    try {
        const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
        
        await authService.logout(refreshToken);
        
        res.clearCookie('refreshToken');
        res.json({ success: true });
    } catch (error) {
        console.error('Logout error:', error);
        next(error);
    }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res, next) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email required' });
        }
        
        const user = await authService.findUserByEmail(email);
        
        // Always return success (don't reveal if email exists)
        if (!user) {
            return res.json({ success: true, message: 'If the email exists, a reset link has been sent' });
        }
        
        const token = await authService.createPasswordResetToken(user.id);
        
        // TODO: Send email with reset link
        console.log(`Password reset token for ${email}: ${token}`);
        
        res.json({ success: true, message: 'If the email exists, a reset link has been sent' });
    } catch (error) {
        console.error('Forgot password error:', error);
        next(error);
    }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res, next) => {
    try {
        const { token, password } = req.body;
        
        if (!token || !password) {
            return res.status(400).json({ error: 'Token and new password required' });
        }
        
        if (password.length < authConfig.password.minLength) {
            return res.status(400).json({ error: `Password must be at least ${authConfig.password.minLength} characters` });
        }
        
        const resetRequest = await authService.findPasswordResetToken(token);
        
        if (!resetRequest) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }
        
        // Update password
        await authService.updatePassword(resetRequest.user_id, password);
        
        // Mark token as used
        await authService.markPasswordResetUsed(resetRequest.id);
        
        // Invalidate all sessions
        await authService.logoutAll(resetRequest.user_id);
        
        res.json({ success: true, message: 'Password has been reset' });
    } catch (error) {
        console.error('Reset password error:', error);
        next(error);
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// PROTECTED ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/auth/me - Get current user
router.get('/me', authenticate, async (req, res, next) => {
    try {
        const user = await authService.findUserById(req.user.userId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            phone: user.phone,
            avatarUrl: user.avatar_url,
            role: user.role,
            permissions: user.permissions,
        });
    } catch (error) {
        console.error('Get me error:', error);
        next(error);
    }
});

// PATCH /api/auth/me - Update current user
router.patch('/me', authenticate, async (req, res, next) => {
    try {
        const { firstName, lastName, phone, avatarUrl } = req.body;
        
        const user = await authService.updateUser(req.user.userId, {
            firstName,
            lastName,
            phone,
            avatarUrl,
        });
        
        res.json(user);
    } catch (error) {
        console.error('Update me error:', error);
        next(error);
    }
});

// POST /api/auth/change-password
router.post('/change-password', authenticate, async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current and new password required' });
        }
        
        if (newPassword.length < authConfig.password.minLength) {
            return res.status(400).json({ error: `Password must be at least ${authConfig.password.minLength} characters` });
        }
        
        // Verify current password
        const user = await authService.findUserByEmail(req.user.email);
        const validPassword = await authService.verifyPassword(currentPassword, user.password_hash);
        
        if (!validPassword) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }
        
        // Update password
        await authService.updatePassword(req.user.userId, newPassword);
        
        res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        next(error);
    }
});

// POST /api/auth/logout-all - Logout from all devices
router.post('/logout-all', authenticate, async (req, res, next) => {
    try {
        await authService.logoutAll(req.user.userId);
        res.clearCookie('refreshToken');
        res.json({ success: true, message: 'Logged out from all devices' });
    } catch (error) {
        console.error('Logout all error:', error);
        next(error);
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/auth/users - List all users (admin only)
router.get('/users', authenticate, requireRole('admin'), async (req, res, next) => {
    try {
        const users = await authService.getAllUsers();
        res.json(users);
    } catch (error) {
        console.error('Get users error:', error);
        next(error);
    }
});

// POST /api/auth/users - Create new user (admin only)
router.post('/users', authenticate, requireRole('admin'), async (req, res, next) => {
    try {
        const { email, password, firstName, lastName, role, phone } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }
        
        // Check if user exists
        const existing = await authService.findUserByEmail(email);
        if (existing) {
            return res.status(400).json({ error: 'Email already registered' });
        }
        
        const user = await authService.createUser({
            email,
            password,
            firstName,
            lastName,
            role: role || 'user',
            phone,
        });
        
        res.status(201).json(user);
    } catch (error) {
        console.error('Create user error:', error);
        next(error);
    }
});

// PATCH /api/auth/users/:id - Update user (admin only)
router.patch('/users/:id', authenticate, requireRole('admin'), async (req, res, next) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        const user = await authService.updateUser(id, updates);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(user);
    } catch (error) {
        console.error('Update user error:', error);
        next(error);
    }
});

// DELETE /api/auth/users/:id - Deactivate user (admin only)
router.delete('/users/:id', authenticate, requireRole('admin'), async (req, res, next) => {
    try {
        const { id } = req.params;
        
        // Don't allow deleting yourself
        if (id === req.user.userId) {
            return res.status(400).json({ error: 'Cannot deactivate your own account' });
        }
        
        await authService.updateUser(id, { isActive: false });
        await authService.logoutAll(id);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Delete user error:', error);
        next(error);
    }
});

export default router;
