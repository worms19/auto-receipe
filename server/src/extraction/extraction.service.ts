import { Injectable, Logger } from '@nestjs/common';
import { CobaltService } from './cobalt.service';
import { MediaService } from './media.service';
import { WhisperService } from './whisper.service';
import { ClaudeService } from './claude.service';
import { ExtractResponseDto } from './dto/extract-response.dto';

@Injectable()
export class ExtractionService {
  private readonly logger = new Logger(ExtractionService.name);

  constructor(
    private readonly cobalt: CobaltService,
    private readonly media: MediaService,
    private readonly whisper: WhisperService,
    private readonly claude: ClaudeService,
  ) {}

  async extract(
    url: string,
    language?: string,
    onProgress?: (stage: string, progress: number) => void,
  ): Promise<ExtractResponseDto> {
    this.logger.log(`Starting extraction for: ${url}`);

    // 1. Resolve Instagram URL to direct video URL via Cobalt
    onProgress?.('downloading', 0.1);
    const videoUrl = await this.cobalt.getVideoUrl(url);

    // Temp file paths
    const videoPath = this.media.tempPath('mp4');
    const audioPath = this.media.tempPath('m4a');
    const thumbPath = this.media.tempPath('jpg');

    try {
      // 2. Download the video
      onProgress?.('downloading', 0.2);
      await this.media.download(videoUrl, videoPath);

      // 3. Extract audio and thumbnail in parallel
      onProgress?.('extracting', 0.4);
      await Promise.all([
        this.media.extractAudio(videoPath, audioPath),
        this.media.extractThumbnail(videoPath, thumbPath),
      ]);

      // 4. Transcribe audio
      onProgress?.('transcribing', 0.6);
      const transcript = await this.whisper.transcribe(audioPath, language ?? 'fr');

      // 5. Structure recipe with Claude
      onProgress?.('structuring', 0.8);
      const recipe = await this.claude.structureRecipe(transcript);

      // 6. Read thumbnail as base64
      const thumbnail = this.media.toBase64DataUri(thumbPath, 'image/jpeg');

      this.logger.log('Extraction complete');
      return { ...recipe, thumbnail };
    } finally {
      // Cleanup temp files
      this.media.cleanup(videoPath);
      this.media.cleanup(audioPath);
      this.media.cleanup(thumbPath);
    }
  }
}
