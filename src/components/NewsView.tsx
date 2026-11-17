import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Calendar, CheckCircle2, Clock, Loader2, Plus, Sparkles, Trash2, Tv, XCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

type SeriesGuideEntry = {
  id: string;
  network: string;        // Ej: NBC, Netflix, CBS, Max...
  title: string;          // Ej: Chicago Fire
  seasonText: string;     // Ej: Season 16 / Spin-off
  category: 'renewed' | 'canceled' | 'new' | 'upcoming';
  headline: string;       // Nota corta / sinopsis
};

const EDITORIAL_GUIDE_KEY = 'serieverse_final_editorial_guide';

const CATEGORY_META = {
  renewed: {
    label: 'Renovada',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300',
    icon: CheckCircle2,
  },
  canceled: {
    label: 'Cancelada / Terminada',
    badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300',
    icon: XCircle,
  },
  new: {
    label: 'Nueva del año',
    badgeClass: 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300',
    icon: Sparkles,
  },
  upcoming: {
    label: 'Spin-off / Reboot / Anunciada',
    badgeClass: 'bg-violet-100 text-violet-800 dark:bg-violet-950/80 dark:text-violet-300',
    icon: Clock,
  },
};

export default function NewsView() {
  const { isAdmin } = useAuth();
  const [entries, setEntries] = useState<SeriesGuideEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNetwork, setSelectedNetwork] = useState<string>('all');

  // Formulario de admin
  const [showForm, setShowForm] = useState(false);
  const [network, setNetwork] = useState('');
  const [title, setTitle] = useState('');
  const [seasonText, setSeasonText] = useState('');
  const [category, setCategory] = useState<SeriesGuideEntry['category']>('renewed');
  const [headline, setHeadline] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchGuideData();
  }, []);

  const fetchGuideData = async () => {
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', EDITORIAL_GUIDE_KEY)
      .maybeSingle();

    if (data?.value) {
      try {
        const parsed = JSON.parse(data.value);
        if (Array.isArray(parsed)) setEntries(parsed);
      } catch {
        setEntries([]);
      }
    } else {
      // Datos de ejemplo iniciales para que veas lo bonito y limpio que queda
      setEntries([
        {
          id: '1',
          network: 'NBC',
          title: 'Chicago Fire',
          seasonText: 'Season 16',
          category: 'renewed',
          headline: 'Renovada oficialmente por la cadena tras mantener excelentes datos de audiencia.',
        },
        {
          id: '2',
          network: 'NBC',
          title: 'The Hunting Party',
          seasonText: 'Season 2',
          category: 'canceled',
          headline: 'Cancelada tras la emisión de su segunda tanda de episodios.',
        },
        {
          id: '3',
          network: 'Netflix',
          title: 'Miércoles',
          seasonText: 'Season 2',
          category: 'renewed',
          headline: 'En postproducción con su esperada segunda temporada.',
        },
      ]);
    }
    setLoading(false);
  };

  const saveGuideData = async (updated: SeriesGuideEntry[]) => {
    setEntries(updated);
    await supabase
      .from('app_settings')
      .upsert({ key: EDITORIAL_GUIDE_KEY, value: JSON.stringify(updated) }, { onConflict: 'key' });
  };

  const handleAddEntry = async (e: FormEvent) => {
    e.preventDefault();
    if (!network.trim() || !title.trim() || !headline.trim()) return;

    setSaving(true);
    try {
      const newEntry: SeriesGuideEntry = {
        id: crypto.randomUUID(),
        network: network.trim(),
        title: title.trim(),
        seasonText: seasonText.trim(),
        category,
        headline: headline.trim(),
      };

      const updated = [newEntry, ...entries];
      await saveGuideData(updated);

      setTitle('');
      setSeasonText('');
      setHeadline('');
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!window.confirm('¿Eliminar esta serie de la guía?')) return;
    const updated = entries.filter((e) => e.id !== id);
    await saveGuideData(updated);
  };

  // Obtener lista de plataformas para el filtro
  const networksList = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => {
      if (e.network) set.add(e.network);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [entries]);

  // Agrupar por plataforma
  const groupedEntries = useMemo(() => {
    const filtered = selectedNetwork === 'all'
      ? entries
      : entries.filter((e) => e.network === selectedNetwork);

    const map: Record<string, SeriesGuideEntry[]> = {};
    filtered.forEach((entry) => {
      if (!map[entry.network]) map[entry.network] = [];
      map[entry.network].push(entry);
    });

    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [entries, selectedNetwork]);

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Cabecera Estética */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200/80 pb-6 dark:border-slate-800">
        <div>
          <span className="rounded-full bg-pastel-accent/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-pastel-accent">
            Flarrow & More · Guía Oficial
          </span>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Renovaciones, Cancelaciones y Estrenos
          </h1>
          <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
            Clasificación oficial por cadena y plataforma. Actualizada al detalle.
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 rounded-2xl bg-pastel-accent px-5 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-pastel-accentHover"
          >
            <Plus className="h-4 w-4" />
            {showForm ? 'Cerrar editor' : 'Añadir serie a la guía'}
          </button>
        )}
      </div>

      {/* Formulario de Administradora */}
      {isAdmin && showForm && (
        <form onSubmit={handleAddEntry} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">Añadir entrada a la guía</h2>
            <span className="text-xs text-slate-400">Control total y directo</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Cadena / Plataforma</span>
              <input
                required
                value={network}
                onChange={(e) => setNetwork(e.target.value)}
                placeholder="Ej: NBC, Netflix, CBS"
                className="w-full rounded-xl border border-slate-200 bg-pastel-cream px-3.5 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Título de la serie</span>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Chicago Fire"
                className="w-full rounded-xl border border-slate-200 bg-pastel-cream px-3.5 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Temporada / Nota (Opcional)</span>
              <input
                value={seasonText}
                onChange={(e) => setSeasonText(e.target.value)}
                placeholder="Ej: Season 16 / Spin-off"
                className="w-full rounded-xl border border-slate-200 bg-pastel-cream px-3.5 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Estado</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as SeriesGuideEntry['category'])}
                className="w-full rounded-xl border border-slate-200 bg-pastel-cream px-3.5 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="renewed">🟢 Renovada</option>
                <option value="canceled">🔴 Cancelada / Terminada</option>
                <option value="new">🔵 Nueva del año</option>
                <option value="upcoming">🟣 Spin-off / Reboot / Anunciada</option>
              </select>
            </label>

            <label className="block space-y-1 sm:col-span-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Nota corta o detalle</span>
              <input
                required
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="Ej: Renovada por una temporada más..."
                className="w-full rounded-xl border border-slate-200 bg-pastel-cream px-3.5 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </label>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-pastel-accent px-6 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-pastel-accentHover disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar en la guía
            </button>
          </div>
        </form>
      )}

      {/* Filtro de plataforma */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs font-bold text-slate-500">
          Mostrando {entries.length} series en total
        </p>

        <select
          value={selectedNetwork}
          onChange={(e) => setSelectedNetwork(e.target.value)}
          aria-label="Filtrar por plataforma"
          className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm focus:border-pastel-accent focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
        >
          <option value="all">🌐 Todas las plataformas</option>
          {networksList.map((net) => (
            <option key={net} value={net}>{net}</option>
          ))}
        </select>
      </div>

      {/* Listado Visual por Plataforma */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-pastel-accent" />
        </div>
      ) : groupedEntries.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white/60 p-12 text-center dark:border-slate-800 dark:bg-slate-900/50">
          <Tv className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-300">No hay series registradas.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedEntries.map(([netName, netItems]) => {
            const byCat = {
              renewed: netItems.filter((i) => i.category === 'renewed'),
              canceled: netItems.filter((i) => i.category === 'canceled'),
              new: netItems.filter((i) => i.category === 'new'),
              upcoming: netItems.filter((i) => i.category === 'upcoming'),
            };

            return (
              <div
                key={netName}
                className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                {/* Cabecera Plataforma */}
                <div className="flex items-center gap-3 border-b border-slate-100 bg-pastel-cream/40 px-6 py-4 dark:border-slate-800 dark:bg-slate-950/40">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-pastel-accent/10 text-pastel-accent">
                    <Tv className="h-4 w-4" />
                  </div>
                  <h2 className="text-base font-black tracking-tight text-slate-900 dark:text-white">
                    {netName}
                  </h2>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {(['renewed', 'canceled', 'new', 'upcoming'] as const).map((catKey) => {
                    const list = byCat[catKey];
                    if (list.length === 0) return null;
                    const meta = CATEGORY_META[catKey];
                    const Icon = meta.icon;

                    return (
                      <div key={catKey} className="p-6">
                        <div className="mb-4 flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-extrabold ${meta.badgeClass}`}>
                            <Icon className="h-3.5 w-3.5" />
                            {meta.label}
                          </span>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          {list.map((item) => (
                            <div
                              key={item.id}
                              className="group relative flex flex-col justify-between rounded-2xl border border-slate-100 bg-pastel-cream/20 p-4 transition hover:border-slate-200 dark:border-slate-800 dark:bg-slate-950/20"
                            >
                              <div>
                                <div className="flex items-start justify-between gap-2">
                                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                                    {item.title}
                                    {item.seasonText && (
                                      <span className="ml-1.5 font-bold text-pastel-accent">· {item.seasonText}</span>
                                    )}
                                  </h3>

                                  {isAdmin && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteEntry(item.id)}
                                      title="Eliminar"
                                      className="rounded-lg p-1 text-slate-400 opacity-0 transition hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100 dark:hover:bg-rose-950/50"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>

                                <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                                  {item.headline}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}