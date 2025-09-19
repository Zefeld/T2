import { Express } from 'express';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import { config } from './config';
import { logger, createIntegrationLogger } from '../utils/logger';
import { authenticateToken, requirePermission, requireRole } from '../middleware/auth';
import { ExternalServiceError } from '../middleware/errorHandler';

/**
 * Proxy configuration interface
 */
interface ProxyConfig {
  path: string;
  target: string;
  authRequired: boolean;
  permissions?: string[];
  roles?: string[];
  options?: Options;
}

/**
 * Service proxy configurations
 */
const PROXY_CONFIGS: ProxyConfig[] = [
  // STT Service
  {
    path: '/api/stt',
    target: config.services.stt,
    authRequired: true,
    permissions: ['voice:stt'],
    options: {
      pathRewrite: { '^/api/stt': '' },
      timeout: 30000,
      changeOrigin: true,
      onError: (err, req, res) => handleProxyError('stt-service', err, req, res),
      onProxyReq: (proxyReq, req) => addAuthHeaders(proxyReq, req),
    }
  },

  // TTS Service  
  {
    path: '/api/tts',
    target: config.services.tts,
    authRequired: true,
    permissions: ['voice:tts'],
    options: {
      pathRewrite: { '^/api/tts': '' },
      timeout: 30000,
      changeOrigin: true,
      onError: (err, req, res) => handleProxyError('tts-service', err, req, res),
      onProxyReq: (proxyReq, req) => addAuthHeaders(proxyReq, req),
    }
  },

  // LLM Adapter
  {
    path: '/api/llm',
    target: config.services.llm,
    authRequired: true,
    permissions: ['llm:chat', 'llm:embeddings'],
    options: {
      pathRewrite: { '^/api/llm': '' },
      timeout: 60000,
      changeOrigin: true,
      onError: (err, req, res) => handleProxyError('llm-adapter', err, req, res),
      onProxyReq: (proxyReq, req) => addAuthHeaders(proxyReq, req),
    }
  },

  // Profile Service
  {
    path: '/api/profiles',
    target: config.services.profile,
    authRequired: true,
    permissions: ['profiles:read'],
    options: {
      pathRewrite: { '^/api/profiles': '' },
      timeout: 10000,
      changeOrigin: true,
      onError: (err, req, res) => handleProxyError('profile-service', err, req, res),
      onProxyReq: (proxyReq, req) => addAuthHeaders(proxyReq, req),
    }
  },

  // Gamification Service
  {
    path: '/api/gamification',
    target: config.services.gamification,
    authRequired: true,
    permissions: ['gamification:read'],
    options: {
      pathRewrite: { '^/api/gamification': '' },
      timeout: 10000,
      changeOrigin: true,
      onError: (err, req, res) => handleProxyError('gamification-service', err, req, res),
      onProxyReq: (proxyReq, req) => addAuthHeaders(proxyReq, req),
    }
  },

  // Analytics Service (restricted access)
  {
    path: '/api/analytics',
    target: config.services.analytics,
    authRequired: true,
    roles: ['hr_specialist', 'hr_manager', 'admin'],
    permissions: ['analytics:read'],
    options: {
      pathRewrite: { '^/api/analytics': '' },
      timeout: 30000,
      changeOrigin: true,
      onError: (err, req, res) => handleProxyError('analytics-service', err, req, res),
      onProxyReq: (proxyReq, req) => addAuthHeaders(proxyReq, req),
    }
  },

  // Jobs Matcher
  {
    path: '/api/jobs',
    target: config.services.jobs,
    authRequired: true,
    permissions: ['jobs:read'],
    options: {
      pathRewrite: { '^/api/jobs': '' },
      timeout: 15000,
      changeOrigin: true,
      onError: (err, req, res) => handleProxyError('jobs-matcher', err, req, res),
      onProxyReq: (proxyReq, req) => addAuthHeaders(proxyReq, req),
    }
  }
];

/**
 * Add authentication headers to proxied requests
 */
function addAuthHeaders(proxyReq: any, req: any): void {
  if (req.user) {
    proxyReq.setHeader('X-User-ID', req.user.id);
    proxyReq.setHeader('X-User-Role', req.user.role);
    proxyReq.setHeader('X-Session-ID', req.user.sessionId);
    proxyReq.setHeader('X-User-Permissions', JSON.stringify(req.user.permissions));
  }

  if (req.correlationId) {
    proxyReq.setHeader('X-Correlation-ID', req.correlationId);
  }

  // Add request timestamp
  proxyReq.setHeader('X-Request-Timestamp', new Date().toISOString());

  // Remove potentially sensitive headers
  proxyReq.removeHeader('authorization');
  proxyReq.removeHeader('cookie');
}

/**
 * Handle proxy errors
 */
function handleProxyError(serviceName: string, err: any, req: any, res: any): void {
  const integrationLogger = createIntegrationLogger(serviceName, 'proxy_error');
  
  integrationLogger.error('Proxy request failed', {
    error: err.message,
    code: err.code,
    path: req.path,
    method: req.method,
    userId: req.user?.id
  });

  let statusCode = 502;
  let message = 'Service temporarily unavailable';

  switch (err.code) {
    case 'ECONNREFUSED':
      message = 'Service unavailable - connection refused';
      statusCode = 503;
      break;
    case 'ETIMEDOUT':
      message = 'Service timeout';
      statusCode = 504;
      break;
    case 'ENOTFOUND':
      message = 'Service not found';
      statusCode = 502;
      break;
    case 'ECONNRESET':
      message = 'Connection reset by service';
      statusCode = 502;
      break;
  }

  if (!res.headersSent) {
    res.status(statusCode).json({
      error: 'ServiceError',
      message,
      service: serviceName,
      timestamp: new Date().toISOString(),
      correlationId: req.correlationId
    });
  }
}

