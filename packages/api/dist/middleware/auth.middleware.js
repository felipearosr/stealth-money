"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuth = exports.requireAuth = void 0;
const express_1 = require("@clerk/express");
const isClerkConfigured = process.env.CLERK_SECRET_KEY &&
    !process.env.CLERK_SECRET_KEY.includes('placeholder');
const requireAuth = async (req, res, next) => {
    try {
        // If Clerk is not configured, skip authentication for development
        if (!isClerkConfigured) {
            console.log('⚠️  Clerk not configured - skipping authentication');
            return next();
        }
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Missing or invalid authorization header'
            });
        }
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        try {
            // Verify the JWT token with Clerk
            const payload = await (0, express_1.verifyToken)(token, {
                secretKey: process.env.CLERK_SECRET_KEY
            });
            if (!payload || !payload.sub) {
                return res.status(401).json({
                    error: 'Unauthorized',
                    message: 'Invalid token'
                });
            }
            // Add user information to request
            req.userId = payload.sub;
            // Optionally fetch full user details
            try {
                const user = await express_1.clerkClient.users.getUser(payload.sub);
                req.user = user;
            }
            catch (userError) {
                console.warn('Could not fetch user details:', userError);
                // Continue without user details - userId is sufficient
            }
            next();
        }
        catch (tokenError) {
            console.error('Token verification failed:', tokenError);
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Token verification failed'
            });
        }
    }
    catch (error) {
        console.error('Authentication middleware error:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: 'Authentication failed'
        });
    }
};
exports.requireAuth = requireAuth;
const optionalAuth = async (req, res, next) => {
    try {
        // If Clerk is not configured, skip authentication
        if (!isClerkConfigured) {
            return next();
        }
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            // No auth header provided, continue without authentication
            return next();
        }
        const token = authHeader.substring(7);
        try {
            const payload = await (0, express_1.verifyToken)(token, {
                secretKey: process.env.CLERK_SECRET_KEY
            });
            if (payload && payload.sub) {
                req.userId = payload.sub;
                try {
                    const user = await express_1.clerkClient.users.getUser(payload.sub);
                    req.user = user;
                }
                catch (userError) {
                    console.warn('Could not fetch user details:', userError);
                }
            }
        }
        catch (tokenError) {
            console.warn('Optional auth token verification failed:', tokenError);
            // Continue without authentication for optional auth
        }
        next();
    }
    catch (error) {
        console.error('Optional authentication middleware error:', error);
        // For optional auth, continue on error
        next();
    }
};
exports.optionalAuth = optionalAuth;
