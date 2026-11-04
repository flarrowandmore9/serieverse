import { useState } from 'react';
import { ChevronDown, Trash2 } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '@/components/PageStates';
import { useAsyncData } from '@/hooks/useAsyncData';
import { deleteSuggestion, fetchSuggestions, setSuggestionStatus } from '@/lib/admin';
import { formatDate } from '@/lib/format';
import { SUGGESTION_STATUSES, type Suggestion, type SuggestionStatus } from '@/lib/types';

const COLUMN_STYLES: Record<SuggestionStatus, { dot: string; header: string }> = {
  Prioridad: { dot: 'bg-rose-500', header: 'text-rose-700 dark:text-rose-300' },
  'Por hacer': { dot: 'bg-pastel-accent', header: 'text-pastel-accentHover dark:text-pastel-lavender' },
  'En proceso': { dot: 'bg-amber-400', header: 'text-amber-700 dark:text-amber-300' },
  Completada: { dot: 'bg-emerald-500', header: 'text-emerald-700 dark:text-emerald-300' },
};

export default function AdminSuggestions() {
  const suggestions = useAsyncData(fetchSuggestions, []);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [openIds, setOpenIds] = useState<Set<number>>(new Set());
  const [actionError, setActionError] = useState<string | null>(null);

  const toggleOpen = (id: number) =>
    setOpenIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const run = async (id: number, action: () => Promise<void>) => {
    setBusyId(id);
    setActionError(null);
    try {
      await action();
      suggestions.reload();
    } catch {
      setActionError('No se pudo actualizar la sugerencia. Inténtalo de nuevo.');
    } finally {
      setBusyId(null);
    }
  };

  const byStatus = (status: SuggestionStatus): Suggestion[] =>
    (suggestions.data ?? []).filter((item) => item.status === status);

  return (
    <div className="space-y-4">
      {suggestions.loading && <LoadingState label="Cargando buzón..." />}
      {suggestions.error && <ErrorState message={suggestions.error} onRetry={suggestions.reload} />}
      {actionError && <p role="alert" className="text-sm text-rose-700">{actionError}</p>}
      {suggestions.data && suggestions.data.length === 0 && <EmptyState message="Todavía no hay sugerencias en el buzón." />}

      {suggestions.data && suggestions.data.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {SUGGESTION_STATUSES.map((status) => {
            const items = byStatus(status);
            const style = COLUMN_STYLES[status];
            return (
              <section key={status} className="flex min-h-40 flex-col gap-3 rounded-2xl bg-pastel-cream/70 p-3 dark:bg-slate-900/60">
                <header className="flex items-center justify-between px-1">
                  <h3 className={`flex items-center gap-2 text-sm font-bold ${style.header}`}>
                    <span className={`h-2.5 w-2.5 rounded-full ${style.dot}`} />
                    {status}
                  </h3>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{items.length}</span>
                </header>

                {items.length === 0 && <p className="px-1 py-6 text-center text-xs text-slate-500 dark:text-slate-400">Sin sugerencias</p>}

                {items.map((item) => {
                  const isOpen = openIds.has(item.id);
                  return (
                  <article key={item.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => toggleOpen(item.id)}
                      className="flex w-full items-start justify-between gap-2 p-3.5 text-left transition hover:bg-pastel-cream/60 dark:hover:bg-slate-800/60"
                    >
                      <span className="min-w-0 space-y-0.5">
                        <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{item.name}</span>
                        <span className="block text-xs text-slate-500 dark:text-slate-400">{formatDate(item.created_at.slice(0, 10))}</span>
                      </span>
                      <ChevronDown className={`mt-0.5 h-4 w-4 shrink-0 text-slate-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isOpen && (
                      <div className="space-y-3 border-t border-slate-100 p-3.5 dark:border-slate-800">
                        {item.email && <p className="text-xs text-slate-500 dark:text-slate-400">{item.email}</p>}
                        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{item.message}</p>
                        <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                          <select
                            aria-label="Mover a otra columna"
                            value={item.status}
                            disabled={busyId === item.id}
                            onChange={(e) => run(item.id, () => setSuggestionStatus(item.id, e.target.value as SuggestionStatus))}
                            className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-pastel-accent/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                          >
                            {SUGGESTION_STATUSES.map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            aria-label="Eliminar sugerencia"
                            disabled={busyId === item.id}
                            onClick={() => {
                              if (window.confirm('¿Eliminar esta sugerencia?')) run(item.id, () => deleteSuggestion(item.id));
                            }}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-rose-950/40"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </article>
                  );
                })}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
