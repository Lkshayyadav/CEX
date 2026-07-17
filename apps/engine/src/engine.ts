import { Order, Market } from '@cex/types';
import { OrderBook, MatchResult } from './orderbook';
import { engineRepository } from './repositories/engine.repository';
import { redis } from '@cex/common';
import pino from 'pino';

const logger = pino({ name: 'matching-engine' });

export class MatchingEngine {
  private orderBooks: Map<string, OrderBook> = new Map();
  private markets: Map<string, Market> = new Map(); // marketId -> Market config
  private initialized = false;

  /**
   * Initializes the matching engine by loading active markets and outstanding open orders.
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    logger.info('Initializing matching engine...');

    // 1. Load active markets
    const dbMarkets = await engineRepository.findActiveMarkets();
    for (const m of dbMarkets) {
      const market: Market = {
        id: m.id,
        symbol: m.symbol,
        baseAssetId: m.baseAssetId,
        quoteAssetId: m.quoteAssetId,
        isActive: m.isActive,
      };
      this.markets.set(m.id, market);
      this.orderBooks.set(m.symbol, new OrderBook(m.symbol));
      logger.info(`Loaded market: ${m.symbol}`);
    }

    // 2. Load open orders to build the in-memory order books
    const openOrders = await engineRepository.findOpenOrders();
    for (const o of openOrders) {
      const symbol = o.market.symbol;
      const book = this.orderBooks.get(symbol);
      if (book) {
        const order: Order = {
          id: o.id,
          userId: o.userId,
          marketId: o.marketId,
          side: o.side as any,
          type: o.type as any,
          status: o.status as any,
          price: o.price ? o.price.toString() : null,
          quantity: o.quantity.toString(),
          filledQuantity: o.filledQuantity.toString(),
          remainingQuantity: o.remainingQuantity.toString(),
          averageFillPrice: o.averageFillPrice ? o.averageFillPrice.toString() : null,
          createdAt: o.createdAt,
          updatedAt: o.updatedAt,
        };
        book.loadOrder(order);
      }
    }

    this.initialized = true;
    logger.info(`Matching engine initialized. Loaded ${openOrders.length} open orders.`);

    // Write initial depth snapshots to Redis
    for (const [symbol, book] of this.orderBooks.entries()) {
      const channelSymbol = symbol.replace('/', '_');
      const depthPayload = {
        symbol: symbol,
        bids: book.getDepth(20).bids,
        asks: book.getDepth(20).asks,
        timestamp: new Date().getTime(),
      };
      await redis.set(`market:${channelSymbol}:depth:snapshot`, JSON.stringify(depthPayload));
    }
  }

  /**
   * Routes and processes an incoming order against the appropriate order book.
   */
  public async processOrder(order: Order): Promise<MatchResult> {
    if (!this.initialized) {
      throw new Error('Matching engine is not initialized');
    }

    const market = this.markets.get(order.marketId);
    if (!market) {
      throw new Error(`Market ID '${order.marketId}' not found in engine configuration`);
    }

    const book = this.orderBooks.get(market.symbol);
    if (!book) {
      throw new Error(`OrderBook for symbol '${market.symbol}' not found`);
    }

    logger.info(`Processing ${order.side} ${order.type} order for ${market.symbol} (Qty: ${order.quantity})`);

    // Snapshot orderbook state for transactional integrity
    const bidsSnapshot = book.getBids().map((o) => ({ ...o }));
    const asksSnapshot = book.getAsks().map((o) => ({ ...o }));

    const channelSymbol = market.symbol.replace('/', '_');

    try {
      // Process matching in-memory
      const matchResult = book.addOrder(order);

      // Always settle and persist order state to database
      await engineRepository.settleTrades(
        market.id,
        market.baseAssetId,
        market.quoteAssetId,
        matchResult.order,
        matchResult.fills,
        matchResult.makerUpdates
      );

      // If matches occurred, publish trade fills to Redis Pub/Sub
      if (matchResult.fills.length > 0) {
        logger.info(`Match found! Generating ${matchResult.fills.length} fill(s)`);
        const tradesPayload = {
          symbol: market.symbol,
          trades: matchResult.fills.map((f) => ({
            price: f.price,
            quantity: f.quantity,
            tradeId: f.tradeId,
            makerOrderId: f.makerOrderId,
            takerOrderId: f.takerOrderId,
            side: matchResult.order.side,
            timestamp: new Date().getTime(),
          })),
        };
        await redis.publish(`market:${channelSymbol}:trades`, JSON.stringify(tradesPayload));
      }

      // Publish standard engine events to Redis Pub/Sub channel
      const eventType = matchResult.fills.length > 0 ? 'ORDER_MATCHED' : 'ORDER_PLACED';
      const orderEventPayload = {
        type: eventType,
        data: {
          order: matchResult.order,
          fills: matchResult.fills,
          makerUpdates: matchResult.makerUpdates,
        },
      };
      await redis.publish(`market:${channelSymbol}:orders`, JSON.stringify(orderEventPayload));

      // Publish depth update to Redis Pub/Sub after any order processing and save snapshot
      const depthPayload = {
        symbol: market.symbol,
        bids: book.getDepth(20).bids,
        asks: book.getDepth(20).asks,
        timestamp: new Date().getTime(),
      };
      await redis.set(`market:${channelSymbol}:depth:snapshot`, JSON.stringify(depthPayload));
      await redis.publish(`market:${channelSymbol}:depth`, JSON.stringify(depthPayload));

      return matchResult;
    } catch (err) {
      // Rollback memory state
      book.restoreState(bidsSnapshot, asksSnapshot);

      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes('Insufficient free balance')) {
        logger.warn(`Order ${order.id} rejected: Insufficient free balance.`);

        // Persist order as REJECTED in database
        try {
          await engineRepository.rejectOrder(market.id, order);
        } catch (dbErr) {
          logger.error(dbErr, `Failed to persist order rejection for ${order.id}`);
        }

        // Publish rejection event to Redis Pub/Sub
        const orderEventPayload = {
          type: 'ORDER_REJECTED',
          data: {
            order: {
              ...order,
              status: 'REJECTED' as const,
              filledQuantity: '0',
              remainingQuantity: order.quantity,
              updatedAt: new Date(),
            },
            fills: [],
            makerUpdates: [],
          },
        };
        await redis.publish(`market:${channelSymbol}:orders`, JSON.stringify(orderEventPayload));

        return {
          order: {
            ...order,
            status: 'REJECTED',
            filledQuantity: '0',
            remainingQuantity: order.quantity,
            updatedAt: new Date(),
          },
          fills: [],
          makerUpdates: [],
        };
      }

      // Rethrow other errors
      throw err;
    }
  }

  /**
   * Cancels an open order in-memory and releases the locked database balances.
   */
  public async cancelOrder(
    orderId: string,
    userId: string,
    marketSymbol: string
  ): Promise<Order | null> {
    if (!this.initialized) {
      throw new Error('Matching engine is not initialized');
    }

    const book = this.orderBooks.get(marketSymbol);
    if (!book) {
      throw new Error(`OrderBook for symbol '${marketSymbol}' not found`);
    }

    const bidsSnapshot = book.getBids().map((o) => ({ ...o }));
    const asksSnapshot = book.getAsks().map((o) => ({ ...o }));

    // Cancel order in memory
    const cancelledOrder = book.cancelOrder(orderId);
    if (!cancelledOrder) {
      return null;
    }

    // Determine lock asset and amount to refund
    const market = Array.from(this.markets.values()).find((m) => m.symbol === marketSymbol);
    if (!market) {
      book.restoreState(bidsSnapshot, asksSnapshot);
      throw new Error(`Market for symbol '${marketSymbol}' not found`);
    }

    logger.info(`Order ${orderId} cancelled in-memory. Persisting cancellation and releasing funds...`);

    try {
      // Settle database balance release and order status update
      await engineRepository.settleTrades(
        market.id,
        market.baseAssetId,
        market.quoteAssetId,
        cancelledOrder,
        [], // no fills
        []  // no maker updates
      );

      const channelSymbol = marketSymbol.replace('/', '_');

      // Publish standard cancel event to Redis Pub/Sub channel
      const cancelEventPayload = {
        type: 'ORDER_CANCELLED',
        data: {
          order: cancelledOrder,
        },
      };
      await redis.publish(`market:${channelSymbol}:orders`, JSON.stringify(cancelEventPayload));

      // Publish depth update to Redis Pub/Sub after cancellation and save snapshot
      const depthPayload = {
        symbol: marketSymbol,
        bids: book.getDepth(20).bids,
        asks: book.getDepth(20).asks,
        timestamp: new Date().getTime(),
      };
      await redis.set(`market:${channelSymbol}:depth:snapshot`, JSON.stringify(depthPayload));
      await redis.publish(`market:${channelSymbol}:depth`, JSON.stringify(depthPayload));

      return cancelledOrder;
    } catch (err) {
      // Rollback memory state
      book.restoreState(bidsSnapshot, asksSnapshot);
      throw err;
    }
  }

  // Debug methods
  public getOrderBook(symbol: string): OrderBook | undefined {
    return this.orderBooks.get(symbol);
  }
}

export const matchingEngine = new MatchingEngine();
