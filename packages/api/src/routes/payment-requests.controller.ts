// src/routes/payment-requests.controller.ts
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PaymentRequestService } from '../services/payment-request.service';

const router = Router();
const paymentRequestService = new PaymentRequestService();

// Validation schemas
const createPaymentRequestSchema = z.object({
  requesterId: z.string().min(1, 'Requester ID is required'),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().length(3, 'Currency must be 3 characters'),
  description: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
  metadata: z.record(z.any()).optional(),
});

const processPaymentSchema = z.object({
  senderId: z.string().min(1, 'Sender ID is required'),
  processorId: z.string().optional(),
  settlementMethod: z.enum(['circle', 'mantle']).optional(),
  metadata: z.record(z.any()).optional(),
});

const userOnboardingSchema = z.object({
  email: z.string().email('Valid email is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  country: z.string().min(2, 'Country is required'),
  currency: z.string().length(3, 'Currency must be 3 characters').optional(),
});

/**
 * POST /api/payment-requests
 * Create a new payment request
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const validatedData = createPaymentRequestSchema.parse(req.body);
    
    // Convert expiresAt string to Date if provided
    const requestData = {
      ...validatedData,
      expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : undefined,
    };

    const paymentRequest = await paymentRequestService.createPaymentRequest(requestData);

    res.status(201).json({
      success: true,
      data: paymentRequest,
      message: 'Payment request created successfully',
    });
  } catch (error) {
    console.error('Create payment request error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid input data',
        errors: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create payment request',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/payment-requests/:id
 * Get payment request details
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const paymentRequest = await paymentRequestService.getRequestStatus(id);
    
    if (!paymentRequest) {
      return res.status(404).json({
        success: false,
        message: 'Payment request not found',
      });
    }

    res.json({
      success: true,
      data: paymentRequest,
    });
  } catch (error) {
    console.error('Get payment request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment request',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/payment-requests/:id/qr-code
 * Generate QR code for payment request
 */
router.get('/:id/qr-code', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const qrData = await paymentRequestService.generateQRCode(id);
    
    res.json({
      success: true,
      data: qrData,
      message: 'QR code generated successfully',
    });
  } catch (error) {
    console.error('Generate QR code error:', error);
    
    // Handle specific validation errors
    if (error instanceof Error) {
      if (error.message === 'Payment request not found') {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }
      
      if (error.message === 'Payment request is not in pending status' || 
          error.message === 'Payment request has expired') {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
    }

    res.status(500).json({
      success: false,
      message: 'Failed to generate QR code',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/payment-requests/:id/shareable-link
 * Generate secure shareable link for payment request
 */
router.get('/:id/shareable-link', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const shareableLink = await paymentRequestService.generateShareableLink(id);
    
    res.json({
      success: true,
      data: {
        shareableLink,
      },
      message: 'Shareable link generated successfully',
    });
  } catch (error) {
    console.error('Generate shareable link error:', error);
    
    // Handle specific validation errors
    if (error instanceof Error) {
      if (error.message === 'Payment request not found') {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }
      
      if (error.message === 'Payment request is not in pending status' || 
          error.message === 'Payment request has expired') {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
    }

    res.status(500).json({
      success: false,
      message: 'Failed to generate shareable link',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/payment-requests/:id/pay
 * Process payment for a payment request
 */
router.post('/:id/pay', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = processPaymentSchema.parse(req.body);
    
    const result = await paymentRequestService.processPaymentRequest(id, validatedData);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error || 'Payment processing failed',
      });
    }

    res.json({
      success: true,
      data: {
        paymentId: result.paymentId,
      },
      message: 'Payment processed successfully',
    });
  } catch (error) {
    console.error('Process payment error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment data',
        errors: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to process payment',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/payment-requests/:id/cancel
 * Cancel a payment request
 */
router.put('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { requesterId } = req.body;
    
    if (!requesterId) {
      return res.status(400).json({
        success: false,
        message: 'Requester ID is required',
      });
    }
    
    const success = await paymentRequestService.cancelPaymentRequest(id, requesterId);
    
    if (!success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to cancel payment request',
      });
    }

    res.json({
      success: true,
      message: 'Payment request cancelled successfully',
    });
  } catch (error) {
    console.error('Cancel payment request error:', error);
    
    // Handle specific validation errors
    if (error instanceof Error) {
      if (error.message === 'Payment request not found') {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }
      
      if (error.message === 'Unauthorized to cancel this payment request' ||
          error.message === 'Can only cancel pending payment requests') {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
    }

    res.status(500).json({
      success: false,
      message: 'Failed to cancel payment request',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/payment-requests/user/:userId
 * Get payment requests for a specific user
 */
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { status } = req.query;
    
    const paymentRequests = await paymentRequestService.getUserPaymentRequests(
      userId, 
      status as string
    );
    
    res.json({
      success: true,
      data: paymentRequests,
      count: paymentRequests.length,
    });
  } catch (error) {
    console.error('Get user payment requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment requests',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/payment-requests/validate-token/:token
 * Validate a shareable link token
 */
router.get('/validate-token/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    
    const validationResult = await paymentRequestService.validateShareableToken(token);
    
    res.json({
      success: true,
      data: validationResult,
      message: 'Token validated successfully',
    });
  } catch (error) {
    console.error('Validate token error:', error);
    
    if (error instanceof Error && error.message === 'Invalid or expired token') {
      return res.status(401).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to validate token',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/payment-requests/onboard-user
 * Onboard a new user who accessed a payment request
 */
router.post('/onboard-user', async (req: Request, res: Response) => {
  try {
    const validatedData = userOnboardingSchema.parse(req.body);
    
    // This would typically integrate with your user service
    // For now, we'll create a simple user record
    // In a real implementation, this would:
    // 1. Create user account
    // 2. Send verification email
    // 3. Set up initial KYC process
    // 4. Return user credentials or session token
    
    // Mock user creation response
    const newUser = {
      id: `user_${Date.now()}`, // In real implementation, this would come from user service
      email: validatedData.email,
      firstName: validatedData.firstName,
      lastName: validatedData.lastName,
      phone: validatedData.phone,
      country: validatedData.country,
      currency: validatedData.currency || 'USD',
      kycStatus: 'PENDING',
      createdAt: new Date(),
    };
    
    res.status(201).json({
      success: true,
      data: newUser,
      message: 'User onboarded successfully',
      nextSteps: [
        'Verify email address',
        'Complete KYC process',
        'Link bank account',
        'Complete payment',
      ],
    });
  } catch (error) {
    console.error('User onboarding error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user data',
        errors: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to onboard user',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/payment-requests/:id/history
 * Get payment request history and timeline
 */
router.get('/:id/history', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const paymentRequest = await paymentRequestService.getRequestStatus(id);
    
    if (!paymentRequest) {
      return res.status(404).json({
        success: false,
        message: 'Payment request not found',
      });
    }

    // Build timeline based on payment request status and dates
    const timeline = [
      {
        event: 'Payment Request Created',
        timestamp: paymentRequest.createdAt,
        status: 'completed',
      },
    ];

    if (paymentRequest.status === 'PAID' && paymentRequest.paidAt) {
      timeline.push({
        event: 'Payment Completed',
        timestamp: paymentRequest.paidAt,
        status: 'completed',
      });
    } else if (paymentRequest.status === 'EXPIRED') {
      timeline.push({
        event: 'Payment Request Expired',
        timestamp: paymentRequest.expiresAt,
        status: 'failed',
      });
    } else if (paymentRequest.status === 'CANCELLED') {
      timeline.push({
        event: 'Payment Request Cancelled',
        timestamp: paymentRequest.updatedAt || paymentRequest.createdAt,
        status: 'cancelled',
      });
    } else {
      timeline.push({
        event: 'Awaiting Payment',
        timestamp: new Date(),
        status: 'pending',
      });
    }

    res.json({
      success: true,
      data: {
        paymentRequest,
        timeline,
      },
    });
  } catch (error) {
    console.error('Get payment request history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment request history',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;