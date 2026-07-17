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
    });
  },
};
