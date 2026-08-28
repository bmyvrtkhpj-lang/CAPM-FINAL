import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import type { TabId } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';
import { Dashboard } from '@/pages/Dashboard';
import { Workbench } from '@/pages/Workbench';
import { FactorAnalysis } from '@/pages/FactorAnalysis';
import { ReportBuilder } from '@/pages/ReportBuilder';
import { fetchLatestNav, enrichScheme, parseSchemeFlags } from '@/lib/dataService';
import type { FundMeta, Period, Benchmark } from '@/lib/types';

const TAB_TITLES: Record<TabId, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard Overview', subtitle: 'Live performance metrics & portfolio summary' },
  workbench: { title: 'Fund Analysis Workbench', subtitle: 'Deep-dive analytics, charts & risk decomposition' },
  factors: { title: 'Factor Analysis', subtitle: 'Fama-French four-factor regression & exposures' },
  report: { title: 'Report Builder', subtitle: 'Exportable data tables & performance reports' },
};

// Default fund: UTI Nifty 50 Index Fund Direct Growth (scheme code 120716)
const DEFAULT_FUND_CODE = 120716;
const DEFAULT_FUND_NAME = 'UTI Nifty 50 Index Fund - Direct Plan - Growth';

function App() {
  const [tab, setTab] = useState<TabId>('dashboard');
  const [selectedFund, setSelectedFund] = useState<FundMeta | null>(null);
  const [benchmark, setBenchmark] = useState<Benchmark>('NIFTY_50');
  const [period, setPeriod] = useState<Period>('5Y');
  const [directGrowthOnly, setDirectGrowthOnly] = useState(false);

  // Load default fund on mount
  useEffect(() => {
    async function loadDefault() {
      try {
        const latestNav = await fetchLatestNav(DEFAULT_FUND_CODE);
        const flags = parseSchemeFlags(DEFAULT_FUND_NAME);
        const fund: FundMeta = {
          schemeCode: DEFAULT_FUND_CODE,
          schemeName: DEFAULT_FUND_NAME,
          fundHouse: 'UTI Mutual Fund',
          schemeCategory: 'Other Scheme - Index Funds',
          schemeType: 'Open Ended Schemes',
          isDirect: flags.isDirect,
          isGrowth: flags.isGrowth,
          isin: 'INF789F01XA0',
          nav: latestNav.nav,
          navDate: latestNav.date,
        };
        setSelectedFund(fund);
      } catch {
        // Fallback: set a minimal fund object so the app still works
        const flags = parseSchemeFlags(DEFAULT_FUND_NAME);
        setSelectedFund({
          schemeCode: DEFAULT_FUND_CODE,
          schemeName: DEFAULT_FUND_NAME,
          fundHouse: 'UTI Mutual Fund',
          schemeCategory: 'Other Scheme - Index Funds',
          schemeType: 'Open Ended Schemes',
          isDirect: flags.isDirect,
          isGrowth: flags.isGrowth,
          isin: 'INF789F01XA0',
          nav: 0,
          navDate: '',
        });
      }
    }
    loadDefault();
  }, []);

  const tabInfo = TAB_TITLES[tab];

  return (
    <div className="min-h-screen bg-bg-base relative flex">
      {/* Ambient background glows */}
      <div className="ambient-glow bg-teal-500" style={{ width: 500, height: 500, top: -100, left: -100 }} />
      <div className="ambient-glow bg-blue-600" style={{ width: 600, height: 600, bottom: -200, right: -150 }} />
      <div className="ambient-glow bg-orange-500" style={{ width: 300, height: 300, top: '40%', left: '50%', opacity: 0.05 }} />

      <Sidebar active={tab} onChange={setTab} />

      <div className="flex-1 min-w-0 relative z-10">
        <TopBar title={tabInfo.title} subtitle={tabInfo.subtitle} />

        <main className="p-4 lg:p-6 pb-24 lg:pb-6 max-w-[1600px] mx-auto">
          {tab === 'dashboard' && (
            <Dashboard
              selectedFund={selectedFund}
              benchmark={benchmark}
              period={period}
            />
          )}
          {tab === 'workbench' && (
            <Workbench
              selectedFund={selectedFund}
              onSelectFund={setSelectedFund}
              benchmark={benchmark}
              onBenchmarkChange={setBenchmark}
              period={period}
              onPeriodChange={setPeriod}
              directGrowthOnly={directGrowthOnly}
              onToggleDirectGrowth={setDirectGrowthOnly}
            />
          )}
          {tab === 'factors' && (
            <FactorAnalysis
              selectedFund={selectedFund}
              benchmark={benchmark}
              period={period}
            />
          )}
          {tab === 'report' && (
            <ReportBuilder
              selectedFund={selectedFund}
              benchmark={benchmark}
              period={period}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
