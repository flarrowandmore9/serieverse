import { useState, type FormEvent } from 'react';
import { Loader2, Trash2, X } from 'lucide-react';
import { addEpisode, deleteEpisode, updateEpisode } from '@/lib/admin';
import { fetchCatalog } from '@/lib/catalog';
import { useAsyncData } from '@/hooks/useAsyncData';
import ShowPicker from '@/components/ShowPicker';
import type { CalendarEpisode, EpisodeRole, SpecialTag } from '@/lib/types';

type AdminCalendarEditorProps = {
  episode: CalendarEpisode | null;
  lockedShow?: { id: number; title: string };
  defaultDate: string;
  onClose: () => void;
  onSaved: () => void;
};

const CATEGORIES: { value: EpisodeRole | ''; label: string }[] = [
  { value: '', label: 'Automática (según la emisión)' },
  { value: 'regular', label: 'Emisión Normal' },
  { value: 'series_premiere', label: 'Estreno Serie' },
  { value: 'season_premiere', label: 'Estreno Temporada' },
  { value: 'mid_season_finale', label: 'Final Mitad Temporada' },
  { value: 'season_finale', label: 'Final Temporada' },
];

const SPECIAL_TAGS: { value: SpecialTag; label: string }[] = [
  { value: null, label: 'Episodio normal' },
  { value: 'crossover', label: 'Crossover' },
  { value: 'halloween', label: 'Episodio Halloween' },
  { value: 'christmas', label: 'Episodio Navidad' },
  { value: 'special', label: 'Episodio Especial' },
];

const inputClass = 'w-full rounded-xl border border-slate-200 bg-pastel-cream px-3.5 py-2.5 text-sm text-slate-900 focus:border-pastel-accent focus:outline-none focus:ring-2 focus:ring-pastel-accent/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

export default function AdminCalendarEditor({ episode, lockedShow, defaultDate, onClose, onSaved }: AdminCalendarEditorProps) {
  const shows = useAsyncData(() => fetchCatalog({ search: '', genre: '', sort: 'recent' }, 1000), []);
  const fixedShow = episode?.show ?? lockedShow ?? null;
  const [showId, setShowId] = useState(fixedShow ? String(fixedShow.id) : '');
  const [season, setSeason] = useState(episode ? String(episode.season) : '1');
  const [number, setNumber] = useState(episode ? String(episode.number) : '1');
  const [name, setName] = useState(episode?.name ?? '');
  const [airdate, setAirdate] = useState(episode?.airdate ?? defaultDate);
  const [runtime, setRuntime] = useState(episode?.runtime ? String(episode.runtime) : '');
  const [roleOverride, setRoleOverride] = useState<EpisodeRole | ''>(episode?.role_override ?? '');
  const [specialTag, setSpecialTag] = useState<SpecialTag>(episode?.special_tag ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedShowId = Number(showId);
    const parsedSeason = Number(season);
    const parsedNumber = Number(number);
    const parsedRuntime = runtime.trim() ? Number(runtime) : null;
    const valid =
      Number.isInteger(parsedShowId) && parsedShowId > 0 &&
      Number.isInteger(parsedSeason) && parsedSeason >= 0 &&
      Number.isInteger(parsedNumber) && parsedNumber >= 1 &&
      Boolean(airdate) &&
      (parsedRuntime === null || (Number.isInteger(parsedRuntime) && parsedRuntime >= 0));
    if (!valid) {
      setError('Revisa la serie, la temporada, el episodio, la fecha y la duración.');
      return;
    }

    const fields = {
      show_id: parsedShowId,
      season: parsedSeason,
      number: parsedNumber,
      name: name.trim() || null,
      airdate,
      runtime: parsedRuntime,
      role_override: roleOverride || null,
      special_tag: specialTag,
    };

    setBusy(true);
    setError(null);
    try {
      if (episode) {
        await updateEpisode(episode.tvmaze_episode_id, fields);
      } else {
        const newId = await addEpisode({ ...fields, episode_type: null, special_tag: null });
        if (fields.role_override || fields.special_tag) await updateEpisode(newId, fields);
      }
      onSaved();
    } catch {
      setError('No se pudo guardar el episodio. Revisa que no exista ya ese número en la temporada.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!episode) return;
    if (!window.confirm(`¿Eliminar el episodio ${episode.number} de "${episode.show.title}"?`)) return;
    setBusy(true);
    setError(null);
    try {
      await deleteEpisode(episode.tvmaze_episode_id);
      onSaved();
    } catch {
      setError('No se pudo eliminar el episodio.');
    } finally {
      setBusy(false);
    }
  };

  const showOptions = [...(shows.data ?? [])].sort((a, b) => a.title.localeCompare(b.title, 'es'));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-labelledby="calendar-editor-title">
      <form onSubmit={handleSubmit} className="max-h-[90vh] w-full max-w-lg space-y-5 overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-pastel-accent">Editor del calendario</p>
            <h2 id="calendar-editor-title" className="mt-1 text-xl font-black text-slate-900 dark:text-white">{episode ? 'Editar episodio' : 'Añadir episodio'}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar editor" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-pastel-rose/60 dark:text-slate-300 dark:hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Serie</span>
            {fixedShow ? (
              <p className="rounded-xl bg-pastel-cream px-3.5 py-2.5 text-sm font-semibold text-slate-900 dark:bg-slate-800 dark:text-slate-100">{fixedShow.title}</p>
            ) : (
              <ShowPicker shows={showOptions} value={showId} onChange={setShowId} />
            )}
          </div>
          <label className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Temporada</span>
            <input required type="number" min={0} value={season} onChange={(e) => setSeason(e.target.value)} className={inputClass} />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Episodio</span>
            <input required type="number" min={1} value={number} onChange={(e) => setNumber(e.target.value)} className={inputClass} />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Fecha de emisión</span>
            <input required type="date" value={airdate} onChange={(e) => setAirdate(e.target.value)} className={inputClass} />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Duración (minutos)</span>
            <input type="number" min={0} value={runtime} onChange={(e) => setRuntime(e.target.value)} className={inputClass} />
          </label>
          <label className="space-y-1.5 sm:col-span-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Título del episodio</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </label>
          <label className="space-y-1.5 sm:col-span-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Categoría</span>
            <select value={roleOverride} onChange={(e) => setRoleOverride(e.target.value as EpisodeRole | '')} className={inputClass}>
              {CATEGORIES.map((category) => (
                <option key={category.value} value={category.value}>{category.label}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5 sm:col-span-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Etiqueta</span>
            <select value={specialTag ?? ''} onChange={(e) => setSpecialTag((e.target.value || null) as SpecialTag)} className={inputClass}>
              {SPECIAL_TAGS.map((tag) => (
                <option key={tag.label} value={tag.value ?? ''}>{tag.label}</option>
              ))}
            </select>
          </label>
        </div>

        {error && <p role="alert" className="text-sm font-medium text-rose-700">{error}</p>}

        <div className="flex flex-wrap items-center justify-between gap-3">
          {episode ? (
            <button type="button" onClick={handleDelete} disabled={busy} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60">
              <Trash2 className="h-4 w-4" />
              Eliminar
            </button>
          ) : <span />}
          <button type="submit" disabled={busy} className="flex items-center gap-2 rounded-xl bg-pastel-accent px-5 py-2.5 text-sm font-bold text-white transition hover:bg-pastel-accentHover disabled:opacity-60">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar
          </button>
        </div>
      </form>
    </div>
  );
}
