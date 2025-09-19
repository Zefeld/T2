import { Request, Response } from 'express';
import axios from 'axios';
import { config } from '../config/config';
import { logger } from '../utils/logger';

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    scibox: {
      status: 'healthy' | 'unhealthy';
      responseTime?: number;
      error?: string;
    };
  };
}

/**
 * Check SciBox API health
 */
async function checkSciBoxHealth(): Promise<{
  status: 'healthy' | 'unhealthy';
  responseTime?: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    const response = await axios.get(`${config.scibox.apiUrl}/v1/models`, {
      timeout: 5000,
      headers: {
        'Authorization': `Bearer ${config.scibox.apiKey}`,
        'User-Agent': 'Career-Platform-LLM-Adapter/1.0 Health-Check'
      }
    });

    const responseTime = Date.now() - startTime;

    if (response.status === 200) {
      return { status: 'healthy', responseTime };
    } else {
      return { 
        status: 'unhealthy', 
        responseTime, 
        error: `HTTP ${response.status}` 
      };
    }
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    let errorMessage = 'Unknown error';

    if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Connection refused';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Request timeout';
    } else if (error.response) {
      errorMessage = `HTTP ${error.response.status}`;
    } else {
      errorMessage = error.message;
    }

    return { status: 'unhealthy', responseTime, error: errorMessage };
  }
}

/**
 * Health check endpoint handler
 */
export async function healthCheck(req: Request, res: Response) {
  try {
    const sciboxHealth = await checkSciBoxHealth();
    
    const overallStatus: 'healthy' | 'unhealthy' = 
      sciboxHealth.status === 'healthy' ? 'healthy' : 'unhealthy';

    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      version: process.env.npm_package_version || '1.0.0',
      services: {
        scibox: sciboxHealth
      }
    };

    const statusCode = overallStatus === 'healthy' ? 200 : 503;

    res.status(statusCode).json(healthStatus);

    // Log health check
    if (overallStatus === 'unhealthy') {
      logger.warn('Health check failed', {
        component: 'health-check',
        services: healthStatus.services
      });
    }

  } catch (error) {
    logger.error('Health check error', {
      component: 'health-check',
      error: error instanceof Error ? error.message : error
    });

    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      uptime: Math.floor(process.uptime()),
      version: process.env.npm_package_version || '1.0.0'
    });
  }
}
