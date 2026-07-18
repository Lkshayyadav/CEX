import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.order.findMany({
    take: 20,
    orderBy: { createdAt: 'desc' },
    include: { market: true }
  });

  console.log('--- LATEST 20 ORDERS ---');
  for (const o of orders) {
    console.log(`ID: ${o.id}`);
    console.log(`  Market: ${o.market.symbol} | Side: ${o.side} | Type: ${o.type}`);
    console.log(`  Price: ${o.price} | Qty: ${o.quantity} | Filled: ${o.filledQuantity} | Remaining: ${o.remainingQuantity}`);
    console.log(`  Status: ${o.status} | CreatedAt: ${o.createdAt.toISOString()}`);
  }

  const fills = await prisma.fill.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
  });
  console.log('\n--- LATEST 10 FILLS ---');
  for (const f of fills) {
    console.log(`ID: ${f.id} | MarketId: ${f.marketId} | Price: ${f.price} | Qty: ${f.quantity} | Maker: ${f.makerOrderId} | Taker: ${f.takerOrderId}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
