import React, { useState, useEffect } from 'react';
import { Wallet, ArrowDownCircle, ArrowUpCircle, RefreshCw, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface BalanceDTO {
  id: string;
  userId: string;
  assetId: string;
  free: string;
  locked: string;
  asset: {
    id: string;
    symbol: string;
    name: string;
    decimals: number;
  };
}

interface DisplayBalance {
  symbol: string;
  name: string;
  free: string;
  locked: string;
  total: string;
  usdValue: string;
}

const ASSET_PRICES: Record<string, number> = {
  USDT: 1.0,
  BTC: 98420.50,
  ETH: 3845.20,
  SOL: 186.75,
};

const DEFAULT_ASSETS = [
  { symbol: 'USDT', name: 'Tether USD' },
  { symbol: 'BTC', name: 'Bitcoin' },
  { symbol: 'ETH', name: 'Ethereum' },
  { symbol: 'SOL', name: 'Solana' },
];

export const WalletPage: React.FC = () => {
  const { isLoggedIn } = useAuth();
  const [balances, setBalances] = useState<BalanceDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [depositAsset, setDepositAsset] = useState('USDT');
  const [depositAmount, setDepositAmount] = useState('1000.00');
  const [isSimulating, setIsSimulating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const fetchBalances = async () => {
    if (!isLoggedIn) return;
    try {
      const response = await api.get<{ success: boolean; data: BalanceDTO[] }>('/balances');
      if (response.data && response.data.success) {
        setBalances(response.data.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch wallet balances:', err);
      setError(err.response?.data?.error?.message || 'Failed to fetch asset balances.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalances();
  }, [isLoggedIn]);

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSimulating(true);
    setError(null);
    setShowSuccess(false);

    try {
      const response = await api.post('/balances/deposit', {
        assetSymbol: depositAsset,
        amount: depositAmount,
      });

      if (response.data && response.data.success) {
        setShowSuccess(true);
        await fetchBalances(); // reload balances
        setTimeout(() => setShowSuccess(false), 4000);
      } else {
        setError('Simulated deposit failed.');
      }
    } catch (err: any) {
      console.error('Deposit simulation failed:', err);
      setError(err.response?.data?.error?.message || 'Deposit simulation failed.');
    } finally {
      setIsSimulating(false);
    }
  };

  // Merge default assets list with actual database balance records
  const displayBalances: DisplayBalance[] = DEFAULT_ASSETS.map((def) => {
    const found = balances.find((b) => b.asset.symbol.toUpperCase() === def.symbol);
    const freeNum = found ? parseFloat(found.free) : 0;
    const lockedNum = found ? parseFloat(found.locked) : 0;
    const totalNum = freeNum + lockedNum;
    const price = ASSET_PRICES[def.symbol] || 0;
    const usdEquivalent = totalNum * price;

    // Formatting decimals nicely
    const formatDecimals = def.symbol === 'USDT' ? 2 : 8;

    return {
      symbol: def.symbol,
      name: def.name,
      free: freeNum.toFixed(formatDecimals),
      locked: lockedNum.toFixed(formatDecimals),
      total: totalNum.toFixed(formatDecimals),
      usdValue: `$${usdEquivalent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    };
  });

  // Calculate overall portfolio value in USD
  const totalPortfolioValue = displayBalances.reduce((sum, item) => {
    const numericStr = item.usdValue.replace(/[$,]/g, '');
    const val = parseFloat(numericStr);
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center flex-col space-y-4">
        <Loader2 className="w-8 h-8 text-brand-green animate-spin" />
        <p className="text-dark-text-secondary text-sm">Verifying ledger entries...</p>
      </div>
    );
  }

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
              ${totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
              <span className="text-xs text-dark-text-secondary font-mono font-medium">USDT EQUIVALENT</span>
            </h1>
            <p className="text-xs text-brand-green flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-green inline-block mr-1.5 auto-pulse"></span>
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

      {error && (
        <div className="flex items-center space-x-2 p-3.5 bg-brand-red/10 border border-brand-red/20 rounded-xl text-xs text-brand-red">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

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
                {displayBalances.map((asset) => (
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
