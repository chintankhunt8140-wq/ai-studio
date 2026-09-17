import { store } from '../db/store';
import { GeminiImageProvider, CreativeCanvasImageProvider, IImageProvider } from './imageProvider';
import { VeoVideoProvider, Cinematic10sVideoRenderer, IVideoProvider } from './videoProvider';

class ProviderRegistry {
  private geminiImage = new GeminiImageProvider();
  private canvasImage = new CreativeCanvasImageProvider();
  
  private veoVideo = new VeoVideoProvider();
  private cinematicVideo = new Cinematic10sVideoRenderer();

  public getImageProvider(): IImageProvider {
    const settings = store.getSettings();
    const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');

    // If key configured and not forced fallback
    if (hasKey && settings.defaultImageModel.includes('gemini')) {
      return this.geminiImage;
    }
    return this.canvasImage;
  }

  public getVideoProvider(): IVideoProvider {
    const settings = store.getSettings();
    const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');

    // If key configured and admin selected veo
    if (hasKey && settings.defaultVideoModel.includes('veo')) {
      return this.veoVideo;
    }
    // High-performance 10s cinematic video renderer
    return this.cinematicVideo;
  }

  public getFallbackImageProvider(): IImageProvider {
    return this.canvasImage;
  }

  public getFallbackVideoProvider(): IVideoProvider {
    return this.cinematicVideo;
  }
}

export const providers = new ProviderRegistry();
