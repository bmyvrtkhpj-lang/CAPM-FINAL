import { useMemo } from 'react';
import {
  TrendingUp, TrendingDown, Activity, Gauge, Target, Zap, Percent, DollarSign,
  ArrowUpRight, ArrowDownRight, Calendar, Award, AlertTriangle,
} from 'lucide-react';
import { MetricCard } from '@/components/MetricCard';
import { GlassPanel } from '@/components/GlassPanel';
import { ChartTooltip } from '@/components/ChartTooltip';
import { LoadingState, ErrorState, SkeletonCard } from '@/components/States';
import { useFundReturns } from '@/lib/useFundReturns';
import { computeMetrics, computeGrowth, computeDrawdown, computeRolling } from '@/lib/finance';
import type { FundMeta, Benchmark, Period, MonthlyReturn } from '@/lib/types';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, BarChart, Bar, Cell, LineChart, Line, Legend,
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
  const drawdown = useMemo(() => returns ? computeDrawdown(returns) : [], [returns]);
  const rolling = useMemo(() => returns ? computeRolling(returns, 36) : [], [returns]);

  const chartData = useMemo(() => {
    const step = Math.max(1, Math.floor(growth.length / 40));
    return growth.filter((_, i) => i % step === 0).map(p => ({
      date: p.date.slice(0, 7),
      fund: Math.round(p.fund),
      benchmark: Math.round(p.benchmark),
    }));
  }, [growth]);

  const drawdownData = useMemo(() => {
    const step = Math.max(1, Math.floor(drawdown.length / 50));
    return drawdown.filter((_, i) => i % step === 0).map(p => ({
      date: p.date.slice(0, 7),
      drawdown: p.drawdown,
    }));
  }, [drawdown]);

  const rollingData = useMemo(() =>
    rolling.map(r => ({ date: r.date.slice(0, 7), alpha: r.alpha, beta: r.beta })),
    [rolling]);

  const yearlyData = useMemo(() => computeYearlyReturns(returns), [returns]);
  const heatmapData = useMemo(() => computeHeatmapData(returns), [returns]);

  const benchLabel = benchmark.replace('NIFTY_', 'Nifty ').replace('_', ' ');
  const fundName = selectedFund?.schemeName ?? 'Fund';

  // Performance verdict
  const verdict = metrics ? getPerformanceVerdict(metrics) : null;

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
          {/* Fund summary header */}
          <GlassPanel className="p-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500/20 to-blue-600/20 border border-white/10 flex items-center justify-center shrink-0">
                  <Activity size={22} className="text-teal-400" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-white font-semibold text-base truncate">{fundName}</h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} /> {period}
                    </span>
                    <span>vs {benchLabel}</span>
                    <span>{returns.length} months</span>
                    {selectedFund && selectedFund.nav > 0 && (
                      <span className="text-gray-400">NAV ₹{selectedFund.nav.toFixed(2)}</span>
                    )}
                  </div>
                </div>
              </div>
              {verdict && (
                <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border ${verdict.bg} ${verdict.border}`}>
                  {verdict.icon}
                  <div>
                    <p className={`text-sm font-semibold ${verdict.text}`}>{verdict.title}</p>
                    <p className="text-xs text-gray-500">{verdict.detail}</p>
                  </div>
                </div>
              )}
            </div>
          </GlassPanel>

          {/* Primary metric cards */}
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
              sublabel={metrics.beta > 1 ? 'Aggressive' : metrics.beta > 0.5 ? 'Moderate' : 'Defensive'}
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
              label="CAGR"
              value={`${metrics.cagr >= 0 ? '+' : ''}${metrics.cagr.toFixed(2)}%`}
              sublabel="Compound annual"
              icon={TrendingUp}
              accent="teal"
              trend={metrics.cagr >= 0 ? 'up' : 'down'}
            />
          </div>

          {/* Growth chart + Drawdown chart */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Growth of 10K - takes 2 columns */}
            <GlassPanel className="p-6 xl:col-span-2">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-white font-semibold flex items-center gap-2">
                    <TrendingUp size={18} className="text-teal-400" />
                    Growth of ₹10,000
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {fundName} vs {benchLabel} · {period}
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

            {/* Drawdown chart */}
            <GlassPanel className="p-6">
              <div className="mb-5">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <TrendingDown size={18} className="text-orange-400" />
                  Historical Drawdown
                </h3>
                <p className="text-xs text-gray-500 mt-1">Peak-to-trough decline</p>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={drawdownData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="ddGradDash" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#D97706" stopOpacity={0.6} />
                        <stop offset="100%" stopColor="#D97706" stopOpacity={0.15} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={50} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v.toFixed(0)}%`} />
                    <Tooltip content={<ChartTooltip suffix="%" decimals={1} />} />
                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
                    <Bar dataKey="drawdown" name="Drawdown" fill="url(#ddGradDash)" radius={[2, 2, 0, 0]}>
                      {drawdownData.map((entry, i) => (
                        <Cell key={i} fill={entry.drawdown < -10 ? '#EF4444' : 'url(#ddGradDash)'} fillOpacity={entry.drawdown < -10 ? 0.7 : 1} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassPanel>
          </div>

          {/* Rolling Alpha & Beta */}
          {rollingData.length > 0 && (
            <GlassPanel className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-white font-semibold flex items-center gap-2">
                    <Activity size={18} className="text-blue-400" />
                    Rolling Alpha & Beta
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">36-month rolling window · stability of risk characteristics</p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1.5 text-gray-400">
                    <span className="w-3 h-0.5 bg-blue-400" /> Beta
                  </span>
                  <span className="flex items-center gap-1.5 text-gray-400">
                    <span className="w-3 h-0.5 bg-orange-400" /> Alpha
                  </span>
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={rollingData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
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
            </GlassPanel>
          )}

          {/* Secondary metrics panels */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <GlassPanel className="p-5" hover>
              <div className="flex items-center gap-2 mb-3">
                <Target size={16} className="text-blue-400" />
                <h4 className="text-sm font-semibold text-white">Risk-Adjusted</h4>
              </div>
              <div className="space-y-2.5">
                <MetricRow label="Sortino Ratio" value={metrics.sortino.toFixed(2)} accent={metrics.sortino > 1 ? 'up' : 'neutral'} />
                <MetricRow label="Information Ratio" value={metrics.informationRatio.toFixed(2)} accent={metrics.informationRatio > 0 ? 'up' : 'down'} />
                <MetricRow label="Treynor Ratio" value={metrics.treynor.toFixed(2)} />
                <MetricRow label="R-Squared" value={`${metrics.rSquared.toFixed(1)}%`} />
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
                <Award size={16} className="text-orange-400" />
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

          {/* Yearly performance table */}
          {yearlyData.length > 0 && (
            <GlassPanel className="p-6">
              <h3 className="text-white font-semibold flex items-center gap-2 mb-4">
                <Calendar size={18} className="text-teal-400" />
                Yearly Performance
              </h3>
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4 text-xs text-gray-500 uppercase tracking-wider font-medium">Year</th>
                      <th className="text-right py-3 px-4 text-xs text-gray-500 uppercase tracking-wider font-medium">Fund Return</th>
                      <th className="text-right py-3 px-4 text-xs text-gray-500 uppercase tracking-wider font-medium">Benchmark</th>
                      <th className="text-right py-3 px-4 text-xs text-gray-500 uppercase tracking-wider font-medium">Excess</th>
                      <th className="text-right py-3 px-4 text-xs text-gray-500 uppercase tracking-wider font-medium">Outperformance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {yearlyData.map(row => {
                      const excess = row.fundReturn - row.benchReturn;
                      const outperformed = excess >= 0;
                      return (
                        <tr key={row.year} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="py-3 px-4 text-white font-medium tnum">{row.year}</td>
                          <td className={`py-3 px-4 text-right tnum ${row.fundReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {row.fundReturn >= 0 ? '+' : ''}{row.fundReturn.toFixed(2)}%
                          </td>
                          <td className={`py-3 px-4 text-right tnum ${row.benchReturn >= 0 ? 'text-emerald-400/70' : 'text-rose-400/70'}`}>
                            {row.benchReturn >= 0 ? '+' : ''}{row.benchReturn.toFixed(2)}%
                          </td>
                          <td className={`py-3 px-4 text-right tnum font-medium ${excess >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {excess >= 0 ? '+' : ''}{excess.toFixed(2)}%
                          </td>
                          <td className="py-3 px-4 text-right">
                            {outperformed ? (
                              <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                                <ArrowUpRight size={14} /> Beat
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-rose-400">
                                <ArrowDownRight size={14} /> Lagged
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </GlassPanel>
          )}

          {/* Monthly returns heatmap */}
          {heatmapData.length > 0 && (
            <GlassPanel className="p-6">
              <h3 className="text-white font-semibold flex items-center gap-2 mb-1">
                <Activity size={18} className="text-blue-400" />
                Monthly Returns Heatmap
              </h3>
              <p className="text-xs text-gray-500 mb-4">Green = positive, Red = negative · darker = larger magnitude</p>
              <div className="overflow-x-auto scrollbar-thin">
                <HeatmapGrid data={heatmapData} />
              </div>
            </GlassPanel>
          )}
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

function HeatmapGrid({ data }: { data: HeatmapRow[] }) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return (
    <table className="w-full text-xs">
      <thead>
        <tr>
          <th className="text-left py-2 px-2 text-gray-500 font-medium">Year</th>
          {months.map(m => (
            <th key={m} className="text-center py-2 px-1 text-gray-500 font-medium">{m}</th>
          ))}
          <th className="text-right py-2 px-3 text-gray-500 font-medium">YTD</th>
        </tr>
      </thead>
      <tbody>
        {data.map(row => (
          <tr key={row.year}>
            <td className="py-1 px-2 text-gray-400 tnum font-medium">{row.year}</td>
            {Array.from({ length: 12 }).map((_, mi) => {
              const val = row.months[mi];
              return (
                <td key={mi} className="py-1 px-1 text-center">
                  {val !== null ? (
                    <div
                      className="rounded-md py-1.5 px-1 tnum text-[10px] font-medium transition-all hover:scale-110 hover:z-10 hover:relative cursor-default"
                      style={getHeatmapStyle(val)}
                      title={`${row.year}-${months[mi]}: ${(val * 100).toFixed(2)}%`}
                    >
                      {(val * 100).toFixed(1)}
                    </div>
                  ) : (
                    <div className="py-1.5 px-1 text-gray-700 text-[10px]">—</div>
                  )}
                </td>
              );
            })}
            <td className="py-1 px-3 text-right tnum font-medium" style={getHeatmapStyle(row.ytd)}>
              {row.ytd >= 0 ? '+' : ''}{(row.ytd * 100).toFixed(1)}%
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function getHeatmapStyle(val: number): React.CSSProperties {
  const pct = val * 100;
  const intensity = Math.min(1, Math.abs(pct) / 8);
  if (pct >= 0) {
    return {
      backgroundColor: `rgba(16, 185, 129, ${0.08 + intensity * 0.35})`,
      color: pct > 3 ? '#6EE7B7' : '#9CA3AF',
    };
  } else {
    return {
      backgroundColor: `rgba(239, 68, 68, ${0.08 + intensity * 0.35})`,
      color: pct < -3 ? '#FCA5A5' : '#9CA3AF',
    };
  }
}

function getPerformanceVerdict(m: { alpha: number; sharpe: number; beta: number; maxDrawdown: number; cagr: number }) {
  if (m.sharpe > 1.5 && m.alpha > 2) {
    return {
      title: 'Exceptional',
      detail: `Sharpe ${m.sharpe.toFixed(2)} · Alpha +${m.alpha.toFixed(1)}%`,
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      text: 'text-emerald-400',
      icon: <Award size={18} className="text-emerald-400" />,
    };
  }
  if (m.sharpe > 0.8 && m.alpha > 0) {
    return {
      title: 'Solid Performance',
      detail: `Sharpe ${m.sharpe.toFixed(2)} · Alpha +${m.alpha.toFixed(1)}%`,
      bg: 'bg-teal-500/10',
      border: 'border-teal-500/20',
      text: 'text-teal-400',
      icon: <TrendingUp size={18} className="text-teal-400" />,
    };
  }
  if (m.alpha < 0 && m.sharpe < 0.5) {
    return {
      title: 'Underperforming',
      detail: `Alpha ${m.alpha.toFixed(1)}% · Sharpe ${m.sharpe.toFixed(2)}`,
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/20',
      text: 'text-rose-400',
      icon: <AlertTriangle size={18} className="text-rose-400" />,
    };
  }
  return {
    title: 'Moderate',
    detail: `Sharpe ${m.sharpe.toFixed(2)} · Beta ${m.beta.toFixed(2)}`,
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    text: 'text-blue-400',
    icon: <Activity size={18} className="text-blue-400" />,
  };
}

interface HeatmapRow {
  year: number;
  months: (number | null)[];
  ytd: number;
}

function computeHeatmapData(returns: MonthlyReturn[] | null): HeatmapRow[] {
  if (!returns || returns.length === 0) return [];
  const byYear = new Map<number, (number | null)[]>();
  for (const r of returns) {
    const year = parseInt(r.date.slice(0, 4));
    const month = parseInt(r.date.slice(5, 7)) - 1;
    if (!byYear.has(year)) byYear.set(year, Array(12).fill(null));
    byYear.get(year)![month] = r.fund;
  }
  const rows: HeatmapRow[] = [];
  for (const [year, months] of byYear) {
    const validMonths = months.filter((m): m is number => m !== null);
    const ytd = validMonths.length > 0
      ? validMonths.reduce((p, r) => p * (1 + r), 1) - 1
      : 0;
    rows.push({ year, months, ytd });
  }
  return rows.sort((a, b) => b.year - a.year);
}

interface YearlyReturn {
  year: number;
  fundReturn: number;
  benchReturn: number;
}

function computeYearlyReturns(returns: MonthlyReturn[] | null): YearlyReturn[] {
  if (!returns || returns.length === 0) return [];
  const byYear = new Map<number, { fund: number[]; bench: number[] }>();
  for (const r of returns) {
    const year = parseInt(r.date.slice(0, 4));
    if (!byYear.has(year)) byYear.set(year, { fund: [], bench: [] });
    byYear.get(year)!.fund.push(r.fund);
    byYear.get(year)!.bench.push(r.benchmark);
  }
  const rows: YearlyReturn[] = [];
  for (const [year, { fund, bench }] of byYear) {
    const fundReturn = fund.reduce((p, r) => p * (1 + r), 1) - 1;
    const benchReturn = bench.reduce((p, r) => p * (1 + r), 1) - 1;
    rows.push({ year, fundReturn: fundReturn * 100, benchReturn: benchReturn * 100 });
  }
  return rows.sort((a, b) => b.year - a.year);
}
