import { useMemo } from 'react';
import { Download, FileBarChart, Table, FileSpreadsheet } from 'lucide-react';
import { GlassPanel } from '@/components/GlassPanel';
import { LoadingState, ErrorState } from '@/components/States';
import { useFundReturns } from '@/lib/useFundReturns';
import { computeMetrics, computeFactorRegression, computeGrowth } from '@/lib/finance';
import type { FundMeta, Benchmark, Period } from '@/lib/types';

interface ReportBuilderProps {
  selectedFund: FundMeta | null;
  benchmark: Benchmark;
  period: Period;
}

export function ReportBuilder({ selectedFund, benchmark, period }: ReportBuilderProps) {
  const { data: returns, loading, error, refetch } = useFundReturns(selectedFund, benchmark, period);

  const metrics = useMemo(() => returns ? computeMetrics(returns) : null, [returns]);
  const regression = useMemo(() => returns ? computeFactorRegression(returns) : null, [returns]);
  const growth = useMemo(() => returns ? computeGrowth(returns) : [], [returns]);

  const benchLabel = benchmark.replace('NIFTY_', 'Nifty ').replace('_', ' ');
  const fundName = selectedFund?.schemeName ?? 'Fund';

  const metricsRows: [string, string][] = metrics ? [
    ['Alpha (Annualized)', `${metrics.alpha.toFixed(2)}%`],
    ['Beta', metrics.beta.toFixed(2)],
    ['Sharpe Ratio', metrics.sharpe.toFixed(2)],
    ['Sortino Ratio', metrics.sortino.toFixed(2)],
    ['Information Ratio', metrics.informationRatio.toFixed(2)],
    ['Treynor Ratio', metrics.treynor.toFixed(2)],
    ['R-Squared', `${metrics.rSquared.toFixed(1)}%`],
    ['Volatility (Annualized)', `${metrics.volatility.toFixed(2)}%`],
    ['CAGR', `${metrics.cagr.toFixed(2)}%`],
    ['Max Drawdown', `${metrics.maxDrawdown.toFixed(2)}%`],
    ['SIP Returns', `${metrics.sipReturns.toFixed(1)}%`],
    ['Upside Capture', `${metrics.upsideCapture.toFixed(0)}%`],
    ['Downside Capture', `${metrics.downsideCapture.toFixed(0)}%`],
  ] : [];

  const factorRows: [string, string, string][] = regression ? [
    ['Market (MKT-RF)', regression.market.toFixed(4), regression.tStats.market.toFixed(2)],
    ['SMB (Size)', regression.smb.toFixed(4), regression.tStats.smb.toFixed(2)],
    ['HML (Value)', regression.hml.toFixed(4), regression.tStats.hml.toFixed(2)],
    ['WML (Momentum)', regression.wml.toFixed(4), regression.tStats.wml.toFixed(2)],
  ] : [];

  function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
    const csv = [
      headers.join(','),
      ...rows.map(r => r.map(c => `"${c}"`).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadMetricsCSV() {
    if (!metrics) return;
    downloadCSV(
      `${fundName.replace(/\s+/g, '_')}_metrics.csv`,
      ['Metric', 'Value'],
      metricsRows,
    );
  }

  function downloadFactorCSV() {
    if (!regression) return;
    downloadCSV(
      `${fundName.replace(/\s+/g, '_')}_factors.csv`,
      ['Factor', 'Coefficient', 't-Statistic'],
      factorRows,
    );
  }

  function downloadMonthlyCSV() {
    if (!returns) return;
    const rows = returns.map(r => [
      r.date,
      (r.fund * 100).toFixed(2),
      (r.benchmark * 100).toFixed(2),
      (r.rf * 100).toFixed(2),
      (r.smb * 100).toFixed(2),
      (r.hml * 100).toFixed(2),
      (r.wml * 100).toFixed(2),
    ]);
    downloadCSV(
      `${fundName.replace(/\s+/g, '_')}_monthly_returns.csv`,
      ['Date', 'Fund Return %', 'Benchmark Return %', 'Risk-Free %', 'SMB %', 'HML %', 'WML %'],
      rows,
    );
  }

  function downloadGrowthCSV() {
    if (!growth.length) return;
    const rows = growth.map(p => [
      p.date,
      p.fund.toFixed(2),
      p.benchmark.toFixed(2),
    ]);
    downloadCSV(
      `${fundName.replace(/\s+/g, '_')}_growth_10000.csv`,
      ['Date', 'Fund Value', 'Benchmark Value'],
      rows,
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Export buttons */}
      <GlassPanel className="p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-white font-semibold flex items-center gap-2">
              <FileBarChart size={18} className="text-blue-400" />
              Report Builder
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              {fundName} · {benchLabel} · {period} · {returns?.length ?? 0} months
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ExportButton onClick={downloadMetricsCSV} icon={Download} label="Metrics CSV" disabled={!metrics} />
            <ExportButton onClick={downloadFactorCSV} icon={Download} label="Factors CSV" disabled={!regression} />
            <ExportButton onClick={downloadMonthlyCSV} icon={FileSpreadsheet} label="Monthly Returns" disabled={!returns} />
            <ExportButton onClick={downloadGrowthCSV} icon={FileSpreadsheet} label="Growth Data" disabled={!growth.length} />
          </div>
        </div>
      </GlassPanel>

      {loading && !metrics && (
        <GlassPanel className="p-6">
          <LoadingState message="Fetching real NAV data for report..." />
        </GlassPanel>
      )}

      {error && !loading && (
        <GlassPanel className="p-6">
          <ErrorState message={error} onRetry={refetch} />
        </GlassPanel>
      )}

      {metrics && regression && returns && selectedFund && (
        <>
          {/* Fund profile */}
          <GlassPanel className="p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Table size={18} className="text-teal-400" />
              Fund Profile
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <ProfileItem label="Fund Name" value={selectedFund.schemeName} />
              <ProfileItem label="Fund House" value={selectedFund.fundHouse || '—'} />
              <ProfileItem label="Category" value={selectedFund.schemeCategory || '—'} />
              <ProfileItem label="Plan" value={selectedFund.isDirect ? 'Direct' : 'Regular'} />
              <ProfileItem label="Option" value={selectedFund.isGrowth ? 'Growth' : 'IDCW'} />
              <ProfileItem label="NAV" value={selectedFund.nav > 0 ? `₹${selectedFund.nav.toFixed(2)}` : '—'} />
              <ProfileItem label="Scheme Code" value={String(selectedFund.schemeCode)} />
              <ProfileItem label="ISIN" value={selectedFund.isin || '—'} />
              <ProfileItem label="Benchmark" value={benchLabel} />
              <ProfileItem label="Period" value={period} />
              <ProfileItem label="Observations" value={`${returns.length} months`} />
              <ProfileItem label="Model Fit (R²)" value={`${(regression.rSquared * 100).toFixed(1)}%`} />
            </div>
          </GlassPanel>

          {/* Performance metrics table */}
          <GlassPanel className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Table size={18} className="text-blue-400" />
                Performance Metrics
              </h3>
              <button
                onClick={downloadMetricsCSV}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-blue-400 transition-colors"
              >
                <Download size={14} /> Export
              </button>
            </div>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-xs text-gray-500 uppercase tracking-wider font-medium">Metric</th>
                    <th className="text-right py-3 px-4 text-xs text-gray-500 uppercase tracking-wider font-medium">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {metricsRows.map(([label, value]) => (
                    <tr key={label} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-2.5 px-4 text-gray-300">{label}</td>
                      <td className="py-2.5 px-4 text-right tnum text-white font-medium">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassPanel>

          {/* Factor regression table */}
          <GlassPanel className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Table size={18} className="text-orange-400" />
                Fama-French Factor Regression
              </h3>
              <button
                onClick={downloadFactorCSV}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-blue-400 transition-colors"
              >
                <Download size={14} /> Export
              </button>
            </div>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-xs text-gray-500 uppercase tracking-wider font-medium">Factor</th>
                    <th className="text-right py-3 px-4 text-xs text-gray-500 uppercase tracking-wider font-medium">Coefficient</th>
                    <th className="text-right py-3 px-4 text-xs text-gray-500 uppercase tracking-wider font-medium">t-Statistic</th>
                  </tr>
                </thead>
                <tbody>
                  {factorRows.map(([factor, coef, tStat]) => (
                    <tr key={factor} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-2.5 px-4 text-gray-300">{factor}</td>
                      <td className="py-2.5 px-4 text-right tnum text-white font-medium">{coef}</td>
                      <td className="py-2.5 px-4 text-right tnum text-gray-300">{tStat}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassPanel>

          {/* Monthly returns preview */}
          <GlassPanel className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Table size={18} className="text-teal-400" />
                Monthly Returns Preview
              </h3>
              <button
                onClick={downloadMonthlyCSV}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-blue-400 transition-colors"
              >
                <Download size={14} /> Export All
              </button>
            </div>
            <div className="overflow-x-auto scrollbar-thin max-h-80">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-bg-elevated">
                  <tr className="border-b border-white/10">
                    <th className="text-left py-2.5 px-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Date</th>
                    <th className="text-right py-2.5 px-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Fund %</th>
                    <th className="text-right py-2.5 px-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Bench %</th>
                    <th className="text-right py-2.5 px-3 text-xs text-gray-500 uppercase tracking-wider font-medium">RF %</th>
                    <th className="text-right py-2.5 px-3 text-xs text-gray-500 uppercase tracking-wider font-medium">SMB %</th>
                    <th className="text-right py-2.5 px-3 text-xs text-gray-500 uppercase tracking-wider font-medium">HML %</th>
                    <th className="text-right py-2.5 px-3 text-xs text-gray-500 uppercase tracking-wider font-medium">WML %</th>
                  </tr>
                </thead>
                <tbody>
                  {returns.slice(-24).reverse().map((r, i) => (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-2 px-3 text-gray-400">{r.date.slice(0, 7)}</td>
                      <td className={`py-2 px-3 text-right tnum ${r.fund >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{(r.fund * 100).toFixed(2)}</td>
                      <td className={`py-2 px-3 text-right tnum ${r.benchmark >= 0 ? 'text-emerald-400/70' : 'text-rose-400/70'}`}>{(r.benchmark * 100).toFixed(2)}</td>
                      <td className="py-2 px-3 text-right tnum text-gray-400">{(r.rf * 100).toFixed(2)}</td>
                      <td className="py-2 px-3 text-right tnum text-gray-400">{(r.smb * 100).toFixed(2)}</td>
                      <td className="py-2 px-3 text-right tnum text-gray-400">{(r.hml * 100).toFixed(2)}</td>
                      <td className="py-2 px-3 text-right tnum text-gray-400">{(r.wml * 100).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500 mt-3">Showing last 24 months. Export for full {returns.length} months.</p>
          </GlassPanel>
        </>
      )}
    </div>
  );
}

function ExportButton({ onClick, icon: Icon, label, disabled }: { onClick: () => void; icon: typeof Download; label: string; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass glass-hover text-sm text-gray-300 hover:text-white transition-all whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <Icon size={16} />
      {label}
    </button>
  );
}

function ProfileItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm text-white font-medium truncate">{value}</p>
    </div>
  );
}
