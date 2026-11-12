import { useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import CastListEditor from '@/components/CastListEditor';
import PosterField from '@/components/PosterField';
import { SHOW_STATUS_OPTIONS, formatPlatforms, parsePlatformInput } from '@/lib/format';
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
  const [title, setTitle] = useState(show.title);
  const [synopsis, setSynopsis] = useState(show.synopsis_es ?? '');
  const [usPlatforms, setUsPlatforms] = useState(show.us_platforms.join(', '));
  const [esPlatforms, setEsPlatforms] = useState(show.es_platforms.join(', '));
  const [status, setStatus] = useState(show.tv_status ?? '');
  const [genres, setGenres] = useState(show.genres ?? '');
  const [network, setNetwork] = useState(show.network_name ?? '');
  const [poster, setPoster] = useState(show.poster_url ?? '');
  const [runtime, setRuntime] = useState(show.runtime?.toString() ?? '');
  const [cast, setCast] = useState<Character[]>(show.characters ?? []);
  // Estados para las casillas de verificación (Cuadrícula)
  const [isMiniseries, setIsMiniseries] = useState(show.is_miniseries);
  const [isSpinoff, setIsSpinoff] = useState((show as any).is_spinoff ?? false);
  const [isReboot, setIsReboot] = useState((show as any).is_reboot ?? false);
  const [isSecuela, setIsSecuela] = useState((show as any).is_secuela ?? false);
  const [isPrequel, setIsPrequel] = useState((show as any).is_prequel ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError('El título no puede estar vacío.');
      return;
    }
    const runtimeNumber = Number(runtime);
    setSaving(true);
    setError(null);
    try {
      const updated = await updateShow(show.id, {
        title: cleanTitle,
        synopsis_es: synopsis.trim() || null,
        us_platforms: parsePlatformInput(usPlatforms),
        es_platforms: parsePlatformInput(esPlatforms),
        tv_status: status || null,
        is_miniseries: isMiniseries,
        is_spinoff: isSpinoff,
        is_reboot: isReboot,
        is_secuela: isSecuela,
        is_prequel: isPrequel,
        genres: genres.trim() || null,
        network_name: network.trim() || null,
        poster_url: poster.trim() || null,
        runtime: runtime && Number.isFinite(runtimeNumber) ? runtimeNumber : null,
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
      <label className="block space-y-1.5">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Título</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Sinopsis en español</span>
        <textarea rows={4} value={synopsis} onChange={(e) => setSynopsis(e.target.value)} className={inputClass} />
      </label>
      <CastListEditor value={cast} onChange={setCast} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Estado</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
            {SHOW_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Géneros (separados por comas)</span>
          <input value={genres} onChange={(e) => setGenres(e.target.value)} className={inputClass} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Cadena original</span>
          <input value={network} onChange={(e) => setNetwork(e.target.value)} className={inputClass} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Duración media (min)</span>
          <input inputMode="numeric" value={runtime} onChange={(e) => setRuntime(e.target.value)} className={inputClass} />
        </label>
      </div>
      {/* SECCIÓN DE ETIQUETAS EN CUADRÍCULA (2 COLUMNAS) */}
      <div className="space-y-1.5">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Clasificación especial</span>
        <div className="grid grid-cols-2 gap-2.5">
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-pastel-cream px-3.5 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer hover:border-pastel-accent transition">
            <input type="checkbox" checked={isSpinoff} onChange={(e) => setIsSpinoff(e.target.checked)} className="h-4 w-4 accent-pastel-accent rounded" />
            Spin-off
          </label>
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-pastel-cream px-3.5 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer hover:border-pastel-accent transition">
            <input type="checkbox" checked={isReboot} onChange={(e) => setIsReboot(e.target.checked)} className="h-4 w-4 accent-pastel-accent rounded" />
            Reboot
          </label>
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-pastel-cream px-3.5 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer hover:border-pastel-accent transition">
            <input type="checkbox" checked={isSecuela} onChange={(e) => setIsSecuela(e.target.checked)} className="h-4 w-4 accent-pastel-accent rounded" />
            Secuela
          </label>
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-pastel-cream px-3.5 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer hover:border-pastel-accent transition col-span-2">
            <input type="checkbox" checked={isPrequel} onChange={(e) => setIsPrequel(e.target.checked)} className="h-4 w-4 accent-pastel-accent rounded" />
            Precuela
          </label>
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-pastel-cream px-3.5 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer hover:border-pastel-accent transition">
            <input type="checkbox" checked={isMiniseries} onChange={(e) => setIsMiniseries(e.target.checked)} className="h-4 w-4 accent-pastel-accent rounded" />
            Miniserie
          </label>
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-pastel-cream px-3.5 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer hover:border-pastel-accent transition">
            <input type="checkbox" checked={isMiniseries} onChange={(e) => setIsMiniseries(e.target.checked)} className="h-4 w-4 accent-pastel-accent rounded" />
            Otro
          </label>
        </div>
      </div>
      
      <PosterField value={poster} onChange={setPoster} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Plataformas EE.UU. (separadas por comas)</span>
          <input value={usPlatforms} onChange={(e) => setUsPlatforms(e.target.value)} className={inputClass} placeholder={formatPlatforms([])} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Plataformas España (separadas por comas)</span>
          <input value={esPlatforms} onChange={(e) => setEsPlatforms(e.target.value)} className={inputClass} placeholder={formatPlatforms([])} />
        </label>
      </div>

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
