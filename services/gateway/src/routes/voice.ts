import express from 'express';
import { requirePermission } from '../middleware/auth';

const router = express.Router();

router.post('/transcribe', requirePermission('voice:stt'), (req, res) => {
  res.json({ message: 'Speech-to-text endpoint - proxied to STT service' });
});

router.post('/synthesize', requirePermission('voice:tts'), (req, res) => {
  res.json({ message: 'Text-to-speech endpoint - proxied to TTS service' });
});

router.get('/transcripts', requirePermission('voice:transcripts'), (req, res) => {
  res.json({ message: 'Voice transcripts - to be implemented' });
});

export { router as voiceRoutes };
