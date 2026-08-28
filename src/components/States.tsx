import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';

export function LoadingState({ message = 'Fetching real market data...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Loader2 size={32} className="text-blue-400 animate-spin mb-4" />
      <p className="text-sm text-gray-400">{message}</p>
      <p className="text-xs text-gray-600 mt-1">This may take a few seconds for large datasets</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <AlertCircle size={32} className="text-rose-400 mb-4" />
      <p className="text-sm text-gray-300 mb-1">Failed to load data</p>
      <p className="text-xs text-gray-500 mb-4 max-w-md">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 rounded-xl glass glass-hover text-sm text-gray-300 hover:text-white transition-all"
        >
          <RefreshCw size={14} /> Retry
        </button>
      )}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="glass rounded-2xl p-5 h-32 shimmer" />
  );
}
