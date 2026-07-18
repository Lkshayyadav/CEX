import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type Time,
  ColorType,
  CandlestickSeries,
} from 'lightweight-charts';
import { useWebSocket, useSubscription } from '../context/WebSocketContext';
import { api } from '../lib/api';

export interface CandlestickChartHandle {
  updateCandle: (candle: CandlestickData<Time>) => void;
}

interface CandlestickChartProps {
  basePrice: number;
  symbol: string;
  interval?: string;
}

export const CandlestickChart = forwardRef<CandlestickChartHandle, CandlestickChartProps>(
  ({ basePrice: _basePrice, symbol, interval = '1m' }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
    const lastCandleRef = useRef<CandlestickData<Time> | null>(null);

    const { isConnected } = useWebSocket();

    // Expose updateCandle to parent for future real-time kline feeds
    useImperativeHandle(ref, () => ({
      updateCandle(candle: CandlestickData<Time>) {
        seriesRef.current?.update(candle);
      },
    }));

    // ── Fetch history kline data ─────────────────────────────────────────────
    const fetchHistoryAndLoad = async () => {
      try {
        // The REST endpoint is /api/v1/markets/:symbol/candles
        const response = await api.get(`/markets/${symbol.replace('/', '-')}/candles`, {
          params: { interval },
        });
        if (response.data?.success) {
          const fetchedCandles = response.data.data;
          
          if (fetchedCandles.length > 0) {
            // Sort by time ascending
            const sortedCandles = [...fetchedCandles]
              .map((c: any) => ({
                time: c.time as Time,
                open: parseFloat(c.open),
                high: parseFloat(c.high),
                low: parseFloat(c.low),
                close: parseFloat(c.close),
              }))
              .sort((a, b) => (a.time as number) - (b.time as number));
              
            seriesRef.current?.setData(sortedCandles);
            lastCandleRef.current = sortedCandles[sortedCandles.length - 1];
          } else {
            // Set empty data instead of seeding mock
            seriesRef.current?.setData([]);
            lastCandleRef.current = null;
          }
          chartRef.current?.timeScale().fitContent();
        }
      } catch (err) {
        console.error('Failed to fetch historical candles:', err);
      }
    };

    // ── Chart lifecycle ───────────────────────────────────────────────────────
    useEffect(() => {
      if (!containerRef.current) return;

      const initialHeight = containerRef.current.clientHeight || 380;
      const chart = createChart(containerRef.current, {
        width: containerRef.current.clientWidth,
        height: initialHeight,
        layout: {
          background: { type: ColorType.Solid, color: '#0d0f14' },
          textColor: '#6b7280',
          fontFamily: "'Inter', 'ui-sans-serif', sans-serif",
          fontSize: 11,
        },
        grid: {
          vertLines: { color: '#1e2129' },
          horzLines: { color: '#1e2129' },
        },
        crosshair: {
          vertLine: { color: '#374151', width: 1, style: 2 },
          horzLine: { color: '#374151', width: 1, style: 2 },
        },
        rightPriceScale: {
          borderColor: '#1e2129',
          textColor: '#6b7280',
        },
        timeScale: {
          borderColor: '#1e2129',
          timeVisible: true,
          secondsVisible: false,
        },
        handleScroll: true,
        handleScale: true,
      });

      const series = chart.addSeries(CandlestickSeries, {
        upColor: '#0ecb81',
        downColor: '#f6465d',
        borderUpColor: '#0ecb81',
        borderDownColor: '#f6465d',
        wickUpColor: '#0ecb81',
        wickDownColor: '#f6465d',
      });

      chartRef.current = chart;
      seriesRef.current = series;

      // Initial history load
      if (isConnected) {
        fetchHistoryAndLoad();
      }

      // ── Responsive resize ─────────────────────────────────────────────────
      const ro = new ResizeObserver(() => {
        if (containerRef.current) {
          const w = containerRef.current.clientWidth;
          const h = containerRef.current.clientHeight || 380;
          chart.resize(w, h);
        }
      });
      ro.observe(containerRef.current);

      return () => {
        ro.disconnect();
        chart.remove();
        chartRef.current = null;
        seriesRef.current = null;
        lastCandleRef.current = null;
      };
      // Re-create chart when symbol or interval changes
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [symbol, interval]);

    // Handle WebSocket reconnect and symbol/interval change history updates
    useEffect(() => {
      if (isConnected && seriesRef.current) {
        fetchHistoryAndLoad();
      }
    }, [isConnected, symbol, interval]);

    // Subscribe to live order matching engine events for trades
    const symbolKey = symbol.replace('/', '_');
    useSubscription(`order:${symbolKey}`, (event: any) => {
      const { type, data } = event;
      if (type !== 'ORDER_MATCHED' || !data || !data.fills) return;

      const fills = data.fills;
      if (!Array.isArray(fills) || fills.length === 0) return;

      fills.forEach((fill: any) => {
        const tradePrice = parseFloat(fill.price);
        const tradeTimeSec = Math.floor(Date.now() / 1000);
        
        let stepSec = 60;
        const cleanInterval = (interval || '1m').toLowerCase();
        if (cleanInterval === '15m') stepSec = 15 * 60;
        else if (cleanInterval === '1h') stepSec = 60 * 60;
        else if (cleanInterval === '1d') stepSec = 24 * 60 * 60;

        const candleTime = (Math.floor(tradeTimeSec / stepSec) * stepSec) as Time;

        const lastCandle = lastCandleRef.current;
        let updatedCandle: CandlestickData<Time>;

        if (lastCandle && lastCandle.time === candleTime) {
          // Update existing candle in the current bucket
          updatedCandle = {
            time: candleTime,
            open: lastCandle.open,
            high: Math.max(lastCandle.high, tradePrice),
            low: Math.min(lastCandle.low, tradePrice),
            close: tradePrice,
          };
        } else {
          // Append new candle (bucket rollover)
          const openPrice = lastCandle ? lastCandle.close : tradePrice;
          updatedCandle = {
            time: candleTime,
            open: openPrice,
            high: Math.max(openPrice, tradePrice),
            low: Math.min(openPrice, tradePrice),
            close: tradePrice,
          };
        }

        seriesRef.current?.update(updatedCandle);
        lastCandleRef.current = updatedCandle;
      });
    });

    return (
      <div className="flex-1 w-full h-full relative" style={{ minHeight: '100%' }}>
        <div ref={containerRef} className="w-full h-full" style={{ minHeight: '100%' }} />
      </div>
    );
  }
);

CandlestickChart.displayName = 'CandlestickChart';
