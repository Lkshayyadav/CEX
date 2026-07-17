import React, { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

interface OrderBookLevel {
  price: string;
  qty: string;
  total: string;
  depthPct: number;
}

const mockBids: OrderBookLevel[] = [
  { price: '98,420.00', qty: '0.450', total: '0.450', depthPct: 15 },
  { price: '98,415.50', qty: '1.200', total: '1.650', depthPct: 45 },
  { price: '98,410.00', qty: '0.850', total: '2.500', depthPct: 65 },
  { price: '98,400.00', qty: '2.140', total: '4.640', depthPct: 90 },
  { price: '98,390.50', qty: '0.310', total: '4.950', depthPct: 98 },
];

const mockAsks: OrderBookLevel[] = [
  { price: '98,425.00', qty: '0.120', total: '0.120', depthPct: 8 },
  { price: '98,430.00', qty: '0.980', total: '1.100', depthPct: 35 },
  { price: '98,442.00', qty: '1.500', total: '2.600', depthPct: 70 },
  { price: '98,450.00', qty: '0.400', total: '3.000', depthPct: 80 },
  { price: '98,460.50', qty: '2.250', total: '5.250', depthPct: 100 },
];

interface RecentTrade {
  price: string;
  qty: string;
  time: string;
  side: 'BUY' | 'SELL';
}

const mockRecentTrades: RecentTrade[] = [
  { price: '98,420.50', qty: '0.045', time: '14:24:51', side: 'BUY' },
  { price: '98,420.00', qty: '0.850', time: '14:24:48', side: 'SELL' },
  { price: '98,419.00', qty: '0.120', time: '14:24:42', side: 'SELL' },
  { price: '98,425.00', qty: '1.450', time: '14:24:35', side: 'BUY' },
  { price: '98,423.50', qty: '0.220', time: '14:24:29', side: 'BUY' },
];

export const DashboardPage: React.FC = () => {
  const [orderSide, setOrderSide] = useState<'BUY' | 'SELL'>('BUY');
  const [orderType, setOrderType] = useState<'LIMIT' | 'MARKET'>('LIMIT');
  const [price, setPrice] = useState('98420.00');
  const [quantity, setQuantity] = useState('0.10');
  const [marketSymbol, setMarketSymbol] = useState('BTC/USDT');

  const handleOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Order Created: ${orderSide} ${orderType} ${quantity} ${marketSymbol} @ ${price}`);
  };

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
          <span className="text-lg font-mono font-bold text-brand-green">$98,420.50</span>
        </div>
        
        <div className="flex space-x-6 text-xs font-mono">
          <div>
            <span className="text-dark-text-secondary block">24h Change</span>
            <span className="text-brand-green font-bold flex items-center">
              <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> +4.85%
            </span>
          </div>
          <div>
            <span className="text-dark-text-secondary block">24h High</span>
            <span className="text-white font-bold">$99,150.00</span>
          </div>
          <div>
            <span className="text-dark-text-secondary block">24h Low</span>
            <span className="text-white font-bold">$93,520.00</span>
          </div>
          <div>
            <span className="text-dark-text-secondary block">24h Volume(BTC)</span>
            <span className="text-white font-bold">12,654.80 BTC</span>
          </div>
        </div>
      </div>

      {/* Main Candlestick Chart Placeholder */}
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
        
        {/* Mock Graphic Chart */}
        <div className="flex-1 flex flex-col justify-end bg-dark-bg/60 border border-dark-border/40 rounded-lg p-4 relative overflow-hidden">
          {/* Background grid lines */}
          <div className="absolute inset-0 flex flex-col justify-between opacity-10 pointer-events-none p-4">
            <div className="border-b border-white w-full"></div>
            <div className="border-b border-white w-full"></div>
            <div className="border-b border-white w-full"></div>
            <div className="border-b border-white w-full"></div>
          </div>
          
          {/* SVG Mock Candlesticks */}
          <svg className="w-full h-64 overflow-visible" preserveAspectRatio="none">
            {/* Candle 1 */}
            <line x1="10%" y1="120" x2="10%" y2="200" stroke="#f6465d" strokeWidth="2" />
            <rect x="8%" y="140" width="4%" height="40" fill="#f6465d" rx="1" />

            {/* Candle 2 */}
            <line x1="25%" y1="90" x2="25%" y2="170" stroke="#0ecb81" strokeWidth="2" />
            <rect x="23%" y="110" width="4%" height="50" fill="#0ecb81" rx="1" />

            {/* Candle 3 */}
            <line x1="40%" y1="60" x2="40%" y2="130" stroke="#0ecb81" strokeWidth="2" />
            <rect x="38%" y="70" width="4%" height="45" fill="#0ecb81" rx="1" />

            {/* Candle 4 */}
            <line x1="55%" y1="80" x2="55%" y2="150" stroke="#f6465d" strokeWidth="2" />
            <rect x="53%" y="95" width="4%" height="40" fill="#f6465d" rx="1" />

            {/* Candle 5 */}
            <line x1="70%" y1="40" x2="70%" y2="100" stroke="#0ecb81" strokeWidth="2" />
            <rect x="68%" y="50" width="4%" height="45" fill="#0ecb81" rx="1" />

            {/* Candle 6 */}
            <line x1="85%" y1="20" x2="85%" y2="80" stroke="#0ecb81" strokeWidth="2" />
            <rect x="83%" y="30" width="4%" height="40" fill="#0ecb81" rx="1" />
          </svg>
          
          <div className="flex justify-between text-[10px] text-dark-text-secondary mt-4 border-t border-dark-border/30 pt-2 font-mono">
            <span>14:00</span>
            <span>14:05</span>
            <span>14:10</span>
            <span>14:15</span>
            <span>14:20</span>
            <span>14:25</span>
          </div>
        </div>
      </div>

      {/* Order Book Panel */}
      <div className="lg:col-span-3 bg-dark-card border border-dark-border rounded-xl p-4 flex flex-col min-h-[480px]">
        <h3 className="font-bold text-white text-sm border-b border-dark-border pb-3 mb-3">Order Book</h3>
        
        {/* Table Headers */}
        <div className="grid grid-cols-3 text-[10px] font-mono text-dark-text-secondary mb-2 px-1">
          <span>Price(USDT)</span>
          <span className="text-right">Size(BTC)</span>
          <span className="text-right">Total(BTC)</span>
        </div>

        {/* Asks (Sell Orders) - Rendered lowest price bottom */}
        <div className="flex-1 flex flex-col justify-end space-y-1 font-mono text-xs">
          {[...mockAsks].reverse().map((ask, idx) => (
            <div key={idx} className="grid grid-cols-3 relative px-1 py-0.5 hover:bg-neutral-800/40 rounded transition-all">
              {/* Depth bar indicator */}
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
            $98,420.50
            <span className="text-[10px] text-dark-text-secondary font-medium ml-1">Spread 4.50</span>
          </span>
          <span className="text-xs text-dark-text-secondary">$98,421.25 Estimated</span>
        </div>

        {/* Bids (Buy Orders) - Rendered highest price top */}
        <div className="flex-1 flex flex-col justify-start space-y-1 font-mono text-xs">
          {mockBids.map((bid, idx) => (
            <div key={idx} className="grid grid-cols-3 relative px-1 py-0.5 hover:bg-neutral-800/40 rounded transition-all">
              {/* Depth bar indicator */}
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

      {/* Trade Execution Panel */}
      <div className="lg:col-span-3 bg-dark-card border border-dark-border rounded-xl p-4 flex flex-col">
        <h3 className="font-bold text-white text-sm border-b border-dark-border pb-3 mb-4">Execute Trade</h3>
        
        {/* BUY / SELL Switch */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            onClick={() => setOrderSide('BUY')}
            className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              orderSide === 'BUY'
                ? 'bg-brand-green text-dark-bg shadow-lg shadow-brand-green/10'
                : 'bg-dark-bg text-dark-text-secondary hover:text-white border border-dark-border'
            }`}
          >
            BUY
          </button>
          <button
            onClick={() => setOrderSide('SELL')}
            className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              orderSide === 'SELL'
                ? 'bg-brand-red text-white shadow-lg shadow-brand-red/10'
                : 'bg-dark-bg text-dark-text-secondary hover:text-white border border-dark-border'
            }`}
          >
            SELL
          </button>
        </div>

        {/* LIMIT / MARKET Tabs */}
        <div className="flex border-b border-dark-border/40 pb-2 mb-4 text-xs font-semibold text-dark-text-secondary space-x-4">
          <span 
            onClick={() => setOrderType('LIMIT')}
            className={`cursor-pointer pb-1.5 transition-colors ${orderType === 'LIMIT' ? 'border-b-2 border-brand-green text-white' : 'hover:text-white'}`}
          >
            Limit
          </span>
          <span 
            onClick={() => setOrderType('MARKET')}
            className={`cursor-pointer pb-1.5 transition-colors ${orderType === 'MARKET' ? 'border-b-2 border-brand-green text-white' : 'hover:text-white'}`}
          >
            Market
          </span>
        </div>

        {/* Input Form */}
        <form onSubmit={handleOrderSubmit} className="space-y-4">
          {orderType === 'LIMIT' && (
            <div>
              <div className="flex justify-between text-xs text-dark-text-secondary mb-1">
                <span>Price</span>
                <span>USDT</span>
              </div>
              <input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-green font-mono"
              />
            </div>
          )}

          <div>
            <div className="flex justify-between text-xs text-dark-text-secondary mb-1">
              <span>Amount</span>
              <span>BTC</span>
            </div>
            <input
              type="number"
              step="0.001"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-green font-mono"
            />
          </div>

          {/* Size percentage slider ticks */}
          <div className="grid grid-cols-4 gap-1.5 pt-1 text-[10px] text-dark-text-secondary font-mono">
            <span className="bg-dark-bg hover:bg-neutral-800 border border-dark-border py-1 text-center rounded cursor-pointer">25%</span>
            <span className="bg-dark-bg hover:bg-neutral-800 border border-dark-border py-1 text-center rounded cursor-pointer">50%</span>
            <span className="bg-dark-bg hover:bg-neutral-800 border border-dark-border py-1 text-center rounded cursor-pointer">75%</span>
            <span className="bg-dark-bg hover:bg-neutral-800 border border-dark-border py-1 text-center rounded cursor-pointer">100%</span>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className={`w-full py-3 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
                orderSide === 'BUY'
                  ? 'bg-brand-green text-dark-bg hover:opacity-90 font-black'
                  : 'bg-brand-red text-white hover:opacity-90 font-black'
              }`}
            >
              {orderSide} {marketSymbol}
            </button>
          </div>
        </form>
      </div>

      {/* Recent Trades panel */}
      <div className="lg:col-span-12 bg-dark-card border border-dark-border rounded-xl p-4">
        <h3 className="font-bold text-white text-sm border-b border-dark-border pb-3 mb-4">Recent Market Trades</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="text-[10px] text-dark-text-secondary uppercase border-b border-dark-border/40 pb-2">
                <th className="pb-2">Time</th>
                <th className="pb-2">Price(USDT)</th>
                <th className="pb-2 text-right">Size(BTC)</th>
                <th className="pb-2 text-right">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border/20">
              {mockRecentTrades.map((trade, idx) => (
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
    </div>
  );
};
