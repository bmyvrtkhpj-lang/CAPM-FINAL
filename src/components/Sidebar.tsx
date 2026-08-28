import { LayoutDashboard, Search, TrendingUp, BarChart3, FileBarChart, Activity } from 'lucide-react';

export type TabId = 'dashboard' | 'workbench' | 'factors' | 'report';

interface SidebarProps {
  active: TabId;
  onChange: (tab: TabId) => void;
}

const NAV_ITEMS: { id: TabId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'workbench', label: 'Fund Analysis', icon: Search },
  { id: 'factors', label: 'Factor Analysis', icon: BarChart3 },
  { id: 'report', label: 'Report Builder', icon: FileBarChart },
];

export function Sidebar({ active, onChange }: SidebarProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 h-screen sticky top-0 glass border-r border-white/5 z-20">
        <div className="px-6 py-6 flex items-center gap-3 border-b border-white/5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center shadow-glow">
            <Activity size={20} className="text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-white font-semibold text-lg leading-none">QuantEdge</h1>
            <p className="text-xs text-gray-500 mt-1">Fund Analytics Terminal</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-1">
          {NAV_ITEMS.map(item => {
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onChange(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'
                }`}
              >
                <item.icon size={18} strokeWidth={2} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="px-6 py-4 border-t border-white/5">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-soft" />
            Live data · mfapi.in
          </div>
          <p className="text-xs text-gray-600 mt-2">v2.0 · Real NAV data</p>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 glass-strong border-t border-white/10 z-50 flex justify-around px-2 py-2">
        {NAV_ITEMS.map(item => {
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
                isActive ? 'text-blue-400' : 'text-gray-500'
              }`}
            >
              <item.icon size={20} strokeWidth={2} />
              <span className="text-[10px] font-medium">{item.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
