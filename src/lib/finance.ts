import type { MonthlyReturn, FundMetrics, RollingPoint, DrawdownPoint, GrowthPoint, FactorRegression } from './types';

// Ordinary Least Squares regression — y = alpha + beta * x
export function ols(y: number[], x: number[]): { alpha: number; beta: number; r2: number } {
  const n = Math.min(y.length, x.length);
  if (n < 2) return { alpha: 0, beta: 0, r2: 0 };

  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0, sumYY = 0;
  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
    sumXY += x[i] * y[i];
    sumXX += x[i] * x[i];
    sumYY += y[i] * y[i];
  }
  const meanX = sumX / n;
  const meanY = sumY / n;
  const covXY = sumXY / n - meanX * meanY;
  const varX = sumXX / n - meanX * meanX;
  const varY = sumYY / n - meanY * meanY;

  const beta = varX > 1e-12 ? covXY / varX : 0;
  const alpha = meanY - beta * meanX;
  const denom = Math.sqrt(varX * varY);
  const r = denom > 1e-12 ? covXY / denom : 0;
  const r2 = Math.max(0, Math.min(1, r * r));

  return { alpha, beta, r2 };
}

// Multi-factor OLS via normal equations (4 factors + intercept)
export function multiFactorOLS(
  y: number[],
  factors: number[][], // [market, smb, hml, wml]
): FactorRegression {
  const n = y.length;
  const k = factors.length + 1; // +1 intercept
  if (n < k) {
    return {
      market: 0, smb: 0, hml: 0, wml: 0, rSquared: 0,
      tStats: { market: 0, smb: 0, hml: 0, wml: 0 },
    };
  }

  // Build design matrix X: rows = n, cols = [1, market, smb, hml, wml]
  const X: number[][] = [];
  for (let i = 0; i < n; i++) {
    X.push([1, factors[0][i], factors[1][i], factors[2][i], factors[3][i]]);
  }

  // XtX (k x k)
  const XtX: number[][] = Array.from({ length: k }, () => new Array(k).fill(0));
  for (let i = 0; i < k; i++) {
    for (let j = 0; j < k; j++) {
      for (let t = 0; t < n; t++) {
        XtX[i][j] += X[t][i] * X[t][j];
      }
    }
  }

  // XtY (k)
  const XtY: number[] = new Array(k).fill(0);
  for (let i = 0; i < k; i++) {
    for (let t = 0; t < n; t++) {
      XtY[i] += X[t][i] * y[t];
    }
  }

  const inv = invertMatrix(XtX, k);
  if (!inv) {
    return {
      market: 0, smb: 0, hml: 0, wml: 0, rSquared: 0,
      tStats: { market: 0, smb: 0, hml: 0, wml: 0 },
    };
  }

  // beta = inv(XtX) * XtY
  const betas: number[] = new Array(k).fill(0);
  for (let i = 0; i < k; i++) {
    for (let j = 0; j < k; j++) {
      betas[i] += inv[i][j] * XtY[j];
    }
  }

  // Residuals & R²
  let ssRes = 0, ssTot = 0;
  const meanY = y.reduce((a, b) => a + b, 0) / n;
  const residuals: number[] = [];
  for (let t = 0; t < n; t++) {
    let pred = 0;
    for (let i = 0; i < k; i++) pred += betas[i] * X[t][i];
    const res = y[t] - pred;
    residuals.push(res);
    ssRes += res * res;
    ssTot += (y[t] - meanY) ** 2;
  }
  const rSquared = ssTot > 1e-12 ? Math.max(0, 1 - ssRes / ssTot) : 0;

  // Standard errors: sigma² * diag(inv(XtX)), sigma² = ssRes / (n - k)
  const sigma2 = ssRes / (n - k);
  const se: number[] = new Array(k).fill(0);
  for (let i = 0; i < k; i++) se[i] = Math.sqrt(Math.max(0, sigma2 * inv[i][i]));

  const tStat = (i: number) => se[i] > 1e-12 ? betas[i] / se[i] : 0;

  return {
    market: betas[1],
    smb: betas[2],
    hml: betas[3],
    wml: betas[4],
    rSquared,
    tStats: {
      market: tStat(1),
      smb: tStat(2),
      hml: tStat(3),
      wml: tStat(4),
    },
  };
}

// Gauss-Jordan matrix inversion
function invertMatrix(m: number[][], n: number): number[][] | null {
  const a: number[][] = m.map((row, i) => [
    ...row,
    ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  ]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(a[r][col]) > Math.abs(a[pivot][col])) pivot = r;
    }
    if (Math.abs(a[pivot][col]) < 1e-12) return null;
    [a[col], a[pivot]] = [a[pivot], a[col]];
    const pv = a[col][col];
    for (let j = 0; j < 2 * n; j++) a[col][j] /= pv;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = a[r][col];
      for (let j = 0; j < 2 * n; j++) a[r][j] -= f * a[col][j];
    }
  }
  return a.map(row => row.slice(n));
}

export function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

export function downsideDeviation(arr: number[], mar = 0): number {
  const downside = arr.filter(v => v < mar).map(v => mar - v);
  if (downside.length === 0) return 0;
  return Math.sqrt(downside.reduce((s, v) => s + v * v, 0) / arr.length);
}

