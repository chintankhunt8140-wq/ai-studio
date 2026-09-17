import crypto from 'crypto';
import {
  AspectRatio,
  CreationAsset,
  GenerationJob,
  GenerationMode,
  JobStatus,
  ReferenceImage,
  VideoMotionConfig,
} from '../../src/types';
import { planCreativeGeneration } from '../ai/brain';
import { store } from '../db/store';
import { providers } from '../services/providerRegistry';
import { storage } from '../services/storageService';
import { logJobEvent } from '../services/logger';

const VALID_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  created: ['queued', 'failed', 'cancelled'],
  queued: ['analyzing', 'failed', 'cancelled'],
  analyzing: ['planning', 'failed', 'cancelled'],
  planning: ['generating', 'failed', 'cancelled'],
  generating: ['finalizing', 'failed', 'cancelled'],
  finalizing: ['completed', 'failed', 'cancelled'],
  completed: [], // Terminal
  failed: [], // Terminal
  cancelled: [], // Terminal
};

class BackgroundJobQueue {
  private processingQueue: string[] = [];
  private activeJobs: Set<string> = new Set();
  private maxConcurrency = 3;
  private idempotencyCache: Map<string, { jobId: string; timestamp: number }> = new Map();
  private rapidSubmissionCache: Map<string, { jobId: string; timestamp: number }> = new Map();

