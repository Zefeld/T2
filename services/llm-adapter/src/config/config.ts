import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Application configuration
 */
export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.LLM_ADAPTER_PORT || '8083', 10),
  
  // SciBox API configuration
  scibox: {
    apiUrl: process.env.SCIBOX_API_URL || 'https://llm.t1v.scibox.tech',
    apiKey: process.env.SCIBOX_API_KEY || '',
    timeout: parseInt(process.env.LLM_TIMEOUT || '30000', 10),
    maxRetries: parseInt(process.env.LLM_MAX_RETRIES || '3', 10),
    defaultModel: process.env.LLM_DEFAULT_MODEL || 'Qwen2.5-72B-Instruct-AWQ',
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '2048', 10),
    temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.7'),
    topP: parseFloat(process.env.LLM_TOP_P || '0.9'),
    availableModels: [
      'Qwen2.5-72B-Instruct-AWQ',
      'bge-m3'
    ],
    // Model capabilities
    chatModels: ['Qwen2.5-72B-Instruct-AWQ'],
    embeddingModels: ['bge-m3']
  },
  
  // CORS configuration
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:8080']
  },
  
  // Rate limiting
  rateLimit: {
    window: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10)
  },
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enableDebugLogs: process.env.ENABLE_DEBUG_LOGS === 'true',
    enableAccessLogs: process.env.NODE_ENV !== 'test'
  },
  
  // Cache configuration (if Redis is available)
  cache: {
    enabled: process.env.REDIS_URL ? true : false,
    redis: {
      url: process.env.REDIS_URL,
      prefix: 'llm:',
      ttl: 300 // 5 minutes
    }
  },
  
  // Request validation
  validation: {
    maxPromptLength: 100000,
    maxMessages: 100,
    maxContextLength: 32000,
    allowedRoles: ['system', 'user', 'assistant'],
    defaultMaxTokens: 1024,
    maxMaxTokens: 4096
  },
  
  // Streaming configuration  
  streaming: {
    enabled: true,
    heartbeatInterval: 5000, // 5 seconds
    maxStreamDuration: 300000 // 5 minutes
  },
  
  // Security
  security: {
    requireAuth: process.env.NODE_ENV === 'production',
    allowedUserRoles: ['employee', 'hr_specialist', 'hr_manager', 'team_lead', 'admin'],
    rateLimitByUser: true,
    sanitizePrompts: true,
    logAllRequests: true
  },
  
  // Monitoring
  monitoring: {
    enableMetrics: process.env.NODE_ENV === 'production',
    metricsPort: parseInt(process.env.METRICS_PORT || '9093', 10),
    healthCheckInterval: 30000 // 30 seconds
  },
  
  // Feature flags
  features: {
    enableSwagger: process.env.ENABLE_SWAGGER !== 'false',
    enableCaching: process.env.ENABLE_CACHING !== 'false',
    enableTracing: process.env.ENABLE_TRACING === 'true',
    mockSciBox: process.env.MOCK_SCIBOX_API === 'true'
  },
  
  // Swagger configuration
  swagger: {
    enabled: process.env.ENABLE_SWAGGER !== 'false'
  },
  
  // Database (for request logging and analytics)
  database: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DB || 'career_platform',
    username: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres'
  }
} as const;

/**
 * Validate required configuration
 */
export function validateConfig(): void {
  const requiredVars = [
    'SCIBOX_API_KEY'
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate API URL format
  try {
    new URL(config.scibox.apiUrl);
  } catch {
    throw new Error('Invalid SCIBOX_API_URL format');
  }

  // Validate numeric configs
  if (config.port < 1000 || config.port > 65535) {
    throw new Error('LLM_ADAPTER_PORT must be between 1000 and 65535');
  }

  if (config.scibox.temperature < 0 || config.scibox.temperature > 2) {
    throw new Error('LLM_TEMPERATURE must be between 0 and 2');
  }

  if (config.scibox.topP < 0 || config.scibox.topP > 1) {
    throw new Error('LLM_TOP_P must be between 0 and 1');
  }

  console.info('✅ Configuration validated successfully');
}

// Validate on load
if (require.main === module || process.env.NODE_ENV !== 'test') {
  validateConfig();
}
