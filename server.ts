import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { store } from './server/db/store';
import { queue } from './server/queue/jobQueue';
import { planCreativeGeneration } from './server/ai/brain';
import { ASSETS_DIR, GENERATED_DIR, UPLOADS_DIR } from './server/services/storageService';
import { AspectRatio, GenerationMode } from './src/types';
import { brainEnhanceLimiter, jobCreateLimiter } from './server/middleware/rateLimiter';

const VALID_MODES: GenerationMode[] = ['image', 'video'];
const VALID_ASPECT_RATIOS: AspectRatio[] = ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9'];

function extractUserId(req: Request): string {
  const headerUser = req.headers['x-user-id'] as string;
  if (headerUser && typeof headerUser === 'string') {
    const verified = store.getUser(headerUser);
    if (verified) return verified.id;
  }
  return 'user_creator_1';
}

function sanitizeErrorMessage(err: any): string {
  const msg = err?.message || String(err) || 'Internal server error';
  // Strip out any accidental API key leaks in error messages
  return msg.replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_KEY]');
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Security hardening: hide Express fingerprint
  app.disable('x-powered-by');

  // Security headers middleware
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // Support JSON payloads with base64 images up to 25mb
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Ensure asset directories are statically served
  app.use('/assets/generated', express.static(GENERATED_DIR));
  app.use('/assets/uploads', express.static(UPLOADS_DIR));
  app.use('/assets', express.static(ASSETS_DIR));

  // -------------------------------------------------------------
  // API Routes
  // -------------------------------------------------------------

  // Health check
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'AI Studio Creative Engine',
      timestamp: Date.now(),
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
    });
  });

  // User Authentication & Profiles
  app.get('/api/auth/users', (req: Request, res: Response) => {
    res.json(store.getUsers());
  });

  app.get('/api/auth/current', (req: Request, res: Response) => {
    const userId = extractUserId(req);
    const user = store.getUser(userId) || store.getUsers()[0];
    res.json(user);
  });

  // AI Brain: Standalone Instant Prompt Enhancement
  app.post('/api/brain/enhance', brainEnhanceLimiter, async (req: Request, res: Response) => {
    try {
      const { mode = 'image', rawPrompt, referenceImage, aspectRatio = '16:9', videoMotion } = req.body;
      const userId = extractUserId(req);

      if (!rawPrompt || typeof rawPrompt !== 'string' || !rawPrompt.trim()) {
        return res.status(400).json({ error: 'Prompt is required and must not be empty' });
      }

      if (rawPrompt.trim().length > 3000) {
        return res.status(400).json({ error: 'Prompt exceeds maximum character length of 3000' });
      }

      if (!VALID_MODES.includes(mode)) {
        return res.status(400).json({ error: `Invalid mode. Allowed: ${VALID_MODES.join(', ')}` });
      }

      if (!VALID_ASPECT_RATIOS.includes(aspectRatio)) {
        return res.status(400).json({ error: `Invalid aspect ratio. Allowed: ${VALID_ASPECT_RATIOS.join(', ')}` });
      }

      const plan = await planCreativeGeneration({
        mode,
        rawPrompt: rawPrompt.trim(),
        referenceImage,
        aspectRatio,
        videoMotion,
      });

      if (userId) {
        store.updateUserStats(userId, { promptEnhancements: 1 });
      }

      res.json(plan);
    } catch (err: any) {
      console.error('Error enhancing prompt:', err);
      res.status(500).json({ error: sanitizeErrorMessage(err) });
    }
  });

  // Background Generation Jobs
  app.post('/api/jobs/create', jobCreateLimiter, (req: Request, res: Response) => {
    try {
      const {
        mode = 'image',
        prompt,
        referenceImage,
        aspectRatio = '16:9',
        videoMotion,
      } = req.body;

      const userId = extractUserId(req);
      const user = store.getUser(userId);
      const userName = user ? user.name : 'Creative Director';

      if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
        return res.status(400).json({ error: 'Prompt is required and must not be empty' });
      }

      if (prompt.trim().length < 2) {
        return res.status(400).json({ error: 'Prompt must be at least 2 characters long' });
      }

      if (prompt.trim().length > 3000) {
        return res.status(400).json({ error: 'Prompt exceeds maximum character length of 3000' });
      }

      if (!VALID_MODES.includes(mode)) {
        return res.status(400).json({ error: `Invalid mode. Allowed: ${VALID_MODES.join(', ')}` });
      }

      if (!VALID_ASPECT_RATIOS.includes(aspectRatio)) {
        return res.status(400).json({ error: `Invalid aspect ratio. Allowed: ${VALID_ASPECT_RATIOS.join(', ')}` });
      }

      // Check reference image if supplied
      if (referenceImage?.dataUrl) {
        if (typeof referenceImage.dataUrl !== 'string' || !referenceImage.dataUrl.startsWith('data:image/')) {
          return res.status(400).json({ error: 'Reference image must be a valid base64 data URL with image MIME type' });
        }
      }

      const idempotencyKey = (req.headers['x-idempotency-key'] as string) || req.body.idempotencyKey;

      const job = queue.createJob({
        userId,
        userName,
        mode,
        prompt: prompt.trim(),
        referenceImage,
        aspectRatio,
        videoMotion,
        idempotencyKey,
      });

      res.status(201).json(job);
    } catch (err: any) {
      console.error('Error creating generation job:', err);
      res.status(500).json({ error: sanitizeErrorMessage(err) });
    }
  });

  app.get('/api/jobs/:id', (req: Request, res: Response) => {
    const callerId = extractUserId(req);
    const job = store.getJob(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    if (callerId !== 'user_admin_root' && job.userId !== callerId) {
      return res.status(403).json({ error: 'Unauthorized to view this generation job' });
    }
    res.json(job);
  });

  app.post('/api/jobs/:id/cancel', (req: Request, res: Response) => {
    const callerId = extractUserId(req);
    const job = store.getJob(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }
    if (callerId !== 'user_admin_root' && job.userId !== callerId) {
      return res.status(403).json({ success: false, error: 'Unauthorized to cancel another user\'s job' });
    }
    const success = queue.cancelJob(req.params.id, callerId);
    if (!success) {
      return res.status(400).json({
        success: false,
        error: 'Unable to cancel job (it may have already completed, failed, or been cancelled)',
      });
    }
    res.json({ success: true });
  });

  app.post('/api/jobs/:id/retry', (req: Request, res: Response) => {
    const callerId = extractUserId(req);
    const job = store.getJob(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Original job not found' });
    }
    if (callerId !== 'user_admin_root' && job.userId !== callerId) {
      return res.status(403).json({ error: 'Unauthorized to retry another user\'s job' });
    }
    if (!['failed', 'cancelled'].includes(job.status)) {
      return res.status(400).json({ error: 'Only failed or cancelled jobs can be retried' });
    }
    const newJob = queue.retryJob(req.params.id, callerId);
    if (!newJob) {
      return res.status(500).json({ error: 'Failed to create retry job' });
    }
    res.status(201).json(newJob);
  });

  // Creations Library
  app.get('/api/creations', (req: Request, res: Response) => {
    const callerId = extractUserId(req);
    const { mode, userId, search, favoriteOnly } = req.query;
    // Admins can optionally filter by another userId; standard creators only see their own
    const effectiveUserId = callerId === 'user_admin_root' ? (userId as string) : callerId;
    const list = store.getCreations({
      mode: mode as string,
      userId: effectiveUserId,
      search: search as string,
      favoriteOnly: favoriteOnly === 'true',
    });
    res.json(list);
  });

  app.get('/api/creations/:id', (req: Request, res: Response) => {
    const callerId = extractUserId(req);
    const item = store.getCreation(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Creation not found' });
    }
    if (callerId !== 'user_admin_root' && item.userId !== callerId) {
      return res.status(403).json({ error: 'Unauthorized to view this creation' });
    }
    res.json(item);
  });

  app.post('/api/creations/:id/favorite', (req: Request, res: Response) => {
    try {
      const userId = extractUserId(req);
      const isFavorite = store.toggleFavorite(req.params.id, userId);
      res.json({ isFavorite });
    } catch (err: any) {
      if (err.message?.includes('Unauthorized')) {
        return res.status(403).json({ error: err.message });
      }
      res.status(404).json({ error: 'Creation not found' });
    }
  });

  app.delete('/api/creations/:id', (req: Request, res: Response) => {
    try {
      const userId = extractUserId(req);
      const success = store.deleteCreation(req.params.id, userId);
      if (!success) {
        return res.status(404).json({ error: 'Creation not found' });
      }
      res.json({ success: true });
    } catch (err: any) {
      if (err.message?.includes('Unauthorized')) {
        return res.status(403).json({ error: err.message });
      }
      res.status(500).json({ error: sanitizeErrorMessage(err) });
    }
  });

  // Admin & Analytics
  app.get('/api/stats', (req: Request, res: Response) => {
    const userId = (req.query.userId as string) || undefined;
    const system = store.getSystemStats(userId);
    res.json(system);
  });

  app.get('/api/admin/settings', (req: Request, res: Response) => {
    res.json(store.getSettings());
  });

  app.post('/api/admin/settings', (req: Request, res: Response) => {
    const callerId = extractUserId(req);
    if (callerId !== 'user_admin_root') {
      return res.status(403).json({ error: 'Forbidden: Admin access required to update engine configuration' });
    }

    const ALLOWED_IMAGE_MODELS = ['gemini-3.1-flash-lite-image', 'gemini-3.1-flash-image'];
    const ALLOWED_VIDEO_MODELS = ['veo-3.1-lite-generate-preview', 'veo-3.1-generate-preview'];
    const { preferredImageModel, preferredVideoModel, defaultImageModel, defaultVideoModel } = req.body;
    const imgModel = preferredImageModel || defaultImageModel;
    const vidModel = preferredVideoModel || defaultVideoModel;

    if (imgModel && !ALLOWED_IMAGE_MODELS.includes(imgModel)) {
      return res.status(400).json({
        error: `Invalid image model: ${imgModel}. Allowed: ${ALLOWED_IMAGE_MODELS.join(', ')}`,
      });
    }
    if (vidModel && !ALLOWED_VIDEO_MODELS.includes(vidModel)) {
      return res.status(400).json({
        error: `Invalid video model: ${vidModel}. Allowed: ${ALLOWED_VIDEO_MODELS.join(', ')}`,
      });
    }

    const updated = store.updateSettings({
      defaultImageModel: imgModel || undefined,
      preferredImageModel: imgModel || undefined,
      defaultVideoModel: vidModel || undefined,
      preferredVideoModel: vidModel || undefined,
    });
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
    app.get('*', (req: Request, res: Response) => {
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
