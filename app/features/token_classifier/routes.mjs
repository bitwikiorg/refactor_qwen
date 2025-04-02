import express from 'express';
import { classifyToken } from './service.mjs';

const router = express.Router();

router.post('/classify', async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }
  try {
    const classification = await classifyToken(token);
    res.json({ classification });
  } catch (error) {
    console.error('Error during token classification:', error);
    res.status(500).json({ error: 'Failed to classify token' });
  }
});

export default router;
