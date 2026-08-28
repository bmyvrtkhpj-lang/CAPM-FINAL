import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Activity, Gauge, Target, Zap, Percent, DollarSign } from 'lucide-react';
import { MetricCard } from '@/components/MetricCard';
import { GlassPanel } from '@/components/GlassPanel';
import { ChartTooltip } from '@/components/ChartTooltip';
import { LoadingState, ErrorState, SkeletonCard } from '@/components/States';
import { useFundReturns } from '@/lib/useFundReturns';
import { computeMetrics, computeGrowth } from '@/lib/finance';
import type { FundMeta, Benchmark, Period } from '@/lib/types';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';

interface DashboardProps {
  selectedFund: FundMeta | null;
  benchmark: Benchmark;
  period: Period;
}

export function Dashboard({ selectedFund, benchmark, period }: DashboardProps) {
  const { data: returns, loading, error, refetch } = useFundReturns(selectedFund, benchmark, period);

  const metrics = useMemo(() => returns ? computeMetrics(returns) : null, [returns]);
  const growth = useMemo(() => returns ? computeGrowth(returns) : [], [returns]);

  const chartData = useMemo(() => {
    const step = Math.max(1, Math.floor(growth.length / 40));
    return growth.filter((_, i) => i % step === 0).map(p => ({
      date: p.date.slice(0, 7),
      fund: Math.round(p.fund),
      benchmark: Math.round(p.benchmark),
    }));
  }, [growth]);

  const benchLabel = benchmark.replace('NIFTY_', 'Nifty ').replace('_', ' ');

  return (
    <div className="space-y-6 animate-fade-in">
      {loading && !metrics && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
          <GlassPanel className="p-6">
            <LoadingState message="Fetching real NAV history and computing metrics..." />
          </GlassPanel>
        </>
      )}

      {error && !loading && (
        <GlassPanel className="p-6">
          <ErrorState message={error} onRetry={refetch} />
        </GlassPanel>
      )}

      {metrics && returns && (
        <>
          {/* Metric summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            <MetricCard
              label="Alpha"
              value={`${metrics.alpha >= 0 ? '+' : ''}${metrics.alpha.toFixed(2)}%`}
              sublabel={metrics.alpha >= 0 ? 'Outperforming' : 'Underperforming'}
              icon={Zap}
              accent="orange"
              trend={metrics.alpha >= 0 ? 'up' : 'down'}
            />
            <MetricCard
              label="Beta"
              value={metrics.beta.toFixed(2)}
              sublabel={metrics.beta > 1 ? 'Aggressive' : 'Defensive'}
              icon={Activity}
              accent="blue"
              trend={metrics.beta > 1 ? 'up' : 'down'}
            />
            <MetricCard
              label="Sharpe Ratio"
              value={metrics.sharpe.toFixed(2)}
              sublabel={metrics.sharpe > 1 ? 'Excellent' : metrics.sharpe > 0 ? 'Adequate' : 'Poor'}
              icon={Gauge}
              accent="teal"
              trend={metrics.sharpe > 1 ? 'up' : 'neutral'}
            />
            <MetricCard
              label="Volatility"
              value={`${metrics.volatility.toFixed(1)}%`}
              sublabel="Annualized"
              icon={Activity}
              accent="blue"
              trend="neutral"
            />
            <MetricCard
              label="Max Drawdown"
              value={`${metrics.maxDrawdown.toFixed(1)}%`}
              sublabel="Worst peak-to-trough"
              icon={TrendingDown}
              accent="orange"
              trend="down"
            />
            <MetricCard
              label="SIP Returns"
              value={`${metrics.sipReturns >= 0 ? '+' : ''}${metrics.sipReturns.toFixed(1)}%`}
              sublabel="₹1000/mo"
              icon={DollarSign}
              accent="teal"
              trend={metrics.sipReturns >= 0 ? 'up' : 'down'}
            />
          </div>

          {/* Growth chart */}
          <GlassPanel className="p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <TrendingUp size={18} className="text-teal-400" />
                  Growth of ₹10,000
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {selectedFund?.schemeName ?? 'Fund'} vs {benchLabel} · {period}
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-gray-400">
                  <span className="w-3 h-0.5 bg-teal-400" /> Fund
                </span>
                <span className="flex items-center gap-1.5 text-gray-400">
                  <span className="w-3 h-0.5 bg-blue-400" /> Benchmark
                </span>
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fundGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0F766E" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#0F766E" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="benchGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563EB" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={40} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<ChartTooltip prefix="₹" decimals={0} />} />
                  <ReferenceLine y={10000} stroke="rgba(255,255,255,0.1)" strokeDasharray="4 4" />
                  <Area type="monotone" dataKey="fund" name="Fund" stroke="#0F766E" strokeWidth={2} fill="url(#fundGrad)" />
                  <Area type="monotone" dataKey="benchmark" name="Benchmark" stroke="#2563EB" strokeWidth={1.5} fill="url(#benchGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassPanel>

          {/* Secondary metrics row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <GlassPanel className="p-5" hover>
              <div className="flex items-center gap-2 mb-3">
                <Target size={16} className="text-blue-400" />
                <h4 className="text-sm font-semibold text-white">Risk-Adjusted</h4>
              </div>
              <div className="space-y-2.5">
                <MetricRow label="Sortino Ratio" value={metrics.sortino.toFixed(2)} />
                <MetricRow label="Information Ratio" value={metrics.informationRatio.toFixed(2)} />
                <MetricRow label="Treynor Ratio" value={metrics.treynor.toFixed(2)} />
                <MetricRow label="R²" value={`${metrics.rSquared.toFixed(1)}%`} />
              </div>
            </GlassPanel>

            <GlassPanel className="p-5" hover>
              <div className="flex items-center gap-2 mb-3">
                <Percent size={16} className="text-teal-400" />
                <h4 className="text-sm font-semibold text-white">Returns</h4>
              </div>
              <div className="space-y-2.5">
                <MetricRow label="CAGR" value={`${metrics.cagr.toFixed(2)}%`} accent={metrics.cagr >= 0 ? 'up' : 'down'} />
                <MetricRow label="SIP XIRR" value={`${metrics.sipReturns.toFixed(1)}%`} accent={metrics.sipReturns >= 0 ? 'up' : 'down'} />
                <MetricRow label="Volatility (Ann.)" value={`${metrics.volatility.toFixed(1)}%`} />
                <MetricRow label="Max Drawdown" value={`${metrics.maxDrawdown.toFixed(1)}%`} accent="down" />
              </div>
            </GlassPanel>

            <GlassPanel className="p-5" hover>
              <div className="flex items-center gap-2 mb-3">
                <Activity size={16} className="text-orange-400" />
                <h4 className="text-sm font-semibold text-white">Capture Ratios</h4>
              </div>
              <div className="space-y-2.5">
                <MetricRow label="Upside Capture" value={`${metrics.upsideCapture.toFixed(0)}%`} accent={metrics.upsideCapture > 100 ? 'up' : 'neutral'} />
                <MetricRow label="Downside Capture" value={`${metrics.downsideCapture.toFixed(0)}%`} accent={metrics.downsideCapture < 100 ? 'up' : 'down'} />
                <MetricRow label="Beta" value={metrics.beta.toFixed(2)} />
                <MetricRow label="Alpha (Ann.)" value={`${metrics.alpha >= 0 ? '+' : ''}${metrics.alpha.toFixed(2)}%`} accent={metrics.alpha >= 0 ? 'up' : 'down'} />
              </div>
            </GlassPanel>
          </div>
        </>
      )}
    </div>
  );
}

function MetricRow({ label, value, accent }: { label: string; value: string; accent?: 'up' | 'down' | 'neutral' }) {
  const color = accent === 'up' ? 'text-emerald-400' : accent === 'down' ? 'text-rose-400' : 'text-white';
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-400">{label}</span>
      <span className={`text-sm tnum font-medium ${color}`}>{value}</span>
    </div>
  );
}
