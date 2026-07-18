import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, ArrowDownRight, Zap, Shield, BarChart3, ChevronRight } from 'lucide-react';

interface TickerData {
  symbol: string;
  name: string;
  price: string;
  change24h: string;
  isPositive: boolean;
  volume24h: string;
}

const mockTickers: TickerData[] = [
  { symbol: 'BTC/USDT', name: 'Bitcoin', price: '$98,420.50', change24h: '+4.85%', isPositive: true, volume24h: '1.24B USDT' },
  { symbol: 'ETH/USDT', name: 'Ethereum', price: '$3,845.20', change24h: '-1.20%', isPositive: false, volume24h: '780.4M USDT' },
  { symbol: 'SOL/USDT', name: 'Solana', price: '$186.75', change24h: '+8.14%', isPositive: true, volume24h: '420.1M USDT' },
  { symbol: 'ADA/USDT', name: 'Cardano', price: '$0.524', change24h: '+0.12%', isPositive: true, volume24h: '56.3M USDT' },
];

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-16 py-8">
      {/* Hero Section */}
      <section className="text-center max-w-4xl mx-auto space-y-6 pt-8">
        <div className="inline-flex items-center space-x-2 bg-brand-green/10 border border-brand-green/20 rounded-full px-4 py-1.5 text-xs font-semibold text-brand-green">
          <Zap className="w-3.5 h-3.5" />
          <span>Unlocking Sub-Millisecond Trade Fills via Redis Backbone</span>
        </div>
        
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
          Next-Generation High Performance <br />
          <span className="bg-gradient-to-r from-brand-green via-emerald-400 to-teal-500 bg-clip-text text-transparent">
            Centralized Asset Exchange
          </span>
        </h1>
        
        <p className="text-lg text-dark-text-secondary max-w-2xl mx-auto">
          Experience ultra-low latency matching, atomic ledger updates, and real-time order books powered by our price-time priority in-memory engine.
        </p>

        <div className="flex justify-center space-x-4 pt-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center space-x-2 bg-brand-green text-dark-bg hover:opacity-90 transition-all font-bold px-6 py-3 rounded-xl cursor-pointer"
          >
            <span>Start Trading Now</span>
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate('/wallet')}
            className="flex items-center space-x-2 bg-dark-card border border-dark-border hover:bg-neutral-800 text-white transition-all font-semibold px-6 py-3 rounded-xl cursor-pointer"
          >
            <span>View Demo Portfolio</span>
          </button>
        </div>
      </section>

      {/* Markets Tickers Grid */}
      <section className="space-y-6">
        <div className="flex justify-between items-end border-b border-dark-border pb-4">
          <h2 className="text-xl font-bold text-white">Market Overview</h2>
          <span className="text-xs text-dark-text-secondary">Updates real-time</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {mockTickers.map((ticker) => (
            <div
              key={ticker.symbol}
              onClick={() => navigate('/dashboard')}
              className="bg-dark-card border border-dark-border rounded-xl p-5 hover:border-brand-green/30 transition-all cursor-pointer group"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-white group-hover:text-brand-green transition-colors">{ticker.symbol}</h3>
                  <p className="text-xs text-dark-text-secondary">{ticker.name}</p>
                </div>
                <span
                  className={`flex items-center space-x-1 text-xs font-semibold px-2 py-0.5 rounded ${
                    ticker.isPositive
                      ? 'bg-brand-green/10 text-brand-green'
                      : 'bg-brand-red/10 text-brand-red'
                  }`}
                >
                  {ticker.isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  <span>{ticker.change24h}</span>
                </span>
              </div>

              <div className="mt-4 pt-4 border-t border-dark-border/40 flex justify-between items-end">
                <div>
                  <p className="text-sm font-mono font-bold text-white">{ticker.price}</p>
                  <p className="text-[10px] text-dark-text-secondary">Vol: {ticker.volume24h}</p>
                </div>
                <span className="text-xs text-brand-green group-hover:translate-x-1 transition-transform inline-flex items-center font-medium">
                  Trade <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Feature Pillars */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-dark-card border border-dark-border rounded-xl p-6 space-y-4">
          <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center text-brand-green">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-white">Sub-Millisecond Execution</h3>
          <p className="text-sm text-dark-text-secondary leading-relaxed">
            In-memory FIFO order book sorting handles thousands of limit and market orders per second without databases lock contention.
          </p>
        </div>

        <div className="bg-dark-card border border-dark-border rounded-xl p-6 space-y-4">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
            <Shield className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-white">Atomic Balance Ledger</h3>
          <p className="text-sm text-dark-text-secondary leading-relaxed">
            Database transactions lock assets during order state transitions, preventing double-spends and assuring mathematical consistency.
          </p>
        </div>

        <div className="bg-dark-card border border-dark-border rounded-xl p-6 space-y-4">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
            <BarChart3 className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-white">Dynamic Stream Feeds</h3>
          <p className="text-sm text-dark-text-secondary leading-relaxed">
            Engine matches trigger instant Redis Pub/Sub events that stream order depth changes and trades via low-latency WebSockets.
          </p>
        </div>
      </section>
    </div>
  );
};
