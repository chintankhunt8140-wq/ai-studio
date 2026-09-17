import { GoogleGenAI, GenerateVideosOperation } from '@google/genai';
import { AIBrainPlan, AspectRatio, ReferenceImage, VideoMotionConfig } from '../../src/types';
import { storage } from './storageService';

export interface VideoGenerationResult {
  videoUrl: string;
  thumbnailUrl: string;
  provider: string;
  mimeType: string;
  fileSizeBytes: number;
  durationSeconds: number;
  metadata?: {
    model: string;
    resolution: string;
    fps?: number;
    operationName?: string;
  };
}

export interface IVideoProvider {
  name: string;
  model: string;
  generate(params: {
    jobId: string;
    plan: AIBrainPlan;
    aspectRatio: AspectRatio;
    referenceImage?: ReferenceImage;
    videoMotion?: VideoMotionConfig;
    onProgress?: (progress: number, step: string) => void;
    checkCancelled?: () => boolean;
  }): Promise<VideoGenerationResult>;
}

export class BaseVeoVideoProvider implements IVideoProvider {
  public name: string;
  public model: string;
  private resolution: '720p' | '1080p';

  constructor(name: string, model: string, resolution: '720p' | '1080p' = '720p') {
    this.name = name;
    this.model = model;
    this.resolution = resolution;
  }

  private getClient(): { ai: GoogleGenAI; key: string } {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === 'MY_GEMINI_API_KEY') {
      throw new Error(
        'Gemini API key is not configured. Please add GEMINI_API_KEY in Settings to enable real AI video generation.'
      );
    }
    return {
      ai: new GoogleGenAI({
        apiKey: key,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      }),
      key,
    };
  }

  async generate(params: {
    jobId: string;
    plan: AIBrainPlan;
    aspectRatio: AspectRatio;
    referenceImage?: ReferenceImage;
    videoMotion?: VideoMotionConfig;
    onProgress?: (progress: number, step: string) => void;
    checkCancelled?: () => boolean;
  }): Promise<VideoGenerationResult> {
    const client = this.getClient();
    const { jobId, plan, aspectRatio, referenceImage, onProgress, checkCancelled } = params;

    const veoAspectRatio: '16:9' | '9:16' = aspectRatio === '9:16' ? '9:16' : '16:9';

    if (checkCancelled?.()) {
      throw new Error('Video generation was cancelled by user');
    }

    onProgress?.(35, `Submitting 10-second prompt to ${this.model}...`);

    // Construct enriched prompt with AI Brain video plan
    const promptSegments = [
      plan.enhancedPrompt,
      plan.videoPlan?.cameraMovement ? `Camera movement: ${plan.videoPlan.cameraMovement}` : null,
      plan.videoPlan?.subjectMotion ? `Subject motion: ${plan.videoPlan.subjectMotion}` : null,
      plan.videoPlan?.environmentMotion ? `Environment motion: ${plan.videoPlan.environmentMotion}` : null,
      plan.videoPlan?.cinematicDirection ? `Cinematic direction: ${plan.videoPlan.cinematicDirection}` : null,
      plan.referencePreservation && plan.referencePreservation.length > 0
        ? `Preserve from source: ${plan.referencePreservation.join('; ')}`
        : null,
      plan.negativeConstraints ? `Negative constraints: ${plan.negativeConstraints}` : null,
      'Continuous 10-second cinematic sequence with seamless temporal continuity and realistic physics.'
    ].filter(Boolean);

    const fullPrompt = promptSegments.join('. ');

    const generatePayload: any = {
      model: this.model,
      prompt: fullPrompt,
      config: {
        numberOfVideos: 1,
        resolution: this.resolution,
        aspectRatio: veoAspectRatio,
      },
    };

    // If reference image exists, pass it for visual conditioning
    if (referenceImage?.dataUrl) {
      const match = referenceImage.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        generatePayload.image = {
          imageBytes: match[2],
          mimeType: match[1] || 'image/png',
        };
      }
    }

    let operation: any;
    try {
      operation = await client.ai.models.generateVideos(generatePayload);
    } catch (apiErr: any) {
      const msg = apiErr?.message || String(apiErr);
      throw new Error(`Veo submission failed: ${msg}`);
    }

    const operationName = operation?.name;
    if (!operationName) {
      throw new Error('Veo did not return an operation name');
    }

    onProgress?.(45, `Neural video synthesis initiated (Job: ${jobId}). Polling provider...`);

    // Poll operation until complete
    let attempts = 0;
    const maxAttempts = 60; // 60 * 5s = 300s (5 minutes)
    let completedOp: any = null;

    while (attempts < maxAttempts) {
      if (checkCancelled?.()) {
        throw new Error('Video generation was cancelled by user');
      }

      await new Promise((r) => setTimeout(r, 5000));
      attempts++;

      const op = new GenerateVideosOperation();
      op.name = operationName;

      let updated: any;
      try {
        updated = await client.ai.operations.getVideosOperation({ operation: op });
      } catch (pollErr: any) {
        console.warn(`Polling error on attempt ${attempts}:`, pollErr);
        continue;
      }

      if (updated?.error) {
        throw new Error(`Veo synthesis encountered error: ${updated.error.message || JSON.stringify(updated.error)}`);
      }

      const pct = Math.min(45 + Math.round((attempts / maxAttempts) * 45), 90);
      onProgress?.(pct, `Veo rendering frames (${attempts * 5}s elapsed)...`);

      if (updated?.done) {
        completedOp = updated;
        break;
      }
    }

    if (!completedOp || !completedOp.done) {
      throw new Error('Veo video generation timed out after 5 minutes');
    }

    const videoUri = completedOp.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) {
      throw new Error('No video URI received in Veo operation response');
    }

    onProgress?.(92, 'Downloading synthesized 10-second master MP4...');

    const videoRes = await fetch(videoUri, {
      headers: { 'x-goog-api-key': client.key },
    });

    if (!videoRes.ok) {
      throw new Error(`Failed to download Veo video stream: ${videoRes.statusText}`);
    }

    const arrayBuffer = await videoRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save video file to disk
    const saved = storage.saveGeneratedVideo(buffer, `veo_${jobId}`);

    // Strictly validate MP4 container, video stream, and duration
    const validation = await storage.validateVideoOutput(saved.filePath);
    if (!validation.valid) {
      storage.deleteAssetFile(saved.url);
      throw new Error(`Generated video validation failed: ${validation.error}`);
    }

    onProgress?.(96, 'Extracting video thumbnail frame...');

    // Extract legitimate video thumbnail using FFmpeg
    let thumbUrl = await storage.extractVideoThumbnail(saved.filePath, jobId);
    if (!thumbUrl) {
      thumbUrl = saved.url; // Fallback to video stream if thumbnail extraction fails
    }

    return {
      videoUrl: saved.url,
      thumbnailUrl: thumbUrl,
      provider: this.model,
      mimeType: 'video/mp4',
      fileSizeBytes: saved.sizeBytes,
      durationSeconds: 10,
      metadata: {
        model: this.model,
        resolution: this.resolution,
        fps: 24,
        operationName,
      },
    };
  }
}

export class VeoLiteVideoProvider extends BaseVeoVideoProvider {
  constructor() {
    super('veo-3.1-lite', 'veo-3.1-lite-generate-preview', '720p');
  }
}

export class VeoProVideoProvider extends BaseVeoVideoProvider {
  constructor() {
    super('veo-3.1-pro', 'veo-3.1-generate-preview', '1080p');
  }
}

// Default export alias for backwards compatibility
export const VeoVideoProvider = VeoLiteVideoProvider;
