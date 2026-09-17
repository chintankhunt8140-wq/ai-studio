import { GoogleGenAI } from '@google/genai';
import { AIBrainPlan, AspectRatio, ReferenceImage } from '../../src/types';
import { storage } from './storageService';

export interface ImageGenerationResult {
  imageUrl: string;
  provider: string;
  mimeType: string;
  fileSizeBytes: number;
  metadata?: {
    model: string;
    resolution: string;
  };
}

export interface IImageProvider {
  name: string;
  model: string;
  generate(params: {
    plan: AIBrainPlan;
    aspectRatio: AspectRatio;
    referenceImage?: ReferenceImage;
  }): Promise<ImageGenerationResult>;
}

export class BaseGeminiImageProvider implements IImageProvider {
  public name: string;
  public model: string;
  private timeoutMs: number;

  constructor(name: string, model: string, timeoutMs: number = 60000) {
    this.name = name;
    this.model = model;
    this.timeoutMs = timeoutMs;
  }

  private getClient(): GoogleGenAI {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === 'MY_GEMINI_API_KEY') {
      throw new Error(
        'Gemini API key is not configured. Please add GEMINI_API_KEY in Settings to enable real AI image generation.'
      );
    }
    return new GoogleGenAI({
      apiKey: key,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });
  }

  private mapAspectRatio(aspectRatio: AspectRatio): '1:1' | '3:4' | '4:3' | '9:16' | '16:9' {
    switch (aspectRatio) {
      case '1:1':
      case '3:4':
      case '4:3':
      case '9:16':
      case '16:9':
        return aspectRatio;
      case '21:9':
        return '16:9'; // Closest standard supported by model
      default:
        return '16:9';
    }
  }

  async generate(params: {
    plan: AIBrainPlan;
    aspectRatio: AspectRatio;
    referenceImage?: ReferenceImage;
  }): Promise<ImageGenerationResult> {
    const ai = this.getClient();
    const { plan, aspectRatio, referenceImage } = params;

    const parts: Array<any> = [];

    // If reference image exists, pass it for visual conditioning & preservation
    if (referenceImage?.dataUrl) {
      const match = referenceImage.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        parts.push({
          inlineData: {
            mimeType: match[1] || 'image/jpeg',
            data: match[2],
          }
        });
      }
    }

    // Build the enhanced prompt using the AI Brain's structured plan
    const promptDetails = [
      plan.enhancedPrompt,
      plan.visualStyle ? `Style: ${plan.visualStyle}` : null,
      plan.lighting ? `Lighting: ${plan.lighting}` : null,
      plan.composition ? `Composition: ${plan.composition}` : null,
      plan.subjectDetails ? `Details: ${plan.subjectDetails}` : null,
      plan.referencePreservation && plan.referencePreservation.length > 0
        ? `Preserve from reference: ${plan.referencePreservation.join('; ')}`
        : null,
      plan.negativeConstraints ? `Negative constraints: ${plan.negativeConstraints}` : null,
    ]
      .filter(Boolean)
      .join('. ');

    parts.push({ text: promptDetails });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${this.name} image generation timed out after ${this.timeoutMs / 1000}s`)),
        this.timeoutMs
      )
    );

    const generatePromise = ai.models.generateContent({
      model: this.model,
      contents: { parts },
      config: {
        imageConfig: {
          aspectRatio: this.mapAspectRatio(aspectRatio),
        }
      }
    });

    const response: any = await Promise.race([generatePromise, timeoutPromise]);

    const candidate = response.candidates?.[0];
    if (!candidate?.content?.parts) {
      throw new Error(`No candidate image content returned by provider ${this.model}`);
    }

    for (const part of candidate.content.parts) {
      if (part.inlineData?.data) {
        const mime = part.inlineData.mimeType || 'image/png';
        
        // Save image to disk using storage service
        const saved = storage.saveGeneratedImage(part.inlineData.data, mime);

        // Strictly validate real binary output on disk
        const validation = storage.validateImageOutput(saved.filePath);
        if (!validation.valid) {
          storage.deleteAssetFile(saved.url);
          throw new Error(`Generated image output validation failed: ${validation.error}`);
        }

        return {
          imageUrl: saved.url,
          provider: this.model,
          mimeType: mime,
          fileSizeBytes: saved.sizeBytes,
          metadata: {
            model: this.model,
            resolution: aspectRatio === '16:9' ? '1280x720' : aspectRatio === '9:16' ? '720x1280' : '1024x1024',
          }
        };
      }
    }

    throw new Error(`No visual image data received from ${this.model}. The provider may have blocked the prompt or encountered a content filter.`);
  }
}

export class GeminiFlashLiteImageProvider extends BaseGeminiImageProvider {
  constructor() {
    super('gemini-3.1-flash-lite-image', 'gemini-3.1-flash-lite-image', 60000);
  }
}

export class GeminiFlashImageProvider extends BaseGeminiImageProvider {
  constructor() {
    super('gemini-3.1-flash-image', 'gemini-3.1-flash-image', 90000);
  }
}

// Default export alias for backwards compatibility
export const GeminiImageProvider = GeminiFlashLiteImageProvider;
