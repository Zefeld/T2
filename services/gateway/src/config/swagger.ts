import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './config';

/**
 * Swagger/OpenAPI specification
 */
const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: config.swagger.title,
      version: config.swagger.version,
      description: config.swagger.description,
      contact: config.swagger.contact,
      license: config.swagger.license,
      termsOfService: 'https://career-platform.com/terms'
    },
    servers: [
      {
        url: config.env === 'production' 
          ? 'https://api.career-platform.com' 
          : `http://localhost:${config.port}`,
        description: config.env === 'production' ? 'Production Server' : 'Development Server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from OIDC authentication'
        },
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'accessToken',
          description: 'JWT token stored in httpOnly cookie'
        }
      },
      schemas: {
        // Common schemas
        Error: {
          type: 'object',
          required: ['error', 'message', 'timestamp'],
          properties: {
            error: {
              type: 'string',
              description: 'Error type'
            },
            message: {
              type: 'string',
              description: 'Human-readable error message'
            },
            code: {
              type: 'string',
              description: 'Error code for programmatic handling'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Error timestamp'
            },
            path: {
              type: 'string',
              description: 'Request path that caused the error'
            },
            correlationId: {
              type: 'string',
              description: 'Request correlation ID for tracking'
            },
            details: {
              type: 'object',
              description: 'Additional error details'
            }
          }
        },
        ValidationError: {
          allOf: [
            { $ref: '#/components/schemas/Error' },
            {
              type: 'object',
              properties: {
                details: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      field: { type: 'string' },
                      message: { type: 'string' },
                      value: { type: 'string' }
                    }
                  }
                }
              }
            }
          ]
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {}
            },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'integer', minimum: 1 },
                limit: { type: 'integer', minimum: 1, maximum: 100 },
                total: { type: 'integer', minimum: 0 },
                totalPages: { type: 'integer', minimum: 0 }
              }
            }
          }
        },
        HealthStatus: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['healthy', 'unhealthy', 'degraded']
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            },
            uptime: {
              type: 'number',
              description: 'Service uptime in seconds'
            },
            version: {
              type: 'string'
            },
            environment: {
              type: 'string'
            },
            services: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  status: {
                    type: 'string',
                    enum: ['healthy', 'unhealthy', 'unknown']
                  },
                  responseTime: { type: 'number' },
                  error: { type: 'string' },
                  lastChecked: {
                    type: 'string',
                    format: 'date-time'
                  }
                }
              }
            }
          }
        },
        // User schemas
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique user identifier'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            role: {
              type: 'string',
              enum: ['employee', 'hr_specialist', 'hr_manager', 'team_lead', 'admin'],
              description: 'User role'
            },
            status: {
              type: 'string',
              enum: ['active', 'inactive', 'suspended'],
              description: 'User account status'
            },
            lastLoginAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Last login timestamp'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp'
            },
            dataProcessingConsent: {
              type: 'boolean',
              description: 'GDPR data processing consent'
            },
            consentDate: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Consent timestamp'
            }
          }
        },
        UserProfile: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            userId: {
              type: 'string',
              format: 'uuid'
            },
            firstName: { type: 'string', maxLength: 100 },
            lastName: { type: 'string', maxLength: 100 },
            displayName: { type: 'string', maxLength: 200 },
            position: { type: 'string', maxLength: 200 },
            department: { type: 'string', maxLength: 200 },
            location: { type: 'string', maxLength: 200 },
            bio: { type: 'string', maxLength: 2000 },
            phone: { type: 'string', maxLength: 20 },
            linkedinUrl: { type: 'string', format: 'uri' },
            careerInterests: {
              type: 'array',
              items: { type: 'string' }
            },
            readyForRelocation: { type: 'boolean' },
            readyForRotation: { type: 'boolean' },
            profileCompletionPercentage: {
              type: 'integer',
              minimum: 0,
              maximum: 100
            }
          }
        },
        Skill: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', maxLength: 200 },
            category: {
              type: 'string',
              enum: ['technical', 'soft_skills', 'language', 'certification', 'domain_knowledge', 'tool', 'framework']
            },
            description: { type: 'string' },
            parentSkillId: { 
              type: 'string', 
              format: 'uuid',
              nullable: true 
            }
          }
        },
        UserSkill: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            skillId: { type: 'string', format: 'uuid' },
            level: {
              type: 'string',
              enum: ['beginner', 'intermediate', 'advanced', 'expert']
            },
            experienceYears: { 
              type: 'integer', 
              minimum: 0,
              nullable: true 
            },
            verified: { type: 'boolean' },
            verifiedBy: { 
              type: 'string', 
              format: 'uuid',
              nullable: true 
            },
            skill: { $ref: '#/components/schemas/Skill' }
          }
        },
        // Gamification schemas
        XPEvent: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            eventType: {
              type: 'string',
              enum: [
                'profile_completion', 'skill_added', 'skill_updated',
                'course_enrolled', 'course_completed', 'assessment_completed',
                'plan_created', 'plan_completed', 'feedback_given'
              ]
            },
            points: { type: 'integer', minimum: 1 },
            description: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Achievement: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', maxLength: 200 },
            description: { type: 'string' },
            type: {
              type: 'string',
              enum: ['milestone', 'streak', 'completion', 'excellence', 'community', 'special']
            },
            iconUrl: { type: 'string', format: 'uri' },
            pointsReward: { type: 'integer', minimum: 0 },
            rarity: {
              type: 'string',
              enum: ['common', 'uncommon', 'rare', 'epic', 'legendary']
            }
          }
        },
        // Voice schemas
        TranscribeRequest: {
          type: 'object',
          required: ['audioData'],
          properties: {
            audioData: {
              type: 'string',
              format: 'base64',
              description: 'Base64 encoded audio data'
            },
            audioFormat: {
              type: 'string',
              enum: ['wav', 'mp3', 'flac', 'ogg'],
              default: 'wav'
            },
            language: {
              type: 'string',
              pattern: '^[a-z]{2}(-[A-Z]{2})?$',
              default: 'en'
            },
            enablePunctuation: { type: 'boolean', default: true },
            enableTimestamps: { type: 'boolean', default: true }
          }
        },
        TranscribeResponse: {
          type: 'object',
          properties: {
            transcript: { type: 'string' },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
            language: { type: 'string' },
            duration: { type: 'number' },
            timestamps: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  word: { type: 'string' },
                  start: { type: 'number' },
                  end: { type: 'number' }
                }
              }
            }
          }
        },
        SynthesizeRequest: {
          type: 'object',
          required: ['text'],
          properties: {
            text: {
              type: 'string',
              minLength: 1,
              maxLength: 5000
            },
            voice: {
              type: 'string',
              default: 'en_US-amy-medium'
            },
            sampleRate: {
              type: 'integer',
              enum: [16000, 22050, 44100, 48000],
              default: 22050
            },
            format: {
              type: 'string',
              enum: ['wav', 'mp3'],
              default: 'wav'
            }
          }
        }
      },
      parameters: {
        PaginationPage: {
          name: 'page',
          in: 'query',
          description: 'Page number (1-based)',
          schema: {
            type: 'integer',
            minimum: 1,
            default: 1
          }
        },
        PaginationLimit: {
          name: 'limit',
          in: 'query',
          description: 'Number of items per page',
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 20
          }
        },
        SortBy: {
          name: 'sortBy',
          in: 'query',
          description: 'Field to sort by',
          schema: {
            type: 'string'
          }
        },
        SortOrder: {
          name: 'sortOrder',
          in: 'query',
          description: 'Sort order',
          schema: {
            type: 'string',
            enum: ['asc', 'desc'],
            default: 'asc'
          }
        },
        UserId: {
          name: 'userId',
          in: 'path',
          required: true,
          description: 'User ID',
          schema: {
            type: 'string',
            format: 'uuid'
          }
        }
      },
      responses: {
        BadRequest: {
          description: 'Bad Request',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ValidationError' }
            }
          }
        },
        Unauthorized: {
          description: 'Unauthorized',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        Forbidden: {
          description: 'Forbidden',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        NotFound: {
          description: 'Not Found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        Conflict: {
          description: 'Conflict',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        TooManyRequests: {
          description: 'Too Many Requests',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        InternalServerError: {
          description: 'Internal Server Error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        ServiceUnavailable: {
          description: 'Service Unavailable',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        }
      }
    },
    security: [
      { bearerAuth: [] },
      { cookieAuth: [] }
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'OIDC authentication and session management'
      },
      {
        name: 'Users',
        description: 'User management operations'
      },
      {
        name: 'Profiles',
        description: 'User profile management'
      },
      {
        name: 'Skills',
        description: 'Skills and competency management'
      },
      {
        name: 'Courses',
        description: 'Learning and course management'
      },
      {
        name: 'Gamification',
        description: 'XP, achievements and gamification features'
      },
      {
        name: 'Voice',
        description: 'Speech-to-text and text-to-speech services'
      },
      {
        name: 'LLM',
        description: 'Language model integration for AI features'
      },
      {
        name: 'Jobs',
        description: 'Job matching and career opportunities'
      },
      {
        name: 'Analytics',
        description: 'HR analytics and reporting'
      },
      {
        name: 'Notifications',
        description: 'User notifications and preferences'
      },
      {
        name: 'Health',
        description: 'System health and monitoring'
      }
    ],
    externalDocs: {
      description: 'Career Platform Documentation',
      url: 'https://docs.career-platform.com'
    }
  },
  apis: [
    './src/routes/*.ts',
    './src/middleware/*.ts',
    './src/server.ts'
  ]
};

