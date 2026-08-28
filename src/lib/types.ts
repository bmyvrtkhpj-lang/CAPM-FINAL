export type Period = '1Y' | '2Y' | '3Y' | '5Y' | '7Y' | '10Y';

export type Benchmark = 'NIFTY_50' | 'NIFTY_500' | 'NIFTY_MIDCAP_150' | 'NIFTY_SMALLCAP_250';

export interface FundMeta {
  schemeCode: number;
  schemeName: string;
  fundHouse: string;
  schemeCategory: string;
  schemeType: string;
  isDirect: boolean;
  isGrowth: boolean;
  isin: string | null;
  nav: number;
  navDate: string;
}

export interface MonthlyReturn {
  date: string; // ISO month
  fund: number;
  benchmark: number;
  rf: number; // risk-free monthly
  smb: number;
  hml: number;
  wml: number;
}

export interface FundMetrics {
  alpha: number;
  beta: number;
  sharpe: number;
  sortino: number;
  informationRatio: number;
  maxDrawdown: number;
  volatility: number;
  cagr: number;
  sipReturns: number;
  rSquared: number;
  upsideCapture: number;
  downsideCapture: number;
  treynor: number;
}

export interface RollingPoint {
  date: string;
  alpha: number;
  beta: number;
}

export interface DrawdownPoint {
  date: string;
  drawdown: number;
}

export interface GrowthPoint {
  date: string;
  fund: number;
  benchmark: number;
}

export interface FactorRegression {
  market: number;
  smb: number;
  hml: number;
  wml: number;
  rSquared: number;
  tStats: { market: number; smb: number; hml: number; wml: number };
}

export interface BenchmarkMeta {
  id: Benchmark;
  label: string;
  short: string;
  schemeCode: number;
}

export const PERIODS: Period[] = ['1Y', '2Y', '3Y', '5Y', '7Y', '10Y'];
export const PERIOD_MONTHS: Record<Period, number> = {
  '1Y': 12,
  '2Y': 24,
  '3Y': 36,
  '5Y': 60,
  '7Y': 84,
  '10Y': 120,
};

// Benchmark index funds used as proxies for Nifty indices.
// These are direct-growth index funds tracking each respective index.
export const BENCHMARKS: BenchmarkMeta[] = [
  { id: 'NIFTY_50', label: 'Nifty 50', short: 'N50', schemeCode: 120716 },
  { id: 'NIFTY_500', label: 'Nifty 500', short: 'N500', schemeCode: 147625 },
  { id: 'NIFTY_MIDCAP_150', label: 'Nifty Midcap 150', short: 'MID150', schemeCode: 147622 },
  { id: 'NIFTY_SMALLCAP_250', label: 'Nifty Smallcap 250', short: 'SML250', schemeCode: 147623 },
];

export const FUND_CATEGORIES = [
  'Large Cap',
  'Large & Mid Cap',
  'Mid Cap',
  'Small Cap',
  'Flexi Cap',
  'Multi Cap',
  'ELSS',
  'Value',
  'International',
];
