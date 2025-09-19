import express from 'express';
import axios from 'axios';
import Joi from 'joi';
import { config } from '../config/config';
import { logger, logSciBoxRequest, logModelUsage, PerformanceLogger } from '../utils/logger';
import { validateRequest, mapAxiosError, ValidationError, ModelError } from '../middleware/errorHandler';

const router = express.Router();

/**
 * Chat completions request schema
 */
const chatCompletionSchema = Joi.object({
  model: Joi.string().valid(...config.scibox.chatModels).required(),
  messages: Joi.array().items(
    Joi.object({
      role: Joi.string().valid('system', 'user', 'assistant').required(),
      content: Joi.string().required().max(config.validation.maxPromptLength),
      name: Joi.string().optional()
    })
  ).min(1).max(config.validation.maxMessages).required(),
  temperature: Joi.number().min(0).max(2).default(config.scibox.temperature),
  top_p: Joi.number().min(0).max(1).default(config.scibox.topP),
  max_tokens: Joi.number().min(1).max(config.validation.maxMaxTokens).default(config.validation.defaultMaxTokens),
  stream: Joi.boolean().default(false),
  stop: Joi.alternatives().try(
    Joi.string(),
    Joi.array().items(Joi.string()).max(4)
  ).optional(),
  presence_penalty: Joi.number().min(-2).max(2).default(0),
  frequency_penalty: Joi.number().min(-2).max(2).default(0),
  user: Joi.string().optional()
});

/**
 * @swagger
 * /v1/chat/completions:
 *   post:
 *     tags: [Chat Completions]
 *     summary: Create chat completion
 *     description: Creates a chat completion using SciBox API (OpenAI-compatible)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [model, messages]
 *             properties:
 *               model:
 *                 type: string
 *                 enum: [Qwen2.5-72B-Instruct-AWQ]
 *                 description: The model to use for completion
 *               messages:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     role:
 *                       type: string
 *                       enum: [system, user, assistant]
 *                     content:
 *                       type: string
 *                     name:
 *                       type: string
 *               temperature:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 2
 *                 default: 0.7
 *               top_p:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 1
 *                 default: 0.9
 *               max_tokens:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 4096
 *                 default: 1024
 *               stream:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       200:
 *         description: Chat completion response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 object:
 *                   type: string
 *                   enum: [chat.completion]
 *                 created:
 *                   type: integer
 *                 model:
 *                   type: string
 *                 choices:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       index:
 *                         type: integer
 *                       message:
 *                         type: object
 *                         properties:
 *                           role:
 *                             type: string
 *                           content:
 *                             type: string
 *                       finish_reason:
 *                         type: string
 *                 usage:
 *                   type: object
 *                   properties:
 *                     prompt_tokens:
 *                       type: integer
 *                     completion_tokens:
 *                       type: integer
 *                     total_tokens:
 *                       type: integer
 */
router.post('/', validateRequest(chatCompletionSchema), async (req, res, next) => {
  const perfLogger = new PerformanceLogger('chat_completion');
  const userId = req.get('X-User-ID') || 'anonymous';
  const correlationId = req.get('X-Correlation-ID') || `chat-${Date.now()}`;
  
  try {
    const {
      model,
      messages,
      temperature,
      top_p,
      max_tokens,
      stream,
      stop,
      presence_penalty,
      frequency_penalty,
      user
    } = req.body;

    // Validate model availability
    if (!config.scibox.chatModels.includes(model)) {
      throw new ModelError(`Model ${model} is not available for chat completions`);
    }

    // Log request
    logger.info('Chat completion request', {
      component: 'chat-completions',
      model,
      messageCount: messages.length,
      maxTokens: max_tokens,
      temperature,
      userId,
      correlationId,
      stream
    });

    // Prepare SciBox API request
    const sciboxRequest = {
      model,
      messages,
      temperature,
      top_p,
      max_tokens,
      stream,
      ...(stop && { stop }),
      ...(presence_penalty !== 0 && { presence_penalty }),
      ...(frequency_penalty !== 0 && { frequency_penalty }),
      ...(user && { user })
    };

    const startTime = Date.now();

    try {
      const response = await axios.post(
        `${config.scibox.apiUrl}/v1/chat/completions`,
        sciboxRequest,
        {
          headers: {
            'Authorization': `Bearer ${config.scibox.apiKey}`,
            'Content-Type': 'application/json',
            'X-Correlation-ID': correlationId
          },
          timeout: config.scibox.timeout,
          responseType: stream ? 'stream' : 'json'
        }
      );

      const responseTime = Date.now() - startTime;

      if (stream) {
        // Handle streaming response
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Correlation-ID', correlationId);

        let chunkCount = 0;
        let totalTokens = 0;

        response.data.on('data', (chunk: Buffer) => {
          const lines = chunk.toString().split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.substring(6);
              
              if (data.trim() === '[DONE]') {
                res.write(`data: [DONE]\n\n`);
                break;
              }

              try {
                const parsed = JSON.parse(data);
                if (parsed.usage?.total_tokens) {
                  totalTokens = parsed.usage.total_tokens;
                }
                chunkCount++;
              } catch {
                // Ignore parse errors for streaming chunks
              }

              res.write(`data: ${data}\n\n`);
            }
          }
        });

        response.data.on('end', () => {
          res.end();
          
          const duration = perfLogger.end({ chunkCount, totalTokens });

          // Log usage
          logModelUsage({
            userId,
            model,
            endpoint: 'chat',
            inputTokens: 0, // Not available in streaming
            outputTokens: 0,
            totalTokens,
            responseTime: duration,
            success: true
          });

          logSciBoxRequest(
            '/v1/chat/completions',
            'POST',
            sciboxRequest,
            { stream: true, chunks: chunkCount, totalTokens },
            responseTime,
            userId,
            correlationId
          );
        });

        response.data.on('error', (error: Error) => {
          logger.error('Streaming error', {
            error: error.message,
            correlationId,
            userId
          });
          
          if (!res.headersSent) {
            res.status(500).json({
              error: {
                message: 'Streaming failed',
                type: 'api_error',
                code: 'streaming_error'
              }
            });
          }
        });

      } else {
        // Handle regular response
        const responseData = response.data;
        const duration = perfLogger.end();

        // Log SciBox interaction
        logSciBoxRequest(
          '/v1/chat/completions',
          'POST',
          sciboxRequest,
          responseData,
          responseTime,
          userId,
          correlationId
        );

        // Log usage analytics
        const usage = responseData.usage || {};
        logModelUsage({
          userId,
          model,
          endpoint: 'chat',
          inputTokens: usage.prompt_tokens || 0,
          outputTokens: usage.completion_tokens || 0,
          totalTokens: usage.total_tokens || 0,
          responseTime: duration,
          success: true
        });

        // Add correlation ID to response
        res.setHeader('X-Correlation-ID', correlationId);
        res.json(responseData);
      }

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      const mappedError = mapAxiosError(error);

      // Log failed SciBox request
      logSciBoxRequest(
        '/v1/chat/completions',
        'POST',
        sciboxRequest,
        null,
        responseTime,
        userId,
        correlationId
      );

      // Log failed usage
      logModelUsage({
        userId,
        model,
        endpoint: 'chat',
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        responseTime: perfLogger.end(),
        success: false,
        errorType: mappedError.type
      });

      throw mappedError;
    }

  } catch (error) {
    next(error);
  }
});

export { router as chatCompletionsRouter };
