import express from 'express';
import { requirePermission } from '../middleware/auth';

const router = express.Router();

router.get('/', requirePermission('notifications:read'), (req, res) => {
  res.json({ message: 'Notifications endpoint - to be implemented' });
});

router.put('/preferences', requirePermission('notifications:write'), (req, res) => {
  res.json({ message: 'Notification preferences - to be implemented' });
});

export { router as notificationRoutes };
