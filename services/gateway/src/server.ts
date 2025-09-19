import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import 'express-async-errors';

import { config } from './config/config';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { authenticateToken } from './middleware/auth';
import { auditLogger } from './middleware/auditLogger';
import { validateRequest } from './middleware/validation';
import { healthCheck } from './middleware/healthCheck';
import { setupProxies } from './config/proxy';
import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/users';
import { profileRoutes } from './routes/profiles';
import { skillRoutes } from './routes/skills';
import { courseRoutes } from './routes/courses';
import { gamificationRoutes } from './routes/gamification';
import { analyticsRoutes } from './routes/analytics';
import { jobRoutes } from './routes/jobs';
import { notificationRoutes } from './routes/notifications';
import { voiceRoutes } from './routes/voice';
import { llmRoutes } from './routes/llm';
import { connectDatabase } from './database/connection';
import { connectRedis } from './cache/redis';
import { swaggerSpec } from './config/swagger';

const app = express();

// Trust proxy for rate limiting behind load balancers
app.set('trust proxy', 1);

/**
 * Security Middleware (OWASP ASVS Compliance)
 */
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS configuration
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-User-ID'],
  exposedHeaders: ['X-Total-Count', 'X-Rate-Limit-Remaining']
}));

// Basic middleware
app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (config.env !== 'test') {
  app.use(morgan('combined', {
    stream: {
      write: (message: string) => logger.info(message.trim())
    }
  }));
}

/**
 * Rate Limiting & DDoS Protection (OWASP ASVS V11.1.2)
 */
const rateLimiter = rateLimit({
  windowMs: config.rateLimit.window,
  max: config.rateLimit.max,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil(config.rateLimit.window / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.socket.remoteAddress || 'unknown';
  }
});

const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 100, // allow 100 requests per 15 minutes at full speed
  delayMs: 500, // slow down subsequent requests by 500ms per request
  maxDelayMs: 20000, // maximum delay of 20 seconds
});

app.use('/api/', rateLimiter);
app.use('/api/', speedLimiter);

/**
 * Health Check Endpoint
 */
app.use('/health', healthCheck);
app.use('/api/health', healthCheck);

/**
 * API Documentation
 */
if (config.swagger.enabled) {
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Career Platform API'
  }));
  
  app.get('/api/docs/json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}

/**
 * Audit Logging Middleware
 */
app.use('/api/', auditLogger);

/**
 * Authentication Routes (Public)
 */
app.use('/api/auth', authRoutes);

/**
 * Protected API Routes
 */
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/profiles', authenticateToken, profileRoutes);
app.use('/api/skills', authenticateToken, skillRoutes);
app.use('/api/courses', authenticateToken, courseRoutes);
app.use('/api/gamification', authenticateToken, gamificationRoutes);
app.use('/api/analytics', authenticateToken, analyticsRoutes);
app.use('/api/jobs', authenticateToken, jobRoutes);
app.use('/api/notifications', authenticateToken, notificationRoutes);
app.use('/api/voice', authenticateToken, voiceRoutes);
app.use('/api/llm', authenticateToken, llmRoutes);

/**
 * Microservice Proxies
 */
setupProxies(app);

/**
 * 404 Handler
 */
app.use('*', (req, res) => {
  logger.warn(`404 - Route not found: ${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    referer: req.get('Referer')
  });
  
  res.status(404).json({
    error: 'Resource not found',
    message: `The requested endpoint ${req.method} ${req.originalUrl} does not exist`,
    timestamp: new Date().toISOString(),
    path: req.originalUrl
  });
});

/**
 * Global Error Handler (OWASP ASVS V7.4.1)
 */
app.use(errorHandler);

/**
 * Server Startup
 */
async function startServer() {
  try {
    // Connect to databases
    await connectDatabase();
    await connectRedis();
    
    // Start HTTP server
    const port = config.port;
    const server = app.listen(port, () => {
      logger.info(`🚀 Career Platform Gateway started`, {
        port,
        env: config.env,
        pid: process.pid,
        nodeVersion: process.version,
        uptime: process.uptime()
      });
    });

    // Graceful shutdown
    const gracefulShutdown = (signal: string) => {
      logger.info(`📝 Received ${signal}. Starting graceful shutdown...`);
      
      server.close(() => {
        logger.info('✅ HTTP server closed');
        
        // Close database connections
        process.exit(0);
      });

      // Force close after 30 seconds
      setTimeout(() => {
        logger.error('❌ Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 30000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (err) => {
      logger.error('💥 Uncaught Exception', { error: err.message, stack: err.stack });
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('💥 Unhandled Rejection', { reason, promise });
      process.exit(1);
    });

  } catch (error) {
    logger.error('❌ Failed to start server', { error: error instanceof Error ? error.message : error });
    process.exit(1);
  }
}

// Start server only if not in test mode
if (require.main === module) {
  startServer();
}

export { app };
