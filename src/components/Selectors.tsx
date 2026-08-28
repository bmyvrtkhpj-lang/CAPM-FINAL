import type { Period, Benchmark } from '@/lib/types';
import { PERIODS, BENCHMARKS } from '@/lib/types';

interface PeriodSelectorProps {
  value: Period;
  onChange: (p: Period) => void;
}

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <div className="inline-flex glass rounded-xl p-1 gap-1">
      {PERIODS.map(p => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all tnum ${
            value === p
              ? 'bg-blue-500/20 text-blue-400 shadow-glow'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          {p}
        </button>
      ))}
    </div>
  );
}

interface BenchmarkSelectorProps {
  value: Benchmark;
  onChange: (b: Benchmark) => void;
}

export function BenchmarkSelector({ value, onChange }: BenchmarkSelectorProps) {
  return (
    <div className="inline-flex glass rounded-xl p-1 gap-1 flex-wrap">
      {BENCHMARKS.map(b => (
        <button
          key={b.id}
          onClick={() => onChange(b.id)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
            value === b.id
              ? 'bg-teal-500/20 text-teal-400 shadow-glow-teal'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          {b.label}
        </button>
      ))}
    </div>
  );
}
