import { useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { ShowDetail } from '@/lib/types';

type EditShowFormProps = {
  show: ShowDetail;
  onCancel: () => void;
  onSaved: () => void;
};

const inputClass = 'w-full rounded-xl border border-slate-200 bg-pastel-cream px-3.5 py-2.5 text-sm text-slate-900 focus:border-pastel-accent focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

export default function EditShowForm({ show, onCancel, onSaved }: EditShowFormProps) {
  const [title, setTitle] = useState(show?.title || '');
  const [synopsis, setSynopsis] = useState(show?.synopsis_es || '');
  const [posterUrl, setPosterUrl] = useState(show?.poster_url || '');
  const [networkName, setNetworkName] = useState(show?.network_name || '');
  const [runtime, setRuntime] = useState(show?.runtime ? String(show.runtime) : '');
  const [genres, setGenres] = useState(show?.genres || '');
  const [tvStatus, setTvStatus] = useState(show?.tv_status || 'Running');
  const [premiered, setPremiered] = useState(show?.premiered || '');
  
  // Plataformas seguras como texto para facilitar la edición manual
  const [esPlatforms, setEsPlatforms] = useState(
    Array.isArray(show?.es_platforms) ? show.es_platforms.join(', ') : (show?.es_platforms || '')
  );
  const [usPlatforms, setUsPlatforms] = useState(
    Array.isArray(show?.us_platforms) ? show.us_platforms.join(', ') : (show?.us_platforms || '')
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!show?.id) return;

    setSaving(true);
    setError(null);

    try {
      const formattedEsPlatforms = esPlatforms ? esPlatforms.split(',').map((p) => p.trim()).filter(Boolean) : [];
      const formattedUsPlatforms = usPlatforms ? usPlatforms.split(',').map((p) => p.trim()).filter(Boolean) : [];

      const { error: updateError } = await supabase
        .from('shows')
        .update({
          title: title.trim(),
          synopsis_es: synopsis.trim(),
          poster_url: posterUrl.trim() || null,
          network_name: networkName.trim() || null,
          runtime: runtime ? Number(runtime) : null,
          genres: genres.trim() || null,
          tv_status: tvStatus,
          premiered: premiered || null,
          es_platforms: formattedEsPlatforms,
          us_platforms: formattedUsPlatforms,
        })
        .eq('id', show.id);

      if (updateError) throw updateError;

      onSaved();
    } catch (err: any) {
      setError(err?.message || 'No se pudieron guardar los cambios.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
          Editando serie: {show?.title}
        </h3>
        <button type="button" onClick={onCancel} className="text-xs font-bold text-slate-400 hover:text-slate-600">
          Cancelar
        </button>
      </div>

      {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1 sm:col-span-2">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Título de la serie</span>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="block space-y-1 sm:col-span-2">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Sinopsis en Español</span>
          <textarea
            rows={3}
            value={synopsis}
            onChange={(e) => setSynopsis(e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="block space-y-1 sm:col-span-2">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">URL de la Carátula (Poster)</span>
          <input
            value={posterUrl}
            onChange={(e) => setPosterUrl(e.target.value)}
            className={inputClass}
            placeholder="https://image.tmdb.org/t/p/w500/..."
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Cadena / Emisión</span>
          <input
            value={networkName}
            onChange={(e) => setNetworkName(e.target.value)}
            className={inputClass}
            placeholder="Ej: Paramount+, Netflix"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Duración media (minutos)</span>
          <input
            type="number"
            value={runtime}
            onChange={(e) => setRuntime(e.target.value)}
            className={inputClass}
            placeholder="Ej: 45"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Plataformas en España (separadas por comas)</span>
          <input
            value={esPlatforms}
            onChange={(e) => setEsPlatforms(e.target.value)}
            className={inputClass}
            placeholder="Ej: Movistar Plus+, Filmin, Netflix"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Plataformas en EE.UU. (separadas por comas)</span>
          <input
            value={usPlatforms}
            onChange={(e) => setUsPlatforms(e.target.value)}
            className={inputClass}
            placeholder="Ej: Paramount+, FX, Starz"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Géneros</span>
          <input
            value={genres}
            onChange={(e) => setGenres(e.target.value)}
            className={inputClass}
            placeholder="Ej: Drama, Action"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Estado de emisión</span>
          <select
            value={tvStatus}
            onChange={(e) => setTvStatus(e.target.value)}
            className={inputClass}
          >
            <option value="Running">En emisión (Running)</option>
            <option value="Ended">Terminada (Ended)</option>
            <option value="Canceled">Cancelada (Canceled)</option>
            <option value="To Be Determined">Por determinar</option>
          </select>
        </label>

        <label className="block space-y-1 sm:col-span-2">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Fecha de estreno</span>
          <input
            type="date"
            value={premiered}
            onChange={(e) => setPremiered(e.target.value)}
            className={inputClass}
          />
        </label>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-pastel-accent px-6 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-pastel-accentHover disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Guardar cambios
        </button>
      </div>
    </form>
  );
}