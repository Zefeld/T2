import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Client, Issuer, generators } from 'openid-client';
import { config } from '../config/config';
import { logger } from '../utils/logger';
import { redisClient } from '../cache/redis';
import { UserService } from '../services/UserService';
import { SessionService } from '../services/SessionService';
import { AuditService } from '../services/AuditService';

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  sessionId: string;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  sessionId: string;
  permissions: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      sessionId?: string;
    }
  }
}

let oidcClient: Client;

/**
 * Initialize OIDC Client
 */
export async function initializeOIDC() {
  try {
    const issuer = await Issuer.discover(config.oidc.issuerUrl);
    
    oidcClient = new issuer.Client({
      client_id: config.oidc.clientId,
      client_secret: config.oidc.clientSecret,
      redirect_uris: [config.oidc.redirectUri],
      response_types: ['code'],
      grant_types: ['authorization_code', 'refresh_token'],
    });

    logger.info('OIDC client initialized successfully', {
      issuer: config.oidc.issuerUrl,
      clientId: config.oidc.clientId
    });

  } catch (error) {
    logger.error('Failed to initialize OIDC client', {
      error: error instanceof Error ? error.message : error,
      issuerUrl: config.oidc.issuerUrl
    });
    throw error;
  }
}

/**
 * Generate OIDC authorization URL with PKCE
 */
export function generateAuthUrl(req: Request): { url: string; codeVerifier: string; state: string } {
  const codeVerifier = generators.codeVerifier();
  const codeChallenge = generators.codeChallenge(codeVerifier);
  const state = generators.state();
  
  const url = oidcClient.authorizationUrl({
    scope: config.oidc.scopes.join(' '),
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state: state,
  });

  // Store PKCE parameters in session
  req.session = req.session || {};
  req.session.codeVerifier = codeVerifier;
  req.session.state = state;

  return { url, codeVerifier, state };
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  code: string, 
  codeVerifier: string, 
  state: string,
  sessionState: string
): Promise<{ accessToken: string; idToken: string; refreshToken?: string }> {
  
  // Verify state parameter (CSRF protection)
  if (state !== sessionState) {
    throw new Error('Invalid state parameter');
  }

  const tokenSet = await oidcClient.callback(
    config.oidc.redirectUri,
    { code, state },
    { code_verifier: codeVerifier }
  );

  if (!tokenSet.access_token || !tokenSet.id_token) {
    throw new Error('Missing required tokens in response');
  }

  return {
    accessToken: tokenSet.access_token,
    idToken: tokenSet.id_token,
    refreshToken: tokenSet.refresh_token
  };
}

/**
 * Verify and decode ID token
 */
export async function verifyIdToken(idToken: string) {
  const claims = oidcClient.validateIdToken(idToken);
  return claims;
}

/**
 * Get user info from OIDC provider
 */
export async function getUserInfo(accessToken: string) {
  const userInfo = await oidcClient.userinfo(accessToken);
  return userInfo;
}

/**
 * Generate internal JWT token
 */
export function generateJWT(user: { id: string; email: string; role: string; sessionId: string }): string {
  const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
    userId: user.id,
    email: user.email,
    role: user.role,
    sessionId: user.sessionId,
    iss: config.jwt.issuer,
    aud: config.jwt.audience,
  };

  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
    algorithm: config.jwt.algorithm,
  });
}

/**
 * Verify JWT token
 */
export function verifyJWT(token: string): JWTPayload {
  return jwt.verify(token, config.jwt.secret, {
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
    algorithms: [config.jwt.algorithm],
  }) as JWTPayload;
}

/**
 * Extract token from request
 */
function extractToken(req: Request): string | null {
  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check cookie
  const cookieToken = req.cookies?.accessToken;
  if (cookieToken) {
    return cookieToken;
  }

  return null;
}

/**
 * Check if session is valid
 */
async function validateSession(sessionId: string): Promise<boolean> {
  try {
    const session = await SessionService.getSession(sessionId);
    if (!session) {
      return false;
    }

    // Check if session is expired
    if (new Date() > session.expiresAt) {
      await SessionService.deleteSession(sessionId);
      return false;
    }

    // Update last activity
    await SessionService.updateLastActivity(sessionId);
    return true;

  } catch (error) {
    logger.error('Session validation error', { error, sessionId });
    return false;
  }
}

/**
 * Get user permissions based on role
 */
