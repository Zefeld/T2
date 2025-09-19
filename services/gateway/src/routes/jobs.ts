import express from 'express';
import { requirePermission } from '../middleware/auth';

const router = express.Router();

router.get('/', requirePermission('jobs:read'), (req, res) => {
  res.json({ message: 'Jobs endpoint - to be implemented' });
});

router.get('/recommendations', requirePermission('jobs:read'), (req, res) => {
  res.json({ message: 'Job recommendations - to be implemented' });
});

export { router as jobRoutes };
