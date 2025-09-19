import { Request, Response, NextFunction } from 'express';
import { body, param, query, ValidationChain, validationResult } from 'express-validator';
import Joi from 'joi';
import { ValidationError } from './errorHandler';
import { logger } from '../utils/logger';

/**
 * Common validation patterns
 */
export const ValidationPatterns = {
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[\d\s\-\(\)]{10,}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  SAFE_STRING: /^[a-zA-Z0-9\s\-_.,!?()'"]+$/,
  LANGUAGE_CODE: /^[a-z]{2}(-[A-Z]{2})?$/,
  SKILL_LEVEL: /^(beginner|intermediate|advanced|expert)$/,
  USER_ROLE: /^(employee|hr_specialist|hr_manager|team_lead|admin)$/,
  EMPLOYMENT_TYPE: /^(full_time|part_time|contract|internship|temporary)$/
};

/**
 * Sanitization functions
 */
export const Sanitizers = {
  trim: (value: string) => value?.trim(),
  toLowerCase: (value: string) => value?.toLowerCase(),
  toUpperCase: (value: string) => value?.toUpperCase(),
  escapeHtml: (value: string) => value?.replace(/[&<>"']/g, (match) => {
    const escapes: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;'
    };
    return escapes[match];
  }),
  removeScripts: (value: string) => value?.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ''),
  stripTags: (value: string) => value?.replace(/<[^>]*>/g, ''),
  normalizeWhitespace: (value: string) => value?.replace(/\s+/g, ' ').trim()
};

/**
 * Common Joi schemas
 */
export const CommonSchemas = {
  uuid: Joi.string().uuid({ version: 'uuidv4' }).required(),
  optionalUuid: Joi.string().uuid({ version: 'uuidv4' }).optional(),
  email: Joi.string().email().max(255).required(),
  password: Joi.string().min(8).max(128).pattern(ValidationPatterns.PASSWORD).required(),
  name: Joi.string().min(1).max(100).pattern(ValidationPatterns.SAFE_STRING).required(),
  optionalName: Joi.string().min(1).max(100).pattern(ValidationPatterns.SAFE_STRING).optional(),
  description: Joi.string().max(2000).optional(),
  phone: Joi.string().pattern(ValidationPatterns.PHONE).optional(),
  url: Joi.string().uri().max(500).optional(),
  languageCode: Joi.string().pattern(ValidationPatterns.LANGUAGE_CODE).default('en'),
  skillLevel: Joi.string().pattern(ValidationPatterns.SKILL_LEVEL).required(),
  userRole: Joi.string().pattern(ValidationPatterns.USER_ROLE).required(),
  employmentType: Joi.string().pattern(ValidationPatterns.EMPLOYMENT_TYPE).required(),
  dateString: Joi.string().isoDate().required(),
  optionalDateString: Joi.string().isoDate().optional(),
  positiveInteger: Joi.number().integer().positive().required(),
  optionalPositiveInteger: Joi.number().integer().positive().optional(),
  percentage: Joi.number().integer().min(0).max(100).required(),
  rating: Joi.number().integer().min(1).max(5).required(),
  currency: Joi.string().length(3).uppercase().default('USD'),
  salary: Joi.number().positive().max(10000000).optional(),
  tags: Joi.array().items(Joi.string().max(50)).max(20).default([]),
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().max(50).optional(),
    sortOrder: Joi.string().valid('asc', 'desc').default('asc')
  })
};

/**
 * User validation schemas
 */
export const UserValidationSchemas = {
  createUser: Joi.object({
    email: CommonSchemas.email,
    role: CommonSchemas.userRole,
    firstName: CommonSchemas.optionalName,
    lastName: CommonSchemas.optionalName
  }),

  updateUser: Joi.object({
    email: CommonSchemas.email.optional(),
    role: CommonSchemas.userRole.optional(),
    status: Joi.string().valid('active', 'inactive', 'suspended').optional()
  }),

  userProfile: Joi.object({
    firstName: CommonSchemas.name,
    lastName: CommonSchemas.name,
    displayName: CommonSchemas.optionalName,
    position: CommonSchemas.optionalName,
    department: CommonSchemas.optionalName,
    location: CommonSchemas.optionalName,
    bio: CommonSchemas.description,
    phone: CommonSchemas.phone,
    linkedinUrl: CommonSchemas.url,
    careerInterests: CommonSchemas.tags,
    readyForRelocation: Joi.boolean().default(false),
    readyForRotation: Joi.boolean().default(false),
    language: CommonSchemas.languageCode
  })
};

