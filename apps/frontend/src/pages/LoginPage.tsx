import React, { useState } from 'react';
import { Link, useOutletContext, useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn, ArrowRight } from 'lucide-react';

interface LayoutContext {
  isLoggedIn: boolean;
  handleLogin: () => void;
}

export const LoginPage: React.FC = () => {
  const { handleLogin } = useOutletContext<LayoutContext>();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate login approval
    handleLogin();
    navigate('/dashboard');
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-dark-card border border-dark-border p-8 rounded-2xl">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-white">Sign In</h2>
          <p className="mt-2 text-sm text-dark-text-secondary">
            Access your trading dashboard and portfolio balances
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={onSubmit}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label className="text-xs font-semibold text-dark-text-secondary uppercase tracking-wider">Email Address</label>
              <div className="mt-1.5 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-dark-text-secondary" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-dark-bg border border-dark-border rounded-xl w-full pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-green transition-all"
                  placeholder="name@domain.com"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-dark-text-secondary uppercase tracking-wider">Password</label>
              <div className="mt-1.5 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-dark-text-secondary" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-dark-bg border border-dark-border rounded-xl w-full pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-green transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 bg-dark-bg border-dark-border rounded text-brand-green focus:ring-brand-green"
              />
              <label htmlFor="remember-me" className="ml-2 block text-xs text-dark-text-secondary">
                Remember my session
              </label>
            </div>

            <div className="text-xs">
              <a href="#" className="font-semibold text-brand-green hover:underline">
                Forgot password?
              </a>
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-semibold rounded-xl text-dark-bg bg-brand-green hover:opacity-90 focus:outline-none transition-all items-center space-x-2 cursor-pointer"
            >
              <span>Authenticate Account</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

        <div className="text-center pt-2">
          <p className="text-xs text-dark-text-secondary">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-brand-green hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
