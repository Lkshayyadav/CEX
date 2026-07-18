import WebSocket from 'ws';
import dotenv from 'dotenv';
import path from 'path';

// Load environment
dotenv.config({ path: path.join(__dirname, '../../backend/.env') });

const API_URL = 'http://localhost:3000/api/v1';
const WS_URL = 'ws://localhost:3000';

async function run() {
  console.log('--- Phase 2 Integration Test Started ---');

  // 1. Register a new user
  const email = `testtrader_${Date.now()}@cex.io`;
  const username = `trader_${Date.now()}`;
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
  console.log('SUCCESS: User registered.');

  // 2. Login to get JWT token
  console.log('Logging in...');
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: email, password }),
  });
  const loginData = (await loginRes.json()) as any;

  if (!loginData.success) {
    throw new Error('Login failed: ' + JSON.stringify(loginData));
  }
  const token = loginData.data.accessToken;
  console.log('SUCCESS: Authenticated. Token received.');

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // Deposit funds to place the order
  console.log('Depositing simulated funds (10,000 USDT)...');
  const depositRes = await fetch(`${API_URL}/balances/deposit`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ assetSymbol: 'USDT', amount: '10000.00' }),
  });
  const depositData = (await depositRes.json()) as any;
  if (!depositData.success) {
    throw new Error('Deposit failed: ' + JSON.stringify(depositData));
  }
  console.log('SUCCESS: Deposited 10,000 USDT.');

  // 3. Test the new REST API depth snapshot endpoint
  console.log('Fetching initial order book depth snapshot...');
  const depthRes = await fetch(`${API_URL}/markets/BTC-USDT/depth`);
  const depthData = (await depthRes.json()) as any;
  if (!depthData.success) {
    throw new Error('Failed to fetch depth snapshot: ' + JSON.stringify(depthData));
  }
  console.log('SUCCESS: Depth snapshot retrieved successfully:', JSON.stringify(depthData.data));

  // 4. Establish WebSocket connection
  console.log(`Connecting to WebSocket server at ${WS_URL}...`);
  const ws = new WebSocket(WS_URL);

  const wsOpenPromise = new Promise<void>((resolve, reject) => {
    ws.on('open', () => {
      console.log('WebSocket connection open.');
      resolve();
    });
    ws.on('error', (err) => {
      reject(err);
    });
  });

  await wsOpenPromise;

  // Subscribe to the order channel
  const subscribeMsg = {
    method: 'SUBSCRIBE',
    params: ['order:BTC_USDT'],
  };
  ws.send(JSON.stringify(subscribeMsg));
  console.log('Subscription request sent for: order:BTC_USDT');

  // Helper to wait for specific WebSocket events
  let onEventCallback: ((event: any) => void) | null = null;
  ws.on('message', (data) => {
    try {
      const parsed = JSON.parse(data.toString());
      console.log('WS Message received:', JSON.stringify(parsed));
      if (parsed.stream === 'order:BTC_USDT' && onEventCallback) {
        onEventCallback(parsed.data);
      }
    } catch (err) {
      console.error('Failed to parse WS message:', err);
    }
  });

  const waitForEvent = (orderId: string, expectedType: string): Promise<any> => {
    return new Promise((resolve) => {
      onEventCallback = (event: any) => {
        if (event.type === expectedType && event.data?.order?.id === orderId) {
          resolve(event);
        }
      };
    });
  };

  // 5. Submit a BUY LIMIT order
  const orderPayload = {
    marketSymbol: 'BTC/USDT',
    side: 'BUY',
    type: 'LIMIT',
    quantity: '0.05',
    price: '98420.00',
  };

  console.log('Placing BUY LIMIT order via REST API...');
  const orderRes = await fetch(`${API_URL}/orders`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(orderPayload),
  });
  const orderResult = (await orderRes.json()) as any;
  if (!orderResult.success) {
    throw new Error('Failed to submit order: ' + JSON.stringify(orderResult));
  }
  const order = orderResult.data;
  console.log(`SUCCESS: Order submitted. ID: ${order.id}, Initial Status: ${order.status}`);

  // 6. Verify ORDER_PLACED WebSocket broadcast is received
  console.log('Waiting for ORDER_PLACED WebSocket event...');
  const placedEvent = await waitForEvent(order.id, 'ORDER_PLACED');
  console.log(`SUCCESS: Received WebSocket ORDER_PLACED event for order: ${placedEvent.data.order.id}`);

  // 7. Verify depth has updated in REST endpoint
  console.log('Fetching updated order book depth snapshot...');
  const updatedDepthRes = await fetch(`${API_URL}/markets/BTC-USDT/depth`);
  const updatedDepthData = (await updatedDepthRes.json()) as any;
  console.log('SUCCESS: Updated depth snapshot:', JSON.stringify(updatedDepthData.data));

  // 8. Cancel the order
  console.log(`Cancelling order ${order.id} via REST API...`);
  const cancelRes = await fetch(`${API_URL}/orders/${order.id}`, {
    method: 'DELETE',
    headers: authHeaders,
  });
  const cancelResult = (await cancelRes.json()) as any;
  if (!cancelResult.success) {
    throw new Error('Failed to cancel order: ' + JSON.stringify(cancelResult));
  }
  console.log(`SUCCESS: Cancel requested. Response status: ${cancelResult.data.status}`);

  // 9. Verify ORDER_CANCELLED WebSocket broadcast is received
  console.log('Waiting for ORDER_CANCELLED WebSocket event...');
  const cancelledEvent = await waitForEvent(order.id, 'ORDER_CANCELLED');
  console.log(`SUCCESS: Received WebSocket ORDER_CANCELLED event for order: ${cancelledEvent.data.order.id}`);

  // Close connection
  ws.close();
  console.log('--- Phase 2 Integration Test Passed Successfully ---');
}

run().catch((err) => {
  console.error('Test Failed:', err.message);
  process.exit(1);
});
