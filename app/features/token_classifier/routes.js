import express from 'express';
import { classifyToken } from './service.js';

const router = express.Router();

router.post('/classify', (req, res) => {
    const { token } = req.body;
    if (!token) {
        return res.status(400).json({ error: 'Token is required' });
    }
    const classification = classifyToken(token);
    res.json({ classification });
});

export default router;
