import express from 'express';
import { 
  generateAuthUrl, 
  exchangeCodeForTokens, 
  verifyIdToken, 
  getUserInfo, 
  generateJWT,
  initializeOIDC 
} from '../middleware/auth';
import { UserService } from '../services/UserService';
import { SessionService } from '../services/SessionService';
import { AuditService } from '../services/AuditService';
import { logger, logSecurityEvent } from '../utils/logger';
import { config } from '../config/config';
import { 
  AuthenticationError, 
  ValidationError, 
  NotFoundError 
} from '../middleware/errorHandler';
import { validateRequest, CommonSchemas } from '../middleware/validation';
import Joi from 'joi';

const router = express.Router();

// Initialize OIDC on module load
initializeOIDC().catch(error => {
  logger.error('Failed to initialize OIDC', { error });
});

/**
 * @swagger
 * /api/auth/login:
 *   get:
 *     tags: [Authentication]
 *     summary: Initiate OIDC login flow
 *     description: Redirects user to OIDC provider for authentication
 *     parameters:
 *       - name: returnUrl
 *         in: query
 *         description: URL to redirect to after successful authentication
 *         schema:
 *           type: string
 *           format: uri
 *     responses:
 *       302:
 *         description: Redirect to OIDC provider
 *         headers:
 *           Location:
 *             description: OIDC authorization URL
 *             schema:
 *               type: string
 *               format: uri
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/login', async (req, res, next) => {
  try {
    const returnUrl = req.query.returnUrl as string;
    
    // Validate return URL if provided
    if (returnUrl) {
      try {
        new URL(returnUrl);
      } catch {
        throw new ValidationError('Invalid return URL format');
      }
    }

    // Generate OIDC authorization URL with PKCE
    const { url, state } = generateAuthUrl(req);
    
    // Store return URL in session
    if (returnUrl) {
      req.session = req.session || {};
      req.session.returnUrl = returnUrl;
    }

    logger.info('Authentication initiated', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      returnUrl,
      state
    });

    // Log security event
    logSecurityEvent({
      type: 'authentication',
      severity: 'low',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      description: 'OIDC authentication flow initiated'
    });

    res.redirect(url);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/auth/callback:
 *   get:
 *     tags: [Authentication]
 *     summary: OIDC callback handler
 *     description: Handles the callback from OIDC provider after authentication
 *     parameters:
 *       - name: code
 *         in: query
 *         required: true
 *         description: Authorization code from OIDC provider
 *         schema:
 *           type: string
 *       - name: state
 *         in: query
 *         required: true
 *         description: State parameter for CSRF protection
 *         schema:
 *           type: string
 *       - name: error
 *         in: query
 *         description: Error from OIDC provider
 *         schema:
 *           type: string
 *       - name: error_description
 *         in: query
 *         description: Error description from OIDC provider
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Authentication successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 accessToken:
 *                   type: string
 *                 expiresIn:
 *                   type: number
 *                 returnUrl:
 *                   type: string
 *       302:
 *         description: Redirect to return URL or dashboard
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/callback', async (req, res, next) => {
  try {
    const { code, state, error, error_description } = req.query;

    // Handle OIDC errors
    if (error) {
      logger.warn('OIDC authentication error', {
        error,
        errorDescription: error_description,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      await AuditService.logAuthEvent({
        eventType: 'login_failed',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        details: { 
          reason: 'OIDC error', 
          error: error as string,
          errorDescription: error_description as string
        }
      });

      throw new AuthenticationError(`Authentication failed: ${error_description || error}`);
    }

    if (!code || !state) {
      throw new ValidationError('Missing authorization code or state parameter');
    }

    // Verify session state
    const sessionState = req.session?.state;
    const codeVerifier = req.session?.codeVerifier;
    
    if (!sessionState || !codeVerifier) {
      throw new AuthenticationError('Invalid session state');
    }

    // Exchange authorization code for tokens
    const { accessToken, idToken, refreshToken } = await exchangeCodeForTokens(
      code as string,
      codeVerifier,
      state as string,
      sessionState
    );

    // Verify and decode ID token
    const idTokenClaims = await verifyIdToken(idToken);
    
    // Get user info from OIDC provider
    const userInfo = await getUserInfo(accessToken);

    logger.info('OIDC tokens received', {
      subject: idTokenClaims.sub,
      email: userInfo.email,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Find or create user
    let user = await UserService.getUserByExternalId(idTokenClaims.sub as string);
    
    if (!user) {
      // Check if user exists by email
      const existingUser = await UserService.getUserByEmail(userInfo.email as string);
      
      if (existingUser) {
        // Link external ID to existing user
        user = await UserService.updateUser(existingUser.id, {
          externalId: idTokenClaims.sub as string
        });
      } else {
        // Create new user
        user = await UserService.createUser({
          email: userInfo.email as string,
          externalId: idTokenClaims.sub as string,
          firstName: userInfo.given_name as string,
          lastName: userInfo.family_name as string,
          dataProcessingConsent: true
        });
      }
    }

    // Check if user is active
    if (user.status !== 'active') {
      await AuditService.logAuthEvent({
        userId: user.id,
        eventType: 'login_failed',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        details: { reason: 'User account inactive', status: user.status }
      });

      throw new AuthenticationError('Account is not active');
    }

    // Create session
    const session = await SessionService.createSession({
      userId: user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      idToken,
      accessToken,
      tokenExpiresAt: new Date(Date.now() + (idTokenClaims.exp as number) * 1000)
    });

    // Generate internal JWT
    const jwtToken = generateJWT({
      id: user.id,
      email: user.email,
      role: user.role,
      sessionId: session.id
    });

    // Update last login
    await UserService.updateLastLogin(user.id);

    // Check for suspicious activity
    const isSuspicious = await SessionService.checkSuspiciousActivity(
      user.id,
      req.ip,
      req.get('User-Agent')
    );

    // Log successful authentication
    await AuditService.logAuthEvent({
      userId: user.id,
      eventType: 'login_success',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: { 
        sessionId: session.id,
        suspicious: isSuspicious,
        oidcSubject: idTokenClaims.sub
      }
    });

    logger.info('User authenticated successfully', {
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId: session.id,
      suspicious: isSuspicious
    });

    // Set secure cookie
    res.cookie('accessToken', jwtToken, {
      httpOnly: true,
      secure: config.env === 'production',
      sameSite: 'lax',
      maxAge: config.security.sessionTimeout,
      path: '/'
    });

    // Clean up session data
    if (req.session) {
      const returnUrl = req.session.returnUrl;
      delete req.session.state;
      delete req.session.codeVerifier;
      delete req.session.returnUrl;
    }

    // Respond with user data and token
    const returnUrl = req.session?.returnUrl || '/dashboard';
    
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        lastLoginAt: user.lastLoginAt,
        dataProcessingConsent: user.dataProcessingConsent
      },
      accessToken: jwtToken,
      expiresIn: config.security.sessionTimeout / 1000,
      returnUrl,
      suspicious: isSuspicious
    });

  } catch (error) {
    logger.error('Authentication callback failed', {
      error: error instanceof Error ? error.message : error,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      query: req.query
    });

    next(error);
  }
});

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     tags: [Authentication]
 *     summary: Refresh access token
 *     description: Refresh the JWT access token using the session refresh token
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                 expiresIn:
 *                   type: number
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/refresh', 
  validateRequest(Joi.object({
    refreshToken: Joi.string().optional()
  })),
  async (req, res, next) => {
    try {
      const refreshToken = req.body.refreshToken || req.cookies.refreshToken;
      
      if (!refreshToken) {
        throw new AuthenticationError('Refresh token required');
      }

      // Refresh session
      const session = await SessionService.refreshSession(refreshToken);
      
      // Generate new JWT
      const user = await UserService.getUserById(session.userId);
      if (!user) {
        throw new NotFoundError('User', session.userId);
      }

      const jwtToken = generateJWT({
        id: user.id,
        email: user.email,
        role: user.role,
        sessionId: session.id
      });

      // Update cookie
      res.cookie('accessToken', jwtToken, {
        httpOnly: true,
        secure: config.env === 'production',
        sameSite: 'lax',
        maxAge: config.security.sessionTimeout,
        path: '/'
      });

      // Log token refresh
      await AuditService.logAuthEvent({
        userId: user.id,
        eventType: 'token_refresh',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        details: { sessionId: session.id }
      });

      res.json({
        success: true,
        accessToken: jwtToken,
        expiresIn: config.security.sessionTimeout / 1000
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags: [Authentication]
 *     summary: Logout user
 *     description: Logout user and invalidate session
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               allDevices:
 *                 type: boolean
 *                 description: Whether to logout from all devices
 *                 default: false
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/logout',
  validateRequest(Joi.object({
    allDevices: Joi.boolean().default(false)
  })),
  async (req, res, next) => {
    try {
      const sessionToken = req.cookies.accessToken || 
                          (req.headers.authorization?.startsWith('Bearer ') ? 
                           req.headers.authorization.substring(7) : null);

      if (sessionToken) {
        const session = await SessionService.getSession(sessionToken);
        
        if (session) {
          if (req.body.allDevices) {
            // Logout from all devices
            await SessionService.deleteUserSessions(session.userId);
          } else {
            // Logout from current session only
            await SessionService.deleteSession(sessionToken);
          }

          // Log logout
          await AuditService.logAuthEvent({
            userId: session.userId,
            eventType: 'logout',
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            details: { 
              sessionId: session.id,
              allDevices: req.body.allDevices 
            }
          });

          logger.info('User logged out', {
            userId: session.userId,
            sessionId: session.id,
            allDevices: req.body.allDevices
          });
        }
      }

      // Clear cookies
      res.clearCookie('accessToken', { path: '/' });
      res.clearCookie('refreshToken', { path: '/' });

      res.json({
        success: true,
        message: req.body.allDevices ? 
          'Logged out from all devices' : 
          'Logged out successfully'
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     tags: [Authentication]
 *     summary: Get current user info
 *     description: Get information about the currently authenticated user
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Current user information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 permissions:
 *                   type: array
 *                   items:
 *                     type: string
 *                 sessionInfo:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     lastActivityAt:
 *                       type: string
 *                       format: date-time
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/me', async (req, res, next) => {
  try {
    const sessionToken = req.cookies.accessToken || 
                        (req.headers.authorization?.startsWith('Bearer ') ? 
                         req.headers.authorization.substring(7) : null);

    if (!sessionToken) {
      throw new AuthenticationError('No access token provided');
    }

    const session = await SessionService.getSession(sessionToken);
    if (!session) {
      throw new AuthenticationError('Invalid session');
    }

    const user = await UserService.getUserById(session.userId);
    if (!user) {
      throw new NotFoundError('User', session.userId);
    }

    // Get user permissions based on role
    const permissions = getUserPermissions(user.role);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        dataProcessingConsent: user.dataProcessingConsent,
        consentDate: user.consentDate
      },
      permissions,
      sessionInfo: {
        id: session.id,
        createdAt: session.createdAt,
        lastActivityAt: session.lastActivityAt,
        expiresAt: session.expiresAt
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * Helper function to get user permissions (should be moved to auth middleware)
 */
