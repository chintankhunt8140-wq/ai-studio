import { store } from '../db/store';
import {
  GeminiFlashLiteImageProvider,
  GeminiFlashImageProvider,
  IImageProvider,
} from './imageProvider';
import {
  VeoLiteVideoProvider,
  VeoProVideoProvider,
  IVideoProvider,
} from './videoProvider';

class ProviderRegistry {
  private flashLiteImage = new GeminiFlashLiteImageProvider();
  private flashImage = new GeminiFlashImageProvider();

  private veoLiteVideo = new VeoLiteVideoProvider();
  private veoProVideo = new VeoProVideoProvider();

  public getImageProvider(modelOverride?: string): IImageProvider {
    const settings = store.getSettings();
    const model = modelOverride || settings.defaultImageModel || 'gemini-3.1-flash-lite-image';

    if (model.includes('flash-image') && !model.includes('lite')) {
      return this.flashImage;
    }
    return this.flashLiteImage;
  }

  public getSecondaryImageProvider(failedModel: string): IImageProvider | null {
    if (failedModel.includes('lite')) {
      return this.flashImage;
    }
    return null;
  }

  public getVideoProvider(modelOverride?: string): IVideoProvider {
    const settings = store.getSettings();
    const model = modelOverride || settings.defaultVideoModel || 'veo-3.1-lite-generate-preview';

    if (model.includes('generate-preview') && !model.includes('lite')) {
      return this.veoProVideo;
    }
    return this.veoLiteVideo;
  }

  public getSecondaryVideoProvider(failedModel: string): IVideoProvider | null {
    if (failedModel.includes('lite')) {
      return this.veoProVideo;
    }
    return null;
  }
}

export const providers = new ProviderRegistry();
