import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/WebSocketContext';
import type { OrderSide, OrderType, Order } from '@cex/types';
import type { AxiosError } from 'axios';

interface OrderEntryProps {
  marketSymbol: string; // e.g. "BTC/USDT"
  lastPrice: number;
  onOrderPlaced?: () => void;
}

interface BackendError {
  success: false;
  error: {
    message: string;
    details?: unknown;
  };
}

interface CreateOrderResponse {
  success: true;
  message: string;
  data: Order;
}

export const OrderEntry: React.FC<OrderEntryProps> = ({ marketSymbol, lastPrice, onOrderPlaced }) => {
  const { isLoggedIn } = useAuth();

  const [side, setSide] = useState<OrderSide>('BUY');
  const [type, setType] = useState<OrderType>('LIMIT');
  const [price, setPrice] = useState<string>(lastPrice.toString());
  const [quantity, setQuantity] = useState<string>('0.10');
  const [loading, setLoading] = useState(false);
  const [pendingOrderIds, setPendingOrderIds] = useState<Set<string>>(new Set());

  // WebSocket Subscription to check order status updates from engine
  const symbolKey = marketSymbol.replace('/', '_');
  useSubscription(`order:${symbolKey}`, (event: any) => {
    const { type: eventType, data } = event;
    if (!eventType || !data || !data.order) return;
    const orderId = data.order.id;

    if (pendingOrderIds.has(orderId)) {
      setPendingOrderIds((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
      toast.success(
        `Engine Confirmed: ${data.order.side} ${data.order.type} order is ${data.order.status}!`,
        { id: orderId, duration: 4000 }
      );
      if (onOrderPlaced) {
        onOrderPlaced();
      }
    }
  });

  // Derive base/quote from "BTC/USDT"
  const [base, quote] = marketSymbol.split('/');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isLoggedIn) {
      toast.error('You must be logged in to place an order.');
      return;
    }

    setLoading(true);

    const payload: {
      marketSymbol: string;
      side: OrderSide;
      type: OrderType;
      quantity: string;
      price?: string;
    } = {
      marketSymbol,         // backend validator accepts "BTC/USDT" format
      side,
      type,
      quantity,
    };

    if (type === 'LIMIT') {
      payload.price = price;
    }

    try {
      const response = await api.post<CreateOrderResponse>('/orders', payload);

      if (response.data.success) {
        const order = response.data.data;
        // Add to pending set
        setPendingOrderIds((prev) => {
          const next = new Set(prev);
          next.add(order.id);
          return next;
        });
        toast.loading('Awaiting Matching Engine settlement...', { id: order.id });
        // Clear quantity after success; keep price for quick re-orders
        setQuantity('0.10');
      }
    } catch (err) {
      const axiosErr = err as AxiosError<BackendError>;
      const errMsg =
        axiosErr.response?.data?.error?.message ??
        'Order placement failed. Please try again.';
      toast.error(errMsg, { duration: 5000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lg:col-span-3 bg-dark-card border border-dark-border rounded-xl p-4 flex flex-col">
      <h3 className="font-bold text-white text-sm border-b border-dark-border pb-3 mb-4">
        Execute Trade
      </h3>

      {/* BUY / SELL Switch */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          type="button"
          onClick={() => setSide('BUY')}
          className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            side === 'BUY'
              ? 'bg-brand-green text-dark-bg shadow-lg shadow-brand-green/10'
              : 'bg-dark-bg text-dark-text-secondary hover:text-white border border-dark-border'
          }`}
        >
          BUY
        </button>
        <button
          type="button"
          onClick={() => setSide('SELL')}
          className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            side === 'SELL'
              ? 'bg-brand-red text-white shadow-lg shadow-brand-red/10'
              : 'bg-dark-bg text-dark-text-secondary hover:text-white border border-dark-border'
          }`}
        >
          SELL
        </button>
      </div>

      {/* LIMIT / MARKET Tabs */}
      <div className="flex border-b border-dark-border/40 pb-2 mb-4 text-xs font-semibold text-dark-text-secondary space-x-4">
        {(['LIMIT', 'MARKET'] as OrderType[]).map((t) => (
          <span
            key={t}
            onClick={() => setType(t)}
            className={`cursor-pointer pb-1.5 transition-colors capitalize ${
              type === t ? 'border-b-2 border-brand-green text-white' : 'hover:text-white'
            }`}
          >
            {t.charAt(0) + t.slice(1).toLowerCase()}
          </span>
        ))}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="space-y-4 flex-1 flex flex-col">
        {type === 'LIMIT' && (
          <div>
            <div className="flex justify-between text-xs text-dark-text-secondary mb-1">
              <span>Price</span>
              <span>{quote}</span>
            </div>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-green font-mono"
              placeholder="0.00"
            />
          </div>
        )}

        <div>
          <div className="flex justify-between text-xs text-dark-text-secondary mb-1">
            <span>Amount</span>
            <span>{base}</span>
          </div>
          <input
            type="number"
            step="0.001"
            min="0.001"
            required
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-green font-mono"
            placeholder="0.000"
          />
        </div>

        {/* Quick-fill percentage buttons */}
        <div className="grid grid-cols-4 gap-1.5 text-[10px] text-dark-text-secondary font-mono">
          {[25, 50, 75, 100].map((pct) => (
            <button
              key={pct}
              type="button"
              className="bg-dark-bg hover:bg-neutral-800 border border-dark-border py-1 text-center rounded cursor-pointer transition-colors"
            >
              {pct}%
            </button>
          ))}
        </div>

        {/* Estimated cost line */}
        {type === 'LIMIT' && quantity && price && (
          <div className="text-[10px] text-dark-text-secondary font-mono flex justify-between px-1">
            <span>Est. Total</span>
            <span className="text-white">
              {(parseFloat(quantity || '0') * parseFloat(price || '0')).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              {quote}
            </span>
          </div>
        )}

        <div className="pt-1 mt-auto">
          <button
            type="submit"
            disabled={loading || pendingOrderIds.size > 0}
            className={`w-full py-3 rounded-xl text-xs font-black transition-all text-center cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50 ${
              side === 'BUY'
                ? 'bg-brand-green text-dark-bg hover:opacity-90'
                : 'bg-brand-red text-white hover:opacity-90'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Submitting to Queue...</span>
              </>
            ) : pendingOrderIds.size > 0 ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-dark-bg" />
                <span>Settling on Engine...</span>
              </>
            ) : (
              <span>
                {side} {marketSymbol}
              </span>
            )}
          </button>
        </div>
      </form>

      {/* Auth prompt */}
      {!isLoggedIn && (
        <p className="mt-3 text-[10px] text-center text-dark-text-secondary">
          <a href="/login" className="text-brand-green hover:underline font-semibold">
            Sign in
          </a>{' '}
          to place orders
        </p>
      )}
    </div>
  );
};
