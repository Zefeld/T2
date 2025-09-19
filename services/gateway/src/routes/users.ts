import express from 'express';
import { UserService, UserFilters } from '../services/UserService';
import { requirePermission, requireOwnershipOrRole } from '../middleware/auth';
import { validateRequest, UserValidationSchemas, ValidatorChains } from '../middleware/validation';
import { auditSensitiveOperation } from '../middleware/auditLogger';
import { NotFoundError } from '../middleware/errorHandler';
import Joi from 'joi';

const router = express.Router();

/**
 * @swagger
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: Get users with filtering and pagination
 *     description: Retrieve a list of users with optional filtering and pagination
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PaginationPage'
 *       - $ref: '#/components/parameters/PaginationLimit'
 *       - $ref: '#/components/parameters/SortBy'
 *       - $ref: '#/components/parameters/SortOrder'
 *       - name: role
 *         in: query
 *         description: Filter by user role
 *         schema:
 *           type: string
 *           enum: [employee, hr_specialist, hr_manager, team_lead, admin]
 *       - name: status
 *         in: query
 *         description: Filter by user status
 *         schema:
 *           type: string
 *           enum: [active, inactive, suspended]
 *       - name: search
 *         in: query
 *         description: Search in email or profile name
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/PaginatedResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/User'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/', 
  requirePermission('users:read'),
  validateRequest(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().valid('created_at', 'updated_at', 'last_login_at', 'email', 'role', 'status').default('created_at'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
    role: Joi.string().valid('employee', 'hr_specialist', 'hr_manager', 'team_lead', 'admin').optional(),
    status: Joi.string().valid('active', 'inactive', 'suspended').optional(),
    search: Joi.string().max(255).optional(),
    createdAfter: Joi.date().iso().optional(),
    createdBefore: Joi.date().iso().optional(),
    lastLoginAfter: Joi.date().iso().optional(),
    lastLoginBefore: Joi.date().iso().optional()
  }), 'query'),
  async (req, res, next) => {
    try {
      const {
        page, limit, sortBy, sortOrder,
        role, status, search, createdAfter, createdBefore,
        lastLoginAfter, lastLoginBefore
      } = req.query as any;

      const filters: UserFilters = {
        ...(role && { role }),
        ...(status && { status }),
        ...(search && { search }),
        ...(createdAfter && { createdAfter }),
        ...(createdBefore && { createdBefore }),
        ...(lastLoginAfter && { lastLoginAfter }),
        ...(lastLoginBefore && { lastLoginBefore })
      };

      const result = await UserService.getUsers(
        filters,
        page,
        limit,
        sortBy,
        sortOrder
      );

      res.json({
        data: result.users,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / result.limit)
        }
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/users/{userId}:
 *   get:
 *     tags: [Users]
 *     summary: Get user by ID
 *     description: Retrieve a specific user by their ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/UserId'
 *     responses:
 *       200:
 *         description: User found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:userId',
  ValidatorChains.uuid('userId'),
  requireOwnershipOrRole('userId', ['hr_specialist', 'hr_manager', 'admin']),
  async (req, res, next) => {
    try {
      const { userId } = req.params;

      const user = await UserService.getUserById(userId);
      if (!user) {
        throw new NotFoundError('User', userId);
      }

      res.json(user);

    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/users:
 *   post:
 *     tags: [Users]
 *     summary: Create new user
 *     description: Create a new user account (admin only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               role:
 *                 type: string
 *                 enum: [employee, hr_specialist, hr_manager, team_lead, admin]
 *                 default: employee
 *               firstName:
 *                 type: string
 *                 maxLength: 100
 *               lastName:
 *                 type: string
 *                 maxLength: 100
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 */
router.post('/',
  requirePermission('users:write'),
  validateRequest(UserValidationSchemas.createUser),
  auditSensitiveOperation('create_user', { operation: 'user_creation' }),
  async (req, res, next) => {
    try {
      const user = await UserService.createUser(req.body, req.user!.id);

      res.status(201).json(user);

    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/users/{userId}:
 *   put:
 *     tags: [Users]
 *     summary: Update user
 *     description: Update user information
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/UserId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               role:
 *                 type: string
 *                 enum: [employee, hr_specialist, hr_manager, team_lead, admin]
 *               status:
 *                 type: string
 *                 enum: [active, inactive, suspended]
 *               dataProcessingConsent:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.put('/:userId',
  ValidatorChains.uuid('userId'),
  requireOwnershipOrRole('userId', ['hr_manager', 'admin']),
  validateRequest(UserValidationSchemas.updateUser),
  auditSensitiveOperation('update_user', { operation: 'user_modification' }),
  async (req, res, next) => {
    try {
      const { userId } = req.params;

      const user = await UserService.updateUser(userId, req.body, req.user!.id);

      res.json(user);

    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/users/{userId}:
 *   delete:
 *     tags: [Users]
 *     summary: Delete user (soft delete)
 *     description: Soft delete a user account and anonymize their data
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/UserId'
 *     responses:
 *       204:
 *         description: User deleted successfully
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete('/:userId',
  ValidatorChains.uuid('userId'),
  requirePermission('users:delete'),
  auditSensitiveOperation('delete_user', { operation: 'user_deletion' }),
  async (req, res, next) => {
    try {
      const { userId } = req.params;

      await UserService.deleteUser(userId, req.user!.id);

      res.status(204).send();

    } catch (error) {
      next(error);
    }
  }
);

export { router as userRoutes };
