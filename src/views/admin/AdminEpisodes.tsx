import { useMemo, useState, type FormEvent } from 'react';
import { Loader2, Pencil, Trash2, X } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '@/components/PageStates';
import { useAsyncData } from '@/hooks/useAsyncData';
import { fetchCatalog } from '@/lib/catalog';
import { deleteEpisode, fetchEpisodesForAdmin, updateEpisode } from '@/lib/admin';
import { formatDate } from '@/lib/format';

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-pastel-cream px-3.5 py-2.5 text-sm text-slate-900 focus:border-pastel-accent focus:outline-none focus:ring-2 focus:ring-pastel-accent/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

export default function AdminEpisodes() {
  const [search, setSearch] = useState('');
  const [selectedShowId, setSelectedShowId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const shows = useAsyncData(() => fetchCatalog({ search, genre: '', sort: 'recent' }, 200), [search]);

  const episodes = useAsyncData(
    () => (selectedShowId ? fetchEpisodesForAdmin(selectedShowId) : Promise.resolve([])),
    [selectedShowId],
  );

  const seasons = useMemo(() => {
    const grouped = new Map<number, NonNullable<typeof episodes.data>>();
    for (const episode of episodes.data ?? []) {
      const list = grouped.get(episode.season) ?? [];
      list.push(episode);
      grouped.set(episode.season, list);
    }
    return [...grouped.entries()].sort(([a], [b]) => a - b);
  }, [episodes.data]);

  const handleSave = async (event: FormEvent<HTMLFormElement>, episodeId: number) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusyId(episodeId);
    setError(null);
    try {
      await updateEpisode(episodeId, {
        name: (data.get('name') as string)?.trim() || null,
        airdate: data.get('airdate') as string,
        runtime: data.get('runtime') ? Number(data.get('runtime')) : null,
        episode_type: (data.get('episode_type') as string)?.trim() || null,
      });
      setEditingId(null);
      episodes.reload();
    } catch {
      setError('No se pudo guardar el episodio. Inténtalo de nuevo.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (episodeId: number) => {
    if (!window.confirm('¿Eliminar este episodio del calendario?')) return;
    setBusyId(episodeId);
    setError(null);
    try {
      await deleteEpisode(episodeId);
      episodes.reload();
    } catch {
      setError('No se pudo eliminar el episodio. Inténtalo de nuevo.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Edición de episodios y calendario</h3>
        <p className="text-xs text-slate-500">Busca una serie, selecciónala y edita la fecha de emisión, el título, la duración o el tipo de cada episodio.</p>
        <div className="relative">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar serie por título..."
            className={inputClass}
          />
        </div>
        {shows.loading && <LoadingState label="Buscando series..." />}
        {shows.error && <ErrorState message={shows.error} onRetry={shows.reload} />}
        {shows.data && shows.data.length > 0 && (
          <ul className="max-h-52 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
            {shows.data.slice(0, 50).map((show) => (
              <li key={show.id}>
                <button
                  type="button"
                  onClick={() => { setSelectedShowId(show.id); setEditingId(null); }}
                  className={`flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm transition ${
                    selectedShowId === show.id
                      ? 'bg-pastel-accent text-white'
                      : 'text-slate-800 hover:bg-pastel-cream dark:text-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="truncate font-semibold">{show.title}</span>
                  {show.tv_status && <span className="shrink-0 text-[11px] opacity-70">{show.tv_status}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}

      {selectedShowId && (
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Episodios</h4>
          {episodes.loading && <LoadingState label="Cargando episodios..." />}
          {episodes.error && <ErrorState message={episodes.error} onRetry={episodes.reload} />}
          {episodes.data && episodes.data.length === 0 && <EmptyState message="Esta serie no tiene episodios cargados." />}
          {episodes.data && episodes.data.length > 0 && (
            <div className="space-y-4">
              {seasons.map(([season, list]) => (
                <div key={season} className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-pastel-accent">Temporada {season}</p>
                  <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                    {list.map((episode) => (
                      <li key={episode.tvmaze_episode_id} className="bg-white px-4 py-3 dark:bg-slate-900">
                        {editingId === episode.tvmaze_episode_id ? (
                          <form onSubmit={(e) => handleSave(e, episode.tvmaze_episode_id)} className="space-y-3">
                            <div className="grid gap-3 sm:grid-cols-2">
                              <label className="block space-y-1">
                                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Título</span>
                                <input name="name" defaultValue={episode.name ?? ''} className={inputClass} />
                              </label>
                              <label className="block space-y-1">
                                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Fecha de emisión</span>
                                <input name="airdate" type="date" defaultValue={episode.airdate} required className={inputClass} />
                              </label>
                              <label className="block space-y-1">
                                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Duración (min)</span>
                                <input name="runtime" type="number" inputMode="numeric" defaultValue={episode.runtime ?? ''} className={inputClass} />
                              </label>
                              <label className="block space-y-1">
                                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Tipo</span>
                                <input name="episode_type" defaultValue={episode.episode_type ?? ''} placeholder="regular, season_premiere..." className={inputClass} />
                              </label>
                            </div>
                            <div className="flex justify-end gap-2">
                              <button type="button" onClick={() => setEditingId(null)} className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300">
                                <X className="h-3.5 w-3.5" /> Cancelar
                              </button>
                              <button type="submit" disabled={busyId === episode.tvmaze_episode_id} className="flex items-center gap-1 rounded-lg bg-pastel-accent px-3 py-1.5 text-xs font-bold text-white hover:bg-pastel-accentHover disabled:opacity-60">
                                {busyId === episode.tvmaze_episode_id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                Guardar
                              </button>
                            </div>
                          </form>
                        ) : (
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                                <span className="mr-1.5 text-pastel-accent">E{episode.number}</span>
                                {episode.name ?? 'Sin título'}
                              </p>
                              <p className="text-xs text-slate-500">
                                {formatDate(episode.airdate)}{episode.runtime ? ` · ${episode.runtime} min` : ''}
                                {episode.episode_type && episode.episode_type !== 'regular' ? ` · ${episode.episode_type}` : ''}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              <button type="button" aria-label="Editar episodio" onClick={() => setEditingId(episode.tvmaze_episode_id)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-pastel-rose hover:text-pastel-accentHover dark:text-slate-300">
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button type="button" aria-label="Eliminar episodio" onClick={() => handleDelete(episode.tvmaze_episode_id)} disabled={busyId === episode.tvmaze_episode_id} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50 dark:text-slate-300">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
