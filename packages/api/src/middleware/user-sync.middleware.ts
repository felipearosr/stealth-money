// src/middleware/user-sync.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { DatabaseService } from '../services/database.service';
import { AuthenticatedRequest } from './auth.middleware';
import { logger } from './logging.middleware';

const dbService = new DatabaseService();

export const syncUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    
    // Only sync if user is authenticated
    if (!authReq.userId) {
      return next();
    }

    // Check if user exists in our database
    let user = await dbService.getUserById(authReq.userId);
    
    if (!user) {
      // User doesn't exist, create them
      const userData = {
        id: authReq.userId,
        email: authReq.user?.emailAddresses?.[0]?.emailAddress || `user-${authReq.userId}@example.com`,
        firstName: authReq.user?.firstName || null,
        lastName: authReq.user?.lastName || null,
        phone: authReq.user?.phoneNumbers?.[0]?.phoneNumber || null,
      };

      try {
        user = await dbService.createUser(userData);
        logger.info('Created new user in database', {
          userId: authReq.userId,
          email: userData.email
        });
      } catch (createError) {
        // Handle case where user might have been created by another request
        if (createError instanceof Error && createError.message.includes('unique constraint')) {
          user = await dbService.getUserById(authReq.userId);
        } else {
          throw createError;
        }
      }
    } else {
      // User exists, update their information if needed
      const updateData: any = {};
      let needsUpdate = false;

      if (authReq.user?.firstName && authReq.user.firstName !== user.firstName) {
        updateData.firstName = authReq.user.firstName;
        needsUpdate = true;
      }

      if (authReq.user?.lastName && authReq.user.lastName !== user.lastName) {
        updateData.lastName = authReq.user.lastName;
        needsUpdate = true;
      }

      const userPhone = authReq.user?.phoneNumbers?.[0]?.phoneNumber;
      if (userPhone && userPhone !== user.phone) {
        updateData.phone = userPhone;
        needsUpdate = true;
      }

      if (needsUpdate) {
        user = await dbService.updateUser(authReq.userId, updateData);
        logger.info('Updated user information', {
          userId: authReq.userId,
          updatedFields: Object.keys(updateData)
        });
      }
    }

    // Add user to request for downstream use
    authReq.dbUser = user;
    next();
  } catch (error) {
    logger.error('User sync failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: (req as AuthenticatedRequest).userId
    });
    
    // Don't fail the request if user sync fails
    next();
  }
};

// Extend the AuthenticatedRequest interface
declare module './auth.middleware' {
  interface AuthenticatedRequest {
    dbUser?: any;
  }
}