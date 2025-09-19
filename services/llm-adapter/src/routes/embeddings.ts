import express from 'express';
import axios from 'axios';
import Joi from 'joi';
import { config } from '../config/config';
import { logger, logSciBoxRequest, logModelUsage, PerformanceLogger } from '../utils/logger';
import { validateRequest, mapAxiosError, ModelError } from '../middleware/errorHandler';

const router = express.Router();

const embeddingSchema = Joi.object({
  model: Joi.string().valid(...config.scibox.embeddingModels).required(),
  input: Joi.alternatives().try(
    Joi.string().max(config.validation.maxPromptLength),
    Joi.array().items(Joi.string().max(config.validation.maxPromptLength)).max(100)
  ).required(),
  encoding_format: Joi.string().valid('float', 'base64').default('float'),
  user: Joi.string().optional()
});

/**
 * @swagger
 * /v1/embeddings:
 *   post:
 *     tags: [Embeddings]
 *     summary: Create embeddings
 *     description: Creates embeddings using SciBox API
 */
router.post('/', validateRequest(embeddingSchema), async (req, res, next) => {
  const perfLogger = new PerformanceLogger('embeddings');
  const userId = req.get('X-User-ID') || 'anonymous';
  const correlationId = req.get('X-Correlation-ID') || `emb-${Date.now()}`;
  
  try {
    const { model, input, encoding_format, user } = req.body;
    
    if (!config.scibox.embeddingModels.includes(model)) {
      throw new ModelError(`Model ${model} is not available for embeddings`);
    }

    const inputArray = Array.isArray(input) ? input : [input];
    
    logger.info('Embeddings request', {
      component: 'embeddings',
      model,
      inputCount: inputArray.length,
      userId,
      correlationId
    });

    const sciboxRequest = {
      model,
      input: inputArray,
      ...(encoding_format && { encoding_format }),
      ...(user && { user })
    };

    const startTime = Date.now();
    
    const response = await axios.post(
      `${config.scibox.apiUrl}/v1/embeddings`,
      sciboxRequest,
      {
        headers: {
          'Authorization': `Bearer ${config.scibox.apiKey}`,
          'Content-Type': 'application/json',
          'X-Correlation-ID': correlationId
        },
        timeout: config.scibox.timeout
      }
    );

    const responseTime = Date.now() - startTime;
    const responseData = response.data;
    const duration = perfLogger.end();

    logSciBoxRequest(
      '/v1/embeddings',
      'POST',
      sciboxRequest,
      responseData,
      responseTime,
      userId,
      correlationId
    );

    const usage = responseData.usage || {};
    logModelUsage({
      userId,
      model,
      endpoint: 'embeddings',
      inputTokens: usage.prompt_tokens || 0,
      totalTokens: usage.total_tokens || 0,
      responseTime: duration,
      success: true
    });

    res.setHeader('X-Correlation-ID', correlationId);
    res.json(responseData);

  } catch (error: any) {
    const mappedError = mapAxiosError(error);
    
    logModelUsage({
      userId,
      model: req.body.model,
      endpoint: 'embeddings',
      inputTokens: 0,
      totalTokens: 0,
      responseTime: perfLogger.end(),
      success: false,
      errorType: mappedError.type
    });

    next(mappedError);
  }
});

export { router as embeddingsRouter };
