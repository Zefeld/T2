import express from 'express';
import { requireRole, requirePermission } from '../middleware/auth';

const router = express.Router();

router.get('/dashboard', requireRole(['hr_specialist', 'hr_manager', 'admin']), (req, res) => {
  res.json({ message: 'Analytics dashboard - to be implemented' });
});

router.get('/reports', requirePermission('analytics:read'), (req, res) => {
  res.json({ message: 'Analytics reports - to be implemented' });
});

export { router as analyticsRoutes };
