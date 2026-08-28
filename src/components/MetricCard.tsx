import type { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string;
  sublabel?: string;
  icon: LucideIcon;
  accent: 'teal' | 'blue' | 'orange';
  trend?: 'up' | 'down' | 'neutral';
}

const ACCENT_MAP = {
  teal: { text: 'text-teal-400', bg: 'bg-teal-500/10', glow: 'shadow-glow-teal', hex: '#0F766E' },
  blue: { text: 'text-blue-400', bg: 'bg-blue-500/10', glow: 'shadow-glow', hex: '#2563EB' },
  orange: { text: 'text-orange-400', bg: 'bg-orange-500/10', glow: 'shadow-glow-orange', hex: '#D97706' },
};

const TREND_MAP = {
  up: 'text-emerald-400',
  down: 'text-rose-400',
  neutral: 'text-gray-400',
};

export function MetricCard({ label, value, sublabel, icon: Icon, accent, trend = 'neutral' }: MetricCardProps) {
  const a = ACCENT_MAP[accent];
  return (
    <div className="glass glass-hover rounded-2xl p-5 relative overflow-hidden group">
      <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full ${a.bg} blur-2xl opacity-60 group-hover:opacity-100 transition-opacity`} />
      <div className="relative flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg ${a.bg} ${a.text}`}>
          <Icon size={18} strokeWidth={2} />
        </div>
        {sublabel && (
          <span className={`text-xs tnum ${TREND_MAP[trend]}`}>{sublabel}</span>
        )}
      </div>
      <div className="relative">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">{label}</p>
        <p className="text-2xl font-semibold tnum text-white">{value}</p>
      </div>
    </div>
  );
}
