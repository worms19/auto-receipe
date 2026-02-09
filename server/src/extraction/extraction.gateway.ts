import { Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { WebSocket } from 'ws';
import { ExtractionService } from './extraction.service';

@WebSocketGateway()
export class ExtractionGateway {
  private readonly logger = new Logger(ExtractionGateway.name);

  constructor(private readonly extraction: ExtractionService) {}

  @SubscribeMessage('extract')
  async handleExtract(
    @MessageBody() data: { url: string; language?: string },
    @ConnectedSocket() client: WebSocket,
  ): Promise<void> {
    this.logger.log(`WS extract request: ${data.url}`);

    const send = (event: string, payload: unknown) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ event, data: payload }));
      }
    };

    try {
      const result = await this.extraction.extract(
        data.url,
        data.language,
        (stage, progress) => send('stage', { stage, progress }),
      );
      send('complete', result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Extraction failed';
      this.logger.error(`WS extract error: ${message}`);
      send('error', { message });
    }
  }
}
