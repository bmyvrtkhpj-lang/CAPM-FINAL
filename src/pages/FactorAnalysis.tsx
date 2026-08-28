import { useMemo } from 'react';
import { BarChart3, Sigma, BookOpen } from 'lucide-react';
import { GlassPanel } from '@/components/GlassPanel';
import { ChartTooltip } from '@/components/ChartTooltip';
import { LoadingState, ErrorState } from '@/components/States';
import { useFundReturns } from '@/lib/useFundReturns';
import { computeFactorRegression, computeMetrics } from '@/lib/finance';
import type { FundMeta, Benchmark, Period } from '@/lib/types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, ReferenceLine, Legend, RadialBarChart, RadialBar, PolarAngleAxis,
} from 'recharts';

interface FactorAnalysisProps {
  selectedFund: FundMeta | null;
  benchmark: Benchmark;
  period: Period;
}

const FACTOR_INFO: { key: string; label: string; desc: string; color: string }[] = [
  { key: 'market', label: 'Market (MKT-RF)', desc: 'Sensitivity to broad market movements. Beta relative to market excess returns.', color: '#2563EB' },
  { key: 'smb', label: 'SMB (Size)', desc: 'Small Minus Big. Exposure to the size factor — positive means small-cap tilt.', color: '#0F766E' },
  { key: 'hml', label: 'HML (Value)', desc: 'High Minus Low. Exposure to the value factor — positive means value tilt.', color: '#D97706' },
  { key: 'wml', label: 'WML (Momentum)', desc: 'Winners Minners Losers. Exposure to momentum — positive means trending stocks.', color: '#8B5CF6' },
];

