import express from 'express';
import { config } from '../config/config';
import { logger } from '../utils/logger';

const router = express.Router();

/**
 * @swagger
 * /v1/models:
 *   get:
 *     tags: [Models]
 *     summary: List available models
 *     description: Returns a list of available models from SciBox API
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.get('X-User-ID') || 'anonymous';
    const correlationId = req.get('X-Correlation-ID') || `models-${Date.now()}`;

    logger.info('Models list requested', {
      component: 'models',
      userId,
      correlationId
    });

    const models = [
      {
        id: 'Qwen2.5-72B-Instruct-AWQ',
        object: 'model',
        created: Date.now(),
        owned_by: 'scibox',
        capabilities: ['chat.completions'],
        description: 'Large language model optimized for instruction following'
      },
      {
        id: 'bge-m3',
        object: 'model',
        created: Date.now(),
        owned_by: 'scibox',
        capabilities: ['embeddings'],
        description: 'Multilingual embedding model for text vectorization'
      }
    ];

    res.setHeader('X-Correlation-ID', correlationId);
    res.json({
      object: 'list',
      data: models
    });

  } catch (error) {
    logger.error('Failed to list models', {
      error: error instanceof Error ? error.message : error
    });
    
    res.status(500).json({
      error: {
        message: 'Failed to retrieve models',
        type: 'api_error'
      }
    });
  }
});

export { router as modelsRouter };
