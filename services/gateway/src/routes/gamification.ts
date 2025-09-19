import express from 'express';
import { requirePermission } from '../middleware/auth';

const router = express.Router();

router.get('/xp', requirePermission('gamification:read'), (req, res) => {
  res.json({ message: 'XP endpoint - to be implemented' });
});

router.get('/achievements', requirePermission('gamification:read'), (req, res) => {
  res.json({ message: 'Achievements endpoint - to be implemented' });
});

export { router as gamificationRoutes };