function getUserPermissions(role: string): string[] {
  const permissions: Record<string, string[]> = {
    admin: [
      'users:read', 'users:write', 'users:delete',
      'profiles:read', 'profiles:write', 'profiles:delete',
      'analytics:read', 'analytics:write',
      'system:admin', 'audit:read',
      'voice:stt', 'voice:tts',
      'llm:chat', 'llm:embeddings'
    ],
    hr_manager: [
      'users:read', 'users:write',
      'profiles:read', 'profiles:write',
      'analytics:read', 'jobs:write',
      'voice:stt', 'voice:tts',
      'llm:chat', 'llm:embeddings'
    ],
    hr_specialist: [
      'users:read', 'profiles:read',
      'analytics:read', 'jobs:read',
      'voice:stt', 'voice:tts',
      'llm:chat'
    ],
    team_lead: [
      'users:read', 'profiles:read',
      'team:manage', 'feedback:write',
      'voice:stt', 'voice:tts',
      'llm:chat'
    ],
    employee: [
      'profiles:read', 'profiles:write:own',
      'courses:read', 'courses:enroll',
      'recommendations:read', 'jobs:apply',
      'gamification:read',
      'voice:stt', 'voice:tts',
      'llm:chat'
    ]
  };

  return permissions[role] || permissions.employee;
}

export { router as authRoutes };
