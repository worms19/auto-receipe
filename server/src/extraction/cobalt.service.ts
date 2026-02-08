import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

const COBALT_URL = process.env.COBALT_URL || 'http://127.0.0.1:9000/';

interface CobaltResponse {
  status: 'tunnel' | 'redirect' | 'picker' | 'error';
  url?: string;
  picker?: Array<{ url: string; type: string }>;
  error?: { code: string };
}

@Injectable()
export class CobaltService {
  private readonly logger = new Logger(CobaltService.name);

  constructor(private readonly http: HttpService) {}

  async getVideoUrl(instagramUrl: string): Promise<string> {
    this.logger.log(`Resolving video URL for: ${instagramUrl}`);

    const { data } = await firstValueFrom(
      this.http.post<CobaltResponse>(COBALT_URL, {
        url: instagramUrl,
        videoQuality: '720',
      }, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      }),
    );

    switch (data.status) {
      case 'tunnel':
      case 'redirect':
        if (!data.url) {
          throw new Error('Cobalt returned no URL');
        }
        this.logger.log(`Resolved via ${data.status}`);
        return data.url;

      case 'picker':
        if (!data.picker?.length) {
          throw new Error('Cobalt picker returned no items');
        }
        const videoItem = data.picker.find((p) => p.type === 'video') ?? data.picker[0];
        this.logger.log('Resolved via picker');
        return videoItem.url;

      case 'error':
        throw new Error(`Cobalt error: ${data.error?.code ?? 'unknown'}`);

      default:
        throw new Error(`Unexpected Cobalt status: ${data.status}`);
    }
  }
}
