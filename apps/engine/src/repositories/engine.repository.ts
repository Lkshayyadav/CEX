import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { Order } from '@cex/types';
import { BookFill } from '../orderbook';

export const engineRepository = {
  /**
   * Loads all active markets.
   */
  async findActiveMarkets() {
    return prisma.market.findMany({
      where: { isActive: true },
      select: {
        id: true,
        symbol: true,
        baseAssetId: true,
        quoteAssetId: true,
        isActive: true,
      },
    });
  },

  /**
   * Loads all open orders to build the in-memory order books upon startup.
   */
  async findOpenOrders() {
    return prisma.order.findMany({
      where: {
        status: { in: ['OPEN', 'PARTIALLY_FILLED'] },
      },
      select: {
        id: true,
        userId: true,
        marketId: true,
        side: true,
        type: true,
        status: true,
        price: true,
        quantity: true,
        filledQuantity: true,
        remainingQuantity: true,
        averageFillPrice: true,
        createdAt: true,
        updatedAt: true,
        market: {
          select: {
            id: true,
            symbol: true,
            baseAssetId: true,
            quoteAssetId: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  },

  /**
   * Atomically executes settlements for fills, maker updates, and the taker order state inside a database transaction.
   */
  async settleTrades(
    marketId: string,
    baseAssetId: string,
    quoteAssetId: string,
    takerOrder: Order,
    fills: BookFill[],
    makerUpdates: Order[]
  ) {
    return prisma.$transaction(async (tx) => {
      // Find or create taker order
      let existingTakerOrder = await tx.order.findUnique({
        where: { id: takerOrder.id }
      });

      if (!existingTakerOrder) {
        // Taker order is not in DB, so we must lock funds and create it
        let assetIdToLock: string;
        let amountToLock: Prisma.Decimal;

        if (takerOrder.side === 'SELL') {
          assetIdToLock = baseAssetId;
          amountToLock = new Prisma.Decimal(takerOrder.quantity);
        } else {
          assetIdToLock = quoteAssetId;
          const priceStr = takerOrder.price;
          if (!priceStr || parseFloat(priceStr) <= 0) {
            throw new Error('A positive price is required to calculate required funds for BUY orders');
          }
          amountToLock = new Prisma.Decimal(priceStr).mul(new Prisma.Decimal(takerOrder.quantity));
        }

        let balance = await tx.balance.findUnique({
          where: { userId_assetId: { userId: takerOrder.userId, assetId: assetIdToLock } }
        });

        if (!balance) {
          balance = await tx.balance.create({
            data: {
              userId: takerOrder.userId,
              assetId: assetIdToLock,
              free: new Prisma.Decimal('0'),
              locked: new Prisma.Decimal('0'),
            }
          });
        }

        if (balance.free.lt(amountToLock)) {
          throw new Error('Insufficient free balance to place this order');
        }

        // Lock funds
        await tx.balance.update({
          where: { id: balance.id },
          data: {
            free: { decrement: amountToLock },
            locked: { increment: amountToLock },
          }
        });

        // Create the order with status OPEN
        existingTakerOrder = await tx.order.create({
          data: {
            id: takerOrder.id,
            userId: takerOrder.userId,
            marketId: marketId,
            side: takerOrder.side,
            type: takerOrder.type,
            price: takerOrder.price ? new Prisma.Decimal(takerOrder.price) : null,
            quantity: new Prisma.Decimal(takerOrder.quantity),
            filledQuantity: new Prisma.Decimal(0),
            remainingQuantity: new Prisma.Decimal(takerOrder.quantity),
            status: 'OPEN',
            createdAt: takerOrder.createdAt,
            updatedAt: takerOrder.updatedAt,
          }
        });
      }

      // If order is cancelled, unlock the remaining funds
      if (takerOrder.status === 'CANCELLED') {
        let assetIdToUnlock: string;
        let amountToUnlock: Prisma.Decimal;

        if (takerOrder.side === 'SELL') {
          assetIdToUnlock = baseAssetId;
          amountToUnlock = new Prisma.Decimal(takerOrder.remainingQuantity);
        } else {
          assetIdToUnlock = quoteAssetId;
          if (!takerOrder.price) {
            throw new Error('Cannot calculate unlock funds for BUY order without price');
          }
          amountToUnlock = new Prisma.Decimal(takerOrder.price).mul(new Prisma.Decimal(takerOrder.remainingQuantity));
        }

        await tx.balance.update({
          where: {
            userId_assetId: { userId: takerOrder.userId, assetId: assetIdToUnlock }
          },
          data: {
            locked: { decrement: amountToUnlock },
            free: { increment: amountToUnlock },
          }
        });
      }

      // 1. Record Fill details
      for (const fill of fills) {
        await tx.fill.create({
          data: {
            id: fill.tradeId,
            makerOrderId: fill.makerOrderId,
            takerOrderId: fill.takerOrderId,
            marketId: marketId,
            price: new Prisma.Decimal(fill.price),
            quantity: new Prisma.Decimal(fill.quantity),
            fee: new Prisma.Decimal('0'),
            feeAssetId: quoteAssetId, // quote asset as default fee asset
          },
        });

        const matchQty = new Prisma.Decimal(fill.quantity);
        const matchPrice = new Prisma.Decimal(fill.price);
        const matchValue = matchQty.mul(matchPrice);

        // 2. Adjust Maker balances
        if (takerOrder.side === 'BUY') {
          // Taker is BUY (so Maker is SELL BTC for USDT)
          // Maker sold base asset: lock base decreases, free quote increases
          await tx.balance.update({
            where: {
              userId_assetId: { userId: fill.makerUserId, assetId: baseAssetId },
            },
            data: {
              locked: { decrement: matchQty },
            },
          });

          await tx.balance.upsert({
            where: {
              userId_assetId: { userId: fill.makerUserId, assetId: quoteAssetId },
            },
            create: {
              userId: fill.makerUserId,
              assetId: quoteAssetId,
              free: matchValue,
              locked: new Prisma.Decimal('0'),
            },
            update: {
              free: { increment: matchValue },
            },
          });
        } else {
          // Taker is SELL (so Maker is BUY BTC with USDT)
          // Maker bought base asset: lock quote decreases, free base increases
          await tx.balance.update({
            where: {
              userId_assetId: { userId: fill.makerUserId, assetId: quoteAssetId },
            },
            data: {
              locked: { decrement: matchValue },
            },
          });

          await tx.balance.upsert({
            where: {
              userId_assetId: { userId: fill.makerUserId, assetId: baseAssetId },
            },
            create: {
              userId: fill.makerUserId,
              assetId: baseAssetId,
              free: matchQty,
              locked: new Prisma.Decimal('0'),
            },
            update: {
              free: { increment: matchQty },
            },
          });
        }

        // 3. Adjust Taker balances for this fill
        if (takerOrder.side === 'BUY') {
          // Taker bought base: lock quote decreases, free base increases
          const takerPrice = takerOrder.price ? new Prisma.Decimal(takerOrder.price) : null;
          if (takerPrice) {
            const lockedValueToDeduct = matchQty.mul(takerPrice);
            const excessRefund = lockedValueToDeduct.minus(matchValue);

            await tx.balance.update({
              where: {
                userId_assetId: { userId: takerOrder.userId, assetId: quoteAssetId },
              },
              data: {
                locked: { decrement: lockedValueToDeduct },
              },
            });

            if (excessRefund.gt(0)) {
              await tx.balance.upsert({
                where: {
                  userId_assetId: { userId: takerOrder.userId, assetId: quoteAssetId },
                },
                create: {
                  userId: takerOrder.userId,
                  assetId: quoteAssetId,
                  free: excessRefund,
                  locked: new Prisma.Decimal('0'),
                },
                update: {
                  free: { increment: excessRefund },
                },
              });
            }
          } else {
            // Market Buy order
            await tx.balance.update({
              where: {
                userId_assetId: { userId: takerOrder.userId, assetId: quoteAssetId },
              },
              data: {
                locked: { decrement: matchValue },
              },
            });
          }

          await tx.balance.upsert({
            where: {
              userId_assetId: { userId: takerOrder.userId, assetId: baseAssetId },
            },
            create: {
              userId: takerOrder.userId,
              assetId: baseAssetId,
              free: matchQty,
              locked: new Prisma.Decimal('0'),
            },
            update: {
              free: { increment: matchQty },
            },
          });
        } else {
          // Taker sold base: lock base decreases, free quote increases
          await tx.balance.update({
            where: {
              userId_assetId: { userId: takerOrder.userId, assetId: baseAssetId },
            },
            data: {
              locked: { decrement: matchQty },
            },
          });

          await tx.balance.upsert({
            where: {
              userId_assetId: { userId: takerOrder.userId, assetId: quoteAssetId },
            },
            create: {
              userId: takerOrder.userId,
              assetId: quoteAssetId,
              free: matchValue,
              locked: new Prisma.Decimal('0'),
            },
            update: {
              free: { increment: matchValue },
            },
          });
        }
      }

      // 4. Update all Maker orders
      for (const maker of makerUpdates) {
        await tx.order.update({
          where: { id: maker.id },
          data: {
            filledQuantity: new Prisma.Decimal(maker.filledQuantity),
            remainingQuantity: new Prisma.Decimal(maker.remainingQuantity),
            status: maker.status,
            averageFillPrice: maker.averageFillPrice ? new Prisma.Decimal(maker.averageFillPrice) : null,
          },
        });
      }

      // 5. Update Taker order status and remaining amounts
      await tx.order.update({
        where: { id: takerOrder.id },
        data: {
          filledQuantity: new Prisma.Decimal(takerOrder.filledQuantity),
          remainingQuantity: new Prisma.Decimal(takerOrder.remainingQuantity),
          status: takerOrder.status,
          averageFillPrice: takerOrder.averageFillPrice ? new Prisma.Decimal(takerOrder.averageFillPrice) : null,
        },
      });
    }, {
      timeout: 30000
    });
  },

  /**
   * Persists an order rejected due to insufficient funds.
   */
  async rejectOrder(marketId: string, order: Order) {
    return prisma.order.create({
      data: {
        id: order.id,
        userId: order.userId,
        marketId: marketId,
        side: order.side,
        type: order.type,
        price: order.price ? new Prisma.Decimal(order.price) : null,
        quantity: new Prisma.Decimal(order.quantity),
        filledQuantity: new Prisma.Decimal(0),
        remainingQuantity: new Prisma.Decimal(order.quantity),
        status: 'REJECTED',
        createdAt: order.createdAt,
        updatedAt: new Date(),
      }
    });
  },
};
