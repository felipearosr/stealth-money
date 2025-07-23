"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncUser = void 0;
const database_service_1 = require("../services/database.service");
const logging_middleware_1 = require("./logging.middleware");
const dbService = new database_service_1.DatabaseService();
const syncUser = async (req, res, next) => {
    try {
        const authReq = req;
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
                logging_middleware_1.logger.info('Created new user in database', {
                    userId: authReq.userId,
                    email: userData.email
                });
            }
            catch (createError) {
                // Handle case where user might have been created by another request
                if (createError instanceof Error && createError.message.includes('unique constraint')) {
                    user = await dbService.getUserById(authReq.userId);
                }
                else {
                    throw createError;
                }
            }
        }
        else {
            // User exists, update their information if needed
            const updateData = {};
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
                logging_middleware_1.logger.info('Updated user information', {
                    userId: authReq.userId,
                    updatedFields: Object.keys(updateData)
                });
            }
        }
        // Add user to request for downstream use
        authReq.dbUser = user;
        next();
    }
    catch (error) {
        logging_middleware_1.logger.error('User sync failed', {
            error: error instanceof Error ? error.message : 'Unknown error',
            userId: req.userId
        });
        // Don't fail the request if user sync fails
        next();
    }
};
exports.syncUser = syncUser;
