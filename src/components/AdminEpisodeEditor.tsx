import { useState, type FormEvent } from 'react';
import { Loader2, Check, X } from 'lucide-react';
import type { Episode, EpisodeRole, SpecialTag } from '@/lib/types';

type AdminEpisodeEditorProps = {
  episode: Episode;
  onSave: (patch: {
    name: string | null;
    airdate: string;
    runtime: number | null;
    role_override: EpisodeRole | null;
    special_tag: SpecialTag;
  }) => Promise<void>;
  onCancel: () => void;
};

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-pastel-accent focus:outline-none focus:ring-2 focus:ring-pastel-accent/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

export default function AdminEpisodeEditor({ episode, onSave, onCancel }: AdminEpisodeEditorProps) {
  const [name, setName] = useState(episode.name ?? '');
  const [airdate, setAirdate] = useState(episode.airdate ? episode.airdate.split('T')[0] : '');
  const [runtime, setRuntime] = useState(episode.runtime?.toString() ?? '');
  const [specialTag, setSpecialTag] = useState<SpecialTag>(episode.special_tag ?? 'normal');
  const [roleOverride, setRoleOverride] = useState<EpisodeRole | null>(episode.role_override ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave({
        name: name.trim() || null,
        airdate: airdate.trim(),
        runtime: runtime ? Number(runtime) : null,
        role_override: roleOverride,
        special_tag: specialTag,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar el episodio.');
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="my-3 rounded-2xl border-2 border-pastel-accent/40 bg-pastel-cream/80 p-4 shadow-md dark:border-pastel-accent/40 dark:bg-slate-900/90">
      <div className="mb-3 flex items-center justify-between border-b border-slate-200/60 pb-2 dark:border-slate-800">
        <span className="text-xs font-bold uppercase tracking-wider text-pastel-accent">
          Editando Episodio {episode.season}x{episode.number}
        </span>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          title="Cancelar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Cuadrícula limpia de dos filas para que no se amontone nada */}
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block space-y-1 sm:col-span-2">
          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Título del Episodio</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Título del episodio..."
            className={inputClass}
            required
          />
        </label>

        <label className="block space-y-1">
          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Fecha de Emisión</span>
          <input
            type="date"
            value={airdate}
            onChange={(e) => setAirdate(e.target.value)}
            className={inputClass}
            required
          />
        </label>

        <label className="block space-y-1">
          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Duración (min)</span>
          <input
            type="number"
            value={runtime}
            onChange={(e) => setRuntime(e.target.value)}
            placeholder="45"
            className={inputClass}
          />
        </label>

        <label className="block space-y-1">
          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Etiqueta</span>
          <select
            value={specialTag}
            onChange={(e) => setSpecialTag(e.target.value as SpecialTag)}
            className={inputClass}
          >
            <option value="normal">Normal</option>
            <option value="double">Doble</option>
            <option value="special">Especial</option>
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-[11px] font-bold text-pastel-accent">Categoría de Emisión</span>
          <select
            value={roleOverride ?? ''}
            onChange={(e) => setRoleOverride((e.target.value || null) as EpisodeRole | null)}
            className={inputClass}
          >
            <option value="">Emisión normal (Automática)</option>
            <option value="series_premiere">Estreno serie</option>
            <option value="season_premiere">Estreno temporada</option>
            <option value="mid_season_finale">Final mitad temporada</option>
            <option value="season_finale">Final temporada</option>
          </select>
        </label>
      </div>

      {error && <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p>}

      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-1.5 rounded-xl bg-pastel-accent px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-pastel-accentHover disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          Guardar episodio
        </button>
      </div>
    </form>
  );
}