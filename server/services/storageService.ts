import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const ASSETS_DIR = path.join(process.cwd(), 'public', 'assets');
export const GENERATED_DIR = path.join(ASSETS_DIR, 'generated');
export const UPLOADS_DIR = path.join(ASSETS_DIR, 'uploads');

// Ensure directories exist
for (const dir of [ASSETS_DIR, GENERATED_DIR, UPLOADS_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export class StorageService {
  /**
   * Validates and saves an uploaded reference image (from base64 dataUrl)
   */
  public saveReferenceImage(dataUrl: string, originalName?: string): {
    url: string;
    filePath: string;
    mimeType: string;
    sizeBytes: number;
    base64Data: string;
  } {
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      throw new Error('Invalid image format: Expected standard base64 data URL');
    }

    const mimeType = match[1].toLowerCase();
    const base64Data = match[2];

    const allowedMimes: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
    };

    if (!allowedMimes[mimeType]) {
      throw new Error(`Unsupported image format: ${mimeType}. Supported: JPEG, PNG, WebP, GIF.`);
    }

    const buffer = Buffer.from(base64Data, 'base64');
    const maxSizeBytes = 15 * 1024 * 1024; // 15MB
    if (buffer.length > maxSizeBytes) {
      throw new Error('Uploaded image exceeds the 15MB limit.');
    }

    const ext = allowedMimes[mimeType];
    const fileId = `ref_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const fileName = `${fileId}.${ext}`;
    const filePath = path.join(UPLOADS_DIR, fileName);

    fs.writeFileSync(filePath, buffer);

    return {
      url: `/assets/uploads/${fileName}`,
      filePath,
      mimeType,
      sizeBytes: buffer.length,
      base64Data,
    };
  }

  /**
   * Saves a generated AI image to disk
   */
  public saveGeneratedImage(
    bufferOrBase64: Buffer | string,
    mimeType: string = 'image/png',
    preferredId?: string
  ): {
    url: string;
    filePath: string;
    sizeBytes: number;
    mimeType: string;
  } {
    let buffer: Buffer;
    if (typeof bufferOrBase64 === 'string') {
      const clean = bufferOrBase64.replace(/^data:[^;]+;base64,/, '');
      buffer = Buffer.from(clean, 'base64');
    } else {
      buffer = bufferOrBase64;
    }

    const ext = mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'jpg' : 'png';
    const id = preferredId || `img_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const fileName = `${id}.${ext}`;
    const filePath = path.join(GENERATED_DIR, fileName);

    fs.writeFileSync(filePath, buffer);

    return {
      url: `/assets/generated/${fileName}`,
      filePath,
      sizeBytes: buffer.length,
      mimeType,
    };
  }

  /**
   * Saves a generated AI video (MP4) to disk
   */
  public saveGeneratedVideo(
    buffer: Buffer,
    preferredId?: string
  ): {
    url: string;
    filePath: string;
    sizeBytes: number;
  } {
    const id = preferredId || `veo_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const fileName = `${id}.mp4`;
    const filePath = path.join(GENERATED_DIR, fileName);

    fs.writeFileSync(filePath, buffer);

    return {
      url: `/assets/generated/${fileName}`,
      filePath,
      sizeBytes: buffer.length,
    };
  }

  /**
   * Extracts a video thumbnail frame using FFmpeg for true media preview
   */
  public async extractVideoThumbnail(videoFilePath: string, preferredId: string): Promise<string | null> {
    try {
      const thumbFileName = `thumb_${preferredId}.jpg`;
      const thumbFilePath = path.join(GENERATED_DIR, thumbFileName);

      // Extract high quality frame at 0.5s or 1.0s
      await execAsync(
        `ffmpeg -y -ss 00:00:01.000 -i "${videoFilePath}" -vframes 1 -q:v 2 "${thumbFilePath}"`,
        { timeout: 8000 }
      );

      if (fs.existsSync(thumbFilePath) && fs.statSync(thumbFilePath).size > 0) {
        return `/assets/generated/${thumbFileName}`;
      }
    } catch (err) {
      console.warn('Could not extract video thumbnail via FFmpeg:', err);
    }
    return null;
  }

  /**
   * Safely deletes an asset file from disk
   */
  public deleteAssetFile(publicUrl: string): boolean {
    try {
      if (!publicUrl || !publicUrl.startsWith('/assets/')) return false;
      const relPath = publicUrl.replace(/^\/assets\//, '');
      const absPath = path.join(ASSETS_DIR, relPath);
      // Path traversal check
      if (!absPath.startsWith(ASSETS_DIR)) return false;

      if (fs.existsSync(absPath)) {
        fs.unlinkSync(absPath);
        return true;
      }
    } catch (e) {
      console.warn('Error deleting asset file:', e);
    }
    return false;
  }
}

export const storage = new StorageService();
