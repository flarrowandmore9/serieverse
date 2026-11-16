import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Calendar, CheckCircle2, Clock, Loader2, Newspaper, Plus, Sparkles, Trash2, Tv, XCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

type PlatformGuideItem = {
  id: string;
  network: string;        // Ej: NBC, Netflix, CBS
  title: string;          // Ej: Chicago Fire
  seasonText: string;     // Ej: Season 16 / Spin-off
  category: 'renewed' | 'canceled' | 'new' | 'upcoming';
  headline: string;       // Nota corta / protagónico
  date: string;
};

const GUIDE_STORAGE_KEY = 'serieverse_platform_guide_v1';

const CATEGORY_CONFIG = {
  renewed: {
    label: 'Renovadas',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300',
    dotColor: 'bg-emerald-500',
    icon: CheckCircle2,
  },
  canceled: {
    label: 'Canceladas / Terminadas',
    badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300',
    dotColor: 'bg-rose-500',
    icon: XCircle,
  },
  new: {
    label: 'Nuevas series del año',
    badgeClass: 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300',
    dotColor: 'bg-sky-500',
    icon: Sparkles,
  },
  upcoming: {
    label: 'Spin-offs / Reboots / Futuras',
    badgeClass: 'bg-violet-100 text-violet-800 dark:bg-violet-950/80 dark:text-violet-300',
    dotColor: 'bg-violet-500',
    icon: Clock,
  },
};

