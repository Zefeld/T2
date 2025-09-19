import { Request, Response, NextFunction } from 'express';
import { config } from '../config/config';
import { logger, logHealthCheck } from '../utils/logger';
import { redisClient } from '../cache/redis';
import { DatabaseService } from '../services/DatabaseService';

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services: ServiceHealthStatus[];
  system: SystemHealthMetrics;
}

interface ServiceHealthStatus {
  name: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  responseTime?: number;
  error?: string;
  lastChecked: string;
  details?: Record<string, any>;
}

interface SystemHealthMetrics {
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    percentage: number;
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
  };
  connections: {
    active: number;
    total: number;
  };
}

/**
 * Health check cache
 */
const healthCheckCache = new Map<string, { status: ServiceHealthStatus; expiresAt: number }>();
const CACHE_TTL = 30 * 1000; // 30 seconds

/**
 * Get system metrics
 */
function getSystemMetrics(): SystemHealthMetrics {
  const memUsage = process.memoryUsage();
  const totalMemory = memUsage.rss + memUsage.heapTotal + memUsage.external;
  
  return {
    memory: {
      used: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
      total: Math.round(totalMemory / 1024 / 1024), // MB
      percentage: Math.round((memUsage.heapUsed / totalMemory) * 100)
    },
    cpu: {
      percentage: Math.round((process.cpuUsage().user + process.cpuUsage().system) / 10000) // Approximate
    },
    disk: {
      used: 0, // Would need additional library for accurate disk usage
      total: 0,
      percentage: 0
    },
    connections: {
      active: 0, // Would track active connections
      total: 0
    }
  };
}

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<ServiceHealthStatus> {
  const startTime = Date.now();
  
  try {
    await DatabaseService.query('SELECT 1 as health_check');
    const responseTime = Date.now() - startTime;
    
    logHealthCheck('database', 'healthy', { responseTime });
    
    return {
      name: 'database',
      status: 'healthy',
      responseTime,
      lastChecked: new Date().toISOString(),
      details: {
        type: 'postgresql',
        host: config.database.host,
        database: config.database.database
      }
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logHealthCheck('database', 'unhealthy', { error: errorMessage, responseTime });
    
    return {
      name: 'database',
      status: 'unhealthy',
      responseTime,
      error: errorMessage,
      lastChecked: new Date().toISOString()
    };
  }
}

/**
 * Check Redis connectivity
 */
async function checkRedis(): Promise<ServiceHealthStatus> {
  const startTime = Date.now();
  
  try {
    await redisClient.ping();
    const responseTime = Date.now() - startTime;
    
    logHealthCheck('redis', 'healthy', { responseTime });
    
    return {
      name: 'redis',
      status: 'healthy',
      responseTime,
      lastChecked: new Date().toISOString(),
      details: {
        type: 'redis',
        url: config.redis.url.replace(/\/\/.*@/, '//***:***@') // Hide credentials
      }
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logHealthCheck('redis', 'unhealthy', { error: errorMessage, responseTime });
    
    return {
      name: 'redis',
      status: 'unhealthy',
      responseTime,
      error: errorMessage,
      lastChecked: new Date().toISOString()
    };
  }
}

/**
 * Check external service connectivity
 */
async function checkExternalService(serviceName: string, url: string): Promise<ServiceHealthStatus> {
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.healthCheck.timeout);
    
    const response = await fetch(`${url}/health`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Career-Platform-Gateway/1.0 Health-Check'
      }
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    if (response.ok) {
      logHealthCheck(serviceName, 'healthy', { responseTime, status: response.status });
      
      return {
        name: serviceName,
        status: 'healthy',
        responseTime,
        lastChecked: new Date().toISOString(),
        details: {
          url: url,
          status: response.status,
          statusText: response.statusText
        }
      };
    } else {
      logHealthCheck(serviceName, 'unhealthy', { 
        responseTime, 
        status: response.status, 
        statusText: response.statusText 
      });
      
      return {
        name: serviceName,
        status: 'unhealthy',
        responseTime,
        error: `HTTP ${response.status}: ${response.statusText}`,
        lastChecked: new Date().toISOString()
      };
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    let errorMessage = 'Unknown error';
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorMessage = 'Request timeout';
      } else if (error.message.includes('ECONNREFUSED')) {
        errorMessage = 'Connection refused';
      } else if (error.message.includes('ENOTFOUND')) {
        errorMessage = 'Service not found';
      } else {
        errorMessage = error.message;
      }
    }
    
    logHealthCheck(serviceName, 'unhealthy', { error: errorMessage, responseTime });
    
    return {
      name: serviceName,
      status: 'unhealthy',
      responseTime,
      error: errorMessage,
      lastChecked: new Date().toISOString()
    };
  }
}

/**
 * Get cached health status or perform check
 */
async function getCachedHealthStatus(
  serviceName: string, 
  checkFunction: () => Promise<ServiceHealthStatus>
): Promise<ServiceHealthStatus> {
  const now = Date.now();
  const cached = healthCheckCache.get(serviceName);
  
  if (cached && now < cached.expiresAt) {
    return cached.status;
  }
  
  try {
    const status = await checkFunction();
    healthCheckCache.set(serviceName, {
      status,
      expiresAt: now + CACHE_TTL
    });
    return status;
  } catch (error) {
    // If check fails and we have stale cache, return it with warning
    if (cached) {
      logger.warn(`Health check failed for ${serviceName}, returning stale cache`, { error });
      return {
        ...cached.status,
        error: 'Check failed, showing cached status'
      };
    }
    throw error;
  }
}