// Annualize a monthly return metric
const ANN = 12;
const ANN_SQRT = Math.sqrt(12);

export function computeMetrics(returns: MonthlyReturn[], benchmarkLabel?: string): FundMetrics {
  const fundR = returns.map(r => r.fund);
  const benchR = returns.map(r => r.benchmark);
  const rfR = returns.map(r => r.rf);

  const { alpha: monthlyAlpha, beta, r2 } = ols(
    fundR.map((r, i) => r - rfR[i]),
    benchR.map((r, i) => r - rfR[i]),
  );

  const alphaAnnual = monthlyAlpha * ANN;

  const excessReturn = fundR.map((r, i) => r - rfR[i]);
  const meanExcess = mean(excessReturn);
  const sd = stdDev(fundR);
  const dd = downsideDeviation(excessReturn);

  const sharpe = sd > 1e-9 ? (meanExcess / sd) * ANN_SQRT : 0;
  const sortino = dd > 1e-9 ? (meanExcess / dd) * ANN_SQRT : 0;

  // Information ratio: excess return over benchmark / tracking error
  const activeReturns = fundR.map((r, i) => r - benchR[i]);
  const meanActive = mean(activeReturns);
  const trackingError = stdDev(activeReturns);
  const informationRatio = trackingError > 1e-9 ? (meanActive / trackingError) * ANN_SQRT : 0;

  // Max drawdown
  let nav = 1;
  let peak = 1;
  let maxDD = 0;
  for (const r of fundR) {
    nav *= 1 + r;
    if (nav > peak) peak = nav;
    const dd1 = (nav - peak) / peak;
    if (dd1 < maxDD) maxDD = dd1;
  }

  // CAGR
  const totalReturn = fundR.reduce((p, r) => p * (1 + r), 1);
  const years = fundR.length / ANN;
  const cagr = years > 0 ? Math.pow(totalReturn, 1 / years) - 1 : 0;

  // SIP returns: monthly SIP of 1000
  let invested = 0;
  let sipValue = 0;
  for (const r of fundR) {
    invested += 1000;
    sipValue = (sipValue + 1000) * (1 + r);
  }
  const sipReturns = invested > 0 ? ((sipValue - invested) / invested) * 100 : 0;

  // Capture ratios
  const upMonths = fundR.filter((r, i) => benchR[i] > 0);
  const downMonths = fundR.filter((r, i) => benchR[i] < 0);
  const upCapture = upMonths.length > 0
    ? (mean(upMonths) / mean(benchR.filter((_, i) => benchR[i] > 0))) * 100
    : 0;
  const downCapture = downMonths.length > 0
    ? (mean(downMonths) / mean(benchR.filter((_, i) => benchR[i] < 0))) * 100
    : 0;

  const treynor = beta > 1e-9 ? (meanExcess * ANN) / beta : 0;

  return {
    alpha: alphaAnnual,
    beta,
    sharpe,
    sortino,
    informationRatio,
    maxDrawdown: maxDD * 100,
    volatility: sd * ANN_SQRT * 100,
    cagr: cagr * 100,
    sipReturns,
    rSquared: r2 * 100,
    upsideCapture: upCapture,
    downsideCapture: downCapture,
    treynor,
  };
}

export function computeRolling(
  returns: MonthlyReturn[],
  window = 36,
): RollingPoint[] {
  if (returns.length < window) return [];
  const points: RollingPoint[] = [];
  for (let i = window - 1; i < returns.length; i++) {
    const slice = returns.slice(i - window + 1, i + 1);
    const fundR = slice.map(r => r.fund);
    const benchR = slice.map(r => r.benchmark);
    const rfR = slice.map(r => r.rf);
    const { alpha, beta } = ols(
      fundR.map((r, idx) => r - rfR[idx]),
      benchR.map((r, idx) => r - rfR[idx]),
    );
    points.push({
      date: returns[i].date,
      alpha: alpha * ANN,
      beta,
    });
  }
  return points;
}

export function computeDrawdown(returns: MonthlyReturn[]): DrawdownPoint[] {
  let nav = 1;
  let peak = 1;
  const points: DrawdownPoint[] = [];
  for (const r of returns) {
    nav *= 1 + r.fund;
    if (nav > peak) peak = nav;
    points.push({
      date: r.date,
      drawdown: ((nav - peak) / peak) * 100,
    });
  }
  return points;
}

export function computeGrowth(returns: MonthlyReturn[], startAmount = 10000): GrowthPoint[] {
  let fundNav = 1;
  let benchNav = 1;
  const points: GrowthPoint[] = [];
  for (const r of returns) {
    fundNav *= 1 + r.fund;
    benchNav *= 1 + r.benchmark;
    points.push({
      date: r.date,
      fund: startAmount * fundNav,
      benchmark: startAmount * benchNav,
    });
  }
  return points;
}

export function computeFactorRegression(returns: MonthlyReturn[]): FactorRegression {
  const y = returns.map(r => r.fund - r.rf);
  const factors = [
    returns.map(r => r.benchmark - r.rf), // market
    returns.map(r => r.smb),
    returns.map(r => r.hml),
    returns.map(r => r.wml),
  ];
  return multiFactorOLS(y, factors);
}
