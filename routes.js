
import express from 'express';

const router = express.Router();

// Main page routes
router.get('/', (req, res) => {
  res.render('terminal', { title: 'Terminal' });
});

router.get('/terminal', (req, res) => {
  res.render('terminal', { title: 'Terminal' });
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