/**
 * Skill validation schemas
 */
export const SkillValidationSchemas = {
  createSkill: Joi.object({
    name: CommonSchemas.name,
    category: Joi.string().valid('technical', 'soft_skills', 'language', 'certification', 'domain_knowledge', 'tool', 'framework').required(),
    description: CommonSchemas.description,
    parentSkillId: CommonSchemas.optionalUuid
  }),

  userSkill: Joi.object({
    skillId: CommonSchemas.uuid,
    level: CommonSchemas.skillLevel,
    experienceYears: CommonSchemas.optionalPositiveInteger,
    lastUsedAt: CommonSchemas.optionalDateString
  })
};

/**
 * Course validation schemas
 */
export const CourseValidationSchemas = {
  createCourse: Joi.object({
    title: Joi.string().min(3).max(300).required(),
    description: CommonSchemas.description,
    type: Joi.string().valid('online', 'offline', 'hybrid', 'certification', 'mentorship', 'self_study').required(),
    difficulty: Joi.string().valid('beginner', 'intermediate', 'advanced').optional(),
    durationHours: CommonSchemas.optionalPositiveInteger,
    provider: CommonSchemas.optionalName,
    url: CommonSchemas.url,
    skills: CommonSchemas.tags,
    prerequisites: CommonSchemas.tags,
    cost: Joi.number().min(0).max(100000).optional(),
    currency: CommonSchemas.currency
  }),

  enrollCourse: Joi.object({
    courseId: CommonSchemas.uuid
  }),

  updateProgress: Joi.object({
    progressPercentage: CommonSchemas.percentage,
    feedback: CommonSchemas.description,
    rating: Joi.number().integer().min(1).max(5).optional()
  })
};

/**
 * Job validation schemas
 */
export const JobValidationSchemas = {
  createVacancy: Joi.object({
    title: Joi.string().min(3).max(300).required(),
    description: CommonSchemas.description,
    department: CommonSchemas.optionalName,
    location: CommonSchemas.optionalName,
    employmentType: CommonSchemas.employmentType,
    seniorityLevel: Joi.string().valid('junior', 'middle', 'senior', 'lead', 'principal').required(),
    requiredSkills: Joi.array().items(CommonSchemas.uuid).min(1).required(),
    preferredSkills: Joi.array().items(CommonSchemas.uuid).default([]),
    minExperienceYears: Joi.number().integer().min(0).max(50).default(0),
    salaryMin: CommonSchemas.salary,
    salaryMax: CommonSchemas.salary,
    currency: CommonSchemas.currency,
    benefits: CommonSchemas.tags,
    closesAt: CommonSchemas.optionalDateString
  }),

  jobApplication: Joi.object({
    vacancyId: CommonSchemas.uuid,
    coverLetter: CommonSchemas.description,
    resumeUrl: CommonSchemas.url
  })
};

/**
 * Voice/Audio validation schemas
 */
export const VoiceValidationSchemas = {
  transcribeAudio: Joi.object({
    audioData: Joi.string().base64().required(),
    audioFormat: Joi.string().valid('wav', 'mp3', 'flac', 'ogg').default('wav'),
    language: CommonSchemas.languageCode,
    enablePunctuation: Joi.boolean().default(true),
    enableTimestamps: Joi.boolean().default(true)
  }),

  synthesizeText: Joi.object({
    text: Joi.string().min(1).max(5000).required(),
    voice: Joi.string().max(100).default('en_US-amy-medium'),
    sampleRate: Joi.number().valid(16000, 22050, 44100, 48000).default(22050),
    format: Joi.string().valid('wav', 'mp3').default('wav')
  })
};

/**
 * Gamification validation schemas
 */
export const GamificationValidationSchemas = {
  xpEvent: Joi.object({
    eventType: Joi.string().valid(
      'profile_completion', 'skill_added', 'skill_updated', 'course_enrolled',
      'course_completed', 'assessment_completed', 'plan_created', 'plan_completed',
      'feedback_given', 'referral_made', 'achievement_unlocked'
    ).required(),
    points: CommonSchemas.positiveInteger,
    description: CommonSchemas.description,
    metadata: Joi.object().optional()
  }),

  createAchievement: Joi.object({
    name: CommonSchemas.name,
    description: CommonSchemas.description,
    type: Joi.string().valid('milestone', 'streak', 'completion', 'excellence', 'community', 'special').required(),
    iconUrl: CommonSchemas.url,
    pointsReward: CommonSchemas.optionalPositiveInteger,
    requirements: Joi.object().required(),
    rarity: Joi.string().valid('common', 'uncommon', 'rare', 'epic', 'legendary').default('common')
  })
};

