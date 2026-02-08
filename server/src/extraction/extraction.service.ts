import { Injectable, Logger } from '@nestjs/common';
import { CobaltService } from './cobalt.service';
import { MediaService } from './media.service';
import { WhisperService } from './whisper.service';
import { ExtractResponseDto } from './dto/extract-response.dto';

@Injectable()
export class ExtractionService {
  private readonly logger = new Logger(ExtractionService.name);

  constructor(
    private readonly cobalt: CobaltService,
    private readonly media: MediaService,
    private readonly whisper: WhisperService,
  ) {}

  async extract(url: string, language?: string): Promise<ExtractResponseDto> {
    this.logger.log(`Starting extraction for: ${url}`);

    // 1. Resolve Instagram URL to direct video URL via Cobalt
    const videoUrl = await this.cobalt.getVideoUrl(url);

    // Temp file paths
    const videoPath = this.media.tempPath('mp4');
    const audioPath = this.media.tempPath('m4a');
    const thumbPath = this.media.tempPath('jpg');

    try {
      // 2. Download the video
      await this.media.download(videoUrl, videoPath);

      // 3. Extract audio and thumbnail in parallel
      await Promise.all([
        this.media.extractAudio(videoPath, audioPath),
        this.media.extractThumbnail(videoPath, thumbPath),
      ]);

      // 4. Transcribe audio
      const transcript = await this.whisper.transcribe(audioPath, language);

      // 5. Read thumbnail as base64
      const thumbnail = this.media.toBase64DataUri(thumbPath, 'image/jpeg');

      this.logger.log('Extraction complete');
      return { transcript, thumbnail };
    } finally {
      // Cleanup temp files
      this.media.cleanup(videoPath);
      this.media.cleanup(audioPath);
      this.media.cleanup(thumbPath);
    }
  }
}
