import express from 'express';
import { requirePermission } from '../middleware/auth';

const router = express.Router();

router.post('/chat', requirePermission('llm:chat'), (req, res) => {
  res.json({ message: 'LLM chat endpoint - proxied to LLM adapter' });
});

router.post('/embeddings', requirePermission('llm:embeddings'), (req, res) => {
  res.json({ message: 'LLM embeddings endpoint - proxied to LLM adapter' });
});

export { router as llmRoutes };
