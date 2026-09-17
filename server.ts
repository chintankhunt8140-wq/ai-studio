import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { store } from './server/db/store';
import { queue } from './server/queue/jobQueue';
import { planCreativeGeneration } from './server/ai/brain';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Support JSON payloads with base64 images up to 50mb
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Ensure generated assets directory is statically served
  const generatedDir = path.join(process.cwd(), 'public', 'assets', 'generated');
  if (!fs.existsSync(generatedDir)) {
    fs.mkdirSync(generatedDir, { recursive: true });
  }
  app.use('/assets/generated', express.static(generatedDir));

  // -------------------------------------------------------------
  // API Routes
  // -------------------------------------------------------------

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'AI Studio Creative Engine',
      timestamp: Date.now(),
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY')
    });
  });

  // User Authentication & Profiles
  app.get('/api/auth/users', (req, res) => {
    res.json(store.getUsers());
  });

  app.get('/api/auth/current', (req, res) => {
    const userId = (req.query.userId as string) || 'user_creator_1';
    const user = store.getUser(userId) || store.getUsers()[0];
    res.json(user);
  });

  // AI Brain: Standalone Instant Prompt Enhancement
  app.post('/api/brain/enhance', async (req, res) => {
    try {
      const { mode, rawPrompt, referenceImage, aspectRatio, videoMotion, userId } = req.body;
      if (!rawPrompt || typeof rawPrompt !== 'string') {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      const plan = await planCreativeGeneration({
        mode: mode || 'image',
        rawPrompt,
        referenceImage,
        aspectRatio: aspectRatio || '16:9',
        videoMotion,
      });

      if (userId) {
        store.updateUserStats(userId, { promptEnhancements: 1 });
      }

      res.json(plan);
    } catch (err: any) {
      console.error('Error enhancing prompt:', err);
      res.status(500).json({ error: err.message || 'Failed to enhance prompt' });
    }
  });

  // Background Generation Jobs
  app.post('/api/jobs/create', (req, res) => {
    try {
      const {
        userId = 'user_creator_1',
        userName = 'Creative Director',
        mode = 'image',
        prompt,
        referenceImage,
        aspectRatio = '16:9',
        videoMotion,
      } = req.body;

      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      const job = queue.createJob({
        userId,
        userName,
        mode,
        prompt,
        referenceImage,
        aspectRatio,
        videoMotion,
      });

      res.status(201).json(job);
    } catch (err: any) {
      console.error('Error creating generation job:', err);
      res.status(500).json({ error: err.message || 'Failed to create job' });
    }
  });

  app.get('/api/jobs/:id', (req, res) => {
    const job = store.getJob(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json(job);
  });

  app.post('/api/jobs/:id/cancel', (req, res) => {
    const success = queue.cancelJob(req.params.id);
    res.json({ success });
  });

  app.post('/api/jobs/:id/retry', (req, res) => {
    const newJob = queue.retryJob(req.params.id);
    if (!newJob) {
      return res.status(404).json({ error: 'Original job not found' });
    }
    res.status(201).json(newJob);
  });

  // Creations Library
  app.get('/api/creations', (req, res) => {
    const { mode, userId, search, favoriteOnly } = req.query;
    const list = store.getCreations({
      mode: mode as string,
      userId: userId as string,
      search: search as string,
      favoriteOnly: favoriteOnly === 'true',
    });
    res.json(list);
  });

  app.get('/api/creations/:id', (req, res) => {
    const item = store.getCreation(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Creation not found' });
    }
    res.json(item);
  });

  app.post('/api/creations/:id/favorite', (req, res) => {
    const isFavorite = store.toggleFavorite(req.params.id);
    res.json({ isFavorite });
  });

  app.delete('/api/creations/:id', (req, res) => {
    const success = store.deleteCreation(req.params.id);
    res.json({ success });
  });

  // Admin & Analytics
  app.get('/api/stats', (req, res) => {
    const system = store.getSystemStats();
    res.json(system);
  });

  app.get('/api/admin/settings', (req, res) => {
    res.json(store.getSettings());
  });

  app.post('/api/admin/settings', (req, res) => {
    const updated = store.updateSettings(req.body);
    res.json(updated);
  });

  // -------------------------------------------------------------
  // Vite Middleware (Dev) or Static files (Prod)
  // -------------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AI Studio] Server active on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[AI Studio] Fatal error starting server:', err);
  process.exit(1);
});
