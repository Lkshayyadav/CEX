import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type Time,
  ColorType,
} from 'lightweight-charts';

// ── Seed data generator ──────────────────────────────────────────────────────
function generateSeedCandles(basePrice: number, count = 60): CandlestickData<Time>[] {
  const candles: CandlestickData<Time>[] = [];
  // Start 60 minutes ago
  const nowSec = Math.floor(Date.now() / 1000);
  let price = basePrice;

  for (let i = count - 1; i >= 0; i--) {
    const time = (nowSec - i * 60) as Time;
    const change = (Math.random() - 0.48) * basePrice * 0.004;
    const open = price;
    const close = +(price + change).toFixed(2);
    const high = +(Math.max(open, close) + Math.random() * basePrice * 0.002).toFixed(2);
    const low = +(Math.min(open, close) - Math.random() * basePrice * 0.002).toFixed(2);
    candles.push({ time, open, high, low, close });
    price = close;
  }
  return candles;
}

// ── Public ref API ────────────────────────────────────────────────────────────
export interface CandlestickChartHandle {
  updateCandle: (candle: CandlestickData<Time>) => void;
}

interface CandlestickChartProps {
  basePrice: number;
  symbol: string;
}

export const CandlestickChart = forwardRef<CandlestickChartHandle, CandlestickChartProps>(
  ({ basePrice, symbol }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

    // Expose updateCandle to parent for future real-time kline feeds
    useImperativeHandle(ref, () => ({
      updateCandle(candle: CandlestickData<Time>) {
        seriesRef.current?.update(candle);
      },
    }));

    // ── Chart lifecycle ───────────────────────────────────────────────────────
    useEffect(() => {
      if (!containerRef.current) return;

      const chart = createChart(containerRef.current, {
        width: containerRef.current.clientWidth,
        height: 380,
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

      const series = chart.addCandlestickSeries({
        upColor: '#0ecb81',
        downColor: '#f6465d',
        borderUpColor: '#0ecb81',
        borderDownColor: '#f6465d',
        wickUpColor: '#0ecb81',
        wickDownColor: '#f6465d',
      });

      const seed = generateSeedCandles(basePrice);
      series.setData(seed);
      chart.timeScale().fitContent();

      chartRef.current = chart;
      seriesRef.current = series;

      // ── Responsive resize ─────────────────────────────────────────────────
      const ro = new ResizeObserver(() => {
        if (containerRef.current) {
          chart.resize(containerRef.current.clientWidth, 380);
        }
      });
      ro.observe(containerRef.current);

      return () => {
        ro.disconnect();
        chart.remove();
        chartRef.current = null;
        seriesRef.current = null;
      };
      // Re-create chart when symbol changes (fresh seed data)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [symbol]);

    // Update series when basePrice changes without re-creating the chart
    useEffect(() => {
      if (!seriesRef.current) return;
      const newSeed = generateSeedCandles(basePrice);
      seriesRef.current.setData(newSeed);
      chartRef.current?.timeScale().fitContent();
    }, [basePrice]);

    return (
      <div className="flex-1 relative" style={{ minHeight: 380 }}>
        <div ref={containerRef} style={{ width: '100%', height: 380 }} />
      </div>
    );
  }
);

CandlestickChart.displayName = 'CandlestickChart';
