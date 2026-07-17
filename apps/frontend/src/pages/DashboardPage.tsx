import React, { useState, useEffect, useRef } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { useWebSocketStream } from '../context/WebSocketContext';
import { OrderEntry } from '../components/OrderEntry';
import { CandlestickChart } from '../components/CandlestickChart';
import type { CandlestickChartHandle } from '../components/CandlestickChart';
import { OpenOrders } from '../components/OpenOrders';

interface OrderBookLevel {
  price: string;
  qty: string;
  total: string;
  depthPct: number;
}

interface RecentTrade {
  price: string;
  qty: string;
  time: string;
  side: 'BUY' | 'SELL';
}

const DEFAULT_MARKET_STATS: Record<
  string,
  {
    lastPrice: string;
    change: string;
    high: string;
    low: string;
    volume: string;
    base: string;
    quote: string;
  }
> = {
  'BTC/USDT': { lastPrice: '98420.50', change: '+4.85%', high: '99150.00', low: '93520.00', volume: '12654.80', base: 'BTC', quote: 'USDT' },
  'ETH/USDT': { lastPrice: '3845.20', change: '+2.14%', high: '3910.00', low: '3720.00', volume: '84620.15', base: 'ETH', quote: 'USDT' },
  'SOL/USDT': { lastPrice: '186.75', change: '-1.42%', high: '194.50', low: '181.20', volume: '412530.40', base: 'SOL', quote: 'USDT' },
};

const INITIAL_MOCK_BIDS = [
  { price: '98420.00', quantity: '0.450' },
  { price: '98415.50', quantity: '1.200' },
  { price: '98410.00', quantity: '0.850' },
  { price: '98400.00', quantity: '2.140' },
  { price: '98390.50', quantity: '0.310' },
];

const INITIAL_MOCK_ASKS = [
  { price: '98425.00', quantity: '0.120' },
  { price: '98430.00', quantity: '0.980' },
  { price: '98442.00', quantity: '1.500' },
  { price: '98450.00', quantity: '0.400' },
  { price: '98460.50', quantity: '2.250' },
];

const INITIAL_MOCK_TRADES: RecentTrade[] = [
  { price: '98,420.50', qty: '0.045', time: '14:24:51', side: 'BUY' },
  { price: '98,420.00', qty: '0.850', time: '14:24:48', side: 'SELL' },
  { price: '98,419.00', qty: '0.120', time: '14:24:42', side: 'SELL' },
  { price: '98,425.00', qty: '1.450', time: '14:24:35', side: 'BUY' },
  { price: '98,423.50', qty: '0.220', time: '14:24:29', side: 'BUY' },
];

