import { useState, type FormEvent } from 'react';
import { Loader2, Sparkles, Trash2 } from 'lucide-react';
import CastListEditor from '@/components/CastListEditor';
import PosterField from '@/components/PosterField';
import { SHOW_STATUS_OPTIONS, SHOW_TYPES_OPTIONS, formatPlatforms } from '@/lib/format';
import { deleteShow, updateShow } from '@/lib/admin';
import {
  fetchFromTmdbById,
  fetchFromTvmazeById,
  saveSyncedEpisodes,
} from '@/lib/externalSync';
import type { Character, Show, ShowListItem } from '@/lib/types';

type EditShowFormProps = {
  show: Show;
  onSaved: (updated: ShowListItem) => void;
  onCancel: () => void;
  onDeleted?: () => void;
};

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-pastel-cream px-3.5 py-2.5 text-sm text-slate-900 focus:border-pastel-accent focus:outline-none focus:ring-2 focus:ring-pastel-accent/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

export default function EditShowForm({ show, onSaved, onCancel, onDeleted }: EditShowFormProps) {
  const [tvmazeId, setTvmazeId] = useState(show.tvmaze_id?.toString() ?? '');
  const [tmdbIdInput, setTmdbIdInput] = useState('');
  const [fetchingExternal, setFetchingExternal] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const [poster, setPoster] = useState(show.poster_url ?? '');
  const [title, setTitle] = useState(show.title);
  const [synopsis, setSynopsis] = useState(show.synopsis_es ?? '');
  const [premiered, setPremiered] = useState(show.premiered ? show.premiered.split('T')[0] : '');
  const [status, setStatus] = useState(show.tv_status ?? '');
  const [network, setNetwork] = useState(show.network_name ?? '');
  const [genres, setGenres] = useState(show.genres ?? '');
  const [runtime, setRuntime] = useState(show.runtime?.toString() ?? '');
  const [rating, setRating] = useState(show.rating?.toString() ?? '');

  // Leemos de forma segura tanto de la propiedad de la base de datos como de localStorage si existiera respaldo
  const savedCustom =
    typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem(`show_custom_${show.id}`) || '{}')
      : {};
  const [showType, setShowType] = useState(show.show_type ?? savedCustom.show_type ?? '');
  const [franchise, setFranchise] = useState(show.franchise ?? savedCustom.franchise ?? '');

  const [usPlatforms, setUsPlatforms] = useState((show.us_platforms ?? []).join(', '));
  const [esPlatforms, setEsPlatforms] = useState((show.es_platforms ?? []).join(', '));
  const [cast, setCast] = useState<Character[]>(show.characters ?? []);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAutoFill = async () => {
    setError(null);
    setSyncNotice(null);
    setFetchingExternal(true);
    try {
      const trimmedTmdb = tmdbIdInput.trim();
      const trimmedTvmaze = tvmazeId.trim();

      const tmdbNum = trimmedTmdb ? Number(trimmedTmdb) : null;
      const tvmazeNum = trimmedTvmaze ? Number(trimmedTvmaze) : null;

      if (tmdbNum !== null && (!Number.isInteger(tmdbNum) || tmdbNum <= 0)) {
        setError('El ID de TMDB debe ser un número entero positivo.');
        return;
      }
      if (tvmazeNum !== null && (!Number.isInteger(tvmazeNum) || tvmazeNum <= 0)) {
        setError('El ID de TVMaze debe ser un número entero positivo.');
        return;
      }

      const synced =
        tmdbNum !== null
          ? await fetchFromTmdbById(tmdbNum)
          : tvmazeNum !== null
          ? await fetchFromTvmazeById(tvmazeNum)
          : null;

      if (!synced) {
        setError('Introduce un ID de TVMaze o TMDB.');
        return;
      }

      if (synced.tvmaze_id) setTvmazeId(String(synced.tvmaze_id));
      if (synced.title) setTitle(synced.title);
      if (synced.synopsis_es) setSynopsis(synced.synopsis_es);
      if (synced.poster_url) setPoster(synced.poster_url);
      if (synced.rating != null) setRating(String(synced.rating));
      if (synced.tv_status) setStatus(synced.tv_status);
      if (synced.premiered) setPremiered(synced.premiered);
      if (synced.genres) setGenres(synced.genres);
      if (synced.network_name) setNetwork(synced.network_name);
      if (synced.runtime != null) setRuntime(String(synced.runtime));
      if (synced.us_platforms.length) setUsPlatforms(synced.us_platforms.join(', '));
      if (synced.es_platforms.length) setEsPlatforms(synced.es_platforms.join(', '));
      if (synced.characters.length) setCast(synced.characters);

      if (synced.episodes?.length) {
        await saveSyncedEpisodes(show.id, synced.episodes);
        setSyncNotice(`Datos cargados y ${synced.episodes.length} episodios sincronizados.`);
      } else {
        setSyncNotice('Datos de la serie cargados.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al obtener datos.');
    } finally {
      setFetchingExternal(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`¿Seguro que quieres eliminar "${title || show.title}"? Se borrarán también sus episodios.`)) {
      return;
    }

    setDeleting(true);
    setError(null);
    try {
      await deleteShow(show.id);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`show_custom_${show.id}`);
        localStorage.removeItem(`serieverse_synced_episodes_${show.id}`);
      }
      if (onDeleted) {
        onDeleted();
      } else {
        onCancel();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar la serie.');
    } finally {
      setDeleting(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError('El título es obligatorio.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      // Guardamos también en localStorage para compatibilidad inmediata con el modal de detalle
      if (typeof window !== 'undefined') {
        const currentCustom = JSON.parse(localStorage.getItem(`show_custom_${show.id}`) || '{}');
        localStorage.setItem(
          `show_custom_${show.id}`,
          JSON.stringify({ ...currentCustom, show_type: showType, franchise }),
        );
      }

      const updated = await updateShow(show.id, {
        tvmaze_id: tvmazeId.trim() ? Number(tvmazeId) : null,
        rating: rating.trim() ? Number(rating.replace(',', '.')) : null,
        title: cleanTitle,
        synopsis_es: synopsis.trim() || null,
        premiered: premiered.trim() || null,
        tv_status: status || null,
        network_name: network.trim() || null,
        genres: genres.trim() || null,
        runtime: runtime.trim() ? Number(runtime) : null,
        show_type: showType || null,
        franchise: franchise.trim() || null,
        us_platforms: usPlatforms.split(',').map((s) => s.trim()).filter(Boolean),
        es_platforms: esPlatforms.split(',').map((s) => s.trim()).filter(Boolean),
        poster_url: poster.trim() || null,
        characters: cast
          .map((c) => ({
            actor: c.actor.trim(),
            character: c.character.trim(),
            image: c.image.trim(),
          }))
          .filter((c) => c.actor),
      });

      onSaved(updated);
    } catch {
      setError('Error al guardar los cambios en la base de datos.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PosterField value={poster} onChange={setPoster} />

      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 dark:border-slate-700 dark:bg-slate-800/50">
        <p className="mb-2.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Autocompletar mediante ID Externo
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">ID TVMaze</span>
            <input inputMode="numeric" value={tvmazeId} onChange={(e) => setTvmazeId(e.target.value)} placeholder="Ej: 59344" className={inputClass} />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">ID TMDB</span>
            <input inputMode="numeric" value={tmdbIdInput} onChange={(e) => setTmdbIdInput(e.target.value)} placeholder="Ej: 1399" className={inputClass} />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleAutoFill}
              disabled={fetchingExternal}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-700"
            >
              {fetchingExternal ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Rellenar datos
            </button>
          </div>
        </div>
        {syncNotice && (
          <p className="mt-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            {syncNotice}
          </p>
        )}
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Título</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Sinopsis en Español</span>
        <textarea rows={4} value={synopsis} onChange={(e) => setSynopsis(e.target.value)} className={inputClass} />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Fecha de Estreno</span>
          <input type="date" value={premiered} onChange={(e) => setPremiered(e.target.value)} className={inputClass} />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Estreno / Estado</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
            {SHOW_STATUS_OPTIONS.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
          </select>
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Emisión Original</span>
          <input value={network} onChange={(e) => setNetwork(e.target.value)} className={inputClass} />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Géneros (comas)</span>
          <input value={genres} onChange={(e) => setGenres(e.target.value)} className={inputClass} />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Duración Media (min)</span>
          <input inputMode="numeric" value={runtime} onChange={(e) => setRuntime(e.target.value)} className={inputClass} />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Puntuación / Score</span>
          <input type="text" inputMode="decimal" value={rating} onChange={(e) => setRating(e.target.value)} className={inputClass} />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tipo de Serie</span>
          <select value={showType} onChange={(e) => setShowType(e.target.value)} className={inputClass}>
            <option value="">Seleccionar tipo...</option>
            {SHOW_TYPES_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Pertenece a (Franquicia / Serie madre)</span>
          <input
            value={franchise}
            onChange={(e) => setFranchise(e.target.value)}
            className={inputClass}
            placeholder="Ej: One Chicago"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Ver en EE.UU.</span>
          <input value={usPlatforms} onChange={(e) => setUsPlatforms(e.target.value)} className={inputClass} placeholder={formatPlatforms([])} />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Ver en España</span>
          <input value={esPlatforms} onChange={(e) => setEsPlatforms(e.target.value)} className={inputClass} placeholder={formatPlatforms([])} />
        </label>
      </div>

      <CastListEditor value={cast} onChange={setCast} />

      {error && (
        <p role="alert" className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting || saving}
          className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 px-3.5 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50 dark:border-rose-900/60 dark:text-rose-400 dark:hover:bg-rose-950/40"
        >
          {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          Eliminar serie
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving || deleting}
            className="flex items-center gap-2 rounded-xl bg-pastel-accent px-5 py-2.5 text-sm font-bold text-white hover:bg-pastel-accentHover disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar cambios
          </button>
        </div>
      </div>
    </form>
  );
}