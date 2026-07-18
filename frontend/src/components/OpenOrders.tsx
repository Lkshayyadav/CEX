import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, XCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { Order } from '@cex/types';
import type { AxiosError } from 'axios';

interface BackendError {
  success: false;
  error: { message: string };
}

interface OrdersResponse {
  success: true;
  data: Order[];
}

import { useSubscription } from '../context/WebSocketContext';

interface OpenOrdersProps {
  marketSymbol?: string;
  refreshTrigger?: number;
}

export const OpenOrders: React.FC<OpenOrdersProps> = ({ marketSymbol, refreshTrigger }) => {
  const { user, isLoggedIn } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancellingIds, setCancellingIds] = useState<Set<string>>(new Set());

  const symbolKey = marketSymbol ? marketSymbol.replace('/', '_') : null;

  useSubscription(symbolKey ? `order:${symbolKey}` : null, (event: any) => {
    const { type, data } = event;
    if (!type || !data || !user) return;

    const handleSingleOrderUpdate = (order: any) => {
      if (order.userId !== user.id) return;

      const formattedOrder: Order = {
        ...order,
        createdAt: new Date(order.createdAt),
        updatedAt: new Date(order.updatedAt),
      };

      if (type === 'ORDER_PLACED') {
        setOrders((prev) => {
          if (prev.some((o) => o.id === formattedOrder.id)) return prev;
          return [formattedOrder, ...prev];
        });
      } else if (type === 'ORDER_CANCELLED') {
        setOrders((prev) => prev.filter((o) => o.id !== formattedOrder.id));
      } else if (type === 'ORDER_MATCHED') {
        setOrders((prev) => {
          if (formattedOrder.status === 'FILLED') {
            return prev.filter((o) => o.id !== formattedOrder.id);
          } else {
            const idx = prev.findIndex((o) => o.id === formattedOrder.id);
            if (idx !== -1) {
              const next = [...prev];
              next[idx] = formattedOrder;
              return next;
            } else {
              return [formattedOrder, ...prev];
            }
          }
        });
      }
    };

    if (data.order) {
      handleSingleOrderUpdate(data.order);
    }
    if (Array.isArray(data.makerUpdates)) {
      data.makerUpdates.forEach((makerOrder: any) => {
        handleSingleOrderUpdate(makerOrder);
      });
    }
  });

  const fetchOrders = useCallback(async () => {
    if (!isLoggedIn) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<OrdersResponse>('/orders');
      if (res.data.success) {
        // Keep both OPEN and PARTIALLY_FILLED orders
        setOrders(res.data.data.filter((o) => o.status === 'OPEN' || o.status === 'PARTIALLY_FILLED'));
      }
    } catch (err) {
      const axiosErr = err as AxiosError<BackendError>;
      const msg = axiosErr.response?.data?.error?.message ?? 'Failed to fetch orders.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders, refreshTrigger]);

  const handleCancel = async (orderId: string) => {
    setCancellingIds((prev) => new Set(prev).add(orderId));
    try {
      const res = await api.delete<{ success: true; message: string }>(`/orders/${orderId}`);
      if (res.data.success) {
        toast.success('Order cancelled successfully.', { icon: '🗑️' });
        // Optimistic removal from local state
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
      }
    } catch (err) {
      const axiosErr = err as AxiosError<BackendError>;
      const msg = axiosErr.response?.data?.error?.message ?? 'Cancellation failed.';
      toast.error(msg);
    } finally {
      setCancellingIds((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="text-center py-6 text-xs text-dark-text-secondary">
        <a href="/login" className="text-brand-green hover:underline font-semibold">
          Sign in
        </a>{' '}
        to view your open orders.
      </div>
    );
  }

  return (
    <div className="lg:col-span-12 bg-dark-card border border-dark-border rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-dark-border pb-3 mb-4">
        <h3 className="font-bold text-white text-sm">Open Orders</h3>
        <button
          onClick={fetchOrders}
          disabled={loading}
          className="flex items-center space-x-1 text-[10px] text-dark-text-secondary hover:text-white transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {loading && orders.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-brand-green animate-spin" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-8 space-y-3 text-center">
          <span className="text-xs text-brand-red font-semibold">{error}</span>
          <button
            onClick={fetchOrders}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-brand-red/10 text-brand-red hover:bg-brand-red/20 transition-colors font-bold text-[10px] cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry Connection</span>
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-8 text-xs text-dark-text-secondary">
          No open orders found.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="text-[10px] text-dark-text-secondary uppercase border-b border-dark-border/40">
                <th className="pb-2 pr-4">Date</th>
                <th className="pb-2 pr-4">Market</th>
                <th className="pb-2 pr-4">Side</th>
                <th className="pb-2 pr-4">Type</th>
                <th className="pb-2 pr-4 text-right">Price</th>
                <th className="pb-2 pr-4 text-right">Quantity</th>
                <th className="pb-2 pr-4 text-right">Filled</th>
                <th className="pb-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border/20">
              {orders.map((order) => {
                const isCancelling = cancellingIds.has(order.id);
                const filledPct =
                  parseFloat(order.quantity) > 0
                    ? (
                        (parseFloat(order.filledQuantity) / parseFloat(order.quantity)) *
                        100
                      ).toFixed(1)
                    : '0.0';

                return (
                  <tr key={order.id} className="hover:bg-neutral-800/20 transition-all">
                    <td className="py-2.5 pr-4 text-dark-text-secondary whitespace-nowrap">
                      {new Date(order.createdAt).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-2.5 pr-4 text-white font-bold">
                      {order.market?.symbol ?? '—'}
                    </td>
                    <td className="py-2.5 pr-4">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          order.side === 'BUY'
                            ? 'bg-brand-green/10 text-brand-green'
                            : 'bg-brand-red/10 text-brand-red'
                        }`}
                      >
                        {order.side}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-dark-text-secondary">{order.type}</td>
                    <td className="py-2.5 pr-4 text-right text-white">
                      {order.price
                        ? parseFloat(order.price).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : 'MARKET'}
                    </td>
                    <td className="py-2.5 pr-4 text-right text-dark-text-primary">
                      {parseFloat(order.quantity).toFixed(6)}
                    </td>
                    <td className="py-2.5 pr-4 text-right">
                      <span className="text-dark-text-secondary">{filledPct}%</span>
                    </td>
                    <td className="py-2.5 text-right">
                      <button
                        onClick={() => handleCancel(order.id)}
                        disabled={isCancelling}
                        className="flex items-center space-x-1 ml-auto px-2 py-1 rounded-lg bg-brand-red/10 text-brand-red hover:bg-brand-red/20 transition-colors text-[10px] font-bold cursor-pointer disabled:opacity-50"
                      >
                        {isCancelling ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        <span>{isCancelling ? 'Cancelling...' : 'Cancel'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
