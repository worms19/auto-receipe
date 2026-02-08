import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import FormData = require('form-data');
import * as fs from 'fs';

const WHISPER_URL = 'http://127.0.0.1:8080/v1/audio/transcriptions';

@Injectable()
export class WhisperService {
  private readonly logger = new Logger(WhisperService.name);

  constructor(private readonly http: HttpService) {}

  async transcribe(audioPath: string, language?: string): Promise<string> {
    this.logger.log('Transcribing audio with whisper...');

    const form = new FormData();
    form.append('file', fs.createReadStream(audioPath));
    form.append('model', 'whisper-1');
    if (language) {
      form.append('language', language);
    }

    const { data } = await firstValueFrom(
      this.http.post<{ text: string }>(WHISPER_URL, form, {
        headers: form.getHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }),
    );

    this.logger.log(`Transcription complete (${data.text.length} chars)`);
    return data.text;
  }
}