/**
 * Generate Swagger specification
 */
export const swaggerSpec = swaggerJsdoc(swaggerOptions);

/**
 * Add custom validation for OpenAPI spec
 */
function validateSwaggerSpec(): void {
  if (!swaggerSpec.info) {
    throw new Error('Swagger spec missing info section');
  }

  if (!swaggerSpec.paths || Object.keys(swaggerSpec.paths).length === 0) {
    console.warn('Warning: Swagger spec has no paths defined');
  }

  if (!swaggerSpec.components?.schemas) {
    console.warn('Warning: Swagger spec has no schemas defined');
  }
}

// Validate spec on load
if (config.swagger.enabled) {
  validateSwaggerSpec();
}

/**
 * Get OpenAPI specification as JSON
 */
export function getOpenAPISpec(): object {
  return swaggerSpec;
}

/**
 * Generate Swagger UI HTML
 */
export function generateSwaggerHTML(specUrl: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Career Platform API Documentation</title>
      <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui.css" />
    </head>
    <body>
      <div id="swagger-ui"></div>
      <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-bundle.js"></script>
      <script>
        SwaggerUIBundle({
          url: '${specUrl}',
          dom_id: '#swagger-ui',
          deepLinking: true,
          presets: [
            SwaggerUIBundle.presets.apis,
            SwaggerUIBundle.presets.standalone
          ],
          plugins: [
            SwaggerUIBundle.plugins.DownloadUrl
          ],
          layout: "StandaloneLayout",
          tryItOutEnabled: true,
          requestInterceptor: (request) => {
            // Add correlation ID to all requests
            request.headers['X-Correlation-ID'] = 'swagger-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            return request;
          }
        });
      </script>
    </body>
    </html>
  `;
}
