import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

/**
 * Environment validation schema (OWASP ASVS V14.2.1)
 */
const configSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).pipe(z.number().min(1000).max(65535)).default('8080'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  
  // Security
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),
  BCRYPT_ROUNDS: z.string().transform(Number).pipe(z.number().min(10).max(15)).default('12'),
  SESSION_TIMEOUT: z.string().transform(Number).pipe(z.number()).default('3600000'),
  
  // Database
  POSTGRES_HOST: z.string().default('localhost'),
  POSTGRES_PORT: z.string().transform(Number).pipe(z.number()).default('5432'),
  POSTGRES_DB: z.string().default('career_platform'),
  POSTGRES_USER: z.string().default('postgres'),
  POSTGRES_PASSWORD: z.string(),
  
  // Redis
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  REDIS_PREFIX: z.string().default('career:'),
  
  // OIDC
  OIDC_ISSUER_URL: z.string().url(),
  OIDC_CLIENT_ID: z.string().min(1),
  OIDC_CLIENT_SECRET: z.string().min(1),
  OIDC_REDIRECT_URI: z.string().url(),
  OIDC_SCOPES: z.string().default('openid profile email'),
  
  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW: z.string().transform(Number).pipe(z.number()).default('900000'),
  RATE_LIMIT_MAX: z.string().transform(Number).pipe(z.number()).default('100'),
  
  // Microservices URLs
  STT_SERVICE_URL: z.string().url().default('http://localhost:8081'),
  TTS_SERVICE_URL: z.string().url().default('http://localhost:8082'),
  LLM_ADAPTER_URL: z.string().url().default('http://localhost:8083'),
  PROFILE_SERVICE_URL: z.string().url().default('http://localhost:8084'),
  GAMIFICATION_SERVICE_URL: z.string().url().default('http://localhost:8085'),
  ANALYTICS_SERVICE_URL: z.string().url().default('http://localhost:8086'),
  JOBS_MATCHER_URL: z.string().url().default('http://localhost:8087'),
  AUTH_SERVICE_URL: z.string().url().default('http://localhost:8088'),
  
  // File Upload
  MAX_FILE_SIZE: z.string().transform(Number).pipe(z.number()).default('10485760'),
  ALLOWED_FILE_TYPES: z.string().default('audio/wav,audio/mp3,application/pdf,image/png,image/jpeg'),
  STORAGE_PATH: z.string().default('./storage'),
  
  // GDPR
  DATA_RETENTION_DAYS_LOGS: z.string().transform(Number).pipe(z.number()).default('90'),
  DATA_RETENTION_DAYS_PROFILES: z.string().transform(Number).pipe(z.number()).default('2555'),
  ENABLE_DATA_ANONYMIZATION: z.string().transform((val) => val === 'true').default('true'),
  
  // Features
  ENABLE_SWAGGER: z.string().transform((val) => val === 'true').default('true'),
  ENABLE_DEBUG_LOGS: z.string().transform((val) => val === 'true').default('false'),
  MOCK_EXTERNAL_SERVICES: z.string().transform((val) => val === 'true').default('false'),
});

// Validate environment variables
const env = configSchema.safeParse(process.env);

if (!env.success) {
  console.error('❌ Invalid environment configuration:');
  console.error(env.error.format());
  process.exit(1);
}

const envVars = env.data;

/**
 * Application Configuration
 */
