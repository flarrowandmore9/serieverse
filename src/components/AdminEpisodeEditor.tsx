import { useMemo, useState, type FormEvent } from 'react';
import { ChevronDown, Loader2, Pencil, Plus, Sparkles, Trash2, X } from 'lucide-react';
import AdminCalendarEditor from '@/components/AdminCalendarEditor';
import { formatDate, toIsoDate } from '@/lib/format';
import { deleteEpisode, updateEpisode } from '@/lib/admin';
import { SPECIAL_TAG_LABELS, SPECIAL_TAG_STYLES } from '@/lib/catalog';
import type { Episode } from '@/lib/types';
import { supabase } from '@/lib/supabase';

type AdminEpisodeEditorProps = {
  show: { id: number; title: string; tvmaze_id?: number | null };
  episodes: Episode[];
  onChanged: () => void;
};

const inputClass = 'w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 focus:border-pastel-accent focus:outline-none';

export default function AdminEpisodeEditor({ show, episodes, onChanged }: AdminEpisodeEditorProps) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [openSeason, setOpenSeason] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [tvmazeInput, setTvmazeInput] = useState('');
  const [tmdbInput, setTmdbInput] = useState('');
  const [syncingExternal, setSyncingExternal] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const seasons = useMemo(() => [...new Set(episodes.map((episode) => episode.season))].sort((a, b) => a - b), [episodes]);

  const handleFetchExternalEpisodes = async () => {
    setSyncingExternal(true);
    setError(null);
    setSyncMessage(null);
    try {
      let rawEpisodes: any[] = [];

      if (tmdbInput.trim()) {
        const apiKey = import.meta.env.VITE_TMDB_API_KEY;
        if (!apiKey) throw new Error('Falta VITE_TMDB_API_KEY en el archivo .env');
        
        const detailRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbInput.trim()}?api_key=${apiKey}&language=es-ES`);
        if (!detailRes.ok) throw new Error('No se encontró la serie en TMDB.');
        const showData = await detailRes.json();
        const seasonsList = showData.seasons || [];

        const seasonPromises = seasonsList.map(async (season: any) => {
          if (season.season_number === 0) return [];
          const sRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbInput.trim()}/season/${season.season_number}?api_key=${apiKey}&language=es-ES`);
          if (!sRes.ok) return [];
          const sData = await sRes.json();
          return (sData.episodes || []).map((e: any) => ({
            tvmaze_episode_id: Number(`${season.season_number}${String(e.episode_number).padStart(3, '0')}`),
            show_id: show.id,
            season: e.season_number,
            number: e.episode_number,
            name: e.name || `Episodio ${e.episode_number}`,
            airdate: e.air_date || null, // Permite nulos
            runtime: e.runtime || showData.episode_run_time?.[0] || null,
            episode_type: 'regular',
          }));
        });

        const results = await Promise.all(seasonPromises);
        rawEpisodes = results.flat();
      } else if (tvmazeInput.trim()) {
        const res = await fetch(`https://api.tvmaze.com/shows/${tvmazeInput.trim()}?embed[]=episodes`);
        if (!res.ok) throw new Error('No se encontró la serie en TVMaze con ese ID.');
        const data = await res.json();
        rawEpisodes = (data._embedded?.episodes ?? []).map((e: any) => ({
          tvmaze_episode_id: e.id,
          show_id: show.id,
          season: e.season,
          number: e.number,
          name: e.name,
          airdate: e.airdate || null, // Permite nulos
          runtime: e.runtime,
          episode_type: e.type,
        }));
      } else {
        throw new Error('Introduce un ID de TVMaze o de TMDB primero.');
      }

      if (rawEpisodes.length === 0) {
        throw new Error('No se encontraron episodios para sincronizar.');
      }

      const { error: upsertErr } = await supabase.from('episodes').upsert(rawEpisodes, { onConflict: 'tvmaze_episode_id' });
      if (upsertErr) throw new Error(upsertErr.message);

      setSyncMessage(`¡Se han sincronizado ${rawEpisodes.length} episodios con éxito!`);
      setTvmazeInput('');
      setTmdbInput('');
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al sincronizar episodios externos.');
    } finally {
      setSyncingExternal(false);
    }
  };

  const save = async (event: FormEvent<HTMLFormElement>, episode: Episode) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusyId(episode.tvmaze_episode_id);
    setError(null);
    try {
      const airdateValue = String(data.get('airdate') ?? '').trim();
      await updateEpisode(episode.tvmaze_episode_id, {
        name: String(data.get('name') ?? '').trim() || null,
        airdate: airdateValue !== '' ? airdateValue : null, // Fecha totalmente opcional
        runtime: data.get('runtime') ? Number(data.get('runtime')) : null,
        episode_type: episode.episode_type ?? null,
        role_override: (String(data.get('role_override') ?? '') || null) as Episode['role_override'],
        special_tag: (String(data.get('special_tag') ?? '') || null) as Episode['special_tag'],
      });
      setEditingId(null);
      onChanged();
    } catch {
      setError('No se pudo guardar el episodio.');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (episode: Episode) => {
    if (!window.confirm(`¿Eliminar el episodio ${episode.number} de la temporada ${episode.season}?`)) return;
    setBusyId(episode.tvmaze_episode_id);
    setError(null);
    try {
      await deleteEpisode(episode.tvmaze_episode_id);
      onChanged();
    } catch {
      setError('No se pudo eliminar el episodio.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-pastel-accent/25 bg-pastel-cream/60 p-4 dark:bg-slate-800/60">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-bold text-slate-900 dark:text-white">Edición de temporadas y episodios</p>
          <p className="mt-1 text-xs text-slate-500">Sincroniza por ID externo, edita episodios individualmente o añade nuevos.</p>
        </div>
        <button type="button" onClick={() => setAdding(true)} className="flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-pastel-accent px-3 py-2 text-xs font-bold text-white transition hover:bg-pastel-accentHover">
          <Plus className="h-3.5 w-3.5" />
          Añadir Episodio
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-pastel-accent">Sincronizar episodios por ID Externo</p>
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <input
            type="text"
            placeholder="ID TVMaze (ej: 82)"
            value={tvmazeInput}
            onChange={(e) => setTvmazeInput(e.target.value)}
            className={inputClass}
          />
          <input
            type="text"
            placeholder="ID TMDB (ej: 1399)"
            value={tmdbInput}
            onChange={(e) => setTmdbInput(e.target.value)}
            className={inputClass}
          />
          <button
            type="button"
            onClick={handleFetchExternalEpisodes}
            disabled={syncingExternal}
            className="flex items-center justify-center gap-1 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-700 dark:hover:bg-slate-600"
          >
            {syncingExternal ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Sincronizar
          </button>
        </div>
        {syncMessage && <p className="mt-2 text-xs font-semibold text-emerald-600">{syncMessage}</p>}
      </div>

      {adding && (
        <AdminCalendarEditor
          episode={null}
          lockedShow={show}
          defaultDate={toIsoDate(new Date())}
          onClose={() => setAdding(false)}
          onSaved={() => { setAdding(false); onChanged(); }}
        />
      )}
      {error && <p role="alert" className="text-xs font-semibold text-rose-700">{error}</p>}
      
      {seasons.map((season) => {
        const isOpen = openSeason === season;
        const seasonEpisodes = episodes.filter((episode) => episode.season === season);
        return (
          <section key={season} className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpenSeason(isOpen ? null : season)}
              className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-pastel-cream/60 dark:hover:bg-slate-800"
            >
              <span className="text-xs font-black uppercase tracking-wide text-pastel-accent">Temporada {season} · {seasonEpisodes.length} episodios</span>
              <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
              <div className="divide-y divide-slate-200 border-t border-slate-200 dark:divide-slate-700 dark:border-slate-700">
                {seasonEpisodes.map((episode) => (
                  <div key={episode.tvmaze_episode_id} className="p-3">
                    {editingId === episode.tvmaze_episode_id ? (
                      <form onSubmit={(event) => save(event, episode)} className="space-y-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                          <label className="space-y-1">
                            <span className="text-[10px] font-semibold text-slate-500">Título</span>
                            <input name="name" defaultValue={episode.name ?? ''} className={inputClass} />
                          </label>
                          <label className="space-y-1">
                            <span className="text-[10px] font-semibold text-slate-500">Emisión (Opcional)</span>
                            <input name="airdate" type="date" defaultValue={episode.airdate ?? ''} className={inputClass} />
                          </label>
                          <label className="space-y-1">
                            <span className="text-[10px] font-semibold text-slate-500">Minutos</span>
                            <input name="runtime" type="number" defaultValue={episode.runtime ?? ''} className={inputClass} />
                          </label>
                          <label className="space-y-1">
                            <span className="text-[10px] font-semibold text-slate-500">Categoría</span>
                            <select name="role_override" defaultValue={episode.role_override ?? 'regular'} className={inputClass}>
                              <option value="regular">Emisión normal</option>
                              <option value="series_premiere">Estreno serie</option>
                              <option value="season_premiere">Estreno temporada</option>
                              <option value="mid_season_finale">Final mitad temporada</option>
                              <option value="season_finale">Final temporada</option>
                            </select>
                          </label>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1">
                          <label className="flex-1 space-y-1">
                            <span className="text-[10px] font-semibold text-slate-500">Etiqueta especial</span>
                            <select name="special_tag" defaultValue={episode.special_tag ?? ''} className={inputClass}>
                              <option value="">Normal</option>
                              <option value="crossover">Crossover</option>
                              <option value="halloween">Halloween</option>
                              <option value="christmas">Navidad</option>
                              <option value="special">Especial</option>
                            </select>
                          </label>
                          <div className="flex items-end gap-1.5 pt-4">
                            <button type="submit" disabled={busyId === episode.tvmaze_episode_id} className="rounded-lg bg-pastel-accent px-4 py-2 text-xs font-bold text-white transition hover:bg-pastel-accentHover disabled:opacity-60">
                              {busyId === episode.tvmaze_episode_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Guardar'}
                            </button>
                            <button type="button" aria-label="Cancelar edición" onClick={() => setEditingId(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </form>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex items-center gap-2 flex-wrap">
                          <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
                            <span className="mr-1.5 text-pastel-accent">E{episode.number}</span>{episode.name ?? 'Sin título'}
                          </p>
                          {episode.role_override && episode.role_override !== 'regular' && (
                            <span className="shrink-0 mt-1 inline-block rounded-md px-1.5 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-100">
                              {episode.role_override === 'series_premiere' ? 'Estreno serie' : episode.role_override === 'season_premiere' ? 'Estreno temporada' : episode.role_override === 'season_finale' ? 'Final temporada' : 'Final mitad temporada'}
                            </span>
                          )}
                          {episode.special_tag && (
                            <span className={`shrink-0 mt-1 ml-1 inline-block rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${SPECIAL_TAG_STYLES[episode.special_tag]}`}>
                              {SPECIAL_TAG_LABELS[episode.special_tag]}
                            </span>
                          )}
                          <p className="w-full mt-1 text-[11px] text-slate-500">
                            {episode.airdate ? formatDate(episode.airdate) : 'Fecha por confirmar'} · {episode.runtime ? `${episode.runtime} min` : 'Duración por confirmar'}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <button type="button" aria-label="Editar episodio" onClick={() => setEditingId(episode.tvmaze_episode_id)} className="rounded-lg p-2 text-slate-500 hover:bg-pastel-rose hover:text-pastel-accent">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" aria-label="Eliminar episodio" onClick={() => remove(episode)} disabled={busyId === episode.tvmaze_episode_id} className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}