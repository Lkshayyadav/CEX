import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Wallet, TrendingUp, User, LogOut, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

interface BalanceResponse {
  success: boolean;
  data: Array<{
    free: string;
    locked: string;
    asset: {
      symbol: string;
      name: string;
    };
  }>;
}

export const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isLoggedIn, logout } = useAuth();
  const [usdtBalance, setUsdtBalance] = useState<string>('0.00');

  useEffect(() => {
    const fetchBalance = async () => {
      if (!isLoggedIn) return;
      try {
        const response = await api.get<BalanceResponse>('/balances');
        if (response.data && response.data.success) {
          const usdt = response.data.data.find(b => b.asset.symbol === 'USDT');
          if (usdt) {
            // Convert to fixed 2 decimals for display
            const val = parseFloat(usdt.free);
            setUsdtBalance(isNaN(val) ? '0.00' : val.toFixed(2));
          } else {
            setUsdtBalance('0.00');
          }
        }
      } catch (error) {
        console.error('Failed to fetch header balances:', error);
      }
    };

    fetchBalance();
    
    // Set up polling interval to keep balances in sync
    const interval = setInterval(fetchBalance, 10000);
    return () => clearInterval(interval);
  }, [isLoggedIn]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-dark-bg text-dark-text-primary flex flex-col font-sans selection:bg-brand-green selection:text-dark-bg">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 bg-dark-bg/85 backdrop-blur-md border-b border-dark-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Left: Branding */}
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center space-x-2 text-xl font-bold tracking-tight">
              <span className="w-8 h-8 rounded-lg bg-brand-green flex items-center justify-center text-dark-bg">
                <TrendingUp className="w-5 h-5 font-black" />
              </span>
              <span className="bg-gradient-to-r from-white via-neutral-100 to-neutral-400 bg-clip-text text-transparent">
                ANTIGRAVITY <span className="text-brand-green font-semibold">CEX</span>
              </span>
            </Link>

            {/* Navigation links */}
            <nav className="hidden md:flex space-x-1">
              <Link
                to="/"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === '/'
                    ? 'text-brand-green bg-dark-card'
                    : 'text-dark-text-secondary hover:text-dark-text-primary hover:bg-dark-card/50'
                }`}
              >
                Markets
              </Link>
              <Link
                to="/dashboard"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === '/dashboard'
                    ? 'text-brand-green bg-dark-card'
                    : 'text-dark-text-secondary hover:text-dark-text-primary hover:bg-dark-card/50'
                }`}
              >
                Trade
              </Link>
              <Link
                to="/wallet"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === '/wallet'
                    ? 'text-brand-green bg-dark-card'
                    : 'text-dark-text-secondary hover:text-dark-text-primary hover:bg-dark-card/50'
                }`}
              >
                Wallet
              </Link>
            </nav>
          </div>

          {/* Right: User actions & simulated balances */}
          <div className="flex items-center space-x-4">
            {isLoggedIn && user ? (
              <>
                {/* Simulated Wallet Indicator */}
                <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-dark-card border border-dark-border">
                  <Wallet className="w-4 h-4 text-brand-green" />
                  <span className="text-xs text-dark-text-secondary">USDT:</span>
                  <span className="text-xs font-mono font-bold text-white">
                    ${usdtBalance}{' '}
                    <span className="text-[10px] text-brand-green">USDT</span>
                  </span>
                </div>

                {/* User indicator */}
                <div className="flex items-center space-x-2 text-sm text-dark-text-primary">
                  <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center border border-dark-border">
                    <User className="w-4 h-4 text-dark-text-secondary" />
                  </div>
                  <span className="hidden lg:inline text-xs text-dark-text-secondary">{user.username}</span>
                </div>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg text-dark-text-secondary hover:text-brand-red hover:bg-dark-card transition-colors cursor-pointer"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="px-4 py-1.5 rounded-lg text-sm font-medium text-dark-text-primary hover:bg-dark-card transition-all font-semibold"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-1.5 rounded-lg text-sm font-medium bg-brand-green text-dark-bg hover:opacity-90 transition-all font-semibold"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-dark-bg border-t border-dark-border py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between text-xs text-dark-text-secondary space-y-2 md:space-y-0">
          <div>
            &copy; 2026 ANTIGRAVITY Exchange Inc. All rights reserved.
          </div>
          <div className="flex space-x-4">
            <a href="#" className="hover:text-dark-text-primary">API Docs</a>
            <a href="#" className="hover:text-dark-text-primary">Terms of Service</a>
            <a href="#" className="hover:text-dark-text-primary">Privacy Policy</a>
            <span className="text-brand-green flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-brand-green inline-block mr-1.5 animate-pulse"></span>Engine Online</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
