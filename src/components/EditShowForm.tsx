import { useMemo, useState, type FormEvent } from 'react';
import { ChevronDown, Loader2, Pencil, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { AdminCalendarEditor from '@/components/AdminCalendarEditor';
import { formatDate, toIsoDate } from '@/lib/format';
import { deleteEpisode, updateEpisode } from '@/lib/admin';
import { SPECIAL_TAG_LABELS, SPECIAL_TAG_STYLES } from '@/lib/catalog';
import type { Episode, EpisodeRole } from '@/lib/types';
import { supabase } from '@/lib/supabase';

type AdminEpisodeEditorProps = {
  show: { id: number; title: string; tvmaze_id?: number | null };
  episodes: Episode[];
  onChanged: () => void;
};

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-pastel-accent focus:outline-none focus:ring-2 focus:ring-pastel-accent/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';

export default function AdminEpisodeEditor({ show, episodes, onChanged }: AdminEpisodeEditorProps) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [openSeason, setOpenSeason] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [syncingEpisodes, setSyncingEpisodes] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const seasons = useMemo(() => [...new Set(episodes.map((episode) => episode.season))].sort((a, b) => a - b), [episodes]);

  // Botón de emergencia/refuerzo para descargar episodios al vuelo si están a 0
  const handleForceSyncEpisodes = async () => {
    if (!show.tvmaze_id) {
      setError('Esta serie no tiene un ID de TVMaze asignado. Edita la serie y asígnale su ID de TVMaze primero.');
      return;
    }
    setSyncingEpisodes(true);
    setError(null);
    try {
      const res = await fetch(`https://api.tvmaze.com/shows/${show.tvmaze_id}?embed[]=episodes`);
      if (!res.ok) throw new Error('No se pudieron obtener los episodios de TVMaze.');
      const data = await res.json();
      const rawEpisodes = data._embedded?.episodes ?? [];

      if (rawEpisodes.length === 0) {
        setError('TVMaze no devolvió episodios para este ID.');
        setSyncingEpisodes(false);
        return;
      }

      const episodesPayload = rawEpisodes
        .filter((e: any) => e.season !== null && e.number !== null && e.airdate)
        .map((e: any) => ({
          tvmaze_episode_id: Number(e.id),
          show_id: show.id,
          season: Number(e.season),
          number: Number(e.number),
          name: e.name ? String(e.name) : `Episodio ${e.number}`,
          airdate: String(e.airdate),
          runtime: e.runtime ? Number(e.runtime) : null,
          episode_type: e.type ? String(e.type) : 'regular',
        }));

      for (let i = 0; i < episodesPayload.length; i += 100) {
        const batch = episodesPayload.slice(i, i + 100);
        await supabase.from('episodes').upsert(batch, { onConflict: 'tvmaze_episode_id' });
      }

      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al sincronizar episodios.');
    } finally {
      setSyncingEpisodes(false);
    }
  };

  const save = async (event: FormEvent<HTMLFormElement>, episode: Episode) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusyId(episode.tvmaze_episode_id);
    setError(null);
    try {
      const roleOverrideVal = String(data.get('role_override') ?? '');
      await updateEpisode(episode.tvmaze_episode_id, {
        name: String(data.get('name') ?? '').trim() || null,
        airdate: String(data.get('airdate') ?? episode.airdate),
        runtime: data.get('runtime') ? Number(data.get('runtime')) : null,
        episode_type: episode.episode_type ?? null,
        role_override: roleOverrideVal ? (roleOverrideVal as EpisodeRole) : null,
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-900 dark:text-white">Edición de temporadas</p>
          <p className="mt-1 text-xs text-slate-500">Gestiona las temporadas, episodios o sincronízalos automáticamente.</p>
        </div>
        <div className="flex gap-2">
          {episodes.length === 0 && (
            <button
              type="button"
              onClick={handleForceSyncEpisodes}
              disabled={syncingEpisodes}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-amber-700 disabled:opacity-50"
            >
              {syncingEpisodes ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Sincronizar Episodios
            </button>
          )}
          <button type="button" onClick={() => setAdding(true)} className="flex shrink-0 items-center gap-1.5 rounded-lg bg-pastel-accent px-3 py-2 text-xs font-bold text-white transition hover:bg-pastel-accentHover">
            <Plus className="h-3.5 w-3.5" />
            Añadir Episodio
          </button>
        </div>
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
      
      {episodes.length === 0 && !error && (
        <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center dark:border-slate-700">
          <p className="text-xs text-slate-500">No hay episodios cargados para esta serie.</p>
          <button
            type="button"
            onClick={handleForceSyncEpisodes}
            disabled={syncingEpisodes}
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-pastel-accent px-4 py-2 text-xs font-bold text-white hover:bg-pastel-accentHover"
          >
            {syncingEpisodes && <Loader2 className="h-4 w-4 animate-spin" />}
            Descargar todos los episodios ahora
          </button>
        </div>
      )}

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
                      <form onSubmit={(event) => save(event, episode)} className="space-y-3 rounded-xl border border-pastel-accent/30 bg-slate-50/80 p-3.5 dark:bg-slate-800/80">
                        <div className="grid gap-3 sm:grid-cols-3">
                          <label className="space-y-1 sm:col-span-3">
                            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Título del episodio</span>
                            <input name="name" defaultValue={episode.name ?? ''} className={inputClass} />
                          </label>
                          <label className="space-y-1">
                            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Fecha de Emisión</span>
                            <input name="airdate" type="date" defaultValue={episode.airdate} className={inputClass} />
                          </label>
                          <label className="space-y-1">
                            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Minutos</span>
                            <input name="runtime" type="number" defaultValue={episode.runtime ?? ''} className={inputClass} placeholder="Ej: 45" />
                          </label>
                          <label className="space-y-1">
                            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Categoría</span>
                            <select name="role_override" defaultValue={episode.role_override ?? ''} className={inputClass}>
                              <option value="">Emisión normal</option>
                              <option value="series_premiere">Estreno serie</option>
                              <option value="season_premiere">Estreno temporada</option>
                              <option value="mid_season_finale">Final mitad temporada</option>
                              <option value="season_finale">Final temporada</option>
                            </select>
                          </label>
                          <label className="space-y-1 sm:col-span-3">
                            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Etiqueta especial</span>
                            <select name="special_tag" defaultValue={episode.special_tag ?? ''} className={inputClass}>
                              <option value="">Normal</option>
                              <option value="crossover">Crossover</option>
                              <option value="halloween">Halloween</option>
                              <option value="christmas">Navidad</option>
                              <option value="special">Especial</option>
                            </select>
                          </label>
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                          <button type="button" onClick={() => setEditingId(null)} className="rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700">
                            Cancelar
                          </button>
                          <button type="submit" disabled={busyId === episode.tvmaze_episode_id} className="flex items-center gap-1.5 rounded-xl bg-pastel-accent px-4 py-2 text-xs font-bold text-white hover:bg-pastel-accentHover disabled:opacity-60">
                            {busyId === episode.tvmaze_episode_id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                            Guardar cambios
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex items-center gap-2 flex-wrap">
                          <p className="truncate text-xs font-bold text-slate-900 dark:text-white"><span className="mr-1.5 text-pastel-accent">E{episode.number}</span>{episode.name ?? 'Sin título'}</p>
                          {episode.role_override && episode.role_override !== 'regular' && (
                            <span className="shrink-0 mt-1 inline-block rounded-md px-1.5 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-100">
                              {episode.role_override === 'series_premiere' ? 'Estreno' : episode.role_override === 'season_premiere' ? 'Estreno Temporada' : episode.role_override === 'season_finale' ? 'Final Temporada' : 'Final Mitad Temporada'}
                            </span>
                          )}
                          {episode.special_tag && (
                            <span className={`shrink-0 mt-1 ml-1 inline-block rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${SPECIAL_TAG_STYLES[episode.special_tag]}`}>{SPECIAL_TAG_LABELS[episode.special_tag]}</span>
                          )}
                          <p className="w-full mt-1 text-[11px] text-slate-500">{formatDate(episode.airdate)} · {episode.runtime ? `${episode.runtime} min` : 'Duración por confirmar'}</p>
                        </div>
                        <div className="flex shrink-0 gap-1"><button type="button" aria-label="Editar episodio" onClick={() => setEditingId(episode.tvmaze_episode_id)} className="rounded-lg p-2 text-slate-500 hover:bg-pastel-rose hover:text-pastel-accent"><Pencil className="h-3.5 w-3.5" /></button><button type="button" aria-label="Eliminar episodio" onClick={() => remove(episode)} disabled={busyId === episode.tvmaze_episode_id} className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700"><Trash2 className="h-3.5 w-3.5" /></button></div>
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