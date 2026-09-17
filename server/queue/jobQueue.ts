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

class BackgroundJobQueue {
  private processingQueue: string[] = [];
  private activeJobs: Set<string> = new Set();
  private maxConcurrency = 3;

  public createJob(params: {
    userId: string;
    userName: string;
    mode: GenerationMode;
    prompt: string;
    referenceImage?: ReferenceImage;
    aspectRatio: AspectRatio;
    videoMotion?: VideoMotionConfig;
  }): GenerationJob {
    const jobId = `job_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const now = Date.now();

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

    // Transition to queued
    job.status = 'queued';
    job.logs.push({
      timestamp: Date.now(),
      step: 'queued',
      message: 'Job enqueued in background dispatcher.',
    });
    store.setJob(job);

    this.processingQueue.push(jobId);
    this.triggerWorker();
    return job;
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
    return true;
  }

  public retryJob(jobId: string, requestedByUserId?: string): GenerationJob | null {
    const oldJob = store.getJob(jobId);
    if (!oldJob) return null;

    if (requestedByUserId && oldJob.userId !== requestedByUserId && requestedByUserId !== 'user_admin_root') {
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
      // Don't overwrite if cancelled in the background
      const current = store.getJob(jobId);
      if (current?.status === 'cancelled') return;

      job.status = status;
      job.progress = progress;
      job.currentStepMessage = message;
      job.updatedAt = Date.now();
      job.logs.push({
        timestamp: Date.now(),
        step: status,
        message,
      });
      store.setJob(job);
    };

    const isCancelled = () => {
      const current = store.getJob(jobId);
      return current?.status === 'cancelled';
    };

    const startTime = Date.now();

    try {
      if (isCancelled()) return;

      // 1. ANALYZING: AI Brain interprets prompt semantics and examines reference imagery
      updateStep('analyzing', 15, 'AI Brain analyzing prompt intent, semantics, and reference image features...');

      // 2. PLANNING: Synthesize visual roadmap
      updateStep('planning', 30, 'AI Brain synthesizing visual plan, negative constraints, and motion sequence...');
      const plan = await planCreativeGeneration({
        mode: job.mode,
        rawPrompt: job.prompt,
        referenceImage: job.referenceImage,
        aspectRatio: job.aspectRatio,
        videoMotion: job.videoMotion,
      });

      if (isCancelled()) return;

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

        try {
          const res = await primaryProvider.generate({
            plan,
            aspectRatio: job.aspectRatio,
            referenceImage: job.referenceImage,
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
          console.warn(`Primary image provider (${primaryProvider.model}) failed:`, primaryErr);

          // Check if secondary real AI model exists
          const secondary = providers.getSecondaryImageProvider(primaryProvider.model);
          if (secondary) {
            updateStep('generating', 55, `Primary model unavailable, retrying with ${secondary.model}...`);
            job.provider = secondary.model;
            store.setJob(job);

            const res = await secondary.generate({
              plan,
              aspectRatio: job.aspectRatio,
              referenceImage: job.referenceImage,
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
          console.warn(`Primary video provider (${primaryVideoProvider.model}) failed:`, videoErr);

          const secondary = providers.getSecondaryVideoProvider(primaryVideoProvider.model);
          if (secondary) {
            updateStep('generating', 45, `Retrying with ${secondary.model}...`);
            job.provider = secondary.model;
            store.setJob(job);

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
    } catch (err: any) {
      if (isCancelled()) return;
      console.error(`Error processing job ${jobId}:`, err);
      job.error = err.message || 'Generation failed';
      updateStep('failed', 100, `Generation encountered error: ${err.message || 'Unknown failure'}`);
    }
  }
}

export const queue = new BackgroundJobQueue();
