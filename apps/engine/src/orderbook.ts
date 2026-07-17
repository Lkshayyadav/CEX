import { Order, OrderSide, OrderType, OrderStatus } from '@cex/types';
import { Decimal } from 'decimal.js';
import * as crypto from 'crypto';

export interface BookFill {
  price: string;
  quantity: string;
  tradeId: string;
  makerOrderId: string;
  takerOrderId: string;
  makerUserId: string;
  takerUserId: string;
}

export interface MatchResult {
  order: Order;
  fills: BookFill[];
  makerUpdates: Order[];
}

function updateAveragePrice(
  oldFilledQtyStr: string,
  oldAvgPriceStr: string | null,
  matchQty: Decimal,
  matchPrice: Decimal
): string {
  const oldFilledQty = new Decimal(oldFilledQtyStr);
  const oldAvgPrice = oldAvgPriceStr ? new Decimal(oldAvgPriceStr) : new Decimal(0);
  const newFilledQty = oldFilledQty.plus(matchQty);

  if (newFilledQty.equals(0)) {
    return '0';
  }

  const totalCost = oldFilledQty.mul(oldAvgPrice).plus(matchQty.mul(matchPrice));
  const newAvgPrice = totalCost.div(newFilledQty);
  return newAvgPrice.toString();
}

export class OrderBook {
  private symbol: string;
  private bids: Order[] = []; // Buy orders, sorted descending by price, then FIFO
  private asks: Order[] = []; // Sell orders, sorted ascending by price, then FIFO

  constructor(symbol: string) {
    this.symbol = symbol;
  }

  /**
   * Load an existing open order into the book (used for initializing state).
   */
  public loadOrder(order: Order): void {
    if (order.status !== 'OPEN' && order.status !== 'PARTIALLY_FILLED') {
      return;
    }
    if (order.side === 'BUY') {
      this.bids.push(order);
      this.sortBids();
    } else {
      this.asks.push(order);
      this.sortAsks();
    }
  }

  /**
   * Add a new order to the book and perform matching.
   */
  public addOrder(order: Order): MatchResult {
    const remaining = new Decimal(order.remainingQuantity);

    if (remaining.lte(0)) {
      return { order, fills: [], makerUpdates: [] };
    }

    if (order.type === 'LIMIT') {
      return this.matchLimitOrder(order);
    } else {
      return this.matchMarketOrder(order);
    }
  }

  /**
   * Cancel an order in the book.
   */
  public cancelOrder(orderId: string): Order | null {
    const bidIndex = this.bids.findIndex((o) => o.id === orderId);
    if (bidIndex !== -1) {
      const [order] = this.bids.splice(bidIndex, 1);
      order.status = 'CANCELLED';
      order.updatedAt = new Date();
      return order;
    }

    const askIndex = this.asks.findIndex((o) => o.id === orderId);
    if (askIndex !== -1) {
      const [order] = this.asks.splice(askIndex, 1);
      order.status = 'CANCELLED';
      order.updatedAt = new Date();
      return order;
    }

    return null;
  }