  public createJob(params: {
    userId: string;
    userName: string;
    mode: GenerationMode;
    prompt: string;
    referenceImage?: ReferenceImage;
    aspectRatio: AspectRatio;
    videoMotion?: VideoMotionConfig;
    idempotencyKey?: string;
  }): GenerationJob {
    const now = Date.now();

    // 1. Check client-supplied idempotency key
    if (params.idempotencyKey) {
      const cached = this.idempotencyCache.get(params.idempotencyKey);
      if (cached && now - cached.timestamp < 300000) { // 5 min TTL
        const existing = store.getJob(cached.jobId);
        if (existing) {
          return existing;
        }
      }
    }

    // 2. Check rapid duplicate protection (within 3 seconds for exact same user + mode + prompt)
    const fingerprint = `${params.userId}:${params.mode}:${params.prompt.trim().toLowerCase()}`;
    const recent = this.rapidSubmissionCache.get(fingerprint);
    if (recent && now - recent.timestamp < 3000) {
      const existing = store.getJob(recent.jobId);
      if (existing && !['failed', 'cancelled'].includes(existing.status)) {
        return existing;
      }
    }

    const jobId = `job_${now}_${crypto.randomBytes(4).toString('hex')}`;

    // Process reference image through storage service if present to avoid storing giant base64 payloads
    let processedReferenceImage: ReferenceImage | undefined = undefined;
    if (params.referenceImage?.dataUrl) {
      try {
        const saved = storage.saveReferenceImage(
          params.referenceImage.dataUrl,
          params.referenceImage.name || params.referenceImage.fileName
        );
        processedReferenceImage = {
          ...params.referenceImage,
          storageUrl: saved.url,
          mimeType: saved.mimeType,
          fileSize: saved.sizeBytes,
        };
      } catch (err: any) {
        console.warn('Failed to persist reference image to storage, retaining memory dataUrl:', err);
        processedReferenceImage = params.referenceImage;
      }
    }

    const job: GenerationJob = {
      id: jobId,
      userId: params.userId,
      userName: params.userName,
      mode: params.mode,
      prompt: params.prompt,
      referenceImage: processedReferenceImage,
      aspectRatio: params.aspectRatio,
      videoMotion: params.videoMotion,
      status: 'created',
      progress: 5,
      currentStepMessage: 'Job registered and queued for AI orchestration...',
      logs: [
        {
          timestamp: now,
          step: 'created',
          message: `Generation job initialized for ${
            params.mode === 'video' ? '10-second cinematic video' : 'high-resolution creative image'
          }.`,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    store.setJob(job);

    // Save idempotency records
    if (params.idempotencyKey) {
      this.idempotencyCache.set(params.idempotencyKey, { jobId, timestamp: now });
    }
    this.rapidSubmissionCache.set(fingerprint, { jobId, timestamp: now });

    logJobEvent({
      event: 'job_created',
      jobId,
      userId: params.userId,
      mode: params.mode,
      details: { prompt: params.prompt.substring(0, 100), aspectRatio: params.aspectRatio },
    });

    // Transition to queued
    this.safeTransition(job, 'queued', 10, 'Job enqueued in background dispatcher.');

    this.processingQueue.push(jobId);
    this.triggerWorker();
    return job;
  }

  private safeTransition(job: GenerationJob, nextStatus: JobStatus, progress: number, message: string): boolean {
    const current = store.getJob(job.id);
    if (!current) return false;

    // Terminal state locks
    if (['completed', 'failed', 'cancelled'].includes(current.status)) {
      return false;
    }

    if (current.status !== nextStatus) {
      const allowed = VALID_TRANSITIONS[current.status];
      if (!allowed || !allowed.includes(nextStatus)) {
        console.warn(`[STATE_MACHINE_REJECTED] Invalid transition from ${current.status} to ${nextStatus} for job ${job.id}`);
        return false;
      }
    }

    job.status = nextStatus;
    job.progress = progress;
    job.currentStepMessage = message;
    job.updatedAt = Date.now();
    job.logs.push({
      timestamp: Date.now(),
      step: nextStatus,
      message,
    });
    store.setJob(job);
    return true;
  }

  public cancelJob(jobId: string, requestedByUserId?: string): boolean {
    const job = store.getJob(jobId);
    if (!job) return false;

    // Check ownership if requestedByUserId is provided
    if (requestedByUserId && job.userId !== requestedByUserId && requestedByUserId !== 'user_admin_root') {
      return false;
    }

    if (['completed', 'failed', 'cancelled'].includes(job.status)) {
      return false;
    }

    job.status = 'cancelled';
    job.error = 'Job was cancelled by user';
    job.currentStepMessage = 'Generation cancelled by user';
    job.updatedAt = Date.now();
    job.logs.push({
      timestamp: Date.now(),
      step: 'cancelled',
      message: 'Job cancelled by client request.',
    });

    store.setJob(job);
    this.activeJobs.delete(jobId);
    this.processingQueue = this.processingQueue.filter((id) => id !== jobId);

    logJobEvent({
      event: 'job_cancelled',
      jobId,
      userId: job.userId,
      mode: job.mode,
    });

    return true;
  }

  public retryJob(jobId: string, requestedByUserId?: string): GenerationJob | null {
    const oldJob = store.getJob(jobId);
    if (!oldJob) return null;

    if (requestedByUserId && oldJob.userId !== requestedByUserId && requestedByUserId !== 'user_admin_root') {
      return null;
    }

    // Only failed or cancelled jobs can be retried
    if (!['failed', 'cancelled'].includes(oldJob.status)) {
      return null;
    }

    return this.createJob({
      userId: oldJob.userId,
      userName: oldJob.userName,
      mode: oldJob.mode,
      prompt: oldJob.prompt,
      referenceImage: oldJob.referenceImage,
      aspectRatio: oldJob.aspectRatio,
      videoMotion: oldJob.videoMotion,
    });
  }

  private triggerWorker(): void {
    while (this.activeJobs.size < this.maxConcurrency && this.processingQueue.length > 0) {
      const jobId = this.processingQueue.shift();
      if (jobId) {
        this.activeJobs.add(jobId);
        this.processJob(jobId).finally(() => {
          this.activeJobs.delete(jobId);
          this.triggerWorker();
        });
      }
    }
  }

  private async processJob(jobId: string): Promise<void> {
    const job = store.getJob(jobId);
    if (!job || job.status === 'failed' || job.status === 'cancelled') return;

    const updateStep = (status: JobStatus, progress: number, message: string) => {
      this.safeTransition(job, status, progress, message);
    };

    const isCancelled = () => {
      const current = store.getJob(jobId);
      return current?.status === 'cancelled';
    };

    const startTime = Date.now();

    try {
      if (isCancelled()) return;

      // 1. ANALYZING: AI Brain interprets prompt semantics and examines reference imagery
      logJobEvent({
        event: 'ai_brain_started',
        jobId,
        userId: job.userId,
        mode: job.mode,
      });
      updateStep('analyzing', 15, 'AI Brain analyzing prompt intent, semantics, and reference image features...');

      // 2. PLANNING: Synthesize visual roadmap
      updateStep('planning', 30, 'AI Brain synthesizing visual plan, negative constraints, and motion sequence...');
      const brainStartTime = Date.now();
      const plan = await planCreativeGeneration({
        mode: job.mode,
        rawPrompt: job.prompt,
        referenceImage: job.referenceImage,
        aspectRatio: job.aspectRatio,
        videoMotion: job.videoMotion,
      });
      const brainDuration = Date.now() - brainStartTime;

      if (isCancelled()) return;

      logJobEvent({
        event: 'ai_brain_completed',
        jobId,
        userId: job.userId,
        mode: job.mode,
        durationMs: brainDuration,
      });

      job.aiPlan = plan;
      job.enhancedPrompt = plan.enhancedPrompt;
      store.setJob(job);

      // 3. GENERATING: Real AI Provider Dispatch
      updateStep(
        'generating',
        45,
        `Dispatching to ${job.mode === 'video' ? 'Veo 3.1 Neural Video Generator' : 'Gemini 3.1 Image Generator'}...`
      );

      let assetResult: {
        mediaUrl: string;
        thumbnailUrl?: string;
        provider: string;
        mimeType: string;
        fileSizeBytes: number;
        durationSeconds?: number;
        metadata?: any;
      };

      if (job.mode === 'image') {
        const primaryProvider = providers.getImageProvider();
        job.provider = primaryProvider.model;
        store.setJob(job);

        logJobEvent({
          event: 'provider_selected',
          jobId,
          userId: job.userId,
          mode: 'image',
          provider: primaryProvider.name,
          model: primaryProvider.model,
        });

        const providerReqStart = Date.now();
        logJobEvent({
          event: 'provider_request_started',
          jobId,
          userId: job.userId,
          mode: 'image',
          model: primaryProvider.model,
        });

        try {
          const res = await primaryProvider.generate({
            plan,
            aspectRatio: job.aspectRatio,
            referenceImage: job.referenceImage,
          });

          logJobEvent({
            event: 'provider_request_completed',
            jobId,
            userId: job.userId,
            mode: 'image',
            model: primaryProvider.model,
            durationMs: Date.now() - providerReqStart,
          });

          assetResult = {
            mediaUrl: res.imageUrl,
            thumbnailUrl: res.imageUrl,
            provider: res.provider,
            mimeType: res.mimeType,
            fileSizeBytes: res.fileSizeBytes,
            metadata: res.metadata,
          };
        } catch (primaryErr: any) {
          const errCategory = categorizeError(primaryErr);
          logJobEvent({
            event: 'provider_request_failed',
            jobId,
            userId: job.userId,
            mode: 'image',
            model: primaryProvider.model,
            durationMs: Date.now() - providerReqStart,
            errorCategory: errCategory,
            error: formatUserFacingError(primaryErr),
          });

          console.warn(`Primary image provider (${primaryProvider.model}) failed:`, primaryErr);

          // Check if secondary real AI model exists
          const secondary = providers.getSecondaryImageProvider(primaryProvider.model);
          if (secondary) {
            updateStep('generating', 55, `Primary model unavailable, retrying with ${secondary.model}...`);
            job.provider = secondary.model;
            store.setJob(job);

            logJobEvent({
              event: 'provider_selected',
              jobId,
              userId: job.userId,
              mode: 'image',
              model: secondary.model,
              details: { fallback: true },
            });

            const secStart = Date.now();
            logJobEvent({
              event: 'provider_request_started',
              jobId,
              userId: job.userId,
              mode: 'image',
              model: secondary.model,
            });

            const res = await secondary.generate({
              plan,
              aspectRatio: job.aspectRatio,
              referenceImage: job.referenceImage,
            });

            logJobEvent({
              event: 'provider_request_completed',
              jobId,
              userId: job.userId,
              mode: 'image',
              model: secondary.model,
              durationMs: Date.now() - secStart,
            });

            assetResult = {
              mediaUrl: res.imageUrl,
              thumbnailUrl: res.imageUrl,
              provider: res.provider,
              mimeType: res.mimeType,
              fileSizeBytes: res.fileSizeBytes,
              metadata: res.metadata,
            };
          } else {
            // No secondary provider or secondary also failed - fail cleanly, NEVER output fake SVG!
            throw primaryErr;
          }
        }
      } else {
        // Video mode: 10-second master video
        const primaryVideoProvider = providers.getVideoProvider();
        job.provider = primaryVideoProvider.model;
        store.setJob(job);

        logJobEvent({
          event: 'provider_selected',
          jobId,
          userId: job.userId,
          mode: 'video',
          provider: primaryVideoProvider.name,
          model: primaryVideoProvider.model,
        });

        const vidReqStart = Date.now();
        logJobEvent({
          event: 'provider_request_started',
          jobId,
          userId: job.userId,
          mode: 'video',
          model: primaryVideoProvider.model,
        });

        try {
          const res = await primaryVideoProvider.generate({
            jobId: job.id,
            plan,
            aspectRatio: job.aspectRatio,
            referenceImage: job.referenceImage,
            videoMotion: job.videoMotion,
            onProgress: (pct, msg) => {
              updateStep('generating', pct, msg);
            },
            checkCancelled: isCancelled,
          });

          if (isCancelled()) return;

          logJobEvent({
            event: 'provider_request_completed',
            jobId,
            userId: job.userId,
            mode: 'video',
            model: primaryVideoProvider.model,
            durationMs: Date.now() - vidReqStart,
          });

          assetResult = {
            mediaUrl: res.videoUrl,
            thumbnailUrl: res.thumbnailUrl,
            provider: res.provider,
            mimeType: res.mimeType,
            fileSizeBytes: res.fileSizeBytes,
            durationSeconds: res.durationSeconds,
            metadata: res.metadata,
          };

          if (res.metadata?.operationName) {
            job.providerJobId = res.metadata.operationName;
            store.setJob(job);
          }
        } catch (videoErr: any) {
          const errCategory = categorizeError(videoErr);
          logJobEvent({
            event: 'provider_request_failed',
            jobId,
            userId: job.userId,
            mode: 'video',
            model: primaryVideoProvider.model,
            durationMs: Date.now() - vidReqStart,
            errorCategory: errCategory,
            error: formatUserFacingError(videoErr),
          });

          console.warn(`Primary video provider (${primaryVideoProvider.model}) failed:`, videoErr);

          const secondary = providers.getSecondaryVideoProvider(primaryVideoProvider.model);
          if (secondary) {
            updateStep('generating', 45, `Retrying with ${secondary.model}...`);
            job.provider = secondary.model;
            store.setJob(job);

            logJobEvent({
              event: 'provider_selected',
              jobId,
              userId: job.userId,
              mode: 'video',
              model: secondary.model,
              details: { fallback: true },
            });

            const secVidStart = Date.now();
            logJobEvent({
              event: 'provider_request_started',
              jobId,
              userId: job.userId,
              mode: 'video',
              model: secondary.model,
            });

            const res = await secondary.generate({
              jobId: job.id,
              plan,
              aspectRatio: job.aspectRatio,
              referenceImage: job.referenceImage,
              videoMotion: job.videoMotion,
              onProgress: (pct, msg) => {
                updateStep('generating', pct, msg);
              },
              checkCancelled: isCancelled,
            });

            if (isCancelled()) return;

            logJobEvent({
              event: 'provider_request_completed',
              jobId,
              userId: job.userId,
              mode: 'video',
              model: secondary.model,
              durationMs: Date.now() - secVidStart,
            });

            assetResult = {
              mediaUrl: res.videoUrl,
              thumbnailUrl: res.thumbnailUrl,
              provider: res.provider,
              mimeType: res.mimeType,
              fileSizeBytes: res.fileSizeBytes,
              durationSeconds: res.durationSeconds,
              metadata: res.metadata,
            };
          } else {
            // Fail cleanly, NEVER output fake static MP4!
            throw videoErr;
          }
        }
      }

      if (isCancelled()) return;

      // 4. FINALIZING: Storing asset and updating metrics
      updateStep('finalizing', 95, 'Validating output asset and cataloging in library...');

      const renderTime = Date.now() - startTime;
      const assetId = `asset_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

      const creationAsset: CreationAsset = {
        id: assetId,
        userId: job.userId,
        userName: job.userName,
        mode: job.mode,
        status: 'completed',
        originalPrompt: job.prompt,
        enhancedPrompt: plan.enhancedPrompt,
        aiPlan: plan,
        mediaUrl: assetResult.mediaUrl,
        thumbnailUrl: assetResult.thumbnailUrl || assetResult.mediaUrl,
        referenceImageUrl: job.referenceImage?.storageUrl || job.referenceImage?.dataUrl,
        referenceImage: job.referenceImage,
        aspectRatio: job.aspectRatio,
        durationSeconds: job.mode === 'video' ? 10 : undefined,
        fileSizeBytes: assetResult.fileSizeBytes,
        mimeType: assetResult.mimeType,
        provider: assetResult.provider,
        createdAt: startTime,
        completedAt: Date.now(),
        isFavorite: false,
        metadata: {
          renderTimeMs: renderTime,
          model: job.provider,
          operationName: job.providerJobId,
          ...(assetResult.metadata || {}),
        },
      };

      // Add to persistent store
      store.addCreation(creationAsset);

      // Update user usage statistics
      store.updateUserStats(job.userId, {
        imagesGenerated: job.mode === 'image' ? 1 : 0,
        videosGenerated: job.mode === 'video' ? 1 : 0,
        totalRenderSeconds: Math.round(renderTime / 1000),
        promptEnhancements: 1,
      });

      // Mark job completed
      job.result = creationAsset;
      job.completedAt = Date.now();
      updateStep(
        'completed',
        100,
        `Successfully synthesized ${
          job.mode === 'video' ? '10-second cinematic video' : 'master creative image'
        } in ${Math.round(renderTime / 1000)}s!`
      );

      logJobEvent({
        event: 'job_completed',
        jobId,
        userId: job.userId,
        mode: job.mode,
        durationMs: renderTime,
        details: { assetId, fileSizeBytes: assetResult.fileSizeBytes },
      });
    } catch (err: any) {
      if (isCancelled()) return;
      console.error(`Error processing job ${jobId}:`, err);
      const cleanError = formatUserFacingError(err);
      const category = categorizeError(err);
      job.error = cleanError;
      this.safeTransition(job, 'failed', 100, `Generation encountered error: ${cleanError}`);

      logJobEvent({
        event: 'job_failed',
        jobId,
        userId: job.userId,
        mode: job.mode,
        errorCategory: category,
        error: cleanError,
        durationMs: Date.now() - startTime,
      });
    }
  }
}

function categorizeError(err: any): string {
  const msg = (err?.message || String(err)).toLowerCase();
  if (msg.includes('429') || msg.includes('quota') || msg.includes('resource_exhausted')) return 'quota_exceeded';
  if (msg.includes('timeout') || msg.includes('timed out')) return 'timeout';
  if (msg.includes('network') || msg.includes('enotfound') || msg.includes('econnrefused')) return 'network';
  if (msg.includes('filter') || msg.includes('blocked') || msg.includes('safety')) return 'content_filtered';
  if (msg.includes('validation') || msg.includes('corrupted') || msg.includes('signature')) return 'validation_failed';
  if (msg.includes('403') || msg.includes('unauthorized') || msg.includes('permission')) return 'unauthorized';
  return 'internal_error';
}

function formatUserFacingError(err: any): string {
  const raw = err?.message || String(err) || 'Generation failed';
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.error?.message) {
        if (parsed.error.code === 429 || parsed.error.status === 'RESOURCE_EXHAUSTED') {
          return 'Gemini AI Quota exceeded: The active Gemini API key does not have image/video generation quota enabled or has reached its rate limit. Please check your API key plan in Settings or retry shortly.';
        }
        return parsed.error.message.replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_KEY]');
      }
    }
  } catch {}
  if (raw.includes('429') || raw.includes('RESOURCE_EXHAUSTED')) {
    return 'Gemini AI Quota exceeded: The active Gemini API key does not have image/video generation quota enabled or has reached its rate limit.';
  }
  return raw.replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_KEY]');
}

export const queue = new BackgroundJobQueue();
