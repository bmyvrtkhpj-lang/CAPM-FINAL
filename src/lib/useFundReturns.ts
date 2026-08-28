import { useState, useEffect, useCallback } from 'react';
import type { FundMeta, Benchmark, Period, MonthlyReturn } from './types';
import { fetchMonthlyReturns } from './dataService';

interface FundDataState {
  data: MonthlyReturn[] | null;
  loading: boolean;
  error: string | null;
}

export function useFundReturns(
  fund: FundMeta | null,
  benchmark: Benchmark,
  period: Period,
): FundDataState & { refetch: () => void } {
  const [state, setState] = useState<FundDataState>({
    data: null,
    loading: false,
    error: null,
  });
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const refetch = useCallback(() => setRefetchTrigger(t => t + 1), []);

  useEffect(() => {
    if (!fund || !fund.schemeCode) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    let cancelled = false;
    setState({ data: null, loading: true, error: null });

    fetchMonthlyReturns(fund, benchmark, period)
      .then(data => {
        if (!cancelled) {
          setState({ data, loading: false, error: null });
        }
      })
      .catch(err => {
        if (!cancelled) {
          setState({ data: null, loading: false, error: err.message || 'Failed to fetch fund data' });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [fund, benchmark, period, refetchTrigger]);

  return { ...state, refetch };
}
