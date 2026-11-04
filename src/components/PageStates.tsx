import { Loader2, AlertTriangle } from 'lucide-react';

export function LoadingState({ label = 'Cargando...' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm font-medium text-slate-500">
      <Loader2 className="h-5 w-5 animate-spin text-pastel-accent" />
      {label}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
      <AlertTriangle className="h-6 w-6 text-rose-600" />
      <p className="text-sm font-medium text-rose-800">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-xl bg-rose-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-800"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <p className="rounded-2xl border border-dashed border-slate-300 bg-white py-14 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900">{message}</p>;
}
