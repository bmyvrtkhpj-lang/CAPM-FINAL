import type { ReactNode } from 'react';

interface GlassPanelProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  strong?: boolean;
}

export function GlassPanel({ children, className = '', hover = false, strong = false }: GlassPanelProps) {
  const base = strong ? 'glass-strong' : 'glass';
  const hoverCls = hover ? 'glass-hover' : '';
  return (
    <div className={`${base} ${hoverCls} rounded-2xl ${className}`}>
      {children}
    </div>
  );
}
