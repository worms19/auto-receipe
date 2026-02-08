import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';

const execFileAsync = promisify(execFile);

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(private readonly http: HttpService) {}

  /** Generate a unique temp file path with the given extension. */
  tempPath(ext: string): string {
    const id = crypto.randomBytes(8).toString('hex');
    return path.join(os.tmpdir(), `wechef-${id}.${ext}`);
  }

  /** Download a file from URL to a local path. */
  async download(url: string, destPath: string): Promise<void> {
    this.logger.log(`Downloading video...`);
    const response = await firstValueFrom(
      this.http.get(url, { responseType: 'arraybuffer' }),
    );
    fs.writeFileSync(destPath, Buffer.from(response.data));
    this.logger.log(`Downloaded to ${destPath}`);
  }

  /** Extract audio from video using ffmpeg (stream copy, no re-encode). */
  async extractAudio(videoPath: string, audioPath: string): Promise<void> {
    this.logger.log('Extracting audio with ffmpeg...');
    await execFileAsync('ffmpeg', [
      '-i', videoPath,
      '-vn',
      '-acodec', 'copy',
      '-y',
      audioPath,
    ]);
    this.logger.log(`Audio extracted to ${audioPath}`);
  }

  /** Capture a thumbnail frame from the video at 1 second. */
  async extractThumbnail(videoPath: string, thumbPath: string): Promise<void> {
    this.logger.log('Extracting thumbnail with ffmpeg...');
    await execFileAsync('ffmpeg', [
      '-i', videoPath,
      '-ss', '00:00:01',
      '-vframes', '1',
      '-q:v', '3',
      '-y',
      thumbPath,
    ]);
    this.logger.log(`Thumbnail extracted to ${thumbPath}`);
  }

  /** Read a file as a base64 data URI. */
  toBase64DataUri(filePath: string, mimeType: string): string {
    const data = fs.readFileSync(filePath);
    return `data:${mimeType};base64,${data.toString('base64')}`;
  }

  /** Remove a file if it exists (for cleanup). */
  cleanup(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch {
      this.logger.warn(`Failed to clean up: ${filePath}`);
    }
  }
}