export default function NewsView() {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState<PlatformGuideItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNetworkFilter, setSelectedNetworkFilter] = useState<string>('all');

  // Formulario de administración
  const [showForm, setShowForm] = useState(false);
  const [network, setNetwork] = useState('');
  const [title, setTitle] = useState('');
  const [seasonText, setSeasonText] = useState('');
  const [category, setCategory] = useState<PlatformGuideItem['category']>('renewed');
  const [headline, setHeadline] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchGuide();
  }, []);

  const fetchGuide = async () => {
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', GUIDE_STORAGE_KEY)
      .maybeSingle();

    if (data?.value) {
      try {
        const parsed = JSON.parse(data.value);
        if (Array.isArray(parsed)) setItems(parsed);
      } catch {
        setItems([]);
      }
    } else {
      // Datos iniciales de demostración estilo blog
      setItems([
        {
          id: '1',
          network: 'NBC',
          title: 'Chicago Fire',
          seasonText: 'Season 16',
          category: 'renewed',
          headline: 'Renovada oficialmente para la próxima temporada.',
          date: '2026-11-16',
        },
        {
          id: '2',
          network: 'NBC',
          title: 'The Hunting Party',
          seasonText: 'Season 2',
          category: 'canceled',
          headline: 'Cancelada tras su segunda tanda.',
          date: '2026-11-16',
        },
        {
          id: '3',
          network: 'Netflix',
          title: 'Miércoles',
          seasonText: 'Season 2',
          category: 'renewed',
          headline: 'En postproducción con su esperada segunda temporada.',
          date: '2026-11-16',
        },
      ]);
    }
    setLoading(false);
  };

  const saveGuide = async (newItems: PlatformGuideItem[]) => {
    setItems(newItems);
    await supabase
      .from('app_settings')
      .upsert({ key: GUIDE_STORAGE_KEY, value: JSON.stringify(newItems) }, { onConflict: 'key' });
  };

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!network.trim() || !title.trim() || !headline.trim()) return;

    setSaving(true);
    try {
      const newItem: PlatformGuideItem = {
        id: crypto.randomUUID(),
        network: network.trim(),
        title: title.trim(),
        seasonText: seasonText.trim(),
        category,
        headline: headline.trim(),
        date: new Date().toISOString().split('T')[0],
      };

      const updated = [newItem, ...items];
      await saveGuide(updated);

      setTitle('');
      setSeasonText('');
      setHeadline('');
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar este registro de la guía?')) return;
    const updated = items.filter((i) => i.id !== id);
    await saveGuide(updated);
  };

  // Obtener lista única de plataformas ordenadas
  const networksList = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (i.network) set.add(i.network);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  // Agrupar elementos por plataforma
  const groupedByNetwork = useMemo(() => {
    const filtered = selectedNetworkFilter === 'all'
      ? items
      : items.filter((i) => i.network === selectedNetworkFilter);

    const map: Record<string, PlatformGuideItem[]> = {};
    filtered.forEach((item) => {
      if (!map[item.network]) map[item.network] = [];
      map[item.network].push(item);
    });

    return Object.entries(map).sort(([netA], [netB]) => netA.localeCompare(netB));
  }, [items, selectedNetworkFilter]);

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Cabecera Estilo Blog Profesional */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200/80 pb-6 dark:border-slate-800">
        <div>
          <span className="rounded-full bg-pastel-accent/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-pastel-accent">
            Flarrow & More · Guía Anual
          </span>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Estado de Series: Renovadas y Canceladas
          </h1>
          <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
            Clasificación oficial por cadena y plataforma. Actualizada de manera dinámica ante cualquier cambio de estado.
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

      {/* Formulario Administradora */}
      {isAdmin && showForm && (
        <form onSubmit={handleAdd} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">Registrar o actualizar estado de serie</h2>
            <span className="text-xs text-slate-400">Si cambia de estado en unos meses, puedes editarla o crearla de nuevo</span>
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
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Estado actual</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as PlatformGuideItem['category'])}
                className="w-full rounded-xl border border-slate-200 bg-pastel-cream px-3.5 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="renewed">🟢 Renovada</option>
                <option value="canceled">🔴 Cancelada / Terminada</option>
                <option value="new">🔵 Nueva serie del año</option>
                <option value="upcoming">🟣 Spin-off / Reboot / Futuras</option>
              </select>
            </label>

            <label className="block space-y-1 sm:col-span-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Nota corta o detalle del anuncio</span>
              <input
                required
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="Ej: Renovada por una temporada más tras batir récords..."
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

      {/* Filtro rápido por plataforma */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs font-bold text-slate-500">
          Mostrando {items.length} registros en total
        </p>

        <select
          value={selectedNetworkFilter}
          onChange={(e) => setSelectedNetworkFilter(e.target.value)}
          aria-label="Filtrar por cadena o plataforma"
          className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm focus:border-pastel-accent focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
        >
          <option value="all">🌐 Todas las plataformas</option>
          {networksList.map((net) => (
            <option key={net} value={net}>{net}</option>
          ))}
        </select>
      </div>

      {/* Listado Principal Agrupado por Plataforma */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-pastel-accent" />
        </div>
      ) : groupedByNetwork.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white/60 p-12 text-center dark:border-slate-800 dark:bg-slate-900/50">
          <Newspaper className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-300">No hay series registradas en esta vista.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedByNetwork.map(([networkName, netItems]) => {
            // Agrupar los ítems de esta plataforma por categoría
            const byCategory = {
              renewed: netItems.filter((i) => i.category === 'renewed'),
              canceled: netItems.filter((i) => i.category === 'canceled'),
              new: netItems.filter((i) => i.category === 'new'),
              upcoming: netItems.filter((i) => i.category === 'upcoming'),
            };

            return (
              <div
                key={networkName}
                className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                {/* Cabecera de la Plataforma */}
                <div className="flex items-center gap-3 border-b border-slate-100 bg-pastel-cream/50 px-6 py-4 dark:border-slate-800 dark:bg-slate-950/50">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-pastel-accent/10 text-pastel-accent">
                    <Tv className="h-5 w-5" />
                  </div>
                  <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                    {networkName}
                  </h2>
                </div>

                {/* Contenido dividido por categorías */}
                <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {(['renewed', 'canceled', 'new', 'upcoming'] as const).map((catKey) => {
                    const groupList = byCategory[catKey];
                    if (groupList.length === 0) return null;
                    const catMeta = CATEGORY_CONFIG[catKey];
                    const Icon = catMeta.icon;

                    return (
                      <div key={catKey} className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-extrabold ${catMeta.badgeClass}`}>
                            <Icon className="h-3.5 w-3.5" />
                            {catMeta.label}
                          </span>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          {groupList.map((item) => (
                            <div
                              key={item.id}
                              className="group relative flex flex-col justify-between rounded-2xl border border-slate-100 bg-pastel-cream/30 p-4 transition hover:border-slate-200 dark:border-slate-800 dark:bg-slate-950/30"
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
                                      onClick={() => handleDelete(item.id)}
                                      title="Eliminar o cambiar estado"
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

                              <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400">
                                <span>Actualizado: {item.date}</span>
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