import express from 'express';
import { requirePermission } from '../middleware/auth';

const router = express.Router();

router.get('/', requirePermission('courses:read'), (req, res) => {
  res.json({ message: 'Courses endpoint - to be implemented' });
});

export { router as courseRoutes };
