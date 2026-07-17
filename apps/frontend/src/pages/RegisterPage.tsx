import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, User as UserIcon, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../lib/api';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/auth/register', {
        email,
        username,
        password,
      });

      if (response.data && response.data.success) {
        // Redirect to login page on success
        navigate('/login', { state: { message: 'Registration successful! Please log in.' } });
      } else {
        setError('Failed to register. Unexpected response from server.');
      }
    } catch (err: any) {
      console.error('Registration failed:', err);
      const errMsg = err.response?.data?.error?.message || 'Registration failed. Please try again.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-dark-card border border-dark-border p-8 rounded-2xl">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-white">Create Account</h2>
          <p className="mt-2 text-sm text-dark-text-secondary">
            Get started with sub-millisecond execution speeds
          </p>
        </div>

        {error && (
          <div className="flex items-center space-x-2 p-3.5 bg-brand-red/10 border border-brand-red/20 rounded-xl text-xs text-brand-red">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={onSubmit}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label className="text-xs font-semibold text-dark-text-secondary uppercase tracking-wider">Username</label>
              <div className="mt-1.5 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon className="h-4 w-4 text-dark-text-secondary" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-dark-bg border border-dark-border rounded-xl w-full pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-green transition-all"
                  placeholder="trader101"
                />
              </div>
            </div>

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

          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                required
                className="h-4 w-4 bg-dark-bg border-dark-border rounded text-brand-green focus:ring-brand-green"
              />
            </div>
            <div className="ml-3 text-xs">
              <label htmlFor="terms" className="text-dark-text-secondary">
                I agree to the{' '}
                <a href="#" className="font-semibold text-brand-green hover:underline">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#" className="font-semibold text-brand-green hover:underline">
                  Privacy Policy
                </a>
              </label>
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
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="text-center pt-2">
          <p className="text-xs text-dark-text-secondary">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-brand-green hover:underline">
              Sign in instead
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
