import { Bell, Settings, Zap } from 'lucide-react';

interface TopBarProps {
  title: string;
  subtitle?: string;
}

export function TopBar({ title, subtitle }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 glass border-b border-white/5 px-5 lg:px-8 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg lg:text-xl font-semibold text-white truncate">{title}</h2>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5 truncate">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-2 lg:gap-3 shrink-0">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <Zap size={14} className="text-emerald-400" />
            <span className="text-xs text-emerald-400 font-medium">Live Feed</span>
          </div>
          <button className="p-2 rounded-lg glass-hover glass text-gray-400 hover:text-white transition-colors relative">
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-orange-500" />
          </button>
          <button className="p-2 rounded-lg glass-hover glass text-gray-400 hover:text-white transition-colors">
            <Settings size={18} />
          </button>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center text-white text-sm font-semibold">
            R
          </div>
        </div>
      </div>
    </header>
  );
}