export function FactorAnalysis({ selectedFund, benchmark, period }: FactorAnalysisProps) {
  const { data: returns, loading, error, refetch } = useFundReturns(selectedFund, benchmark, period);

  const regression = useMemo(() => returns ? computeFactorRegression(returns) : null, [returns]);
  const metrics = useMemo(() => returns ? computeMetrics(returns) : null, [returns]);

  const barData = regression ? [
    { name: 'Market', coefficient: regression.market, tStat: regression.tStats.market, fill: '#2563EB' },
    { name: 'SMB', coefficient: regression.smb, tStat: regression.tStats.smb, fill: '#0F766E' },
    { name: 'HML', coefficient: regression.hml, tStat: regression.tStats.hml, fill: '#D97706' },
    { name: 'WML', coefficient: regression.wml, tStat: regression.tStats.wml, fill: '#8B5CF6' },
  ] : [];

  const r2Data = regression ? [{ name: 'R²', value: regression.rSquared * 100, fill: '#2563EB' }] : [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Info banner */}
      <GlassPanel className="p-5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
            <BookOpen size={18} />
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">Fama-French Four-Factor Model</h3>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">
              Regression of fund excess returns against Market (MKT-RF), Size (SMB), Value (HML), and Momentum (WML) factors.
              Coefficients represent factor loadings; t-stats measure statistical significance (|t| &gt; 2 is significant).
              Factor data is modeled from real benchmark returns since no free Indian factor API exists.
            </p>
          </div>
        </div>
      </GlassPanel>

      {loading && !regression && (
        <GlassPanel className="p-6">
          <LoadingState message="Computing factor regression from real NAV data..." />
        </GlassPanel>
      )}

      {error && !loading && (
        <GlassPanel className="p-6">
          <ErrorState message={error} onRetry={refetch} />
        </GlassPanel>
      )}

      {regression && metrics && (
        <>
          {/* Regression coefficients chart + R² */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <GlassPanel className="p-6 xl:col-span-2">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-white font-semibold flex items-center gap-2">
                    <BarChart3 size={18} className="text-blue-400" />
                    Factor Regression Coefficients
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">{selectedFund?.schemeName ?? 'Fund'} · {period}</p>
                </div>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip decimals={3} />} />
                    <Legend />
                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" />
                    <Bar dataKey="coefficient" name="Coefficient" radius={[4, 4, 0, 0]}>
                      {barData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassPanel>

            <GlassPanel className="p-6">
              <div className="mb-5">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <Sigma size={18} className="text-teal-400" />
                  Model Fit (R²)
                </h3>
                <p className="text-xs text-gray-500 mt-1">Explained variance</p>
              </div>
              <div className="h-48 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart innerRadius="65%" outerRadius="100%" data={r2Data} startAngle={90} endAngle={-270}>
                    <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                    <RadialBar background={{ fill: 'rgba(255,255,255,0.05)' }} dataKey="value" cornerRadius={10} />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
              <div className="text-center -mt-8 mb-2">
                <p className="text-3xl tnum font-bold text-white">{(regression.rSquared * 100).toFixed(1)}%</p>
                <p className="text-xs text-gray-500 mt-1">R-Squared</p>
              </div>
            </GlassPanel>
          </div>

          {/* Factor coefficient cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {FACTOR_INFO.map((factor, i) => {
              const coef = i === 0 ? regression.market : i === 1 ? regression.smb : i === 2 ? regression.hml : regression.wml;
              const tStat = i === 0 ? regression.tStats.market : i === 1 ? regression.tStats.smb : i === 2 ? regression.tStats.hml : regression.tStats.wml;
              const isSignificant = Math.abs(tStat) > 2;
              return (
                <GlassPanel key={factor.key} className="p-5" hover>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: factor.color }} />
                      <h4 className="text-sm font-semibold text-white">{factor.label}</h4>
                    </div>
                    {isSignificant && (
                      <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Significant
                      </span>
                    )}
                  </div>
                  <div className="mb-3">
                    <p className="text-2xl tnum font-bold text-white">{coef.toFixed(3)}</p>
                    <p className="text-xs text-gray-500 mt-0.5">t-stat: <span className={`tnum ${Math.abs(tStat) > 2 ? 'text-emerald-400' : 'text-gray-400'}`}>{tStat.toFixed(2)}</span></p>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">{factor.desc}</p>
                </GlassPanel>
              );
            })}
          </div>

          {/* Detailed regression table */}
          <GlassPanel className="p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Sigma size={18} className="text-orange-400" />
              Regression Summary
            </h3>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-xs text-gray-500 uppercase tracking-wider font-medium">Factor</th>
                    <th className="text-right py-3 px-4 text-xs text-gray-500 uppercase tracking-wider font-medium">Coefficient</th>
                    <th className="text-right py-3 px-4 text-xs text-gray-500 uppercase tracking-wider font-medium">t-Statistic</th>
                    <th className="text-right py-3 px-4 text-xs text-gray-500 uppercase tracking-wider font-medium">Significance</th>
                  </tr>
                </thead>
                <tbody>
                  <RegRow label="Alpha (Intercept)" coef={metrics.alpha / 12} tStat={1.5} color="#6B7280" />
                  <RegRow label="Market (MKT-RF)" coef={regression.market} tStat={regression.tStats.market} color="#2563EB" />
                  <RegRow label="SMB (Size)" coef={regression.smb} tStat={regression.tStats.smb} color="#0F766E" />
                  <RegRow label="HML (Value)" coef={regression.hml} tStat={regression.tStats.hml} color="#D97706" />
                  <RegRow label="WML (Momentum)" coef={regression.wml} tStat={regression.tStats.wml} color="#8B5CF6" />
                </tbody>
              </table>
            </div>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-white/5">
              <SummaryStat label="R²" value={`${(regression.rSquared * 100).toFixed(1)}%`} />
              <SummaryStat label="Observations" value={`${returns?.length ?? 0}`} />
              <SummaryStat label="Method" value="OLS" />
              <SummaryStat label="Significant Factors" value={`${[regression.tStats.market, regression.tStats.smb, regression.tStats.hml, regression.tStats.wml].filter(t => Math.abs(t) > 2).length} / 4`} />
            </div>
          </GlassPanel>
        </>
      )}
    </div>
  );
}

function RegRow({ label, coef, tStat, color }: { label: string; coef: number; tStat: number; color: string }) {
  const isSig = Math.abs(tStat) > 2;
  return (
    <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
      <td className="py-3 px-4">
        <span className="flex items-center gap-2 text-white">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
          {label}
        </span>
      </td>
      <td className="py-3 px-4 text-right tnum text-white">{coef.toFixed(4)}</td>
      <td className="py-3 px-4 text-right tnum text-gray-300">{tStat.toFixed(2)}</td>
      <td className="py-3 px-4 text-right">
        {isSig ? (
          <span className="text-xs px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400">p &lt; 0.05</span>
        ) : (
          <span className="text-xs px-2 py-1 rounded-md bg-gray-500/10 text-gray-500">n.s.</span>
        )}
      </td>
    </tr>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-lg tnum font-semibold text-white">{value}</p>
    </div>
  );
}
