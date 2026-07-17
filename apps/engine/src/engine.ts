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

    // Process matching in-memory
    const matchResult = book.addOrder(order);

    const channelSymbol = market.symbol.replace('/', '_');

    // If matches occurred, persist fills and settle balances
    if (matchResult.fills.length > 0) {
      logger.info(`Match found! Generating ${matchResult.fills.length} fill(s)`);
      await engineRepository.settleTrades(
        market.id,
        market.baseAssetId,
        market.quoteAssetId,
        matchResult.order,
        matchResult.fills,
        matchResult.makerUpdates
      );

      // Publish trade fills to Redis Pub/Sub
      const tradesPayload = {
        symbol: market.symbol,
        trades: matchResult.fills.map((f) => ({
          price: f.price,
          quantity: f.quantity,
          tradeId: f.tradeId,
          makerOrderId: f.makerOrderId,
          takerOrderId: f.takerOrderId,
          timestamp: new Date().getTime(),
        })),
      };
      await redis.publish(`market:${channelSymbol}:trades`, JSON.stringify(tradesPayload));
    }

    // Publish depth update to Redis Pub/Sub after any order processing
    const depthPayload = {
      symbol: market.symbol,
      bids: book.getDepth(20).bids,
      asks: book.getDepth(20).asks,
      timestamp: new Date().getTime(),
    };
    await redis.publish(`market:${channelSymbol}:depth`, JSON.stringify(depthPayload));

    return matchResult;
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

    // Cancel order in memory
    const cancelledOrder = book.cancelOrder(orderId);
    if (!cancelledOrder) {
      return null;
    }

    // Determine lock asset and amount to refund
    const market = Array.from(this.markets.values()).find((m) => m.symbol === marketSymbol);
    if (!market) {
      throw new Error(`Market for symbol '${marketSymbol}' not found`);
    }

    logger.info(`Order ${orderId} cancelled in-memory. Persisting cancellation and releasing funds...`);

    // Settle database balance release and order status update
    await engineRepository.settleTrades(
      market.id,
      market.baseAssetId,
      market.quoteAssetId,
      cancelledOrder,
      [], // no fills
      []  // no maker updates
    );

    // Publish depth update to Redis Pub/Sub after cancellation
    const channelSymbol = marketSymbol.replace('/', '_');
    const depthPayload = {
      symbol: marketSymbol,
      bids: book.getDepth(20).bids,
      asks: book.getDepth(20).asks,
      timestamp: new Date().getTime(),
    };
    await redis.publish(`market:${channelSymbol}:depth`, JSON.stringify(depthPayload));

    return cancelledOrder;
  }

  // Debug methods
  public getOrderBook(symbol: string): OrderBook | undefined {
    return this.orderBooks.get(symbol);
  }
}

export const matchingEngine = new MatchingEngine();