  /**
   * Match a LIMIT order against the book.
   */
  private matchLimitOrder(order: Order): MatchResult {
    const fills: BookFill[] = [];
    const makerUpdates: Order[] = [];
    const isBuy = order.side === 'BUY';
    const limitPrice = new Decimal(order.price!);
    let remainingQty = new Decimal(order.remainingQuantity);
    let filledQty = new Decimal(order.filledQuantity);

    if (isBuy) {
      // Match against asks (sell orders)
      while (this.asks.length > 0 && remainingQty.gt(0)) {
        const bestAsk = this.asks[0];
        const askPrice = new Decimal(bestAsk.price!);

        // Buy price must be >= sell price to match
        if (limitPrice.lt(askPrice)) {
          break;
        }

        const askRemaining = new Decimal(bestAsk.remainingQuantity);
        const matchQty = Decimal.min(remainingQty, askRemaining);
        const tradeId = crypto.randomUUID();

        // Update average prices
        const makerOldFilled = bestAsk.filledQuantity;
        const makerOldAvg = bestAsk.averageFillPrice;
        bestAsk.averageFillPrice = updateAveragePrice(makerOldFilled, makerOldAvg, matchQty, askPrice);

        const takerOldFilled = filledQty.toString();
        const takerOldAvg = order.averageFillPrice;
        order.averageFillPrice = updateAveragePrice(takerOldFilled, takerOldAvg, matchQty, askPrice);

        // Record fill
        fills.push({
          price: askPrice.toString(),
          quantity: matchQty.toString(),
          tradeId,
          makerOrderId: bestAsk.id,
          takerOrderId: order.id,
          makerUserId: bestAsk.userId,
          takerUserId: order.userId,
        });

        // Update quantities
        remainingQty = remainingQty.minus(matchQty);
        filledQty = filledQty.plus(matchQty);

        bestAsk.remainingQuantity = askRemaining.minus(matchQty).toString();
        bestAsk.filledQuantity = new Decimal(bestAsk.filledQuantity).plus(matchQty).toString();
        bestAsk.status = new Decimal(bestAsk.remainingQuantity).equals(0) ? 'FILLED' : 'PARTIALLY_FILLED';
        bestAsk.updatedAt = new Date();

        makerUpdates.push({ ...bestAsk });

        if (bestAsk.status === 'FILLED') {
          this.asks.shift();
        }
      }
    } else {
      // Match against bids (buy orders)
      while (this.bids.length > 0 && remainingQty.gt(0)) {
        const bestBid = this.bids[0];
        const bidPrice = new Decimal(bestBid.price!);

        // Sell price must be <= buy price to match
        if (limitPrice.gt(bidPrice)) {
          break;
        }

        const bidRemaining = new Decimal(bestBid.remainingQuantity);
        const matchQty = Decimal.min(remainingQty, bidRemaining);
        const tradeId = crypto.randomUUID();

        // Update average prices
        const makerOldFilled = bestBid.filledQuantity;
        const makerOldAvg = bestBid.averageFillPrice;
        bestBid.averageFillPrice = updateAveragePrice(makerOldFilled, makerOldAvg, matchQty, bidPrice);

        const takerOldFilled = filledQty.toString();
        const takerOldAvg = order.averageFillPrice;
        order.averageFillPrice = updateAveragePrice(takerOldFilled, takerOldAvg, matchQty, bidPrice);

        // Record fill
        fills.push({
          price: bidPrice.toString(),
          quantity: matchQty.toString(),
          tradeId,
          makerOrderId: bestBid.id,
          takerOrderId: order.id,
          makerUserId: bestBid.userId,
          takerUserId: order.userId,
        });

        // Update quantities
        remainingQty = remainingQty.minus(matchQty);
        filledQty = filledQty.plus(matchQty);

        bestBid.remainingQuantity = bidRemaining.minus(matchQty).toString();
        bestBid.filledQuantity = new Decimal(bestBid.filledQuantity).plus(matchQty).toString();
        bestBid.status = new Decimal(bestBid.remainingQuantity).equals(0) ? 'FILLED' : 'PARTIALLY_FILLED';
        bestBid.updatedAt = new Date();

        makerUpdates.push({ ...bestBid });

        if (bestBid.status === 'FILLED') {
          this.bids.shift();
        }
      }
    }

    order.remainingQuantity = remainingQty.toString();
    order.filledQuantity = filledQty.toString();
    order.updatedAt = new Date();

    if (remainingQty.equals(0)) {
      order.status = 'FILLED';
    } else if (filledQty.gt(0)) {
      order.status = 'PARTIALLY_FILLED';
      // Put remaining into the book
      if (isBuy) {
        this.bids.push(order);
        this.sortBids();
      } else {
        this.asks.push(order);
        this.sortAsks();
      }
    } else {
      order.status = 'OPEN';
      // Put whole order into the book
      if (isBuy) {
        this.bids.push(order);
        this.sortBids();
      } else {
        this.asks.push(order);
        this.sortAsks();
      }
    }

    return { order, fills, makerUpdates };
  }

