import { prisma } from '../lib';

const assetsToSeed = [
  { symbol: 'BTC', name: 'Bitcoin', decimals: 8 },
  { symbol: 'ETH', name: 'Ethereum', decimals: 8 },
  { symbol: 'SOL', name: 'Solana', decimals: 8 },
  { symbol: 'USDT', name: 'Tether', decimals: 6 },
  { symbol: 'INR', name: 'Indian Rupee', decimals: 2 },
];

const marketsToSeed = [
  { symbol: 'BTC/USDT', base: 'BTC', quote: 'USDT', minOrderSize: '0.0001', maxOrderSize: '1000', tickSize: '0.01', stepSize: '0.00001' },
  { symbol: 'ETH/USDT', base: 'ETH', quote: 'USDT', minOrderSize: '0.001', maxOrderSize: '10000', tickSize: '0.01', stepSize: '0.0001' },
  { symbol: 'SOL/USDT', base: 'SOL', quote: 'USDT', minOrderSize: '0.1', maxOrderSize: '100000', tickSize: '0.001', stepSize: '0.01' },
  { symbol: 'BTC/INR', base: 'BTC', quote: 'INR', minOrderSize: '0.0001', maxOrderSize: '1000', tickSize: '1.0', stepSize: '0.00001' },
];

async function main() {
  console.log('Seeding assets...');
  const assetMap: Record<string, string> = {};

  for (const asset of assetsToSeed) {
    const created = await prisma.asset.upsert({
      where: { symbol: asset.symbol },
      update: { name: asset.name, decimals: asset.decimals },
      create: { symbol: asset.symbol, name: asset.name, decimals: asset.decimals },
    });
    assetMap[asset.symbol] = created.id;
    console.log(`Asset ${asset.symbol} seeded: ${created.id}`);
  }

  console.log('Seeding markets...');
  for (const market of marketsToSeed) {
    const baseAssetId = assetMap[market.base];
    const quoteAssetId = assetMap[market.quote];

    if (!baseAssetId || !quoteAssetId) {
      throw new Error(`Could not find base (${market.base}) or quote (${market.quote}) for market ${market.symbol}`);
    }

    const created = await prisma.market.upsert({
      where: { symbol: market.symbol },
      update: {
        baseAssetId,
        quoteAssetId,
        minOrderSize: market.minOrderSize,
        maxOrderSize: market.maxOrderSize,
        tickSize: market.tickSize,
        stepSize: market.stepSize,
      },
      create: {
        symbol: market.symbol,
        baseAssetId,
        quoteAssetId,
        minOrderSize: market.minOrderSize,
        maxOrderSize: market.maxOrderSize,
        tickSize: market.tickSize,
        stepSize: market.stepSize,
      },
    });
    console.log(`Market ${market.symbol} seeded: ${created.id}`);
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
