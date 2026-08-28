import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, Check, TrendingUp, Loader2 } from 'lucide-react';
import type { FundMeta } from '@/lib/types';
import { searchSchemes, parseSchemeFlags, fetchLatestNav, enrichScheme } from '@/lib/dataService';

interface FundSearchProps {
  selectedId: number | null;
  onSelect: (fund: FundMeta) => void;
  directGrowthOnly: boolean;
  onToggleDirectGrowth: (v: boolean) => void;
}

interface SearchResult {
  schemeCode: number;
  schemeName: string;
  isDirect: boolean;
  isGrowth: boolean;
}

export function FundSearch({
  selectedId,
  onSelect,
  directGrowthOnly,
  onToggleDirectGrowth,
}: FundSearchProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedName, setSelectedName] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!open || !query.trim()) {
      setResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchSchemes(query.trim());
        const enriched: SearchResult[] = data.map(d => {
          const { isDirect, isGrowth } = parseSchemeFlags(d.schemeName);
          return { schemeCode: d.schemeCode, schemeName: d.schemeName, isDirect, isGrowth };
        });
        setResults(enriched);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, open]);

  const filtered = useMemo(() => {
    let list = results;
    if (directGrowthOnly) {
      list = list.filter(r => r.isDirect && r.isGrowth);
    }
    return list.slice(0, 50);
  }, [results, directGrowthOnly]);

  async function handleSelect(result: SearchResult) {
    setOpen(false);
    setQuery('');
    setSelectedName(result.schemeName);
    try {
      const latestNav = await fetchLatestNav(result.schemeCode);
      const fund = await enrichScheme({
        schemeCode: result.schemeCode,
        schemeName: result.schemeName,
        fundHouse: '',
        schemeCategory: '',
        schemeType: '',
        isin: null,
      }, latestNav);
      onSelect(fund);
    } catch {
      // Even if NAV fetch fails, create a minimal fund object
      onSelect({
        schemeCode: result.schemeCode,
        schemeName: result.schemeName,
        fundHouse: '',
        schemeCategory: '',
        schemeType: '',
        isDirect: result.isDirect,
        isGrowth: result.isGrowth,
        isin: null,
        nav: 0,
        navDate: '',
      });
    }
  }

  return (
    <div ref={ref} className="relative flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
        />
        <input
          type="text"
          value={open ? query : selectedName}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { setOpen(true); setQuery(''); }}
          placeholder="Search real mutual fund schemes (e.g. HDFC, SBI, Axis)..."
          className="w-full glass rounded-xl pl-12 pr-10 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/40 transition-colors"
        />
        {selectedName && !open && (
          <button
            onClick={() => { setOpen(true); setQuery(''); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
          >
            <X size={16} />
          </button>
        )}
        {loading && (
          <Loader2 size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 animate-spin" />
        )}

        {open && (query.trim().length > 0) && (
          <div className="absolute top-full left-0 right-0 mt-2 glass-strong rounded-xl border border-white/10 shadow-2xl max-h-80 overflow-y-auto scrollbar-thin z-50 animate-slide-up">
            {loading ? (
              <div className="px-4 py-6 text-sm text-gray-500 text-center flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" /> Searching schemes...
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-4 py-6 text-sm text-gray-500 text-center">
                {query.trim().length < 2 ? 'Type at least 2 characters' : 'No funds found'}
              </div>
            ) : (
              <ul className="py-1">
                {filtered.map(result => (
                  <li key={result.schemeCode}>
                    <button
                      onClick={() => handleSelect(result)}
                      className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-white/5 transition-colors ${
                        result.schemeCode === selectedId ? 'bg-blue-500/10' : ''
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-white font-medium truncate">{result.schemeName}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Code: {result.schemeCode}
                          {result.isDirect && result.isGrowth && (
                            <span className="ml-2 text-teal-400">Direct Growth</span>
                          )}
                        </p>
                      </div>
                      {result.schemeCode === selectedId && <Check size={16} className="text-blue-400 shrink-0" />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <button
        onClick={() => onToggleDirectGrowth(!directGrowthOnly)}
        className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
          directGrowthOnly
            ? 'bg-teal-500/15 text-teal-400 border border-teal-500/30'
            : 'glass text-gray-400 border border-white/5 hover:text-white'
        }`}
      >
        <TrendingUp size={16} />
        Direct Growth
        {directGrowthOnly && <Check size={14} />}
      </button>
    </div>
  );
}