function getUserPermissions(role: string): string[] {
  const permissions: Record<string, string[]> = {
    admin: [
      'users:read', 'users:write', 'users:delete',
      'profiles:read', 'profiles:write', 'profiles:delete',
      'analytics:read', 'analytics:write',
      'system:admin', 'audit:read'
    ],
    hr_manager: [
      'users:read', 'users:write',
      'profiles:read', 'profiles:write',
      'analytics:read', 'jobs:write'
    ],
    hr_specialist: [
      'users:read', 'profiles:read',
      'analytics:read', 'jobs:read'
    ],
    team_lead: [
      'users:read', 'profiles:read',
      'team:manage', 'feedback:write'
    ],
    employee: [
      'profiles:read', 'profiles:write:own',
      'courses:read', 'courses:enroll',
      'recommendations:read', 'jobs:apply'
    ]
  };

  return permissions[role] || permissions.employee;
}

/**
 * Authentication middleware
 */
export async function authenticateToken(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractToken(req);
    
    if (!token) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Access token is missing',
        code: 'MISSING_TOKEN'
      });
    }

    // Verify JWT token
    let payload: JWTPayload;
    try {
      payload = verifyJWT(token);
    } catch (jwtError) {
      logger.warn('Invalid JWT token', {
        error: jwtError instanceof Error ? jwtError.message : jwtError,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      });
    }

    // Validate session
    const isValidSession = await validateSession(payload.sessionId);
    if (!isValidSession) {
      return res.status(401).json({
        error: 'Session invalid',
        message: 'User session has expired or is invalid',
        code: 'INVALID_SESSION'
      });
    }

    // Check if user is still active
    const user = await UserService.getUserById(payload.userId);
    if (!user || user.status !== 'active') {
      await AuditService.logAuthEvent({
        userId: payload.userId,
        eventType: 'login_failed',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        details: { reason: 'User account inactive' }
      });

      return res.status(401).json({
        error: 'Account inactive',
        message: 'User account is not active',
        code: 'ACCOUNT_INACTIVE'
      });
    }

    // Set user context
    req.user = {
      id: payload.userId,
      email: payload.email,
      role: payload.role,
      sessionId: payload.sessionId,
      permissions: getUserPermissions(payload.role)
    };
    req.sessionId = payload.sessionId;

    // Set user context for RLS (Row Level Security)
    await redisClient.setex(
      `${config.redis.prefix}user_context:${payload.sessionId}`,
      300, // 5 minutes
      JSON.stringify({ userId: payload.userId, role: payload.role })
    );

    next();

  } catch (error) {
    logger.error('Authentication middleware error', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      ip: req.ip,
      path: req.path
    });

    res.status(500).json({
      error: 'Internal server error',
      message: 'Authentication service temporarily unavailable',
      code: 'AUTH_SERVICE_ERROR'
    });
  }
}

/**
 * Authorization middleware - check permissions
 */
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User not authenticated',
        code: 'NOT_AUTHENTICATED'
      });
    }

    // Check if user has required permission
    if (!req.user.permissions.includes(permission)) {
      logger.warn('Insufficient permissions', {
        userId: req.user.id,
        requiredPermission: permission,
        userPermissions: req.user.permissions,
        path: req.path,
        method: req.method
      });

      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `Required permission: ${permission}`,
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    next();
  };
}

/**
 * Role-based authorization middleware
 */
export function requireRole(roles: string | string[]) {
  const requiredRoles = Array.isArray(roles) ? roles : [roles];
  
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'NOT_AUTHENTICATED'
      });
    }

    if (!requiredRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient privileges',
        message: `Required role: ${requiredRoles.join(' or ')}`,
        code: 'INSUFFICIENT_ROLE'
      });
    }

    next();
  };
}

/**
 * Resource ownership check
 */
export function requireOwnershipOrRole(resourceUserIdPath: string, allowedRoles: string[] = ['admin', 'hr_manager']) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'NOT_AUTHENTICATED'
      });
    }

    // Extract resource user ID from request
    const resourceUserId = req.params[resourceUserIdPath] || req.body[resourceUserIdPath];
    
    // Allow if user is accessing their own resource
    if (req.user.id === resourceUserId) {
      return next();
    }

    // Allow if user has required role
    if (allowedRoles.includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({
      error: 'Access denied',
      message: 'You can only access your own resources',
      code: 'RESOURCE_ACCESS_DENIED'
    });
  };
}

/**
 * Optional authentication (for public endpoints that can benefit from user context)
 */
export async function optionalAuthentication(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
  
  if (!token) {
    return next();
  }

  try {
    const payload = verifyJWT(token);
    const isValidSession = await validateSession(payload.sessionId);
    
    if (isValidSession) {
      req.user = {
        id: payload.userId,
        email: payload.email,
        role: payload.role,
        sessionId: payload.sessionId,
        permissions: getUserPermissions(payload.role)
      };
    }
  } catch (error) {
    // Silently fail for optional authentication
    logger.debug('Optional authentication failed', { error });
  }

  next();
}
