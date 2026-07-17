import React, { useState } from 'react';
import { Wallet, ArrowDownCircle, ArrowUpCircle, RefreshCw, CheckCircle2 } from 'lucide-react';

interface AssetBalance {
  symbol: string;
  name: string;
  free: string;
  locked: string;
  total: string;
  usdValue: string;
}

const mockBalances: AssetBalance[] = [
  { symbol: 'USDT', name: 'Tether USD', free: '5,000.00', locked: '0.00', total: '5,000.00', usdValue: '$5,000.00' },
  { symbol: 'BTC', name: 'Bitcoin', free: '0.07500000', locked: '0.01000000', total: '0.08500000', usdValue: '$8,365.74' },
  { symbol: 'ETH', name: 'Ethereum', free: '1.25000000', locked: '0.00000000', total: '1.25000000', usdValue: '$4,806.50' },
  { symbol: 'SOL', name: 'Solana', free: '12.40000000', locked: '4.50000000', total: '16.90000000', usdValue: '$3,156.07' },
];

export const WalletPage: React.FC = () => {
  const [depositAsset, setDepositAsset] = useState('USDT');
  const [depositAmount, setDepositAmount] = useState('1000.00');
  const [isSimulating, setIsSimulating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSimulating(true);
    setTimeout(() => {
      setIsSimulating(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }, 1500);
  };

  return (
    <div className="space-y-8 py-4">
      {/* Portfolio overview card */}
      <section className="bg-dark-card border border-dark-border rounded-2xl p-6 relative overflow-hidden">
        {/* Glow decorative bubble */}
        <div className="absolute -right-24 -top-24 w-64 h-64 rounded-full bg-brand-green/5 blur-3xl pointer-events-none"></div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-dark-text-secondary text-sm">
              <Wallet className="w-4 h-4 text-brand-green" />
              <span>Estimated Portfolio Value</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              $21,328.31 <span className="text-xs text-dark-text-secondary font-mono font-medium">USDT EQUIVALENT</span>
            </h1>
            <p className="text-xs text-brand-green flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-green inline-block mr-1.5 animate-pulse"></span>
              Ledger verified & synchronized
            </p>
          </div>

          <div className="flex space-x-3">
            <button className="flex items-center space-x-2 bg-brand-green text-dark-bg hover:opacity-90 transition-all font-bold px-4 py-2.5 rounded-xl text-xs cursor-pointer">
              <ArrowDownCircle className="w-4 h-4" />
              <span>Deposit Funds</span>
            </button>
            <button className="flex items-center space-x-2 bg-dark-bg border border-dark-border hover:bg-neutral-800 text-white transition-all font-semibold px-4 py-2.5 rounded-xl text-xs cursor-pointer">
              <ArrowUpCircle className="w-4 h-4" />
              <span>Withdraw Funds</span>
            </button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Balances List Table */}
        <div className="lg:col-span-2 bg-dark-card border border-dark-border rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">Asset Balances</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="text-[10px] text-dark-text-secondary uppercase border-b border-dark-border/40 pb-2">
                  <th className="pb-2">Asset</th>
                  <th className="pb-2 text-right">Free</th>
                  <th className="pb-2 text-right">Locked</th>
                  <th className="pb-2 text-right">Total</th>
                  <th className="pb-2 text-right">Est. Value (USD)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border/20">
                {mockBalances.map((asset) => (
                  <tr key={asset.symbol} className="hover:bg-neutral-800/10 transition-colors">
                    <td className="py-4">
                      <div className="flex items-center space-x-2.5">
                        <span className="w-7 h-7 rounded-lg bg-neutral-800 text-[10px] font-bold text-white flex items-center justify-center border border-dark-border">
                          {asset.symbol}
                        </span>
                        <div>
                          <span className="font-bold text-white block">{asset.symbol}</span>
                          <span className="text-[10px] text-dark-text-secondary font-sans">{asset.name}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 text-right text-dark-text-primary">{asset.free}</td>
                    <td className="py-4 text-right text-dark-text-secondary">{asset.locked}</td>
                    <td className="py-4 text-right text-white font-bold">{asset.total}</td>
                    <td className="py-4 text-right text-white">{asset.usdValue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Deposit Simulator Panel */}
        <div className="bg-dark-card border border-dark-border rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-white mb-1">Deposit Simulator</h2>
            <p className="text-xs text-dark-text-secondary mb-6">
              Credit assets directly to your exchange balance ledger for testing.
            </p>

            <form onSubmit={handleDeposit} className="space-y-4">
              <div>
                <label className="text-[10px] font-semibold text-dark-text-secondary uppercase tracking-wider block mb-1">Select Asset</label>
                <select
                  value={depositAsset}
                  onChange={(e) => setDepositAsset(e.target.value)}
                  className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-green font-mono"
                >
                  <option value="USDT">USDT (Tether USD)</option>
                  <option value="BTC">BTC (Bitcoin)</option>
                  <option value="ETH">ETH (Ethereum)</option>
                  <option value="SOL">SOL (Solana)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-dark-text-secondary uppercase tracking-wider block mb-1">Deposit Amount</label>
                <input
                  type="number"
                  step="0.0001"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-green font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={isSimulating}
                className="w-full py-3 rounded-xl text-xs font-bold text-center bg-brand-green text-dark-bg hover:opacity-90 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {isSimulating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing Transaction...</span>
                  </>
                ) : (
                  <span>Submit Simulated Deposit</span>
                )}
              </button>
            </form>
          </div>

          {showSuccess && (
            <div className="mt-4 flex items-center space-x-2 p-3 bg-brand-green/10 border border-brand-green/20 rounded-xl text-xs text-brand-green">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>Successfully credited {depositAmount} {depositAsset} to your wallet ledger!</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