/**
 * Perform comprehensive health check
 */
async function performHealthCheck(detailed: boolean = false): Promise<HealthStatus> {
  const startTime = Date.now();
  
  try {
    // Core services check
    const coreChecks = await Promise.allSettled([
      getCachedHealthStatus('database', checkDatabase),
      getCachedHealthStatus('redis', checkRedis)
    ]);
    
    const services: ServiceHealthStatus[] = [];
    
    // Process core services
    coreChecks.forEach((result, index) => {
      const serviceName = ['database', 'redis'][index];
      if (result.status === 'fulfilled') {
        services.push(result.value);
      } else {
        services.push({
          name: serviceName,
          status: 'unhealthy',
          error: 'Health check failed',
          lastChecked: new Date().toISOString()
        });
      }
    });
    
    // External services check (only in detailed mode)
    if (detailed) {
      const externalServices = [
        { name: 'auth-service', url: config.services.auth },
        { name: 'profile-service', url: config.services.profile },
        { name: 'stt-service', url: config.services.stt },
        { name: 'tts-service', url: config.services.tts },
        { name: 'llm-adapter', url: config.services.llm },
        { name: 'gamification-service', url: config.services.gamification },
        { name: 'analytics-service', url: config.services.analytics },
        { name: 'jobs-matcher', url: config.services.jobs }
      ];
      
      const externalChecks = await Promise.allSettled(
        externalServices.map(service => 
          getCachedHealthStatus(service.name, () => checkExternalService(service.name, service.url))
        )
      );
      
      externalChecks.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          services.push(result.value);
        } else {
          services.push({
            name: externalServices[index].name,
            status: 'unknown',
            error: 'Health check timeout or error',
            lastChecked: new Date().toISOString()
          });
        }
      });
    }
    
    // Determine overall status
    const healthyServices = services.filter(s => s.status === 'healthy').length;
    const totalServices = services.length;
    const coreServices = services.filter(s => ['database', 'redis'].includes(s.name));
    const coreHealthy = coreServices.every(s => s.status === 'healthy');
    
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded';
    
    if (!coreHealthy) {
      overallStatus = 'unhealthy';
    } else if (healthyServices === totalServices) {
      overallStatus = 'healthy';
    } else {
      overallStatus = 'degraded';
    }
    
    const result: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      version: process.env.npm_package_version || '1.0.0',
      environment: config.env,
      services,
      system: getSystemMetrics()
    };
    
    const checkDuration = Date.now() - startTime;
    logger.info('Health check completed', {
      duration: checkDuration,
      status: overallStatus,
      healthyServices,
      totalServices
    });
    
    return result;
    
  } catch (error) {
    logger.error('Health check failed', {
      error: error instanceof Error ? error.message : error,
      duration: Date.now() - startTime
    });
    
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      version: process.env.npm_package_version || '1.0.0',
      environment: config.env,
      services: [{
        name: 'health-check',
        status: 'unhealthy',
        error: 'Health check system failure',
        lastChecked: new Date().toISOString()
      }],
      system: getSystemMetrics()
    };
  }
}

/**
 * Health check middleware
 */
export async function healthCheck(req: Request, res: Response, next: NextFunction) {
  try {
    // Determine if detailed check is requested
    const detailed = req.query.detailed === 'true' || req.path.includes('/health/detailed');
    
    // Perform health check
    const healthStatus = await performHealthCheck(detailed);
    
    // Set appropriate HTTP status code
    let httpStatus = 200;
    if (healthStatus.status === 'unhealthy') {
      httpStatus = 503; // Service Unavailable
    } else if (healthStatus.status === 'degraded') {
      httpStatus = 200; // Still OK, but with warnings
    }
    
    // Set response headers
    res.set({
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Expires': '0',
      'Pragma': 'no-cache'
    });
    
    res.status(httpStatus).json(healthStatus);
    
  } catch (error) {
    logger.error('Health check endpoint failed', {
      error: error instanceof Error ? error.message : error,
      path: req.path
    });
    
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check system failure',
      uptime: Math.floor(process.uptime()),
      version: process.env.npm_package_version || '1.0.0',
      environment: config.env
    });
  }
}

/**
 * Readiness check middleware (for Kubernetes)
 */
export async function readinessCheck(req: Request, res: Response) {
  try {
    // Check only core dependencies for readiness
    const [dbStatus, redisStatus] = await Promise.all([
      checkDatabase(),
      checkRedis()
    ]);
    
    const isReady = dbStatus.status === 'healthy' && redisStatus.status === 'healthy';
    
    if (isReady) {
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString(),
        checks: {
          database: dbStatus.status,
          redis: redisStatus.status
        }
      });
    } else {
      res.status(503).json({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        checks: {
          database: dbStatus.status,
          redis: redisStatus.status
        },
        errors: [
          ...(dbStatus.error ? [{ service: 'database', error: dbStatus.error }] : []),
          ...(redisStatus.error ? [{ service: 'redis', error: redisStatus.error }] : [])
        ]
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      error: 'Readiness check failed'
    });
  }
}

/**
 * Liveness check middleware (for Kubernetes)
 */
export function livenessCheck(req: Request, res: Response) {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    pid: process.pid,
    version: process.env.npm_package_version || '1.0.0'
  });
}

/**
 * Cleanup health check cache periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of healthCheckCache.entries()) {
    if (now > value.expiresAt) {
      healthCheckCache.delete(key);
    }
  }
}, 60 * 1000); // Clean up every minute
