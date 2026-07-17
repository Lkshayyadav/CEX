import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, ArrowRight, AlertCircle, Info, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth, type AuthUser } from '../context/AuthContext';

interface LoginResponse {
  success: boolean;
  data: {
    accessToken: string;
    user: AuthUser;
  };
}

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Read registration redirection message
  const infoMessage = location.state?.message as string | undefined;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await api.post<LoginResponse>('/auth/login', {
        identifier,
        password,
      });

      if (response.data && response.data.success) {
        const { accessToken, user } = response.data.data;
        // Update context & localStorage
        login(accessToken, user);
        // Redirect to dashboard
        navigate('/dashboard');
      } else {
        setError('Login failed. Unexpected response structure.');
      }
    } catch (err: any) {
      console.error('Login failed:', err);
      const errMsg = err.response?.data?.error?.message || 'Invalid credentials or login failed.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
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

        {infoMessage && !error && (
          <div className="flex items-center space-x-2 p-3.5 bg-brand-green/10 border border-brand-green/20 rounded-xl text-xs text-brand-green">
            <Info className="w-4 h-4 flex-shrink-0" />
            <span>{infoMessage}</span>
          </div>
        )}

        {error && (
          <div className="flex items-center space-x-2 p-3.5 bg-brand-red/10 border border-brand-red/20 rounded-xl text-xs text-brand-red">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={onSubmit}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label className="text-xs font-semibold text-dark-text-secondary uppercase tracking-wider">Email or Username</label>
              <div className="mt-1.5 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-dark-text-secondary" />
                </div>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="bg-dark-bg border border-dark-border rounded-xl w-full pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-green transition-all"
                  placeholder="name@domain.com or username"
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
              disabled={loading}
              className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-semibold rounded-xl text-dark-bg bg-brand-green hover:opacity-90 focus:outline-none transition-all items-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>Authenticate Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
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
