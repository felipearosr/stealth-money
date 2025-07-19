import { Request, Response, NextFunction } from 'express';
import { clerkClient, verifyToken } from '@clerk/express';

// Extend Express Request interface to include user information
export interface AuthenticatedRequest extends Request {
  userId: string;
  user?: any;
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if Clerk is configured dynamically
    const isClerkConfigured = process.env.CLERK_SECRET_KEY && 
      process.env.CLERK_SECRET_KEY !== 'placeholder' &&
      !process.env.CLERK_SECRET_KEY.includes('placeholder');
    
    console.log('🔐 Auth middleware - isClerkConfigured:', isClerkConfigured);
    console.log('🔐 Auth middleware - CLERK_SECRET_KEY exists:', !!process.env.CLERK_SECRET_KEY);
    
    // If Clerk is not configured, skip authentication for development
    if (!isClerkConfigured) {
      console.log('⚠️  Clerk not configured - skipping authentication');
      // Set a mock user ID for testing
      (req as AuthenticatedRequest).userId = 'mock-user-id';
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
      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY!
      });
      
      if (!payload || !payload.sub) {
        return res.status(401).json({ 
          error: 'Unauthorized', 
          message: 'Invalid token' 
        });
      }

      // Add user information to request
      (req as AuthenticatedRequest).userId = payload.sub;
      
      // Optionally fetch full user details
      try {
        const user = await clerkClient.users.getUser(payload.sub);
        (req as AuthenticatedRequest).user = user;
      } catch (userError) {
        console.warn('Could not fetch user details:', userError);
        // Continue without user details - userId is sufficient
      }

      next();
    } catch (tokenError) {
      console.error('Token verification failed:', tokenError);
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Token verification failed' 
      });
    }
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: 'Authentication failed' 
    });
  }
};

export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if Clerk is configured dynamically
    const isClerkConfigured = process.env.CLERK_SECRET_KEY && 
      process.env.CLERK_SECRET_KEY !== 'placeholder' &&
      !process.env.CLERK_SECRET_KEY.includes('placeholder');
    
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
      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY!
      });
      
      if (payload && payload.sub) {
        (req as AuthenticatedRequest).userId = payload.sub;
        
        try {
          const user = await clerkClient.users.getUser(payload.sub);
          (req as AuthenticatedRequest).user = user;
        } catch (userError) {
          console.warn('Could not fetch user details:', userError);
        }
      }
    } catch (tokenError) {
      console.warn('Optional auth token verification failed:', tokenError);
      // Continue without authentication for optional auth
    }

    next();
  } catch (error) {
    console.error('Optional authentication middleware error:', error);
    // For optional auth, continue on error
    next();
  }
};