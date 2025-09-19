import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import 'express-async-errors';

import { config } from './config/config';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { healthCheck } from './middleware/healthCheck';
import { chatCompletionsRouter } from './routes/chat';
import { embeddingsRouter } from './routes/embeddings';
import { modelsRouter } from './routes/models';

const app = express();

// Trust proxy for rate limiting
app.set('trust proxy', 1);

/**
 * Security middleware
 */
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
    },
  }
}));

app.use(cors({
  origin: config.cors.origin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-User-ID', 'X-Correlation-ID']
}));

app.use(compression());
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
 * Rate limiting
 */
const rateLimiter = rateLimit({
  windowMs: config.rateLimit.window,
  max: config.rateLimit.max,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil(config.rateLimit.window / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/', rateLimiter);

/**
 * Health check
 */
app.use('/health', healthCheck);

/**
 * API Documentation
 */
if (config.swagger.enabled) {
  const swaggerSpec = swaggerJsdoc({
    definition: {
      openapi: '3.0.3',
      info: {
        title: 'Career Platform LLM Adapter',
        version: '1.0.0',
        description: 'OpenAI-compatible API adapter for SciBox LLM services',
        contact: {
          name: 'Career Platform Team',
          email: 'support@career-platform.com'
        }
      },
      servers: [
        {
          url: config.env === 'production' 
            ? 'https://llm.career-platform.com' 
            : `http://localhost:${config.port}`,
          description: config.env === 'production' ? 'Production Server' : 'Development Server'
        }
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          }
        }
      },
      tags: [
        {
          name: 'Chat Completions',
          description: 'OpenAI-compatible chat completions API'
        },
        {
          name: 'Embeddings',
          description: 'Text embeddings generation'
        },
        {
          name: 'Models',
          description: 'Available models information'
        }
      ]
    },
    apis: ['./src/routes/*.ts']
  });

  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'LLM Adapter API'
  }));
  
  app.get('/docs/json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}

/**
 * API Routes - OpenAI compatible
 */
app.use('/v1/chat/completions', chatCompletionsRouter);
app.use('/v1/embeddings', embeddingsRouter);
app.use('/v1/models', modelsRouter);

// Legacy routes for backward compatibility
app.use('/chat/completions', chatCompletionsRouter);
app.use('/embeddings', embeddingsRouter);
app.use('/models', modelsRouter);

/**
 * 404 Handler
 */
app.use('*', (req, res) => {
  logger.warn(`404 - Route not found: ${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  res.status(404).json({
    error: {
      message: `The requested endpoint ${req.method} ${req.originalUrl} does not exist`,
      type: 'invalid_request_error',
      code: 'endpoint_not_found'
    }
  });
});

/**
 * Global Error Handler
 */
app.use(errorHandler);

/**
 * Server startup
 */
async function startServer() {
  try {
    const port = config.port;
    const server = app.listen(port, () => {
      logger.info(`🚀 LLM Adapter started`, {
        port,
        env: config.env,
        pid: process.pid,
        sciboxUrl: config.scibox.apiUrl,
        models: config.scibox.availableModels
      });
    });

    // Graceful shutdown
    const gracefulShutdown = (signal: string) => {
      logger.info(`📝 Received ${signal}. Starting graceful shutdown...`);
      
      server.close(() => {
        logger.info('✅ HTTP server closed');
        process.exit(0);
      });

      setTimeout(() => {
        logger.error('❌ Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    process.on('uncaughtException', (err) => {
      logger.error('💥 Uncaught Exception', { error: err.message, stack: err.stack });
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('💥 Unhandled Rejection', { reason, promise });
      process.exit(1);
    });

  } catch (error) {
    logger.error('❌ Failed to start server', { 
      error: error instanceof Error ? error.message : error 
    });
    process.exit(1);
  }
}

// Start server
if (require.main === module) {
  startServer();
}

export { app };
