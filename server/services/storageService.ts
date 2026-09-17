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
    if (buffer.length < 12) {
      throw new Error('Uploaded image file is empty or corrupted.');
    }

    // Verify magic bytes signature matches claimed image format
    const isValidSignature = this.verifyImageSignature(buffer, mimeType);
    if (!isValidSignature) {
      throw new Error(`File contents do not match valid image signature for format: ${mimeType}`);
    }

    const ext = allowedMimes[mimeType];
    const fileId = `ref_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
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
   * Verifies file magic bytes against claimed MIME type
   */
  private verifyImageSignature(buffer: Buffer, mimeType: string): boolean {
    if (mimeType.includes('png')) {
      return (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a
      );
    }
    if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    }
    if (mimeType.includes('webp')) {
      return (
        buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
        buffer.subarray(8, 12).toString('ascii') === 'WEBP'
      );
    }
    if (mimeType.includes('gif')) {
      const header = buffer.subarray(0, 4).toString('ascii');
      return header === 'GIF8';
    }
    return false;
  }

  /**
   * Validates generated image on disk before completing job
   */
  public validateImageOutput(filePath: string): { valid: boolean; sizeBytes: number; error?: string } {
    try {
      if (!fs.existsSync(filePath)) {
        return { valid: false, sizeBytes: 0, error: 'Generated image file does not exist on disk' };
      }
      const stat = fs.statSync(filePath);
      if (stat.size < 50) {
        return { valid: false, sizeBytes: stat.size, error: 'Generated image file is empty or corrupted (size < 50 bytes)' };
      }
      const buf = Buffer.alloc(16);
      const fd = fs.openSync(filePath, 'r');
      fs.readSync(fd, buf, 0, 16, 0);
      fs.closeSync(fd);

      const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
      const isJpg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
      const isWebp = buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP';

      if (!isPng && !isJpg && !isWebp) {
        return { valid: false, sizeBytes: stat.size, error: 'Generated file is not a valid PNG, JPEG, or WebP image binary' };
      }
      return { valid: true, sizeBytes: stat.size };
    } catch (e: any) {
      return { valid: false, sizeBytes: 0, error: `Validation error: ${e.message}` };
    }
  }

  /**
   * Validates generated video on disk using ffprobe before completing job
   */
  public async validateVideoOutput(filePath: string): Promise<{
    valid: boolean;
    durationSeconds: number;
    sizeBytes: number;
    error?: string;
  }> {
    try {
      if (!fs.existsSync(filePath)) {
        return { valid: false, durationSeconds: 0, sizeBytes: 0, error: 'Generated video file does not exist on disk' };
      }
      const stat = fs.statSync(filePath);
      if (stat.size < 1000) {
        return { valid: false, durationSeconds: 0, sizeBytes: stat.size, error: 'Generated video file size is invalid (< 1KB)' };
      }

      // Check header box
      const buf = Buffer.alloc(12);
      const fd = fs.openSync(filePath, 'r');
      fs.readSync(fd, buf, 0, 12, 0);
      fs.closeSync(fd);
      const ftyp = buf.subarray(4, 8).toString('ascii');
      if (ftyp !== 'ftyp') {
        return { valid: false, durationSeconds: 0, sizeBytes: stat.size, error: 'Generated file is not a valid MP4 container (missing ftyp box)' };
      }

      // Use ffprobe to inspect video stream & duration
      const { stdout } = await execAsync(
        `ffprobe -v error -show_entries format=duration,format_name -show_entries stream=codec_type,width,height -of json "${filePath}"`,
        { timeout: 8000 }
      );
      const parsed = JSON.parse(stdout);
      const hasVideoStream = parsed.streams?.some((s: any) => s.codec_type === 'video');
      if (!hasVideoStream) {
        return { valid: false, durationSeconds: 0, sizeBytes: stat.size, error: 'MP4 container does not contain a playable video stream' };
      }

      const duration = parseFloat(parsed.format?.duration || '10');
      return {
        valid: true,
        durationSeconds: Math.round(duration) || 10,
        sizeBytes: stat.size,
      };
    } catch (err: any) {
      return { valid: false, durationSeconds: 0, sizeBytes: 0, error: `ffprobe validation failed: ${err.message}` };
    }
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
      const absPath = path.resolve(ASSETS_DIR, relPath);
      // Path traversal check: must remain strictly inside ASSETS_DIR
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
