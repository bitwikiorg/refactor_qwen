import express from 'express';
// Correct the import path for the logger module
import { getLoggerInstance } from './services/logger.mjs';

const router = express.Router();
const logger = getLoggerInstance({ module: 'Routes' });

// Main page routes
router.get('/', (req, res) => {
  logger.info('Root route accessed');
  res.render('terminal', { title: 'Terminal' });
});

router.get('/terminal', (req, res) => {
  try {
    res.render('terminal'); // Ensure 'terminal.ejs' exists in the views directory
  } catch (error) {
    console.error('Error rendering terminal view:', error.message);
    res.status(500).send('Internal Server Error');
  }
});

router.get('/research', (req, res) => {
  res.render('research', { title: 'Research' });
});

router.get('/memory', (req, res) => {
  res.render('memory', { title: 'Memory' });
});

router.get('/self', (req, res) => {
  res.render('self', { title: 'Self-Management' });
});

router.get('/admin', (req, res) => {
  res.render('admin', { title: 'Admin' });
});

router.get('/github', (req, res) => {
  res.render('github', { title: 'GitHub Integration' });
});

export default router;
