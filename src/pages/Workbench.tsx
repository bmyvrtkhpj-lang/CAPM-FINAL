import { useMemo } from 'react';
import { TrendingUp, Activity, TrendingDown, BarChart3, Info } from 'lucide-react';
import { GlassPanel } from '@/components/GlassPanel';
import { FundSearch } from '@/components/FundSearch';
import { PeriodSelector, BenchmarkSelector } from '@/components/Selectors';
import { ChartTooltip } from '@/components/ChartTooltip';
import { LoadingState, ErrorState } from '@/components/States';
import { useFundReturns } from '@/lib/useFundReturns';
import { computeMetrics, computeGrowth, computeRolling, computeDrawdown } from '@/lib/finance';
import type { FundMeta, Period, Benchmark } from '@/lib/types';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell, Legend,
} from 'recharts';

interface WorkbenchProps {
  selectedFund: FundMeta | null;
  onSelectFund: (f: FundMeta) => void;
  benchmark: Benchmark;
  onBenchmarkChange: (b: Benchmark) => void;
  period: Period;
  onPeriodChange: (p: Period) => void;
  directGrowthOnly: boolean;
  onToggleDirectGrowth: (v: boolean) => void;
}

export function Workbench({
  selectedFund, onSelectFund, benchmark, onBenchmarkChange,
  period, onPeriodChange, directGrowthOnly, onToggleDirectGrowth,
}: WorkbenchProps) {
  const { data: returns, loading, error, refetch } = useFundReturns(selectedFund, benchmark, period);

  const metrics = useMemo(() => returns ? computeMetrics(returns) : null, [returns]);
  const growth = useMemo(() => returns ? computeGrowth(returns) : [], [returns]);
  const rolling = useMemo(() => returns ? computeRolling(returns, 36) : [], [returns]);
  const drawdown = useMemo(() => returns ? computeDrawdown(returns) : [], [returns]);

  const growthData = useMemo(() => growth.map(p => ({
    date: p.date.slice(0, 7),
    fund: Math.round(p.fund),
    benchmark: Math.round(p.benchmark),
  })), [growth]);

  const drawdownData = useMemo(() => drawdown.map(p => ({
    date: p.date.slice(0, 7),
    drawdown: p.drawdown,
  })), [drawdown]);

  const benchLabel = benchmark.replace('NIFTY_', 'Nifty ').replace('_', ' ');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Search & selectors */}
      <GlassPanel className="p-5 space-y-4">
        <FundSearch
          selectedId={selectedFund?.schemeCode ?? null}
          onSelect={onSelectFund}
          directGrowthOnly={directGrowthOnly}
          onToggleDirectGrowth={onToggleDirectGrowth}
        />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Period</span>
            <PeriodSelector value={period} onChange={onPeriodChange} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Benchmark</span>
            <BenchmarkSelector value={benchmark} onChange={onBenchmarkChange} />
          </div>
        </div>
      </GlassPanel>

      {/* Fund info bar */}
      {selectedFund && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <InfoChip label="NAV" value={selectedFund.nav > 0 ? `₹${selectedFund.nav.toFixed(2)}` : '—'} />
          <InfoChip label="Scheme Code" value={String(selectedFund.schemeCode)} />
          <InfoChip label="Plan" value={selectedFund.isDirect ? 'Direct' : 'Regular'} />
          <InfoChip label="Option" value={selectedFund.isGrowth ? 'Growth' : 'IDCW'} />
          <InfoChip label="Alpha" value={metrics ? `${metrics.alpha >= 0 ? '+' : ''}${metrics.alpha.toFixed(2)}%` : '—'} accent={metrics ? (metrics.alpha >= 0 ? 'up' : 'down') : undefined} />
          <InfoChip label="Beta" value={metrics ? metrics.beta.toFixed(2) : '—'} />
        </div>
      )}

      {loading && !metrics && (
        <GlassPanel className="p-6">
          <LoadingState message="Fetching real NAV data from mfapi.in..." />
        </GlassPanel>
      )}

      {error && !loading && (
        <GlassPanel className="p-6">
          <ErrorState message={error} onRetry={refetch} />
        </GlassPanel>
      )}

      {metrics && returns && (
        <>
          {/* Growth of 10K */}
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
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={growthData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="wFundGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0F766E" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#0F766E" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="wBenchGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563EB" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={50} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<ChartTooltip prefix="₹" decimals={0} />} />
                  <ReferenceLine y={10000} stroke="rgba(255,255,255,0.1)" strokeDasharray="4 4" />
                  <Area type="monotone" dataKey="fund" name="Fund" stroke="#0F766E" strokeWidth={2} fill="url(#wFundGrad)" />
                  <Area type="monotone" dataKey="benchmark" name="Benchmark" stroke="#2563EB" strokeWidth={1.5} fill="url(#wBenchGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassPanel>

          {/* Rolling Beta/Alpha & Drawdown */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <GlassPanel className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-white font-semibold flex items-center gap-2">
                    <Activity size={18} className="text-blue-400" />
                    Rolling Alpha & Beta
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">36-month rolling window</p>
                </div>
              </div>
              {rolling.length > 0 ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={rolling.map(r => ({ date: r.date.slice(0, 7), alpha: r.alpha, beta: r.beta }))} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={50} />
                      <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip decimals={2} />} />
                      <Legend />
                      <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
                      <ReferenceLine y={1} stroke="rgba(37,99,235,0.15)" strokeDasharray="4 4" />
                      <Line type="monotone" dataKey="beta" name="Beta" stroke="#2563EB" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="alpha" name="Alpha (%)" stroke="#D97706" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-72 flex items-center justify-center text-sm text-gray-500">
                  <div className="text-center">
                    <Info size={24} className="mx-auto mb-2 text-gray-600" />
                    Need at least 36 months of data for rolling analysis.
                    <br />Try a longer period (3Y+).
                  </div>
                </div>
              )}
            </GlassPanel>

            <GlassPanel className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-white font-semibold flex items-center gap-2">
                    <TrendingDown size={18} className="text-orange-400" />
                    Historical Drawdown
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">Peak-to-trough decline over time</p>
                </div>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={drawdownData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#D97706" stopOpacity={0.6} />
                        <stop offset="100%" stopColor="#D97706" stopOpacity={0.15} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={50} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v.toFixed(0)}%`} />
                    <Tooltip content={<ChartTooltip suffix="%" decimals={1} />} />
                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
                    <Bar dataKey="drawdown" name="Drawdown" fill="url(#ddGrad)" radius={[2, 2, 0, 0]}>
                      {drawdownData.map((entry, i) => (
                        <Cell key={i} fill={entry.drawdown < -10 ? '#EF4444' : 'url(#ddGrad)'} fillOpacity={entry.drawdown < -10 ? 0.7 : 1} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassPanel>
          </div>

          {/* Full metrics table */}
          <GlassPanel className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={18} className="text-teal-400" />
              <h3 className="text-white font-semibold">Complete Metrics Breakdown</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-3">
              <MetricItem label="Alpha (Annualized)" value={`${metrics.alpha >= 0 ? '+' : ''}${metrics.alpha.toFixed(2)}%`} accent={metrics.alpha >= 0 ? 'up' : 'down'} />
              <MetricItem label="Beta" value={metrics.beta.toFixed(2)} />
              <MetricItem label="Sharpe Ratio" value={metrics.sharpe.toFixed(2)} accent={metrics.sharpe > 1 ? 'up' : 'neutral'} />
              <MetricItem label="Sortino Ratio" value={metrics.sortino.toFixed(2)} accent={metrics.sortino > 1 ? 'up' : 'neutral'} />
              <MetricItem label="Information Ratio" value={metrics.informationRatio.toFixed(2)} accent={metrics.informationRatio > 0 ? 'up' : 'down'} />
              <MetricItem label="Treynor Ratio" value={metrics.treynor.toFixed(2)} />
              <MetricItem label="R-Squared" value={`${metrics.rSquared.toFixed(1)}%`} />
              <MetricItem label="Volatility (Ann.)" value={`${metrics.volatility.toFixed(2)}%`} />
              <MetricItem label="CAGR" value={`${metrics.cagr.toFixed(2)}%`} accent={metrics.cagr >= 0 ? 'up' : 'down'} />
              <MetricItem label="Max Drawdown" value={`${metrics.maxDrawdown.toFixed(2)}%`} accent="down" />
              <MetricItem label="SIP Returns" value={`${metrics.sipReturns.toFixed(1)}%`} accent={metrics.sipReturns >= 0 ? 'up' : 'down'} />
              <MetricItem label="Upside Capture" value={`${metrics.upsideCapture.toFixed(0)}%`} />
              <MetricItem label="Downside Capture" value={`${metrics.downsideCapture.toFixed(0)}%`} />
            </div>
          </GlassPanel>
        </>
      )}
    </div>
  );
}

function InfoChip({ label, value, accent }: { label: string; value: string; accent?: 'up' | 'down' }) {
  const color = accent === 'up' ? 'text-emerald-400' : accent === 'down' ? 'text-rose-400' : 'text-white';
  return (
    <div className="glass rounded-xl px-4 py-3">
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-sm tnum font-semibold ${color}`}>{value}</p>
    </div>
  );
}

function MetricItem({ label, value, accent }: { label: string; value: string; accent?: 'up' | 'down' | 'neutral' }) {
  const color = accent === 'up' ? 'text-emerald-400' : accent === 'down' ? 'text-rose-400' : 'text-white';
  return (
    <div className="flex items-center justify-between border-b border-white/5 pb-2">
      <span className="text-xs text-gray-400">{label}</span>
      <span className={`text-sm tnum font-medium ${color}`}>{value}</span>
    </div>
  );
}