export const DashboardPage: React.FC = () => {
  const [marketSymbol, setMarketSymbol] = useState('BTC/USDT');
  const chartRef = useRef<CandlestickChartHandle>(null);

  const stats = DEFAULT_MARKET_STATS[marketSymbol] || DEFAULT_MARKET_STATS['BTC/USDT'];
  const [lastPrice, setLastPrice] = useState<number>(parseFloat(stats.lastPrice));

  // WebSocket Live States
  const [rawBids, setRawBids] = useState<Array<{ price: string; quantity: string }>>([]);
  const [rawAsks, setRawAsks] = useState<Array<{ price: string; quantity: string }>>([]);
  const [recentTrades, setRecentTrades] = useState<RecentTrade[]>([]);

  // Reset feeds and price when market symbol changes
  useEffect(() => {
    const currentStats = DEFAULT_MARKET_STATS[marketSymbol];
    if (currentStats) {
      const parsedPrice = parseFloat(currentStats.lastPrice);
      setLastPrice(parsedPrice);
      setPrice(parsedPrice.toString());
    }
    setRawBids([]);
    setRawAsks([]);
    setRecentTrades([]);
  }, [marketSymbol]);

  // Derive subscription keys (e.g. BTC_USDT)
  const symbolKey = marketSymbol.replace('/', '_');
  const depthStream = `depth:${symbolKey}`;
  const tradeStream = `trade:${symbolKey}`;

  // Subscribe to real-time depth events
  useWebSocketStream(depthStream, (event: any) => {
    if (event.bids) setRawBids(event.bids);
    if (event.asks) setRawAsks(event.asks);
  });

  // Subscribe to real-time trade events
  useWebSocketStream(tradeStream, (event: any) => {
    if (event.price) {
      const parsedPrice = parseFloat(event.price);
      setLastPrice(parsedPrice);

      setRecentTrades((prev) => {
        const formattedTime = new Date(event.timestamp || Date.now()).toLocaleTimeString();
        const newTrade: RecentTrade = {
          price: parsedPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          qty: parseFloat(event.quantity || '0').toFixed(4),
          time: formattedTime,
          side: event.side === 'SELL' ? 'SELL' : 'BUY',
        };
        return [newTrade, ...prev].slice(0, 20);
      });
    }
  });

  // Process and sort bids (BUY orders, highest first)
  const getDisplayBids = (): OrderBookLevel[] => {
    const dataSource = rawBids.length > 0 ? rawBids : INITIAL_MOCK_BIDS;
    const sorted = [...dataSource]
      .map((b) => ({ price: parseFloat(b.price), qty: parseFloat(b.quantity) }))
      .sort((a, b) => b.price - a.price)
      .slice(0, 5);

    let runningTotal = 0;
    const mapped = sorted.map((item) => {
      runningTotal += item.qty;
      return {
        price: item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        qty: item.qty.toFixed(4),
        total: runningTotal,
      };
    });

    const maxTotal = runningTotal || 1;
    return mapped.map((item) => ({
      ...item,
      total: item.total.toFixed(4),
      depthPct: Math.min(100, Math.round((item.total / maxTotal) * 100)),
    }));
  };

  // Process and sort asks (SELL orders, lowest first)
  const getDisplayAsks = (): OrderBookLevel[] => {
    const dataSource = rawAsks.length > 0 ? rawAsks : INITIAL_MOCK_ASKS;
    const sorted = [...dataSource]
      .map((a) => ({ price: parseFloat(a.price), qty: parseFloat(a.quantity) }))
      .sort((a, b) => a.price - b.price)
      .slice(0, 5);

    let runningTotal = 0;
    const mapped = sorted.map((item) => {
      runningTotal += item.qty;
      return {
        price: item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        qty: item.qty.toFixed(4),
        total: runningTotal,
      };
    });

    const maxTotal = runningTotal || 1;
    return mapped.map((item) => ({
      ...item,
      total: item.total.toFixed(4),
      depthPct: Math.min(100, Math.round((item.total / maxTotal) * 100)),
    }));
  };

  const displayBids = getDisplayBids();
  const displayAsks = getDisplayAsks();
  const displayTrades = recentTrades.length > 0 ? recentTrades : INITIAL_MOCK_TRADES;

  // Calculate spreads
  const highestBid = displayBids[0] ? parseFloat(displayBids[0].price.replace(/,/g, '')) : lastPrice;
  const lowestAsk = displayAsks[0] ? parseFloat(displayAsks[0].price.replace(/,/g, '')) : lastPrice;
  const spread = Math.abs(lowestAsk - highestBid);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Top Header stats ticker bar */}
      <div className="lg:col-span-12 bg-dark-card border border-dark-border rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <select
            value={marketSymbol}
            onChange={(e) => setMarketSymbol(e.target.value)}
            className="bg-dark-bg border border-dark-border text-white text-base font-bold rounded-lg px-3 py-1 focus:outline-none focus:border-brand-green"
          >
            <option value="BTC/USDT">BTC/USDT</option>
            <option value="ETH/USDT">ETH/USDT</option>
            <option value="SOL/USDT">SOL/USDT</option>
          </select>
          <span className="text-lg font-mono font-bold text-brand-green">
            ${lastPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        <div className="flex space-x-6 text-xs font-mono">
          <div>
            <span className="text-dark-text-secondary block">24h Change</span>
            <span className={`font-bold flex items-center ${stats.change.startsWith('+') ? 'text-brand-green' : 'text-brand-red'}`}>
              <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> {stats.change}
            </span>
          </div>
          <div>
            <span className="text-dark-text-secondary block">24h High</span>
            <span className="text-white font-bold">${stats.high}</span>
          </div>
          <div>
            <span className="text-dark-text-secondary block">24h Low</span>
            <span className="text-white font-bold">${stats.low}</span>
          </div>
          <div>
            <span className="text-dark-text-secondary block">24h Volume({stats.base})</span>
            <span className="text-white font-bold">
              {stats.volume} {stats.base}
            </span>
          </div>
        </div>
      </div>

      {/* Main Candlestick Chart */}
      <div className="lg:col-span-6 bg-dark-card border border-dark-border rounded-xl p-4 flex flex-col min-h-[480px]">
        <div className="flex items-center justify-between border-b border-dark-border pb-3 mb-4">
          <h3 className="font-bold text-white text-sm">Candlestick Chart</h3>
          <div className="flex space-x-1.5 text-xs text-dark-text-secondary">
            <span className="px-2 py-0.5 rounded bg-dark-bg text-brand-green font-bold">1m</span>
            <span className="px-2 py-0.5 rounded hover:text-white cursor-pointer">15m</span>
            <span className="px-2 py-0.5 rounded hover:text-white cursor-pointer">1H</span>
            <span className="px-2 py-0.5 rounded hover:text-white cursor-pointer">1D</span>
          </div>
        </div>
        <CandlestickChart
          ref={chartRef}
          basePrice={lastPrice}
          symbol={marketSymbol}
        />
      </div>

      {/* Order Book Panel */}
      <div className="lg:col-span-3 bg-dark-card border border-dark-border rounded-xl p-4 flex flex-col min-h-[480px]">
        <h3 className="font-bold text-white text-sm border-b border-dark-border pb-3 mb-3">Order Book</h3>

        {/* Table Headers */}
        <div className="grid grid-cols-3 text-[10px] font-mono text-dark-text-secondary mb-2 px-1">
          <span>Price({stats.quote})</span>
          <span className="text-right">Size({stats.base})</span>
          <span className="text-right">Total({stats.base})</span>
        </div>

        {/* Asks (Sell Orders) - Rendered lowest price bottom */}
        <div className="flex-1 flex flex-col justify-end space-y-1 font-mono text-xs">
          {[...displayAsks].reverse().map((ask, idx) => (
            <div key={idx} className="grid grid-cols-3 relative px-1 py-0.5 hover:bg-neutral-800/40 rounded transition-all">
              <div
                className="absolute right-0 top-0 bottom-0 bg-brand-red/10 border-r-2 border-brand-red/35 pointer-events-none"
                style={{ width: `${ask.depthPct}%` }}
              ></div>
              <span className="text-brand-red relative z-10">{ask.price}</span>
              <span className="text-right text-dark-text-primary relative z-10">{ask.qty}</span>
              <span className="text-right text-dark-text-secondary relative z-10">{ask.total}</span>
            </div>
          ))}
        </div>

        {/* Spread / Mid-Market Price Indicator */}
        <div className="my-3 py-2 border-y border-dark-border/40 flex items-center justify-between px-1">
          <span className="text-sm font-bold font-mono text-brand-green flex items-center">
            ${lastPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-dark-text-secondary font-medium">
            Spread: {spread.toFixed(2)}
          </span>
        </div>

        {/* Bids (Buy Orders) - Rendered highest price top */}
        <div className="flex-1 flex flex-col justify-start space-y-1 font-mono text-xs">
          {displayBids.map((bid, idx) => (
            <div key={idx} className="grid grid-cols-3 relative px-1 py-0.5 hover:bg-neutral-800/40 rounded transition-all">
              <div
                className="absolute right-0 top-0 bottom-0 bg-brand-green/10 border-r-2 border-brand-green/35 pointer-events-none"
                style={{ width: `${bid.depthPct}%` }}
              ></div>
              <span className="text-brand-green relative z-10">{bid.price}</span>
              <span className="text-right text-dark-text-primary relative z-10">{bid.qty}</span>
              <span className="text-right text-dark-text-secondary relative z-10">{bid.total}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Trade Execution Panel – extracted to OrderEntry component */}
      <OrderEntry marketSymbol={marketSymbol} lastPrice={lastPrice} />

      {/* Recent Trades panel */}
      <div className="lg:col-span-12 bg-dark-card border border-dark-border rounded-xl p-4">
        <h3 className="font-bold text-white text-sm border-b border-dark-border pb-3 mb-4">Recent Market Trades</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="text-[10px] text-dark-text-secondary uppercase border-b border-dark-border/40 pb-2">
                <th className="pb-2">Time</th>
                <th className="pb-2">Price({stats.quote})</th>
                <th className="pb-2 text-right">Size({stats.base})</th>
                <th className="pb-2 text-right">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border/20">
              {displayTrades.map((trade, idx) => (
                <tr key={idx} className="hover:bg-neutral-800/20 transition-all">
                  <td className="py-2.5 text-dark-text-secondary">{trade.time}</td>
                  <td className={`py-2.5 font-bold ${trade.side === 'BUY' ? 'text-brand-green' : 'text-brand-red'}`}>
                    {trade.price}
                  </td>
                  <td className="py-2.5 text-right text-dark-text-primary">{trade.qty}</td>
                  <td className="py-2.5 text-right">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      trade.side === 'BUY' ? 'bg-brand-green/10 text-brand-green' : 'bg-brand-red/10 text-brand-red'
                    }`}>
                      {trade.side}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Open Orders panel */}
      <OpenOrders />
    </div>

  );
};
