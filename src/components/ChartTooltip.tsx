interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; dataKey: string }>;
  label?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

export function ChartTooltip({
  active,
  payload,
  label,
  prefix = '',
  suffix = '',
  decimals = 2,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="glass-strong rounded-xl px-3 py-2.5 shadow-xl border border-white/10">
      {label && (
        <p className="text-xs text-gray-400 mb-1.5 font-medium">{label}</p>
      )}
      <div className="space-y-1">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span
              className="w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-400 capitalize">{entry.name}:</span>
            <span className="tnum text-white font-medium">
              {prefix}{entry.value.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
