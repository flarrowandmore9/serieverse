import { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  fetchFromTmdbById,
  fetchFromTvmazeById,
  saveSyncedEpisodes,
} from '@/lib/externalSync';
type AdminShowsProps = {
  onOpenShow: (showId: number) => void;
};

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-pastel-cream px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-pastel-accent focus:outline-none focus:ring-2 focus:ring-pastel-accent/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

export function QuickImportShowBox({ onImported }: { onImported: () => void }) {
  const [source, setSource] = useState<'tvmaze' | 'tmdb'>('tmdb');
  const [externalId, setExternalId] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async () => {
    const numericId = Number(externalId.trim());
    if (!numericId || Number.isNaN(numericId)) {
      setError('Introduce un ID numérico válido.');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const synced =
        source === 'tmdb'
          ? await fetchFromTmdbById(numericId)
          : await fetchFromTvmazeById(numericId);

      const { data: insertedShow, error: insertError } = await supabase
        .from('shows')
        .insert({
          tvmaze_id: synced.tvmaze_id,
          imdb_id: synced.imdb_id,
          title: synced.title,
          synopsis_es: synced.synopsis_es,
          poster_url: synced.poster_url,
          rating: synced.rating,
          tv_status: synced.tv_status,
          premiered: synced.premiered,
          genres: synced.genres,
          network_name: synced.network_name,
          runtime: synced.runtime,
          us_platforms: synced.us_platforms,
          es_platforms: synced.es_platforms,
          characters: synced.characters,
        })
        .select('id, title')
        .single();

      if (insertError) throw new Error(insertError.message);

      await saveSyncedEpisodes(insertedShow.id, synced.episodes);

      setMessage(
        `¡"${insertedShow.title}" importada con ${synced.episodes.length} episodios!`,
      );
      setExternalId('');
      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al importar la serie.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-pastel-accent/30 bg-pastel-cream/60 p-4 dark:bg-slate-800/60">
      <p className="text-sm font-bold text-slate-900 dark:text-white">
        Añadir serie automática por ID (TVMaze o TMDB)
      </p>
      <p className="mt-0.5 text-xs text-slate-500">
        Descarga ficha completa, carátula, reparto, plataformas y todas las temporadas y episodios.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          value={source}
          onChange={(e) => setSource(e.target.value as 'tvmaze' | 'tmdb')}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        >
          <option value="tmdb">TMDB ID</option>
          <option value="tvmaze">TVMaze ID</option>
        </select>

        <input
          inputMode="numeric"
          value={externalId}
          onChange={(e) => setExternalId(e.target.value)}
          placeholder={source === 'tmdb' ? 'Ej: 1399' : 'Ej: 82'}
          className="w-44 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />

        <button
          type="button"
          onClick={handleImport}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-xl bg-pastel-accent px-4 py-2 text-sm font-bold text-white transition hover:bg-pastel-accentHover disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Importar serie completa
        </button>
      </div>

      {message && <p className="mt-2 text-xs font-semibold text-emerald-700">{message}</p>}
      {error && <p className="mt-2 text-xs font-semibold text-rose-700">{error}</p>}
    </div>
  );
}

export default function AdminShows({ onOpenShow }: AdminShowsProps) {
  const shows = useAsyncData(() => fetchCatalog({ search: '', genre: '', sort: 'recent' }, 1000), []);
  const [tvmazeId, setTvmazeId] = useState('');
  const [tmdbId, setTmdbId] = useState('');
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  const handleAdd = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTvmaze = tvmazeId.trim();
    const trimmedTmdb = tmdbId.trim();
    
    const tvmazeNum = trimmedTvmaze ? Number(trimmedTvmaze) : null;
    const tmdbNum = trimmedTmdb ? Number(trimmedTmdb) : null;

    if (tvmazeNum !== null && (!Number.isInteger(tvmazeNum) || tvmazeNum <= 0)) {
      setMessage({ type: 'error', text: 'El ID de TVMaze debe ser un número entero positivo.' });
      return;
    }

    if (tmdbNum !== null && (!Number.isInteger(tmdbNum) || tmdbNum <= 0)) {
      setMessage({ type: 'error', text: 'El ID de TMDB debe ser un número entero positivo.' });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      await addShow({
        tvmaze_id: tvmazeNum,
        tmdb_id: tmdbNum,
        title: title.trim(),
        tv_type: 'scripted',
        synopsis_es: null,
        us_platforms: [],
        es_platforms: [],
      });

      setTvmazeId('');
      setTmdbId('');
      setTitle('');
      setMessage({
        type: 'ok',
        text: '¡Serie añadida correctamente al catálogo!',
      });
      shows.reload();
    } catch (error) {
      const text = error instanceof Error ? error.message : 'No se pudo añadir la serie. Revisa los datos.';
      setMessage({ type: 'error', text });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`¿Eliminar "${name}" del catálogo? Se borrarán también sus episodios.`)) return;
    try {
      await deleteShow(id);
      shows.reload();
    } catch {
      setMessage({ type: 'error', text: 'No se pudo eliminar la serie. Inténtalo de nuevo.' });
    }
  };

  return (
    <div className="space-y-8">
      <form onSubmit={handleAdd} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Añadir serie al catálogo</h3>
        <p className="text-xs text-slate-500">Indica el ID de TVMaze o TMDB y el título. Las plataformas, carátula y episodios se sincronizarán automáticamente.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">ID de TVMaze (opcional)</span>
            <input inputMode="numeric" value={tvmazeId} onChange={(e) => setTvmazeId(e.target.value)} placeholder="Ej: 59344" className={inputClass} />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">ID de TMDB (opcional)</span>
            <input inputMode="numeric" value={tmdbId} onChange={(e) => setTmdbId(e.target.value)} placeholder="Ej: 1399" className={inputClass} />
          </label>
          <label className="space-y-1.5 sm:col-span-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Título de la serie</span>
            <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Tulsa King" className={inputClass} />
          </label>
        </div>
        {message && (
          <p role="alert" className={`text-sm font-medium ${message.type === 'ok' ? 'text-emerald-700' : 'text-rose-700'}`}>
            {message.text}
          </p>
        )}
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-pastel-accent px-5 py-2.5 text-sm font-bold text-white transition hover:bg-pastel-accentHover disabled:opacity-60"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Añadir serie
        </button>
      </form>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Series del catálogo</h3>
        {shows.loading && <LoadingState label="Cargando series..." />}
        {shows.error && <ErrorState message={shows.error} onRetry={shows.reload} />}
        {shows.data && shows.data.length === 0 && <EmptyState message="No hay series en el catálogo." />}
        {shows.data && shows.data.length > 0 && (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
            {shows.data.map((show) => (
              <li key={show.id} className="flex items-center gap-4 bg-white px-4 py-3 dark:bg-slate-900">
                <button type="button" onClick={() => onOpenShow(show.id)} className="h-16 w-11 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                  {show.poster_url && <img src={show.poster_url} alt="" className="h-full w-full object-cover" />}
                </button>
                <button type="button" onClick={() => onOpenShow(show.id)} className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-black text-slate-900 hover:text-pastel-accent dark:text-white">{show.title}</p>
                  <p className="mt-1 truncate text-xs text-slate-500">{show.genres ?? 'Sin género'} · {show.network_name ?? 'Cadena por confirmar'}</p>
                  <p className="mt-1 text-[11px] text-slate-400">Editar serie y temporadas desde la ficha</p>
                </button>
                <div className="flex shrink-0 items-center gap-1">
                  <button type="button" aria-label={`Editar ${show.title}`} onClick={() => onOpenShow(show.id)} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-pastel-rose hover:text-pastel-accentHover dark:text-slate-300"><Pencil className="h-4 w-4" /></button>
                  <button type="button" aria-label={`Eliminar ${show.title}`} onClick={() => handleDelete(show.id, show.title)} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-rose-50 hover:text-rose-700 dark:text-slate-300"><Trash2 className="h-4 w-4" /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}