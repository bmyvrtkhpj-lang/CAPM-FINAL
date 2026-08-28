import type { FundMeta, Benchmark, Period, MonthlyReturn } from './types';
import { PERIOD_MONTHS, BENCHMARKS } from './types';
import { mulberry32, gaussian, hashString } from './prng';

// Edge function URL
const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mf-api`;

export interface NavDataPoint {
  date: string; // DD-MM-YYYY
  nav: number;
}

export interface SchemeSearchResult {
  schemeCode: number;
  schemeName: string;
}

export interface SchemeListEntry {
  schemeCode: number;
  schemeName: string;
  fundHouse: string;
  schemeCategory: string;
  schemeType: string;
  isin: string | null;
}

// Parse "DD-MM-YYYY" to ISO date string
function parseDmY(dmY: string): Date {
  const [d, m, y] = dmY.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Parse "DD-MM-YYYY" to ISO "YYYY-MM-DD"
function toIsoDate(dmY: string): string {
  const [d, m, y] = dmY.split('-').map(Number);
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// Search for mutual fund schemes
export async function searchSchemes(query: string): Promise<SchemeSearchResult[]> {
  if (!query.trim()) return [];
  const resp = await fetch(`${EDGE_URL}/search?q=${encodeURIComponent(query)}`, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!resp.ok) throw new Error(`Search failed (${resp.status})`);
  const data = await resp.json();
  if (!Array.isArray(data)) return [];
  return data;
}

// Fetch the full scheme list (paginated) — returns enriched FundMeta[]
export async function fetchSchemeList(): Promise<SchemeListEntry[]> {
  const allSchemes: SchemeListEntry[] = [];
  const batchSize = 250;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const resp = await fetch(`${EDGE_URL}/schemes?limit=${batchSize}&offset=${offset}`, {
      headers: { 'Content-Type': 'application/json' },
    });
    if (!resp.ok) throw new Error(`Scheme list fetch failed (${resp.status})`);
    const data = await resp.json();

    if (!Array.isArray(data) || data.length === 0) {
      hasMore = false;
      break;
    }

    for (const item of data) {
      allSchemes.push({
        schemeCode: item.schemeCode,
        schemeName: item.schemeName || '',
        fundHouse: item.fundHouse || '',
        schemeCategory: item.schemeCategory || '',
        schemeType: item.schemeType || '',
        isin: item.isin || null,
      });
    }

    if (data.length < batchSize) hasMore = false;
    offset += batchSize;
  }

  return allSchemes;
}

// Fetch NAV history for a scheme
export async function fetchNavHistory(schemeCode: number): Promise<{
  meta: {
    fund_house: string;
    scheme_type: string;
    scheme_category: string;
    scheme_code: number;
    scheme_name: string;
  };
  data: NavDataPoint[];
}> {
  const resp = await fetch(`${EDGE_URL}/nav/${schemeCode}`, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!resp.ok) throw new Error(`NAV fetch failed (${resp.status})`);
  const data = await resp.json();
  if (!data || data.status !== 'SUCCESS' || !Array.isArray(data.data)) {
    throw new Error('Invalid NAV response');
  }
  return {
    meta: data.meta,
    data: data.data.map((d: { date: string; nav: string }) => ({
      date: d.date,
      nav: parseFloat(d.nav),
    })),
  };
}

// Fetch latest NAV for a scheme
export async function fetchLatestNav(schemeCode: number): Promise<{ nav: number; date: string }> {
  const resp = await fetch(`${EDGE_URL}/nav/${schemeCode}/latest`, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!resp.ok) throw new Error(`Latest NAV fetch failed (${resp.status})`);
  const data = await resp.json();
  if (!data || data.status !== 'SUCCESS' || !Array.isArray(data.data) || data.data.length === 0) {
    throw new Error('Invalid latest NAV response');
  }
  return {
    nav: parseFloat(data.data[0].nav),
    date: data.data[0].date,
  };
}

// Determine if a scheme name indicates Direct + Growth
export function parseSchemeFlags(schemeName: string): { isDirect: boolean; isGrowth: boolean } {
  const name = schemeName.toLowerCase();
  const isDirect = /direct/.test(name);
  const isGrowth = /growth/.test(name) && !/idcw|dividend|payout|reinvestment/.test(name);
  return { isDirect, isGrowth };
}

// Convert a raw scheme list entry to a FundMeta with latest NAV
export async function enrichScheme(
  entry: SchemeListEntry,
  latestNav: { nav: number; date: string },
): Promise<FundMeta> {
  const { isDirect, isGrowth } = parseSchemeFlags(entry.schemeName);
  return {
    schemeCode: entry.schemeCode,
    schemeName: entry.schemeName,
    fundHouse: entry.fundHouse,
    schemeCategory: entry.schemeCategory,
    schemeType: entry.schemeType,
    isDirect,
    isGrowth,
    isin: entry.isin,
    nav: latestNav.nav,
    navDate: latestNav.date,
  };
}

// Convert daily NAV data to monthly returns
// Groups NAV by year-month, takes the last NAV of each month, computes returns
function navToMonthlyReturns(navData: NavDataPoint[]): { date: string; return: number }[] {
  if (navData.length < 2) return [];

  // Sort by date ascending
  const sorted = [...navData].sort((a, b) => {
    const da = parseDmY(a.date);
    const db = parseDmY(b.date);
    return da.getTime() - db.getTime();
  });

  // Group by year-month, keeping last NAV per month
  const monthlyNavs: { yearMonth: string; nav: number; date: string }[] = [];
  const monthMap = new Map<string, { yearMonth: string; nav: number; date: string }>();

  for (const point of sorted) {
    const iso = toIsoDate(point.date);
    const yearMonth = iso.slice(0, 7); // YYYY-MM
    monthMap.set(yearMonth, { yearMonth, nav: point.nav, date: iso });
  }

  // Sort by yearMonth and compute returns
  const sortedMonths = Array.from(monthMap.values()).sort((a, b) =>
    a.yearMonth.localeCompare(b.yearMonth),
  );

  const returns: { date: string; return: number }[] = [];
  for (let i = 1; i < sortedMonths.length; i++) {
    const prev = sortedMonths[i - 1];
    const curr = sortedMonths[i];
    if (prev.nav > 0) {
      const r = (curr.nav - prev.nav) / prev.nav;
      returns.push({ date: curr.date, return: r });
    }
  }

  return returns;
}

// Risk-free rate (monthly, ~6% annual => 0.005 monthly)
const RF_MONTHLY = 0.005;

// Generate Fama-French factor data (SMB, HML, WML) deterministically from benchmark returns
// Since there's no free Indian factor data API, we generate synthetic but realistic factor returns
// seeded by the benchmark — stable across renders and correlated with market conditions
function generateFactorData(
  benchmarkReturns: { date: string; return: number }[],
  seed: number,
): { smb: number[]; hml: number[]; wml: number[] } {
  const rng = mulberry32(seed);
  const smb: number[] = [];
  const hml: number[] = [];
  const wml: number[] = [];

  for (const br of benchmarkReturns) {
    // SMB: small-cap premium, positively correlated with market but with noise
    smb.push(0.003 + br.return * 0.15 + gaussian(rng) * 0.018);
    // HML: value premium, slightly negatively correlated with momentum markets
    hml.push(-0.001 - br.return * 0.05 + gaussian(rng) * 0.016);
    // WML: momentum factor, positively correlated with market
    wml.push(0.004 + br.return * 0.2 + gaussian(rng) * 0.022);
  }

  return { smb, hml, wml };
}

// Fetch and compute monthly returns for a fund + benchmark pair
export async function fetchMonthlyReturns(
  fund: FundMeta,
  benchmark: Benchmark,
  period: Period,
): Promise<MonthlyReturn[]> {
  const periodMonths = PERIOD_MONTHS[period];

  // Fetch fund NAV history
  const fundNav = await fetchNavHistory(fund.schemeCode);
  const fundMonthly = navToMonthlyReturns(fundNav.data);

  // Fetch benchmark NAV history
  const benchmarkMeta = BENCHMARKS.find(b => b.id === benchmark);
  if (!benchmarkMeta) throw new Error('Unknown benchmark');
  const benchNav = await fetchNavHistory(benchmarkMeta.schemeCode);
  const benchMonthly = navToMonthlyReturns(benchNav.data);

  // Align by date — find overlapping months
  const fundMap = new Map(fundMonthly.map(r => [r.date.slice(0, 7), r]));
  const benchMap = new Map(benchMonthly.map(r => [r.date.slice(0, 7), r]));
  const allMonths = new Set([...fundMap.keys(), ...benchMap.keys()]);
  const sortedMonths = Array.from(allMonths).sort();

  // Take only the last `periodMonths` of overlapping data
  const overlapping = sortedMonths.filter(m => fundMap.has(m) && benchMap.has(m));
  const sliced = overlapping.slice(-periodMonths);

  if (sliced.length < 3) {
    throw new Error('Insufficient overlapping data for the selected period');
  }

  // Generate factor data seeded from fund + benchmark
  const factorSeed = hashString(fund.schemeCode + '_' + benchmark);
  const benchReturnsForFactors = sliced.map(m => benchMap.get(m)!.return);
  const factors = generateFactorData(
    benchReturnsForFactors.map((r, i) => ({ date: sliced[i], return: r })),
    factorSeed,
  );

  const result: MonthlyReturn[] = [];
  for (let i = 0; i < sliced.length; i++) {
    const month = sliced[i];
    result.push({
      date: month + '-01',
      fund: fundMap.get(month)!.return,
      benchmark: benchMap.get(month)!.return,
      rf: RF_MONTHLY,
      smb: factors.smb[i],
      hml: factors.hml[i],
      wml: factors.wml[i],
    });
  }

  return result;
}

// Fetch latest NAV for multiple schemes in parallel (batched)
export async function batchLatestNav(
  schemeCodes: number[],
  concurrency = 10,
): Promise<Map<number, { nav: number; date: string }>> {
  const result = new Map<number, { nav: number; date: string }>();
  const batches: number[][] = [];
  for (let i = 0; i < schemeCodes.length; i += concurrency) {
    batches.push(schemeCodes.slice(i, i + concurrency));
  }

  for (const batch of batches) {
    const promises = batch.map(async code => {
      try {
        const nav = await fetchLatestNav(code);
        result.set(code, nav);
      } catch {
        // Skip failed fetches
      }
    });
    await Promise.all(promises);
  }

  return result;
}
