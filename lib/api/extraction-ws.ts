import { ExtractionResponse } from './extraction-server';

const WS_URL = 'ws://127.0.0.1:3000';

/**
 * Extracts a recipe via WebSocket, receiving real-time stage updates.
 *
 * @param url - Instagram reel/post URL
 * @param onStage - Called with (stage, progress) as the server advances through pipeline steps
 * @param language - Whisper language code (defaults to 'fr' on server)
 */
export function extractViaWebSocket(
  url: string,
  onStage: (stage: string, progress: number) => void,
  language?: string,
): Promise<ExtractionResponse> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);

    const cleanup = () => {
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
    };

    ws.onopen = () => {
      ws.send(JSON.stringify({ event: 'extract', data: { url, language } }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(typeof event.data === 'string' ? event.data : '');

        switch (msg.event) {
          case 'stage':
            onStage(msg.data.stage, msg.data.progress);
            break;
          case 'complete':
            cleanup();
            ws.close();
            resolve(msg.data);
            break;
          case 'error':
            cleanup();
            ws.close();
            reject(new Error(msg.data.message));
            break;
        }
      } catch {
        // Ignore unparseable messages
      }
    };

    ws.onerror = () => {
      cleanup();
      reject(new Error('WebSocket connection failed'));
    };

    ws.onclose = (event) => {
      if (!event.wasClean) {
        cleanup();
        reject(new Error('WebSocket closed unexpectedly'));
      }
    };
  });
}
