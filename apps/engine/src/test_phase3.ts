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
  console.log(`Registering user: ${username} (${email})...`);
  const registerRes = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, username, password }),
  });
  const registerData = (await registerRes.json()) as any;
  if (!registerData.success) {
    throw new Error('Registration failed: ' + JSON.stringify(registerData));
  }

  console.log(`Logging in user: ${username}...`);
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
  console.log('--- Phase 3 Integration Test Started ---');

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
  const depBuyerRes = await fetch(`${API_URL}/balances/deposit`, {
    method: 'POST',
    headers: buyerHeaders,
    body: JSON.stringify({ assetSymbol: 'USDT', amount: '10000.00' }),
  });
  console.log('Buyer deposit status:', (await depBuyerRes.json() as any).success);

  console.log('Depositing 2.0 BTC to seller...');
  const depSellerRes = await fetch(`${API_URL}/balances/deposit`, {
    method: 'POST',
    headers: sellerHeaders,
    body: JSON.stringify({ assetSymbol: 'BTC', amount: '2.000000' }),
  });
  console.log('Seller deposit status:', (await depSellerRes.json() as any).success);

  // Connect WebSocket
  console.log(`Connecting to WebSocket server at ${WS_URL}...`);
  const ws = new WebSocket(WS_URL);

  await new Promise<void>((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
  });
  console.log('WebSocket connected.');

  // Subscribe to order:BTC_USDT
  ws.send(JSON.stringify({ method: 'SUBSCRIBE', params: ['order:BTC_USDT'] }));
  console.log('Subscribed to order:BTC_USDT channel.');

  // Listen to WebSocket events
  const wsEvents: any[] = [];
  ws.on('message', (data) => {
    try {
      const parsed = JSON.parse(data.toString());
      if (parsed.stream === 'order:BTC_USDT') {
        console.log('WS [order:BTC_USDT]:', JSON.stringify(parsed.data));
        wsEvents.push(parsed.data);
      }
    } catch (e) {
      console.error('Failed parsing WS message:', e);
    }
  });

  // Helper to wait for a WebSocket event for a specific order ID
  const waitForEvent = (type: string, orderId: string, timeoutMs: number = 15000) => {
    return new Promise<any>((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error(`Timeout waiting for event ${type} on order ${orderId}`));
      }, timeoutMs);

      const listener = (data: WebSocket.RawData) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.stream === 'order:BTC_USDT') {
            const event = parsed.data;
            if (event.type === type && event.data?.order?.id === orderId) {
              cleanup();
              resolve(event);
            }
          }
        } catch (e) {
          // ignore
        }
      };

      const cleanup = () => {
        ws.removeListener('message', listener);
        clearTimeout(timer);
      };

      ws.on('message', listener);
    });
  };

  // Wait a small bit for subscription confirmation
  await new Promise((r) => setTimeout(r, 500));

  // 1. User B (Seller) places LIMIT SELL order: 1.0 BTC @ 5000.00 USDT
  console.log('--- Placing Seller Order: SELL 1.0 BTC @ 5000.00 USDT ---');
  const sellRes = await fetch(`${API_URL}/orders`, {
    method: 'POST',
    headers: sellerHeaders,
    body: JSON.stringify({
      marketSymbol: 'BTC/USDT',
      side: 'SELL',
      type: 'LIMIT',
      quantity: '1.000000',
      price: '5000.00',
    }),
  });
  const sellResult = (await sellRes.json()) as any;
  if (!sellResult.success) {
    throw new Error('Seller placement failed: ' + JSON.stringify(sellResult));
  }
  const sellOrder = sellResult.data;
  console.log(`Seller order placed successfully. ID: ${sellOrder.id}`);

  console.log(`Waiting for ORDER_PLACED event for Seller order ${sellOrder.id}...`);
  await waitForEvent('ORDER_PLACED', sellOrder.id);

  // Verify Seller balance has locked funds
  console.log('Checking Seller balances after placing order...');
  const bSellerRes = await fetch(`${API_URL}/balances`, { headers: sellerHeaders });
  const bSellerData = (await bSellerRes.json()) as any;
  console.log('Seller balances:', JSON.stringify(bSellerData.data));

  // 2. User A (Buyer) places LIMIT BUY order: 0.5 BTC @ 5000.00 USDT (should match!)
  console.log('--- Placing Buyer Order: BUY 0.5 BTC @ 5000.00 USDT (Matches SELL) ---');
  const buyRes = await fetch(`${API_URL}/orders`, {
    method: 'POST',
    headers: buyerHeaders,
    body: JSON.stringify({
      marketSymbol: 'BTC/USDT',
      side: 'BUY',
      type: 'LIMIT',
      quantity: '0.500000',
      price: '5000.00',
    }),
  });
  const buyResult = (await buyRes.json()) as any;
  if (!buyResult.success) {
    throw new Error('Buyer placement failed: ' + JSON.stringify(buyResult));
  }
  const buyOrder = buyResult.data;
  console.log(`Buyer order placed successfully. ID: ${buyOrder.id}`);

  console.log(`Waiting for ORDER_MATCHED event for Buyer order ${buyOrder.id}...`);
  await waitForEvent('ORDER_MATCHED', buyOrder.id);

  // Check Buyer balances
  console.log('Checking Buyer balances after match...');
  const bBuyerRes = await fetch(`${API_URL}/balances`, { headers: buyerHeaders });
  const bBuyerData = (await bBuyerRes.json()) as any;
  console.log('Buyer balances:', JSON.stringify(bBuyerData.data));

  // Check Seller balances
  console.log('Checking Seller balances after match...');
  const bSellerRes2 = await fetch(`${API_URL}/balances`, { headers: sellerHeaders });
  const bSellerData2 = (await bSellerRes2.json()) as any;
  console.log('Seller balances:', JSON.stringify(bSellerData2.data));

  // 3. Rollback Logic: Cancel the remaining partially filled order
  console.log('--- Cancelling Seller Partially Filled Order ---');
  const cancelRes = await fetch(`${API_URL}/orders/${sellOrder.id}`, {
    method: 'DELETE',
    headers: sellerHeaders,
  });
  const cancelResult = (await cancelRes.json()) as any;
  if (!cancelResult.success) {
    throw new Error('Cancel failed: ' + JSON.stringify(cancelResult));
  }
  console.log(`Cancel request sent for order ${sellOrder.id}`);

  console.log(`Waiting for ORDER_CANCELLED event for Seller order ${sellOrder.id}...`);
  await waitForEvent('ORDER_CANCELLED', sellOrder.id);

  // Check Seller balances after cancellation
  console.log('Checking Seller balances after cancellation (BTC should be unlocked)...');
  const bSellerRes3 = await fetch(`${API_URL}/balances`, { headers: sellerHeaders });
  const bSellerData3 = (await bSellerRes3.json()) as any;
  console.log('Seller balances:', JSON.stringify(bSellerData3.data));

  // 4. Validation: Try placing a BUY order that exceeds user balance (Insufficient funds)
  console.log('--- Placing Order with Insufficient Funds (Expected to fail/reject) ---');
  const invalidBuyRes = await fetch(`${API_URL}/orders`, {
    method: 'POST',
    headers: buyerHeaders,
    body: JSON.stringify({
      marketSymbol: 'BTC/USDT',
      side: 'BUY',
      type: 'LIMIT',
      quantity: '10.000000', // Requires 50,000 USDT (Buyer has ~7,500 USDT)
      price: '5000.00',
    }),
  });
  const invalidBuyResult = (await invalidBuyRes.json()) as any;
  console.log('Rejection response from API (or Engine queue):', JSON.stringify(invalidBuyResult));

  // Wait to see if any event propagates
  await new Promise((r) => setTimeout(r, 1500));

  // Print all captured WebSocket events to show ORDER_MATCHED, etc.
  console.log('--- Captured WebSocket Events ---');
  for (const event of wsEvents) {
    console.log(`Event Type: ${event.type}, Status: ${event.data?.order?.status || 'N/A'}`);
    if (event.data?.fills?.length > 0) {
      console.log(`  Fills:`, JSON.stringify(event.data.fills));
    }
  }

  ws.close();
  console.log('--- Phase 3 Integration Test Completed ---');
}

run().catch((err) => {
  console.error('Test script crashed:', err);
  process.exit(1);
});