/**
 * Setup service proxies
 */
export function setupProxies(app: Express): void {
  const setupLogger = createIntegrationLogger('proxy', 'setup');
  
  PROXY_CONFIGS.forEach(proxyConfig => {
    try {
      const middlewares: any[] = [];

      // Add authentication middleware if required
      if (proxyConfig.authRequired) {
        middlewares.push(authenticateToken);
      }

      // Add role-based authorization if specified
      if (proxyConfig.roles && proxyConfig.roles.length > 0) {
        middlewares.push(requireRole(proxyConfig.roles));
      }

      // Add permission-based authorization if specified
      if (proxyConfig.permissions && proxyConfig.permissions.length > 0) {
        proxyConfig.permissions.forEach(permission => {
          middlewares.push(requirePermission(permission));
        });
      }

      // Create proxy middleware
      const proxyMiddleware = createProxyMiddleware({
        target: proxyConfig.target,
        changeOrigin: true,
        secure: config.env === 'production',
        logLevel: config.env === 'development' ? 'debug' : 'warn',
        ...proxyConfig.options,
        onProxyReq: (proxyReq, req, res) => {
          // Call custom onProxyReq if provided
          if (proxyConfig.options?.onProxyReq) {
            proxyConfig.options.onProxyReq(proxyReq, req, res);
          }

          // Log proxy request
          setupLogger.debug('Proxying request', {
            originalPath: req.path,
            targetUrl: `${proxyConfig.target}${req.path}`,
            method: req.method,
            userId: (req as any).user?.id
          });
        },
        onProxyRes: (proxyRes, req, res) => {
          // Add correlation ID to response
          if ((req as any).correlationId) {
            res.setHeader('X-Correlation-ID', (req as any).correlationId);
          }

          // Log proxy response
          setupLogger.debug('Proxy response received', {
            path: req.path,
            statusCode: proxyRes.statusCode,
            userId: (req as any).user?.id
          });
        }
      });

      // Apply middlewares and proxy
      app.use(proxyConfig.path, ...middlewares, proxyMiddleware);

      setupLogger.info('Proxy configured', {
        path: proxyConfig.path,
        target: proxyConfig.target,
        authRequired: proxyConfig.authRequired,
        permissions: proxyConfig.permissions,
        roles: proxyConfig.roles
      });

    } catch (error) {
      setupLogger.error('Failed to setup proxy', {
        error: error instanceof Error ? error.message : error,
        path: proxyConfig.path,
        target: proxyConfig.target
      });
    }
  });

  setupLogger.info('All service proxies configured', {
    totalProxies: PROXY_CONFIGS.length
  });
}

/**
 * Health check proxy targets
 */
export async function checkProxyTargetsHealth(): Promise<Array<{
  service: string;
  target: string;
  healthy: boolean;
  responseTime?: number;
  error?: string;
}>> {
  const results: Array<{
    service: string;
    target: string;
    healthy: boolean;
    responseTime?: number;
    error?: string;
  }> = [];

  await Promise.allSettled(
    PROXY_CONFIGS.map(async proxyConfig => {
      const serviceName = proxyConfig.path.replace('/api/', '');
      const startTime = Date.now();

      try {
        const response = await fetch(`${proxyConfig.target}/health`, {
          method: 'GET',
          timeout: 5000,
          headers: {
            'User-Agent': 'Career-Platform-Gateway/1.0 Health-Check'
          }
        });

        const responseTime = Date.now() - startTime;
        const healthy = response.ok;

        results.push({
          service: serviceName,
          target: proxyConfig.target,
          healthy,
          responseTime,
          error: healthy ? undefined : `HTTP ${response.status}`
        });

      } catch (error) {
        const responseTime = Date.now() - startTime;
        results.push({
          service: serviceName,
          target: proxyConfig.target,
          healthy: false,
          responseTime,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    })
  );

  return results;
}

/**
 * Get proxy configuration for debugging
 */
export function getProxyConfig(): Array<{
  path: string;
  target: string;
  authRequired: boolean;
  permissions?: string[];
  roles?: string[];
}> {
  return PROXY_CONFIGS.map(config => ({
    path: config.path,
    target: config.target,
    authRequired: config.authRequired,
    permissions: config.permissions,
    roles: config.roles
  }));
}

/**
 * Circuit breaker pattern for proxy requests
 */
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private readonly maxFailures: number;
  private readonly resetTimeout: number;

  constructor(maxFailures = 5, resetTimeout = 60000) {
    this.maxFailures = maxFailures;
    this.resetTimeout = resetTimeout;
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new ExternalServiceError('circuit-breaker', 'Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.maxFailures) {
      this.state = 'OPEN';
    }
  }

  getState(): { state: string; failures: number; lastFailureTime: number } {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime
    };
  }
}

// Circuit breakers for each service
const circuitBreakers = new Map<string, CircuitBreaker>();

/**
 * Get or create circuit breaker for service
 */
export function getCircuitBreaker(serviceName: string): CircuitBreaker {
  if (!circuitBreakers.has(serviceName)) {
    circuitBreakers.set(serviceName, new CircuitBreaker());
  }
  return circuitBreakers.get(serviceName)!;
}

/**
 * Get circuit breaker states for monitoring
 */
export function getCircuitBreakerStates(): Record<string, any> {
  const states: Record<string, any> = {};
  
  for (const [service, breaker] of circuitBreakers.entries()) {
    states[service] = breaker.getState();
  }
  
  return states;
}
