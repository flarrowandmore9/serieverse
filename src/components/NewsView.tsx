import { useEffect, useState, type FormEvent } from 'react';
import { Calendar, CheckCircle2, Clock, Loader2, Newspaper, Plus, Sparkles, Trash2, Tv, XCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

type PlatformNewsSection = {
  id: string;
  platformName: string; // Ej: NBC, CBS, Netflix, Movistar+
  renewed: string[];    // Ej: ["Chicago Fire | Season 16", "Law & Order | Season 25"]
  canceled: string[];   // Ej: ["The Hunting Party | Season 2"]
  newShows: string[];   // Ej: ["The Pitt | Nueva serie"]
  upcoming: string[];   // Ej: ["Spin-off de tal..."]
};

const NEWS_LIST_KEY = 'editorial_news_2026';

export default function NewsView() {
  const { isAdmin } = useAuth();
  const [sections, setSections] = useState<PlatformNewsSection[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados del editor de administradora
  const [showForm, setShowForm] = useState(false);
  const [platformName, setPlatformName] = useState('');
  const [renewedText, setRenewedText] = useState('');
  const [canceledText, setCanceledText] = useState('');
  const [newShowsText, setNewShowsText] = useState('');
  const [upcomingText, setUpcomingText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchEditorialNews();
  }, []);

  const fetchEditorialNews = async () => {
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', NEWS_LIST_KEY)
      .maybeSingle();

    if (data?.value) {
      try {
        const parsed = JSON.parse(data.value);
        if (Array.isArray(parsed)) setSections(parsed);
      } catch {
        setSections([]);
      }
    } else {
      // Datos de ejemplo iniciales para que veas cómo luce
      setSections([
        {
          id: '1',
          platformName: 'NBC',
          renewed: ['Chicago Fire | Season 16', 'Law & Order: SVU | Season 27'],
          canceled: ['The Hunting Party | Season 2'],
          newShows: ['Dr. Odyssey (Temporada 2)'],
          upcoming: ['Nuevo spin-off médico en desarrollo'],
        },
        {
          id: '2',
          platformName: 'Netflix',
          renewed: ['El juego del calamar | Season 3', 'Miércoles | Season 2'],
          canceled: ['The Umbrella Academy (Finalizada)'],
          newShows: ['Nueva serie limitada de misterio'],
          upcoming: ['Reboot anunciado para 2027'],
        },
      ]);
    }
    setLoading(false);
  };

  const saveSections = async (newSections: PlatformNewsSection[]) => {
    setSections(newSections);
    await supabase
      .from('app_settings')
      .upsert({ key: NEWS_LIST_KEY, value: JSON.stringify(newSections) }, { onConflict: 'key' });
  };

  const handleSavePlatform = async (e: FormEvent) => {
    e.preventDefault();
    if (!platformName.trim()) return;

    setSaving(true);
    try {
      const newSection: PlatformNewsSection = {
        id: crypto.randomUUID(),
        platformName: platformName.trim(),
        renewed: renewedText.split('\n').filter((s) => s.trim()),
        canceled: canceledText.split('\n').filter((s) => s.trim()),
        newShows: newShowsText.split('\n').filter((s) => s.trim()),
        upcoming: upcomingText.split('\n').filter((s) => s.trim()),
      };

      const updated = [...sections, newSection];
      await saveSections(updated);

      setPlatformName('');
      setRenewedText('');
      setCanceledText('');
      setNewShowsText('');
      setUpcomingText('');
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlatform = async (id: string) => {
    if (!window.confirm('¿Eliminar esta plataforma y sus listados?')) return;
    const updated = sections.filter((s) => s.id !== id);
    await saveSections(updated);
  };

  return (
    <section className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-6 dark:border-slate-800">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-pastel-accent">Especial Temporada · Flarrow & More</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Guía de Renovaciones, Cancelaciones y Estrenos
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            El estado de todas las series ordenado por cadena y plataforma, al estilo de tus artículos de cabecera.
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 rounded-xl bg-pastel-accent px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-pastel-accentHover"
          >
            <Plus className="h-4 w-4" />
            {showForm ? 'Cerrar editor' : 'Añadir plataforma o bloque'}
          </button>
        )}
      </div>

      {/* Formulario de Administradora para añadir plataformas enteras con saltos de línea */}
      {isAdmin && showForm && (
        <form onSubmit={handleSavePlatform} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Añadir bloque de plataforma (Escribe una por línea)</h2>
          
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Nombre de la Cadena o Plataforma</span>
            <input
              required
              value={platformName}
              onChange={(e) => setPlatformName(e.target.value)}
              placeholder="Ej: NBC, CBS, Netflix, Movistar+"
              className="w-full rounded-xl border border-slate-200 bg-pastel-cream px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">🟢 Renovadas (una por línea)</span>
              <textarea
                rows={4}
                value={renewedText}
                onChange={(e) => setRenewedText(e.target.value)}
                placeholder="Chicago Fire | Season 16&#10;Law & Order | Season 25"
                className="w-full rounded-xl border border-slate-200 bg-pastel-cream px-3 py-2 text-xs font-mono dark:border-slate-700 dark:bg-slate-800"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-rose-700 dark:text-rose-400">🔴 Canceladas / Terminadas (una por línea)</span>
              <textarea
                rows={4}
                value={canceledText}
                onChange={(e) => setCanceledText(e.target.value)}
                placeholder="The Hunting Party | Season 2"
                className="w-full rounded-xl border border-slate-200 bg-pastel-cream px-3 py-2 text-xs font-mono dark:border-slate-700 dark:bg-slate-800"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-sky-700 dark:text-sky-400">🔵 Nuevas estrenadas este año (una por línea)</span>
              <textarea
                rows={4}
                value={newShowsText}
                onChange={(e) => setNewShowsText(e.target.value)}
                placeholder="Título de la serie | Nota corta"
                className="w-full rounded-xl border border-slate-200 bg-pastel-cream px-3 py-2 text-xs font-mono dark:border-slate-700 dark:bg-slate-800"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-violet-700 dark:text-violet-400">🟣 Próximas / Spin-offs / Reboots (una por línea)</span>
              <textarea
                rows={4}
                value={upcomingText}
                onChange={(e) => setUpcomingText(e.target.value)}
                placeholder="Spin-off anunciado..."
                className="w-full rounded-xl border border-slate-200 bg-pastel-cream px-3 py-2 text-xs font-mono dark:border-slate-700 dark:bg-slate-800"
              />
            </label>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-pastel-accent px-5 py-2.5 text-xs font-bold text-white hover:bg-pastel-accentHover disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar bloque de plataforma
            </button>
          </div>
        </form>
      )}

      {/* Listado estilo artículo de blog por plataformas */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-pastel-accent" />
        </div>
      ) : sections.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-10 text-center dark:border-slate-700 dark:bg-slate-900/50">
          <Newspaper className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
            No hay bloques publicados todavía. Pulsa en "Añadir plataforma o bloque" para empezar.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {sections.map((sec) => (
            <div
              key={sec.id}
              className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  <Tv className="h-5 w-5 text-pastel-accent" />
                  {sec.platformName}
                </h2>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleDeletePlatform(sec.id)}
                    title="Eliminar esta plataforma"
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="mt-4 grid gap-6 md:grid-cols-2">
                {/* Renovadas */}
                {sec.renewed.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 mb-2">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Renovadas
                    </h3>
                    <ul className="space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
                      {sec.renewed.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-emerald-500 font-bold">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Canceladas */}
                {sec.canceled.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 flex items-center gap-1.5 mb-2">
                      <XCircle className="h-3.5 w-3.5" /> Canceladas / Terminadas
                    </h3>
                    <ul className="space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
                      {sec.canceled.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-rose-500 font-bold">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Nuevas */}
                {sec.newShows.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400 flex items-center gap-1.5 mb-2">
                      <Sparkles className="h-3.5 w-3.5" /> Estrenos del año
                    </h3>
                    <ul className="space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
                      {sec.newShows.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-sky-500 font-bold">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Futuras / Spin-offs */}
                {sec.upcoming.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-violet-700 dark:text-violet-400 flex items-center gap-1.5 mb-2">
                      <Clock className="h-3.5 w-3.5" /> Spin-offs / Reboots / Anunciadas
                    </h3>
                    <ul className="space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
                      {sec.upcoming.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-violet-500 font-bold">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
