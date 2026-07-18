import React, { useState, useEffect, useRef } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { useWebSocketStream, useWebSocket } from '../context/WebSocketContext';
import { OrderEntry } from '../components/OrderEntry';
import { CandlestickChart } from '../components/CandlestickChart';
import type { CandlestickChartHandle } from '../components/CandlestickChart';
import { OpenOrders } from '../components/OpenOrders';
import { api } from '../lib/api';

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

// No initial mock data. Using actual live order book depth and trade executions.

export const DashboardPage: React.FC = () => {
  const [marketSymbol, setMarketSymbol] = useState('BTC/USDT');
  const [interval, setInterval] = useState<'1m' | '15m' | '1h' | '1d'>('1m');
  const [isChartMaximized, setIsChartMaximized] = useState(false);
  const chartRef = useRef<CandlestickChartHandle>(null);

  const [stats, setStats] = useState({
    lastPrice: '0.00',
    change: '0.00%',
    high: '0.00',
    low: '0.00',
    volume: '0.0000',
    base: 'BTC',
    quote: 'USDT',
  });
  const [lastPrice, setLastPrice] = useState<number>(0);

  const prevPriceRef = useRef<number>(lastPrice);
  useEffect(() => {
    prevPriceRef.current = lastPrice;
  }, [lastPrice]);

  // WebSocket Live States
  const [rawBids, setRawBids] = useState<Array<{ price: string; quantity: string }>>([]);
  const [rawAsks, setRawAsks] = useState<Array<{ price: string; quantity: string }>>([]);
  const [recentTrades, setRecentTrades] = useState<RecentTrade[]>([]);

  const [ordersRefreshTrigger, setOrdersRefreshTrigger] = useState(0);
  const handleOrderPlaced = () => setOrdersRefreshTrigger((prev) => prev + 1);

  const { isConnected } = useWebSocket();

  // Reset feeds and price when market symbol changes, and fetch static snapshot
  useEffect(() => {
    setStats({
      lastPrice: '0.00',
      change: '0.00%',
      high: '0.00',
      low: '0.00',
      volume: '0.0000',
      base: marketSymbol.split('/')[0],
      quote: marketSymbol.split('/')[1] || 'USDT',
    });
    setLastPrice(0);
    prevPriceRef.current = 0;
    setRawBids([]);
    setRawAsks([]);
    setRecentTrades([]);

    let active = true;

    const fetchMarketStats = async () => {
      try {
        const response = await api.get(`/markets/${marketSymbol.replace('/', '-')}/stats`);
        if (active && response.data?.success) {
          const s = response.data.data;
          setStats({
            lastPrice: s.lastPrice || '0.00',
            change: s.change || '0.00%',
            high: s.high || '0.00',
            low: s.low || '0.00',
            volume: s.volume || '0.0000',
            base: s.base || marketSymbol.split('/')[0],
            quote: s.quote || marketSymbol.split('/')[1] || 'USDT',
          });
          if (s.lastPrice) {
            const parsedPrice = parseFloat(s.lastPrice);
            setLastPrice(parsedPrice);
            prevPriceRef.current = parsedPrice;
          }
        }
      } catch (err) {
        console.error('Failed to fetch market stats:', err);
      }
    };

    const fetchDepthSnapshot = async () => {
      try {
        const response = await api.get(`/markets/${marketSymbol.replace('/', '-')}/depth`);
        if (active && response.data?.success) {
          const depthData = response.data.data;
          if (depthData.bids) {
            setRawBids(depthData.bids.map((b: any) => ({ price: b[0], quantity: b[1] })));
          }
          if (depthData.asks) {
            setRawAsks(depthData.asks.map((a: any) => ({ price: a[0], quantity: a[1] })));
          }
        }
      } catch (err) {
        console.error('Failed to fetch depth snapshot:', err);
      }
    };

    const fetchTradesHistory = async () => {
      try {
        const response = await api.get(`/markets/${marketSymbol.replace('/', '-')}/trades`);
        if (active && response.data?.success) {
          const trades = response.data.data;
          setRecentTrades(trades.map((t: any) => ({
            price: parseFloat(t.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            qty: parseFloat(t.quantity).toFixed(4),
            time: new Date(t.timestamp).toLocaleTimeString(),
            side: t.side,
          })));
          if (trades.length > 0) {
            const latestPrice = parseFloat(trades[0].price);
            setLastPrice(latestPrice);
          }
        }
      } catch (err) {
        console.error('Failed to fetch trades history:', err);
      }
    };

    fetchMarketStats();
    fetchDepthSnapshot();
    fetchTradesHistory();

    return () => {
      active = false;
    };
  }, [marketSymbol]);


  // Derive subscription keys (e.g. BTC_USDT)
  const symbolKey = marketSymbol.replace('/', '_');
  const depthStream = `depth:${symbolKey}`;
  const tradeStream = `trade:${symbolKey}`;

  // Subscribe to real-time depth events (as authoritative backup stream)
  useWebSocketStream(depthStream, (event: any) => {
    if (event.bids) {
      setRawBids(event.bids.map((b: any) => ({ price: b[0], quantity: b[1] })));
    }
    if (event.asks) {
      setRawAsks(event.asks.map((a: any) => ({ price: a[0], quantity: a[1] })));
    }
  });


  // Subscribe to real-time trade events
  useWebSocketStream(tradeStream, (event: any) => {
    if (event.trades && Array.isArray(event.trades)) {
      event.trades.forEach((trade: any) => {
        const parsedPrice = parseFloat(trade.price);
        const parsedQty = parseFloat(trade.quantity || '0');
        setLastPrice(parsedPrice);

        setRecentTrades((prev) => {
          const formattedTime = new Date(trade.timestamp || Date.now()).toLocaleTimeString();
          const newTrade: RecentTrade = {
            price: parsedPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            qty: parsedQty.toFixed(4),
            time: formattedTime,
            side: trade.side === 'SELL' ? 'SELL' : 'BUY',
          };
          return [newTrade, ...prev].slice(0, 20);
        });

        setStats((prev) => {
          const prevHigh = parseFloat(prev.high);
          const prevLow = parseFloat(prev.low);
          const newHigh = prevHigh === 0 ? parsedPrice : Math.max(prevHigh, parsedPrice);
          const newLow = prevLow === 0 ? parsedPrice : Math.min(prevLow, parsedPrice);
          const newVol = parseFloat(prev.volume) + parsedQty;

          return {
            ...prev,
            lastPrice: parsedPrice.toFixed(2),
            high: newHigh.toFixed(2),
            low: newLow.toFixed(2),
            volume: newVol.toFixed(4),
          };
        });
      });
    }
  });


  // Process and sort bids (BUY orders, highest first)
  const getDisplayBids = (): OrderBookLevel[] => {
    const dataSource = rawBids;
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
    const dataSource = rawAsks;
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
  const displayTrades = recentTrades;

  // Calculate spreads
  const highestBid = displayBids[0] ? parseFloat(displayBids[0].price.replace(/,/g, '')) : lastPrice;
  const lowestAsk = displayAsks[0] ? parseFloat(displayAsks[0].price.replace(/,/g, '')) : lastPrice;
  const spread = Math.abs(lowestAsk - highestBid);

  const priceColorClass =
    lastPrice > prevPriceRef.current
      ? 'text-brand-green'
      : lastPrice < prevPriceRef.current
      ? 'text-brand-red'
      : 'text-white';

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
          <span className={`text-lg font-mono font-bold ${priceColorClass}`}>
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
      <div className={isChartMaximized 
        ? "fixed inset-0 z-50 bg-[#0c0d12] p-6 flex flex-col"
        : "lg:col-span-6 bg-dark-card border border-dark-border rounded-xl p-4 flex flex-col min-h-[480px]"
      }>
        <div className="flex items-center justify-between border-b border-dark-border pb-3 mb-4">
          <h3 className="font-bold text-white text-sm">
            Candlestick Chart - {marketSymbol} ({interval})
          </h3>
          <div className="flex items-center space-x-3 text-xs text-dark-text-secondary">
            <div className="flex space-x-1.5">
              {(['1m', '15m', '1h', '1d'] as const).map((it) => (
                <span
                  key={it}
                  onClick={() => setInterval(it)}
                  className={`px-2 py-0.5 rounded cursor-pointer transition-all ${
                    interval === it
                      ? 'bg-dark-bg text-brand-green font-bold border border-brand-green/20'
                      : 'hover:text-white hover:bg-dark-bg/50'
                  }`}
                >
                  {it}
                </span>
              ))}
            </div>
            <button
              onClick={() => setIsChartMaximized(!isChartMaximized)}
              className="text-dark-text-secondary hover:text-white transition-colors p-1 rounded bg-dark-bg/30 hover:bg-dark-bg/60 flex items-center justify-center"
              title={isChartMaximized ? "Minimize Chart" : "Maximize Chart"}
            >
              {isChartMaximized ? (
                // Minimize Icon (Exit Full Screen)
                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ width: '18px', height: '18px' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 9L3 3m0 0l3.5 0M3 3v3.5M15 9l6-6m0 0l-3.5 0M21 3v3.5M9 15l-6 6m0 0h3.5M3 21v-3.5M15 15l6 6m0 0h-3.5M21 21v-3.5" />
                </svg>
              ) : (
                // Maximize Icon (Full Screen)
                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ width: '18px', height: '18px' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h6M3 3v6M21 3h-6M21 3v6M3 21h6M3 21v-6M21 21h-6M21 21v-6" />
                </svg>
              )}
            </button>
          </div>
        </div>
        <div className={isChartMaximized ? "flex-1 w-full h-[calc(100vh-120px)]" : "h-[380px] w-full"}>
          <CandlestickChart
            ref={chartRef}
            basePrice={lastPrice}
            symbol={marketSymbol}
            interval={interval}
          />
        </div>
      </div>

      {/* Order Book Panel */}
      <div className="lg:col-span-3 bg-dark-card border border-dark-border rounded-xl p-4 flex flex-col min-h-[480px]">
        <h3 className="font-bold text-white text-sm border-b border-dark-border pb-3 mb-3 flex items-center justify-between">
          <span>Order Book</span>
          <span className="flex items-center space-x-1.5 text-[10px] font-normal">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-brand-green animate-pulse' : 'bg-brand-red animate-ping'}`} />
            <span className={isConnected ? 'text-dark-text-secondary' : 'text-brand-red font-bold'}>
              {isConnected ? 'Live' : 'Reconnecting...'}
            </span>
          </span>
        </h3>

        {/* Table Headers */}
        <div className="grid grid-cols-3 text-[10px] font-mono text-dark-text-secondary mb-2 px-1">
          <span>Price({stats.quote})</span>
          <span className="text-right">Size({stats.base})</span>
          <span className="text-right">Total({stats.base})</span>
        </div>

        {/* Asks (Sell Orders) - Rendered lowest price bottom */}
        <div className="flex-1 flex flex-col justify-end space-y-1 font-mono text-xs">
          {displayAsks.length === 0 ? (
            <div className="py-8 text-center text-[11px] text-dark-text-secondary italic">
              No sell orders open
            </div>
          ) : (
            [...displayAsks].reverse().map((ask, idx) => (
              <div key={idx} className="grid grid-cols-3 relative px-1 py-0.5 hover:bg-neutral-800/40 rounded transition-all">
                <div
                  className="absolute right-0 top-0 bottom-0 bg-brand-red/10 border-r-2 border-brand-red/35 pointer-events-none"
                  style={{ width: `${ask.depthPct}%` }}
                ></div>
                <span className="text-brand-red relative z-10">{ask.price}</span>
                <span className="text-right text-dark-text-primary relative z-10">{ask.qty}</span>
                <span className="text-right text-dark-text-secondary relative z-10">{ask.total}</span>
              </div>
            ))
          )}
        </div>

        {/* Spread / Mid-Market Price Indicator */}
        <div className="my-3 py-2 border-y border-dark-border/40 flex items-center justify-between px-1">
          <span className={`text-sm font-bold font-mono ${priceColorClass} flex items-center`}>
            ${lastPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className={`text-[10px] font-mono font-medium ${priceColorClass}`}>
            Spread: {spread.toFixed(2)}
          </span>
        </div>

        {/* Bids (Buy Orders) - Rendered highest price top */}
        <div className="flex-1 flex flex-col justify-start space-y-1 font-mono text-xs">
          {displayBids.length === 0 ? (
            <div className="py-8 text-center text-[11px] text-dark-text-secondary italic">
              No buy orders open
            </div>
          ) : (
            displayBids.map((bid, idx) => (
              <div key={idx} className="grid grid-cols-3 relative px-1 py-0.5 hover:bg-neutral-800/40 rounded transition-all">
                <div
                  className="absolute right-0 top-0 bottom-0 bg-brand-green/10 border-r-2 border-brand-green/35 pointer-events-none"
                  style={{ width: `${bid.depthPct}%` }}
                ></div>
                <span className="text-brand-green relative z-10">{bid.price}</span>
                <span className="text-right text-dark-text-primary relative z-10">{bid.qty}</span>
                <span className="text-right text-dark-text-secondary relative z-10">{bid.total}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Trade Execution Panel – extracted to OrderEntry component */}
      <OrderEntry marketSymbol={marketSymbol} lastPrice={lastPrice} onOrderPlaced={handleOrderPlaced} />

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
              {displayTrades.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-dark-text-secondary italic">
                    No trades executed yet in this market
                  </td>
                </tr>
              ) : (
                displayTrades.map((trade, idx) => (
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Open Orders panel */}
      <OpenOrders marketSymbol={marketSymbol} refreshTrigger={ordersRefreshTrigger} />
    </div>

  );
};