export const config = {
  env: envVars.NODE_ENV,
  port: Number(envVars.PORT),
  
  // Database configuration
  database: {
    host: envVars.POSTGRES_HOST,
    port: envVars.POSTGRES_PORT,
    database: envVars.POSTGRES_DB,
    username: envVars.POSTGRES_USER,
    password: envVars.POSTGRES_PASSWORD,
    ssl: envVars.NODE_ENV === 'production',
    pool: {
      min: 2,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    }
  },
  
  // Redis configuration
  redis: {
    url: envVars.REDIS_URL,
    prefix: envVars.REDIS_PREFIX,
    options: {
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
    }
  },
  
  // JWT configuration
  jwt: {
    secret: envVars.JWT_SECRET,
    expiresIn: envVars.JWT_EXPIRES_IN,
    refreshExpiresIn: envVars.REFRESH_TOKEN_EXPIRES_IN,
    algorithm: 'HS256' as const,
    issuer: 'career-platform',
    audience: 'career-platform-users'
  },
  
  // OIDC configuration
  oidc: {
    issuerUrl: envVars.OIDC_ISSUER_URL,
    clientId: envVars.OIDC_CLIENT_ID,
    clientSecret: envVars.OIDC_CLIENT_SECRET,
    redirectUri: envVars.OIDC_REDIRECT_URI,
    scopes: envVars.OIDC_SCOPES.split(' '),
    responseType: 'code',
    grantType: 'authorization_code',
    pkce: true,
  },
  
  // Security configuration
  security: {
    bcryptRounds: envVars.BCRYPT_ROUNDS,
    sessionTimeout: envVars.SESSION_TIMEOUT,
    maxLoginAttempts: 5,
    lockoutDuration: 30 * 60 * 1000, // 30 minutes
    passwordMinLength: 8,
    passwordRequireUppercase: true,
    passwordRequireLowercase: true,
    passwordRequireNumbers: true,
    passwordRequireSpecial: true,
  },
  
  // CORS configuration
  cors: {
    origin: envVars.CORS_ORIGIN.split(',').map(origin => origin.trim()),
    credentials: true,
  },
  
  // Rate limiting
  rateLimit: {
    window: envVars.RATE_LIMIT_WINDOW,
    max: envVars.RATE_LIMIT_MAX,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },
  
  // Microservices URLs
  services: {
    stt: envVars.STT_SERVICE_URL,
    tts: envVars.TTS_SERVICE_URL,
    llm: envVars.LLM_ADAPTER_URL,
    profile: envVars.PROFILE_SERVICE_URL,
    gamification: envVars.GAMIFICATION_SERVICE_URL,
    analytics: envVars.ANALYTICS_SERVICE_URL,
    jobs: envVars.JOBS_MATCHER_URL,
    auth: envVars.AUTH_SERVICE_URL,
  },
  
  // File upload configuration
  upload: {
    maxFileSize: envVars.MAX_FILE_SIZE,
    allowedTypes: envVars.ALLOWED_FILE_TYPES.split(','),
    storagePath: envVars.STORAGE_PATH,
    tempDir: '/tmp/career-platform',
  },
  
  // Logging configuration
  logging: {
    level: envVars.LOG_LEVEL,
    enableDebugLogs: envVars.ENABLE_DEBUG_LOGS,
    enableAccessLogs: envVars.NODE_ENV !== 'test',
    enableErrorReporting: envVars.NODE_ENV === 'production',
  },
  
  // GDPR configuration
  gdpr: {
    dataRetentionDays: {
      logs: envVars.DATA_RETENTION_DAYS_LOGS,
      profiles: envVars.DATA_RETENTION_DAYS_PROFILES,
      sessions: 90,
      auditLogs: 365,
    },
    enableDataAnonymization: envVars.ENABLE_DATA_ANONYMIZATION,
    dataExportFormats: ['json', 'csv'] as const,
    consentValidityPeriod: 365 * 24 * 60 * 60 * 1000, // 1 year
  },
  
  // Feature flags
  features: {
    enableSwagger: envVars.ENABLE_SWAGGER,
    enableMetrics: envVars.NODE_ENV === 'production',
    enableTracing: envVars.NODE_ENV === 'production',
    mockExternalServices: envVars.MOCK_EXTERNAL_SERVICES,
    enableRealTimeFeatures: true,
    enableVoiceAssistant: true,
    enableGamification: true,
    enableAnalytics: true,
  },
  
  // Swagger configuration
  swagger: {
    enabled: envVars.ENABLE_SWAGGER,
    title: 'Career Platform API',
    description: 'Comprehensive API for career development and internal mobility platform',
    version: '1.0.0',
    contact: {
      name: 'Career Platform Team',
      email: 'support@career-platform.com'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  
  // Health check configuration
  healthCheck: {
    timeout: 5000,
    interval: 30000,
    retries: 3,
    services: [
      'database',
      'redis',
      'auth-service',
      'profile-service',
      'gamification-service',
      'analytics-service',
      'jobs-matcher',
      'stt-service',
      'tts-service',
      'llm-adapter'
    ]
  }
} as const;

/**
 * Environment-specific overrides
 */
if (config.env === 'production') {
  // Production-specific configurations
  Object.assign(config.logging, {
    enableDebugLogs: false,
    enableErrorReporting: true,
  });
  
  Object.assign(config.rateLimit, {
    max: 50, // Stricter rate limiting in production
  });
}

if (config.env === 'test') {
  // Test-specific configurations
  Object.assign(config.logging, {
    level: 'error',
    enableAccessLogs: false,
  });
  
  Object.assign(config.features, {
    mockExternalServices: true,
  });
}
