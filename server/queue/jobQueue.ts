import crypto from 'crypto';
import { AspectRatio, CreationAsset, GenerationJob, GenerationMode, JobStatus, ReferenceImage, VideoMotionConfig } from '../../src/types';
import { planCreativeGeneration } from '../ai/brain';
import { store } from '../db/store';
import { providers } from '../services/providerRegistry';

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

    const job: GenerationJob = {
      id: jobId,
      userId: params.userId,
      userName: params.userName,
      mode: params.mode,
      prompt: params.prompt,
      referenceImage: params.referenceImage,
      aspectRatio: params.aspectRatio,
      videoMotion: params.videoMotion,
      status: 'queued',
      progress: 5,
      currentStepMessage: 'Job submitted and queued for AI orchestration...',
      logs: [
        {
          timestamp: now,
          step: 'queued',
          message: `Generation job enqueued for ${params.mode === 'video' ? '10-second cinematic video' : 'high-resolution creative image'}.`
        }
      ],
      createdAt: now,
      updatedAt: now,
    };

    store.setJob(job);
    this.processingQueue.push(jobId);
    this.triggerWorker();
    return job;
  }

  public cancelJob(jobId: string): boolean {
    const job = store.getJob(jobId);
    if (!job) return false;

    if (['completed', 'failed'].includes(job.status)) {
      return false;
    }

    job.status = 'failed';
    job.error = 'Job was cancelled by user';
    job.currentStepMessage = 'Generation cancelled';
    job.updatedAt = Date.now();
    job.logs.push({
      timestamp: Date.now(),
      step: 'failed',
      message: 'Job cancelled by client request.'
    });

    store.setJob(job);
    this.activeJobs.delete(jobId);
    this.processingQueue = this.processingQueue.filter(id => id !== jobId);
    return true;
  }

  public retryJob(jobId: string): GenerationJob | null {
    const oldJob = store.getJob(jobId);
    if (!oldJob) return null;

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
    if (!job || job.status === 'failed') return;

    const updateStep = (status: JobStatus, progress: number, message: string) => {
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

    const startTime = Date.now();

    try {
      // 1. ANALYZING: AI Brain analyzes raw prompt and visual features of reference image
      updateStep('analyzing', 20, 'AI Brain is interpreting intent, semantics, and reference imagery...');
      
      // 2. PLANNING: Produce structured GenerationPlan with style, lighting, composition, camera & motion
      updateStep('planning', 35, 'AI Brain synthesizing visual plan, negative constraints & motion timeline...');
      const plan = await planCreativeGeneration({
        mode: job.mode,
        rawPrompt: job.prompt,
        referenceImage: job.referenceImage,
        aspectRatio: job.aspectRatio,
        videoMotion: job.videoMotion,
      });

      job.aiPlan = plan;
      store.setJob(job);

      // 3. GENERATING: Provider dispatch
      updateStep('generating', 50, `Dispatching to ${job.mode === 'video' ? '10s cinematic video engine' : 'neural image generator'}...`);

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
        } catch (imgErr) {
          console.warn('Primary image provider error, switching to creative canvas provider:', imgErr);
          const fallback = providers.getFallbackImageProvider();
          const res = await fallback.generate({
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
        }
      } else {
        // Video mode: target approx 10 seconds
        const primaryVideoProvider = providers.getVideoProvider();
        try {
          const res = await primaryVideoProvider.generate({
            jobId: job.id,
            plan,
            aspectRatio: job.aspectRatio,
            referenceImage: job.referenceImage,
            videoMotion: job.videoMotion,
            onProgress: (pct, msg) => {
              updateStep('generating', pct, msg);
            }
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
        } catch (vidErr) {
          console.warn('Primary video provider error, falling back to 10s cinematic video engine:', vidErr);
          const fallback = providers.getFallbackVideoProvider();
          const res = await fallback.generate({
            jobId: job.id,
            plan,
            aspectRatio: job.aspectRatio,
            referenceImage: job.referenceImage,
            videoMotion: job.videoMotion,
            onProgress: (pct, msg) => {
              updateStep('generating', pct, msg);
            }
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
        }
      }

      // 4. FINALIZING: Storing asset and updating metrics
      updateStep('finalizing', 95, 'Finalizing output asset and cataloging in generation library...');

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
        referenceImageUrl: job.referenceImage?.dataUrl,
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
          ...(assetResult.metadata || {}),
        }
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
      updateStep('completed', 100, `Successfully created ${job.mode === 'video' ? '10-second cinematic video' : 'creative image'} in ${Math.round(renderTime / 1000)}s!`);

    } catch (err: any) {
      console.error(`Error processing job ${jobId}:`, err);
      job.error = err.message || 'Generation failed';
      updateStep('failed', 100, `Generation encountered error: ${err.message || 'Unknown failure'}`);
    }
  }
}

export const queue = new BackgroundJobQueue();
