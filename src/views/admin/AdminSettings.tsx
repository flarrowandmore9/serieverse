import { useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { ErrorState, LoadingState } from '@/components/PageStates';
import { useAsyncData } from '@/hooks/useAsyncData';
import { fetchAppSettings, upsertAppSetting } from '@/lib/admin';
import { refreshAppSettings } from '@/hooks/useAppSettings';

const SETTING_FIELDS: { key: string; label: string }[] = [
  { key: 'hero_title', label: 'Título de la portada' },
  { key: 'hero_subtitle', label: 'Subtítulo de la portada' },
  { key: 'btn_download', label: 'Texto del botón Instalar App' },
  { key: 'nav_catalog', label: 'Nombre del botón Catálogo' },
  { key: 'nav_calendar', label: 'Nombre del botón Calendario' },
  { key: 'nav_platforms', label: 'Nombre del botón Plataformas y Cadenas' },
  { key: 'nav_library', label: 'Nombre del botón Mis Listas' },
  { key: 'nav_suggestions', label: 'Nombre del botón Sugerencias' },
];

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-pastel-cream px-3.5 py-2.5 text-sm text-slate-900 focus:border-pastel-accent focus:outline-none focus:ring-2 focus:ring-pastel-accent/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

export default function AdminSettings() {
  const settings = useAsyncData(fetchAppSettings, []);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setValues(settings.data ?? {});
  }, [settings.data]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      for (const field of SETTING_FIELDS) {
        const value = values[field.key] ?? '';
        if (value.trim()) await upsertAppSetting(field.key, value.trim());
      }
      await refreshAppSettings();
      setSaved(true);
    } catch {
      setError('No se pudieron guardar los cambios. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Textos y botones de la aplicación</h3>
        <p className="text-xs text-slate-500">Cambia los títulos, subtítulos y nombres de los botones del menú. Los cambios se ven al instante en toda la app.</p>
      </div>

      {settings.loading && <LoadingState label="Cargando textos..." />}
      {settings.error && <ErrorState message={settings.error} onRetry={settings.reload} />}

      {settings.data && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {SETTING_FIELDS.map((field) => (
              <label key={field.key} className="block space-y-1.5">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{field.label}</span>
                <input
                  value={values[field.key] ?? ''}
                  onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  maxLength={80}
                  className={inputClass}
                />
              </label>
            ))}
          </div>

          {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
          {saved && <p className="text-sm font-medium text-emerald-700">Cambios guardados.</p>}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-pastel-accent px-5 py-2.5 text-sm font-bold text-white transition hover:bg-pastel-accentHover disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar cambios
          </button>
        </div>
      )}
    </div>
  );
}
