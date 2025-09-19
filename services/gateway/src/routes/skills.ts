import express from 'express';
import { requirePermission } from '../middleware/auth';

const router = express.Router();

router.get('/', requirePermission('skills:read'), (req, res) => {
  res.json({ message: 'Skills endpoint - to be implemented' });
});

export { router as skillRoutes };
