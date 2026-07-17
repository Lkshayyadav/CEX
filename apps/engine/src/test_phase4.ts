import WebSocket from 'ws';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { prisma } from './lib/prisma';

// Load environment
dotenv.config({ path: path.join(__dirname, '../../backend/.env') });

const API_URL = 'http://localhost:3000/api/v1';
const WS_URL = 'ws://localhost:3000';

async function registerAndLogin(username: string, email: string) {
  const password = 'Password123';
  const registerRes = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, username, password }),
  });
  const registerData = (await registerRes.json()) as any;
  if (!registerData.success) {
    throw new Error('Registration failed: ' + JSON.stringify(registerData));
  }

  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: email, password }),
  });
  const loginData = (await loginRes.json()) as any;
  if (!loginData.success) {
    throw new Error('Login failed: ' + JSON.stringify(loginData));
  }
  return {
    token: loginData.data.accessToken,
    userId: loginData.data.user.id,
  };
}

async function run() {
  console.log('--- Phase 4 E2E Chart Verification Script ---');

  // 1. Clean up Database (Orders, Fills) and Restart Matching Engine to get a clean in-memory state
  console.log('Cleaning up database (orders, fills)...');
  await prisma.fill.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.balance.deleteMany({});

  console.log('Touching engine.ts to trigger tsx watch reload...');
  const enginePath = path.join(__dirname, 'engine.ts');
  fs.utimesSync(enginePath, new Date(), new Date());

  console.log('Waiting 5 seconds for engine to reload and initialize with empty state...');
  await new Promise((r) => setTimeout(r, 5000));

  const time = Date.now();
  const buyerUser = await registerAndLogin(`buyer_${time}`, `buyer_${time}@cex.io`);
  const sellerUser = await registerAndLogin(`seller_${time}`, `seller_${time}@cex.io`);

  const buyerHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${buyerUser.token}`,
  };

  const sellerHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${sellerUser.token}`,
  };

  // Deposit funds
  console.log('Depositing 10,000 USDT to buyer...');
  await fetch(`${API_URL}/balances/deposit`, {
    method: 'POST',
    headers: buyerHeaders,
    body: JSON.stringify({ assetSymbol: 'USDT', amount: '10000.00' }),
  });

  console.log('Depositing 2.0 BTC to seller...');
  await fetch(`${API_URL}/balances/deposit`, {
    method: 'POST',
    headers: sellerHeaders,
    body: JSON.stringify({ assetSymbol: 'BTC', amount: '2.000000' }),
  });

  // Connect WebSocket simulating frontend client
  console.log(`Connecting to WebSocket server at ${WS_URL}...`);
  const ws = new WebSocket(WS_URL);

  await new Promise<void>((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
  });
  console.log('WebSocket client connected.');

  // Subscribe to order:BTC_USDT (exactly like CandlestickChart component)
  ws.send(JSON.stringify({ method: 'SUBSCRIBE', params: ['order:BTC_USDT'] }));
  console.log('Subscribed to order:BTC_USDT channel.');

  // Initialize a mock client-side candlestick data structure
  // representing the initial klines before the match occurs.
  const startBucketSec = Math.floor(Date.now() / 60000) * 60;
  let clientCandlestick = {
    time: startBucketSec,
    open: 5000.00,
    high: 5000.00,
    low: 5000.00,
    close: 5000.00,
  };

  console.log('\n[Client Initial Candlestick State]:');
  console.log(JSON.stringify(clientCandlestick, null, 2));

  // Set up WebSocket listener to catch ORDER_MATCHED and perform tick update
  let matchedEventReceived = false;
  ws.on('message', (data) => {
    try {
      const parsed = JSON.parse(data.toString());
      if (parsed.stream === 'order:BTC_USDT' && parsed.data.type === 'ORDER_MATCHED') {
        const event = parsed.data;
        const fills = event.data.fills;
        if (Array.isArray(fills) && fills.length > 0) {
          console.log('\n--- WS MATCHED EVENT RECEIVED ---');
          console.log(`Match Count: ${fills.length}`);
          
          fills.forEach((fill: any, index: number) => {
            const tradePrice = parseFloat(fill.price);
            const tradeQuantity = parseFloat(fill.quantity);
            console.log(`Fill #${index + 1}: ${tradeQuantity} BTC @ ${tradePrice} USDT`);

            // Apply CandlestickChart.tsx's tick-feeding logic
            const tradeTimeSec = Math.floor(Date.now() / 1000);
            const candleTime = Math.floor(tradeTimeSec / 60) * 60;

            if (clientCandlestick.time === candleTime) {
              // Update current candlestick
              clientCandlestick = {
                time: candleTime,
                open: clientCandlestick.open,
                high: Math.max(clientCandlestick.high, tradePrice),
                low: Math.min(clientCandlestick.low, tradePrice),
                close: tradePrice,
              };
            } else {
              // Roll over bucket
              clientCandlestick = {
                time: candleTime,
                open: clientCandlestick.close,
                high: Math.max(clientCandlestick.close, tradePrice),
                low: Math.min(clientCandlestick.close, tradePrice),
                close: tradePrice,
              };
            }
          });

          console.log('\n[Client Updated Candlestick State (Visual Tick Change!)]');
          console.log(JSON.stringify(clientCandlestick, null, 2));
          matchedEventReceived = true;
        }
      }
    } catch (e) {
      console.error('Failed to parse WebSocket message:', e);
    }
  });

  // Wait a small bit for subscription confirmation
  await new Promise((r) => setTimeout(r, 500));

  // 1. Place Seller order (SELL 1.0 BTC @ 5050.00 USDT)
  console.log('\nPlacing Sell Order: SELL 1.0 BTC @ 5050.00 USDT...');
  await fetch(`${API_URL}/orders`, {
    method: 'POST',
    headers: sellerHeaders,
    body: JSON.stringify({
      marketSymbol: 'BTC/USDT',
      side: 'SELL',
      type: 'LIMIT',
      quantity: '1.000000',
      price: '5050.00',
    }),
  });

  // 2. Place Buyer order (BUY 0.5 BTC @ 5050.00 USDT) -> Generates MATCH at 5050.00
  console.log('Placing matching Buy Order: BUY 0.5 BTC @ 5050.00 USDT...');
  await fetch(`${API_URL}/orders`, {
    method: 'POST',
    headers: buyerHeaders,
    body: JSON.stringify({
      marketSymbol: 'BTC/USDT',
      side: 'BUY',
      type: 'LIMIT',
      quantity: '0.500000',
      price: '5050.00',
    }),
  });

  // Wait for match event to arrive and update client kline
  const startWait = Date.now();
  while (!matchedEventReceived && Date.now() - startWait < 15000) {
    await new Promise((r) => setTimeout(r, 100));
  }

  ws.close();

  if (matchedEventReceived) {
    console.log('\nE2E Chart Verification SUCCESSFUL! The matched trade successfully caused a client-side candlestick tick update.');
    process.exit(0);
  } else {
    console.error('\nE2E Chart Verification FAILED: Timeout waiting for ORDER_MATCHED WebSocket event.');
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('E2E Verification crashed:', err);
  process.exit(1);
});