  /**
   * Match a MARKET order against the book.
   */
  private matchMarketOrder(order: Order): MatchResult {
    const fills: BookFill[] = [];
    const makerUpdates: Order[] = [];
    const isBuy = order.side === 'BUY';
    let remainingQty = new Decimal(order.remainingQuantity);
    let filledQty = new Decimal(order.filledQuantity);

    if (isBuy) {
      while (this.asks.length > 0 && remainingQty.gt(0)) {
        const bestAsk = this.asks[0];
        const askPrice = new Decimal(bestAsk.price!);
        const askRemaining = new Decimal(bestAsk.remainingQuantity);
        const matchQty = Decimal.min(remainingQty, askRemaining);
        const tradeId = crypto.randomUUID();

        // Update average prices
        const makerOldFilled = bestAsk.filledQuantity;
        const makerOldAvg = bestAsk.averageFillPrice;
        bestAsk.averageFillPrice = updateAveragePrice(makerOldFilled, makerOldAvg, matchQty, askPrice);

        const takerOldFilled = filledQty.toString();
        const takerOldAvg = order.averageFillPrice;
        order.averageFillPrice = updateAveragePrice(takerOldFilled, takerOldAvg, matchQty, askPrice);

        fills.push({
          price: askPrice.toString(),
          quantity: matchQty.toString(),
          tradeId,
          makerOrderId: bestAsk.id,
          takerOrderId: order.id,
          makerUserId: bestAsk.userId,
          takerUserId: order.userId,
        });

        remainingQty = remainingQty.minus(matchQty);
        filledQty = filledQty.plus(matchQty);

        bestAsk.remainingQuantity = askRemaining.minus(matchQty).toString();
        bestAsk.filledQuantity = new Decimal(bestAsk.filledQuantity).plus(matchQty).toString();
        bestAsk.status = new Decimal(bestAsk.remainingQuantity).equals(0) ? 'FILLED' : 'PARTIALLY_FILLED';
        bestAsk.updatedAt = new Date();

        makerUpdates.push({ ...bestAsk });

        if (bestAsk.status === 'FILLED') {
          this.asks.shift();
        }
      }
    } else {
      while (this.bids.length > 0 && remainingQty.gt(0)) {
        const bestBid = this.bids[0];
        const bidPrice = new Decimal(bestBid.price!);
        const bidRemaining = new Decimal(bestBid.remainingQuantity);
        const matchQty = Decimal.min(remainingQty, bidRemaining);
        const tradeId = crypto.randomUUID();

        // Update average prices
        const makerOldFilled = bestBid.filledQuantity;
        const makerOldAvg = bestBid.averageFillPrice;
        bestBid.averageFillPrice = updateAveragePrice(makerOldFilled, makerOldAvg, matchQty, bidPrice);

        const takerOldFilled = filledQty.toString();
        const takerOldAvg = order.averageFillPrice;
        order.averageFillPrice = updateAveragePrice(takerOldFilled, takerOldAvg, matchQty, bidPrice);

        fills.push({
          price: bidPrice.toString(),
          quantity: matchQty.toString(),
          tradeId,
          makerOrderId: bestBid.id,
          takerOrderId: order.id,
          makerUserId: bestBid.userId,
          takerUserId: order.userId,
        });

        remainingQty = remainingQty.minus(matchQty);
        filledQty = filledQty.plus(matchQty);

        bestBid.remainingQuantity = bidRemaining.minus(matchQty).toString();
        bestBid.filledQuantity = new Decimal(bestBid.filledQuantity).plus(matchQty).toString();
        bestBid.status = new Decimal(bestBid.remainingQuantity).equals(0) ? 'FILLED' : 'PARTIALLY_FILLED';
        bestBid.updatedAt = new Date();

        makerUpdates.push({ ...bestBid });

        if (bestBid.status === 'FILLED') {
          this.bids.shift();
        }
      }
    }

    order.remainingQuantity = remainingQty.toString();
    order.filledQuantity = filledQty.toString();
    order.updatedAt = new Date();

    if (remainingQty.equals(0)) {
      order.status = 'FILLED';
    } else {
      order.status = filledQty.gt(0) ? 'PARTIALLY_FILLED' : 'REJECTED';
    }

    return { order, fills, makerUpdates };
  }

  /**
   * Sort bids descending by price, then ascending by time (price-time priority).
   */
  private sortBids(): void {
    this.bids.sort((a, b) => {
      const priceA = new Decimal(a.price!);
      const priceB = new Decimal(b.price!);
      if (!priceA.equals(priceB)) {
        return priceB.comparedTo(priceA); // Highest price first
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); // Oldest first
    });
  }

  /**
   * Sort asks ascending by price, then ascending by time (price-time priority).
   */
  private sortAsks(): void {
    this.asks.sort((a, b) => {
      const priceA = new Decimal(a.price!);
      const priceB = new Decimal(b.price!);
      if (!priceA.equals(priceB)) {
        return priceA.comparedTo(priceB); // Lowest price first
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); // Oldest first
    });
  }

  // Getters for debug and testing
  public getBids(): Order[] {
    return [...this.bids];
  }

  public getAsks(): Order[] {
    return [...this.asks];
  }
}
