import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { redisSub } from '@cex/common';
import pino from 'pino';

const logger = pino({ name: 'websocket-service' });

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clientSubscriptions: Map<WebSocket, Set<string>> = new Map();

  /**
   * Initializes the WebSocket server and binds it to the HTTP server.
   */
  public init(server: Server): void {
    this.wss = new WebSocketServer({ server });
    logger.info('WebSocket server attached to HTTP server');

    this.wss.on('connection', (ws: WebSocket) => {
      logger.info('New WebSocket connection established');
      this.clientSubscriptions.set(ws, new Set());

      ws.on('message', (message: string) => {
        try {
          const parsed = JSON.parse(message);
          const { method, params } = parsed;

          if (method === 'SUBSCRIBE' && Array.isArray(params)) {
            const subs = this.clientSubscriptions.get(ws);
            if (subs) {
              for (const param of params) {
                subs.add(param);
                logger.info(`Client subscribed to channel: ${param}`);
              }
              ws.send(
                JSON.stringify({
                  event: 'subscriptionStatus',
                  status: 'subscribed',
                  channels: params,
                })
              );
            }
          } else if (method === 'UNSUBSCRIBE' && Array.isArray(params)) {
            const subs = this.clientSubscriptions.get(ws);
            if (subs) {
              for (const param of params) {
                subs.delete(param);
                logger.info(`Client unsubscribed from channel: ${param}`);
              }
              ws.send(
                JSON.stringify({
                  event: 'subscriptionStatus',
                  status: 'unsubscribed',
                  channels: params,
                })
              );
            }
          } else {
            ws.send(
              JSON.stringify({
                event: 'error',
                message: 'Invalid method or parameter format',
              })
            );
          }
        } catch (err) {
          logger.error(err, 'Failed to process incoming WebSocket message');
          ws.send(
            JSON.stringify({
              event: 'error',
              message: 'Invalid JSON format',
            })
          );
        }
      });

      ws.on('close', () => {
        logger.info('WebSocket client disconnected');
        this.clientSubscriptions.delete(ws);
      });

      ws.on('error', (err) => {
        logger.error(err, 'WebSocket error occurred');
        this.clientSubscriptions.delete(ws);
      });
    });

    // Subscribe to Redis Pub/Sub pattern for all market channels
    redisSub
      .psubscribe('market:*:*')
      .then(() => {
        logger.info('Successfully subscribed to Redis pattern market:*:*');
      })
      .catch((err) => {
        logger.error(err, 'Failed to subscribe to Redis pattern market:*:*');
      });

    // Handle incoming pattern messages from Redis
    redisSub.on('pmessage', (_pattern, channel, message) => {
      const parts = channel.split(':');
      if (parts.length === 3) {
        const symbol = parts[1]; // e.g. BTC_USDT
        const type = parts[2];   // e.g. trades or depth

        // Standardize channel param names: trade:BTC_USDT or depth:BTC_USDT
        const streamParam = type === 'trades' ? `trade:${symbol}` : `depth:${symbol}`;

        const payload = JSON.parse(message);

        // Broadcast to all active clients subscribed to the specific stream
        for (const [ws, subs] of this.clientSubscriptions.entries()) {
          if (subs.has(streamParam) && ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                stream: streamParam,
                data: payload,
              })
            );
          }
        }
      }
    });
  }

  /**
   * Gracefully shuts down the WebSocket server.
   */
  public close(): void {
    if (this.wss) {
      this.wss.close(() => {
        logger.info('WebSocket server closed');
      });
      this.wss = null;
    }
  }
}

export const webSocketManager = new WebSocketManager();
export const webSocketService = webSocketManager;
