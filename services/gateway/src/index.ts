import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createProxyMiddleware } from 'http-proxy-middleware';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import promClient from 'prom-client';
import promMiddleware from 'express-prometheus-middleware';
import dotenv from 'dotenv';

import { logger } from './utils/logger';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { validateRequest } from './middleware/validation';
import { rbacMiddleware } from './middleware/rbac';
import { auditMiddleware } from './middleware/audit';
import { healthRouter } from './routes/health';
import { authRouter } from './routes/auth';
import { profileRouter } from './routes/profile';
import { swaggerOptions } from './config/swagger';
import { redisClient } from './config/redis';
import { initializeTracing } from './config/tracing';

// Load environment variables
dotenv.config();

// Initialize tracing
initializeTracing();

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for rate limiting and IP detection
app.set('trust proxy', 1);

// Prometheus metrics
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestsTotal);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.company.com"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID']
}));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger);

// Prometheus metrics middleware
app.use(promMiddleware({
  metricsPath: '/metrics',
  collectDefaultMetrics: true,
  requestDurationBuckets: [0.1, 0.5, 1, 1.5, 2, 3, 5, 10],
  requestLengthBuckets: [512, 1024, 5120, 10240, 51200, 102400],
  responseLengthBuckets: [512, 1024, 5120, 10240, 51200, 102400]
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: redisClient ? new (require('rate-limit-redis'))({
    sendCommand: (...args: string[]) => redisClient.sendCommand(args),
  }) : undefined
});

app.use(limiter);

// Swagger documentation
const specs = swaggerJsdoc(swaggerOptions);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Career Development Platform API'
}));

// Health check (no auth required)
app.use('/health', healthRouter);

// Metrics endpoint (no auth required)
app.get('/metrics', (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(register.metrics());
});

// Authentication routes (no auth required for login/callback)
app.use('/auth', authRouter);

// Protected routes - require authentication
app.use('/api', authMiddleware);

// Profile routes
app.use('/api/profile', rbacMiddleware(['profile:read']), auditMiddleware, profileRouter);

// Proxy to microservices with authentication
const createAuthenticatedProxy = (target: string, pathRewrite?: Record<string, string>) => {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite,
    timeout: 30000,
    proxyTimeout: 30000,
    onProxyReq: (proxyReq, req) => {
      // Forward user context to microservices
      if (req.user) {
        proxyReq.setHeader('X-User-ID', req.user.id);
        proxyReq.setHeader('X-User-Email', req.user.email);
        proxyReq.setHeader('X-User-Roles', JSON.stringify(req.user.roles));
      }
      
      // Forward request ID for tracing
      if (req.headers['x-request-id']) {
        proxyReq.setHeader('X-Request-ID', req.headers['x-request-id'] as string);
      }
    },
    onError: (err, req, res) => {
      logger.error('Proxy error:', { error: err.message, url: req.url });
      res.status(502).json({ error: 'Service temporarily unavailable' });
    }
  });
};

// Learning service routes
app.use('/api/learning', 
  rbacMiddleware(['learning:read']), 
  auditMiddleware,
  createAuthenticatedProxy('http://learning-service:3002', {
    '^/api/learning': ''
  })
);

// Analytics service routes
app.use('/api/analytics', 
  rbacMiddleware(['analytics:read']), 
  auditMiddleware,
  createAuthenticatedProxy('http://analytics-service:3003', {
    '^/api/analytics': ''
  })
);

// Gamification service routes
app.use('/api/gamification', 
  rbacMiddleware(['gamification:read']), 
  auditMiddleware,
  createAuthenticatedProxy('http://gamification-service:3004', {
    '^/api/gamification': ''
  })
);

// Jobs matcher service routes
app.use('/api/jobs', 
  rbacMiddleware(['jobs:read']), 
  auditMiddleware,
  createAuthenticatedProxy('http://jobs-matcher-service:3005', {
    '^/api/jobs': ''
  })
);

// STT service routes
app.use('/api/stt', 
  rbacMiddleware(['stt:use']), 
  auditMiddleware,
  createAuthenticatedProxy('http://stt-service:3006', {
    '^/api/stt': ''
  })
);

// TTS service routes
app.use('/api/tts', 
  rbacMiddleware(['tts:use']), 
  auditMiddleware,
  createAuthenticatedProxy('http://tts-service:3007', {
    '^/api/tts': ''
  })
);

// LLM adapter service routes
app.use('/api/llm', 
  rbacMiddleware(['llm:use']), 
  auditMiddleware,
  createAuthenticatedProxy('http://llm-adapter:3008', {
    '^/api/llm': ''
  })
);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info('Received shutdown signal, closing server gracefully...');
  
  try {
    if (redisClient) {
      await redisClient.quit();
      logger.info('Redis connection closed');
    }
    
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
const server = app.listen(PORT, () => {
  logger.info(`🚀 API Gateway started on port ${PORT}`);
  logger.info(`📚 API Documentation available at http://localhost:${PORT}/docs`);
  logger.info(`📊 Metrics available at http://localhost:${PORT}/metrics`);
  logger.info(`🏥 Health check available at http://localhost:${PORT}/health`);
});

// Handle server errors
server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.syscall !== 'listen') {
    throw error;
  }

  switch (error.code) {
    case 'EACCES':
      logger.error(`Port ${PORT} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      logger.error(`Port ${PORT} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
});

export default app;