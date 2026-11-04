import { useEffect, useState } from 'react';
import { Search, Tv } from 'lucide-react';
import Modal from '@/components/Modal';
import { fetchCatalog } from '@/lib/catalog';
import { statusLabel } from '@/lib/format';
import type { ShowListItem } from '@/lib/types';

type SearchModalProps = {
  onClose: () => void;
  onSelect: (showId: number) => void;
};

const SEARCH_DELAY_MS = 250;
const RESULT_LIMIT = 12;

export default function SearchModal({ onClose, onSelect }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ShowListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const term = query.trim();
    if (!term) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const data = await fetchCatalog({ search: term, genre: '', sort: 'all' }, RESULT_LIMIT);
        if (!cancelled) {
          setResults(data);
          setError(null);
        }
      } catch {
        if (!cancelled) setError('No se pudo buscar. Inténtalo de nuevo.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, SEARCH_DELAY_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  return (
    <Modal title="Buscar series" onClose={onClose} maxWidth="max-w-xl">
      <div className="space-y-4">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Escribe el título de una serie"
            className="w-full rounded-xl border border-slate-200 bg-pastel-cream py-3 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-pastel-accent focus:outline-none focus:ring-2 focus:ring-pastel-accent/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </label>

        {error && <p role="alert" className="text-sm font-medium text-rose-700">{error}</p>}
        {loading && <p className="text-xs text-slate-500">Buscando...</p>}
        {!loading && query.trim() && !error && results.length === 0 && (
          <p className="text-sm text-slate-500">No encontramos ninguna serie con ese título.</p>
        )}

        {results.length > 0 && (
          <ul className="max-h-[60vh] space-y-1 overflow-y-auto">
            {results.map((show) => {
              const status = statusLabel(show.tv_status);
              return (
                <li key={show.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(show.id)}
                    className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition hover:bg-pastel-rose/50 dark:hover:bg-slate-800"
                  >
                    <span className="flex h-16 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                      {show.poster_url ? (
                        <img src={show.poster_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                      ) : (
                        <Tv className="h-4 w-4 text-slate-400" />
                      )}
                    </span>
                    <span className="min-w-0 space-y-1">
                      <span className="block truncate text-sm font-bold text-slate-900 dark:text-white">{show.title}</span>
                      <span className={`inline-block rounded-full px-2 py-px text-[10px] font-bold ${status.className}`}>{status.label}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Modal>
  );
}
