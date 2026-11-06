import { useState, type FormEvent } from 'react';
import { Loader2, Pencil, Trash2 } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '@/components/PageStates';
import { useAsyncData } from '@/hooks/useAsyncData';
import { addShow, deleteShow } from '@/lib/admin';
import { fetchCatalog } from '@/lib/catalog';
import { parsePlatformInput } from '@/lib/format';

type AdminShowsProps = {
  onOpenShow: (showId: number) => void;
};

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-pastel-cream px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-pastel-accent focus:outline-none focus:ring-2 focus:ring-pastel-accent/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

export default function AdminShows({ onOpenShow }: AdminShowsProps) {
  const shows = useAsyncData(() => fetchCatalog({ search: '', genre: '', sort: 'recent' }, 1000), []);
  const [tvmazeId, setTvmazeId] = useState('');
  const [TMDBId, setthemoviedbId] = useState('');
  const [title, setTitle] = useState('');
  const [usPlatforms, setUsPlatforms] = useState('');
  const [esPlatforms, setEsPlatforms] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  const handleAdd = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedId = tvmazeId.trim();
    const id = trimmedId ? Number(trimmedId) : null;
    if (id !== null && (!Number.isInteger(id) || id <= 0)) {
      setMessage({ type: 'error', text: 'El ID de TVMaze debe ser un número entero positivo.' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await addShow({
        tvmaze_id: id,
        TMDB_id: themoviedbId.trim() || null,
        title: title.trim(),
        synopsis_es: null,
        us_platforms: parsePlatformInput(usPlatforms),
        es_platforms: parsePlatformInput(esPlatforms),
      });
      setTvmazeId('');
      setthemoviedbId('');
      setTitle('');
      setUsPlatforms('');
      setEsPlatforms('');
      setMessage({
        type: 'ok',
        text: id === null ? 'Serie añadida manualmente. Completa sus datos desde su ficha.' : 'Serie añadida y sincronizada con TVMaze.',
      });
      shows.reload();
    } catch (error) {
      const text = error instanceof Error && error.message.includes('TVMaze')
        ? error.message
        : 'No se pudo añadir la serie. Revisa que el ID no esté ya en el catálogo.';
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
        <p className="text-xs text-slate-500">Si la serie existe en TVMaze, indica su ID y los datos, episodios y reparto se cargan solos. Si no, déjalo vacío y añádela manualmente.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">ID de TVMaze (opcional)</span>
            <input inputMode="numeric" value={tvmazeId} onChange={(e) => setTvmazeId(e.target.value)} className={inputClass} />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">ID de TMDB (opcional)</span>
            <input value={themoviedbId} onChange={(e) => setImdbId(e.target.value)} placeholder="tt1234567" className={inputClass} />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Título (referencia)</span>
            <input required value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Plataformas EE. UU.</span>
            <input value={usPlatforms} onChange={(e) => setUsPlatforms(e.target.value)} placeholder="Hulu, Netflix" className={inputClass} />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Plataformas España</span>
            <input value={esPlatforms} onChange={(e) => setEsPlatforms(e.target.value)} placeholder="Netflix, Movistar Plus+" className={inputClass} />
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
