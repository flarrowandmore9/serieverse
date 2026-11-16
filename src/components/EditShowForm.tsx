import { useState, type FormEvent } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import CastListEditor from '@/components/CastListEditor';
import PosterField from '@/components/PosterField';
import { SHOW_STATUS_OPTIONS, SHOW_TYPES_OPTIONS, formatPlatforms } from '@/lib/format';
import { updateShow } from '@/lib/admin';
import type { Character, Show, ShowListItem } from '@/lib/types';

type EditShowFormProps = {
  show: Show;
  onSaved: (updated: ShowListItem) => void;
  onCancel: () => void;
};

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-pastel-cream px-3.5 py-2.5 text-sm text-slate-900 focus:border-pastel-accent focus:outline-none focus:ring-2 focus:ring-pastel-accent/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

export default function EditShowForm({ show, onSaved, onCancel }: EditShowFormProps) {
  const [tvmazeId, setTvmazeId] = useState(show.tvmaze_id?.toString() ?? '');
  const [tmdbIdInput, setTmdbIdInput] = useState('');
  const [fetchingExternal, setFetchingExternal] = useState(false);

  const [poster, setPoster] = useState(show.poster_url ?? '');
  const [title, setTitle] = useState(show.title);
  const [synopsis, setSynopsis] = useState(show.synopsis_es ?? '');
  const [premiered, setPremiered] = useState(show.premiered ? show.premiered.split('T')[0] : '');
  const [status, setStatus] = useState(show.tv_status ?? '');
  const [network, setNetwork] = useState(show.network_name ?? '');
  const [genres, setGenres] = useState(show.genres ?? '');
  const [runtime, setRuntime] = useState(show.runtime?.toString() ?? '');
  const [rating, setRating] = useState(show.rating?.toString() ?? '');
  const [showType, setShowType] = useState(show.show_type ?? '');
  const [franchise, setFranchise] = useState(show.franchise ?? '');
  const [usPlatforms, setUsPlatforms] = useState(show.us_platforms.join(', '));
  const [esPlatforms, setEsPlatforms] = useState(show.es_platforms.join(', '));
  const [cast, setCast] = useState<Character[]>(show.characters ?? []);
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAutoFill = async () => {
    setError(null);
    setFetchingExternal(true);
    try {
      if (tmdbIdInput.trim()) {
        const apiKey = import.meta.env.VITE_TMDB_API_KEY;
        if (!apiKey) throw new Error('Falta VITE_TMDB_API_KEY en el archivo .env');
        
        const [detailRes, provRes] = await Promise.all([
          fetch(`https://api.themoviedb.org/3/tv/${tmdbIdInput.trim()}?api_key=${apiKey}&language=es-ES`),
          fetch(`https://api.themoviedb.org/3/tv/${tmdbIdInput.trim()}/watch/providers?api_key=${apiKey}`),
        ]);
        
        if (!detailRes.ok) throw new Error('No se encontró ninguna serie con ese ID en TMDB.');
        const data = await detailRes.json();
        const provData = provRes.ok ? await provRes.json() : null;

        if (data.name) setTitle(data.name);
        if (data.overview) setSynopsis(data.overview);
        if (data.poster_path) setPoster(`https://image.tmdb.org/t/p/original${data.poster_path}`);
        if (data.vote_average) setRating(Number(data.vote_average).toFixed(1));
        if (data.status) setStatus(data.status);
        if (data.first_air_date) setPremiered(data.first_air_date.split('T')[0]);
        if (data.genres?.length) setGenres(data.genres.map((g: any) => g.name).join(', '));
        if (data.networks?.[0]?.name) setNetwork(data.networks[0].name);
        if (data.episode_run_time?.[0]) setRuntime(String(data.episode_run_time[0]));

        const esList = (provData?.results?.ES?.flatrate ?? []).map((p: any) => p.provider_name);
        const usList = (provData?.results?.US?.flatrate ?? []).map((p: any) => p.provider_name);
        if (esList.length) setEsPlatforms(esList.join(', '));
        if (usList.length) setUsPlatforms(usList.join(', '));
      } else if (tvmazeId.trim()) {
        // Pedimos la serie y sus episodios embebidos desde TVMaze
        const res = await fetch(`https://api.tvmaze.com/shows/${tvmazeId.trim()}?embed[]=episodes&embed[]=cast`);
        if (!res.ok) throw new Error('No se encontró ninguna serie con ese ID en TVMaze.');
        const data = await res.json();

        if (data.name) setTitle(data.name);
        if (data.summary) setSynopsis(data.summary.replace(/<[^>]*>/g, '').trim());
        if (data.image?.original || data.image?.medium) setPoster(data.image.original ?? data.image.medium);
        if (data.rating?.average) setRating(String(data.rating.average));
        if (data.status) setStatus(data.status);
        if (data.premiered) setPremiered(data.premiered.split('T')[0]);
        if (data.genres?.length) setGenres(data.genres.join(', '));
        if (data.network?.name || data.webChannel?.name) setNetwork(data.network?.name ?? data.webChannel?.name);
        if (data.averageRuntime || data.runtime) setRuntime(String(data.averageRuntime ?? data.runtime));

        // Sincronización automática de los episodios obtenidos
        const rawEpisodes = data._embedded?.episodes ?? [];
        if (rawEpisodes.length > 0) {
          const episodesPayload = rawEpisodes
            .filter((e: any) => e.season !== null && e.number !== null && e.airdate)
            .map((e: any) => ({
              tvmaze_episode_id: e.id,
              show_id: show.id,
              season: e.season,
              number: e.number,
              name: e.name,
              airdate: e.airdate,
              runtime: e.runtime,
              episode_type: e.type,
            }));

          if (episodesPayload.length > 0) {
            // Importamos supabase para insertar directamente los episodios
            const { supabase } = await import('@/lib/supabase');
            await supabase.from('episodes').upsert(episodesPayload, { onConflict: 'tv_episode_id' });
          }
        }
      } else {
        setError('Escribe primero un ID de TVMaze o un ID de TMDB.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al obtener datos externos.');
    } finally {
      setFetchingExternal(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError('El título no puede estar vacío.');
      return;
    }
    const runtimeNumber = Number(runtime);
    const ratingNumber = rating.trim() !== '' ? Number(rating.replace(',', '.')) : null;
    const tvmazeNumber = tvmazeId.trim() !== '' ? Number(tvmazeId) : null;

    setSaving(true);
    setError(null);
    try {
      const updated = await updateShow(show.id, {
        tvmaze_id: tvmazeNumber && Number.isFinite(tvmazeNumber) ? tvmazeNumber : null,
        rating: ratingNumber !== null && Number.isFinite(ratingNumber) ? ratingNumber : null,
        title: cleanTitle,
        synopsis_es: synopsis.trim() || null,
        premiered: premiered.trim() || null,
        tv_status: status || null,
        network_name: network.trim() || null,
        genres: genres.trim() || null,
        runtime: runtime && Number.isFinite(runtimeNumber) ? runtimeNumber : null,
        show_type: showType || null,
        franchise: franchise.trim() || null,
        us_platforms: usPlatforms.split(',').map((s) => s.trim()).filter(Boolean),
        es_platforms: esPlatforms.split(',').map((s) => s.trim()).filter(Boolean),
        characters: cast
          .map((member) => ({ actor: member.actor.trim(), character: member.character.trim(), image: member.image.trim() }))
          .filter((member) => member.actor),
      });

      onSaved(updated);
    } catch {
      setError('No se pudieron guardar los cambios. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 1. Carátula */}
      <PosterField value={poster} onChange={(poster) => setPoster(poster)} />

      {/* 2. Autocompletar mediante ID Externo */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 dark:border-slate-700 dark:bg-slate-800/50">
        <p className="mb-2.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Autocompletar mediante ID Externo
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">ID TVMaze</span>
            <input
              inputMode="numeric"
              value={tvmazeId}
              onChange={(e) => setTvmazeId(e.target.value)}
              placeholder="Ej: 82"
              className={inputClass}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">ID TMDB</span>
            <input
              inputMode="numeric"
              value={tmdbIdInput}
              onChange={(e) => setTmdbIdInput(e.target.value)}
              placeholder="Ej: 1399"
              className={inputClass}
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleAutoFill}
              disabled={fetchingExternal}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-pastel-accent px-3.5 py-2.5 text-xs font-bold text-white transition hover:bg-pastel-accentHover disabled:opacity-60 dark:bg-slate-700 dark:hover:bg-slate-600"
            >
              {fetchingExternal ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Rellenar datos
            </button>
          </div>
        </div>
      </div>

      {/* 3. Título */}
      <label className="block space-y-1.5">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Título</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
      </label>

      {/* 4. Sinopsis en Español */}
      <label className="block space-y-1.5">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Sinopsis en Español</span>
        <textarea rows={4} value={synopsis} onChange={(e) => setSynopsis(e.target.value)} className={inputClass} />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* 5. Fecha de Estreno */}
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Fecha de Estreno</span>
          <input
            type="date"
            value={premiered}
            onChange={(e) => setPremiered(e.target.value)}
            className={inputClass}
          />
        </label>

        {/* 6. Estreno (Estado de emisión) */}
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Estreno</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
            {SHOW_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        {/* 7. Emisión Original */}
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Emisión Original</span>
          <input value={network} onChange={(e) => setNetwork(e.target.value)} className={inputClass} placeholder="Ej: HBO, Netflix..." />
        </label>

        {/* 8. Géneros (separados por comas) */}
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Géneros (separados por comas)</span>
          <input value={genres} onChange={(e) => setGenres(e.target.value)} className={inputClass} placeholder="Ej: Drama, Thriller" />
        </label>

        {/* 9. Duración Media (min) */}
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Duración Media (min)</span>
          <input inputMode="numeric" value={runtime} onChange={(e) => setRuntime(e.target.value)} className={inputClass} placeholder="Ej: 45" />
        </label>

        {/* 10. Puntuación / Score */}
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Puntuación / Score</span>
          <input
            type="text"
            inputMode="decimal"
            value={rating}
            onChange={(e) => setRating(e.target.value)}
            placeholder="Ej: 8.5"
            className={inputClass}
          />
        </label>

        {/* 11. Tipo de Serie */}
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tipo de Serie</span>
          <select value={showType} onChange={(e) => setShowType(e.target.value)} className={inputClass}>
            {SHOW_TYPES_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        {/* 12. Pertenece a (Franquicia / Serie Madre) */}
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Pertenece a (Franquicia / Serie Madre)</span>
          <input
            value={franchise}
            onChange={(e) => setFranchise(e.target.value)}
            className={inputClass}
            placeholder="Ej: One Chicago"
          />
        </label>

        {/* 13. Ver en EE.UU. (separadas por comas) */}
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Ver en EE.UU. (separadas por comas)</span>
          <input value={usPlatforms} onChange={(e) => setUsPlatforms(e.target.value)} className={inputClass} placeholder={formatPlatforms([])} />
        </label>

        {/* 14. Ver en España (separadas por comas) */}
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Ver en España (separadas por comas)</span>
          <input value={esPlatforms} onChange={(e) => setEsPlatforms(e.target.value)} className={inputClass} placeholder={formatPlatforms([])} />
        </label>
      </div>

      {/* 15. Reparto principal */}
      <CastListEditor value={cast} onChange={setCast} />

      {error && <p role="alert" className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">{error}</p>}

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-pastel-rose/40 dark:text-slate-300">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-pastel-accent px-5 py-2.5 text-sm font-bold text-white hover:bg-pastel-accentHover disabled:opacity-60"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Guardar cambios
        </button>
      </div>
    </form>
  );
}