/**
 * Express-validator chains for common validations
 */
export const ValidatorChains = {
  uuid: (field: string) => param(field).isUUID(4).withMessage(`${field} must be a valid UUID`),
  
  email: (field: string = 'email') => body(field)
    .isEmail()
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Valid email address is required'),

  password: (field: string = 'password') => body(field)
    .isLength({ min: 8, max: 128 })
    .matches(ValidationPatterns.PASSWORD)
    .withMessage('Password must be at least 8 characters with uppercase, lowercase, number and special character'),

  pagination: [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('sortBy').optional().isLength({ max: 50 }).trim(),
    query('sortOrder').optional().isIn(['asc', 'desc'])
  ]
};

/**
 * Validation middleware factory
 */
export function validateRequest<T = any>(schema: Joi.Schema<T>, source: 'body' | 'params' | 'query' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    const data = req[source];
    
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      logger.warn('Request validation failed', {
        path: req.path,
        method: req.method,
        source,
        errors: details,
        userId: req.user?.id
      });

      throw new ValidationError('Request validation failed', { details });
    }

    // Replace the source data with validated and sanitized data
    req[source] = value;
    next();
  };
}

/**
 * Express-validator result handler
 */
export function handleValidationErrors(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const details = errors.array().map(error => ({
      field: error.type === 'field' ? (error as any).path : error.type,
      message: error.msg,
      value: (error as any).value
    }));

    logger.warn('Express-validator validation failed', {
      path: req.path,
      method: req.method,
      errors: details,
      userId: req.user?.id
    });

    throw new ValidationError('Request validation failed', { details });
  }

  next();
}

/**
 * File upload validation
 */
export function validateFileUpload(
  allowedTypes: string[] = ['image/jpeg', 'image/png', 'application/pdf'],
  maxSize: number = 10 * 1024 * 1024 // 10MB
) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.file && !req.files) {
      return next();
    }

    const files = req.files ? (Array.isArray(req.files) ? req.files : Object.values(req.files).flat()) : [req.file];

    for (const file of files) {
      if (!file) continue;

      // Check file type
      if (!allowedTypes.includes(file.mimetype)) {
        throw new ValidationError(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`);
      }

      // Check file size
      if (file.size > maxSize) {
        throw new ValidationError(`File size exceeds limit of ${maxSize / (1024 * 1024)}MB`);
      }

      // Basic security check - scan for potential malicious content
      if (file.originalname.includes('../') || file.originalname.includes('..\\')) {
        throw new ValidationError('Invalid file name');
      }
    }

    next();
  };
}

/**
 * Request rate validation (to prevent abuse)
 */
export function validateRequestRate(
  maxRequests: number = 100,
  windowMs: number = 15 * 60 * 1000, // 15 minutes
  keyGenerator?: (req: Request) => string
) {
  const requests = new Map<string, { count: number; resetTime: number }>();
  
  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator ? keyGenerator(req) : req.ip || 'unknown';
    const now = Date.now();
    
    const requestData = requests.get(key);
    
    if (!requestData || now > requestData.resetTime) {
      requests.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    if (requestData.count >= maxRequests) {
      throw new ValidationError(`Too many requests. Try again in ${Math.ceil((requestData.resetTime - now) / 1000)} seconds`);
    }
    
    requestData.count++;
    next();
  };
}

/**
 * Content Security validation
 */
export function validateContentSecurity(req: Request, res: Response, next: NextFunction) {
  const contentType = req.get('Content-Type');
  
  // Block potential XSS in content type
  if (contentType && /[<>"]/.test(contentType)) {
    throw new ValidationError('Invalid Content-Type header');
  }
  
  // Validate User-Agent to prevent certain attacks
  const userAgent = req.get('User-Agent');
  if (userAgent && userAgent.length > 512) {
    throw new ValidationError('User-Agent header too long');
  }
  
  // Block suspicious request patterns
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /data:text\/html/i,
    /vbscript:/i
  ];
  
  const requestBody = JSON.stringify(req.body);
  if (suspiciousPatterns.some(pattern => pattern.test(requestBody))) {
    logger.warn('Suspicious content detected', {
      path: req.path,
      method: req.method,
      userId: req.user?.id,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    throw new ValidationError('Suspicious content detected');
  }
  
  next();
}
