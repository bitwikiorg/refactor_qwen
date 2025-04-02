import { Router } from 'express';
import { processChatMessage } from './service.mjs';
// Removed unused logger imports

const chatRouter = Router();

// --- HELPER MIDDLEWARES ---
const validateMessageBody = async (req, res, next) => {
  try {
    const content = req.body?.content;
    if (!content || typeof content !== 'string') throw new Error("Invalid message format");

    res.locals.sanitizedContent = sanitizeInput(content);

    next();
  } catch (e) {
    next(e); // Handled downstream through global error handler later
  }
};

function sanitizeInput(input) {
  return input.replace(/<script>/gi, ''); // Basic XSS mitigation example - replace w/full library implementation!
}

// --- ENDPOINTS ---

chatRouter.get('/', (req, res) => {
  res.render('chat'); // Assumes a view named 'chat' exists
});

chatRouter.post('/meta', async (req, res, next) => {
  try {
    const metadata = await req.container?.chatService.getMetadata();
    res.json({ success: true, data: Object.fromEntries(metadata) });
  } catch (err) {
    next(err); // Assume global error handler exists now - remove custom local handlers!
  }
});

/* Message sending */
chatRouter.post(
  '/send',
  validateMessageBody,
  async (req, res, next) => {
    try {
      await req.container?.chatService.sendMessage({
        content: res.locals.sanitizedContent,
        userId: req.user?.id || 'anonymous',
        timestamp: new Date()
      });

      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  }
);

chatRouter.post('/send', async (req, res, next) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }
  try {
    const response = await processChatMessage(message);
    res.json({ success: true, response });
  } catch (error) {
    next(error);
  }
});

/* Message retrieval */
chatRouter.get(
  '/',
  async (req, res, next) => {
    try {
      const query = req.query.q || '';
      const messages = await req.container?.chatService.findMessages(query.toString());

      res.json(messages.map(m => ({ ...m, id: m._id.toHexString() })));
    } catch (err) {
      next(err);
    }
  }
);

export default chatRouter;