import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Calendar, CheckCircle2, Clock, Loader2, Plus, Sparkles, Trash2, Tv, XCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { fetchCatalog } from '@/lib/catalog';
import type { ShowListItem } from '@/lib/types';

type EditorialCardItem = {
  id: string;
  showId?: number | null;
  title: string;          // Ej: Chicago Fire
  seasonText: string;     // Ej: Season 16
  category: 'renewed' | 'canceled' | 'new_year' | 'upcoming';
  headline: string;       // Nota corta / sinopsis
  network: string;        // Ej: NBC, Paramount+, CBS
  posterUrl?: string;     // Carátula de la serie
  date: string;
};

const CARDS_STORAGE_KEY = 'serieverse_editorial_cards_v1';

const CATEGORY_META = {
  renewed: {
    label: 'Renovada',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300',
    icon: CheckCircle2,
  },
  canceled: {
    label: 'Cancelada o Terminada',
    badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300',
    icon: XCircle,
  },
  new_year: {
    label: 'Estrenos del año',
    badgeClass: 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300',
    icon: Sparkles,
  },
  upcoming: {
    label: 'Series Nuevas / Futuras',
    badgeClass: 'bg-violet-100 text-violet-800 dark:bg-violet-950/80 dark:text-violet-300',
    icon: Clock,
  },
};

export default function NewsView() {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState<EditorialCardItem[]>([]);
  const [catalog, setCatalog] = useState<ShowListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'renewed' | 'canceled' | 'new_year' | 'upcoming'>('all');
  const [selectedNetwork, setSelectedNetwork] = useState<string>('all');

  // Formulario de administración
  const [showForm, setShowForm] = useState(false);
  const [selectedCatalogId, setSelectedCatalogId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [seasonText, setSeasonText] = useState('');
  const [category, setCategory] = useState<EditorialCardItem['category']>('renewed');
  const [headline, setHeadline] = useState('');
  const [network, setNetwork] = useState('');
  const [posterUrl, setPosterUrl] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchCardsData(),
      fetchCatalog({ search: '', genre: '', sort: 'title' }, 500).catch(() => []),
    ]).then(([cardsData, catalogData]) => {
      setItems(cardsData);
      setCatalog(catalogData);
      setLoading(false);
    });
  }, []);

  const fetchCardsData = async () => {
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', CARDS_STORAGE_KEY)
      .maybeSingle();

    if (data?.value) {
      try {
        const parsed = JSON.parse(data.value);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }

    // Datos iniciales de demostración con el diseño visual exacto
    return [
      {
        id: '1',
        title: 'Chicago Fire',
        seasonText: 'Season 16',
        category: 'renewed' as const,
        headline: 'En emisión / Renovada: la serie continúa activa con nuevos episodios.',
        network: 'NBC',
        posterUrl: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=500&auto=format&fit=crop&q=60',
        date: '2026-11-16',
      },
      {
        id: '2',
        title: 'The Hunting Party',
        seasonText: 'Season 2',
        category: 'canceled' as const,
        headline: 'Serie finalizada o cancelada oficialmente tras completar su emisión.',
        network: 'NBC',
        posterUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=60',
        date: '2026-11-16',
      },
    ];
  };

  const saveCardsData = async (updated: EditorialCardItem[]) => {
    setItems(updated);
    await supabase
      .from('app_settings')
      .upsert({ key: CARDS_STORAGE_KEY, value: JSON.stringify(updated) }, { onConflict: 'key' });
  };

  const handleSelectCatalogShow = (idStr: string) => {
    setSelectedCatalogId(idStr);
    const found = catalog.find((s) => String(s.id) === idStr);
    if (found) {
      setTitle(found.title);
      setPosterUrl(found.poster_url ?? '');
      const platform = found.es_platforms?.[0] || found.us_platforms?.[0] || found.network_name || '';
      setNetwork(platform);
    }
  };

  const handleAddCard = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !headline.trim() || !network.trim()) return;

    setSaving(true);
    try {
      const newItem: EditorialCardItem = {
        id: crypto.randomUUID(),
        showId: selectedCatalogId ? Number(selectedCatalogId) : null,
        title: title.trim(),
        seasonText: seasonText.trim(),
        category,
        headline: headline.trim(),
        network: network.trim(),
        posterUrl: posterUrl.trim() || undefined,
        date: new Date().toISOString().split('T')[0],
      };

      const updated = [newItem, ...items];
      await saveCardsData(updated);

      setSelectedCatalogId('');
      setTitle('');
      setSeasonText('');
      setHeadline('');
      setNetwork('');
      setPosterUrl('');
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCard = async (id: string) => {
    if (!window.confirm('¿Eliminar esta tarjeta de la guía?')) return;
    const updated = items.filter((i) => i.id !== id);
    await saveCardsData(updated);
  };

  // Obtener plataformas para el filtro
  const networksList = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (i.network) set.add(i.network);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  // Filtrado por Pestaña (los 5 botones) y por Plataforma
  const filteredItems = items.filter((item) => {
    const matchesTab = activeTab === 'all' || item.category === activeTab;
    const matchesNetwork = selectedNetwork === 'all' || item.network === selectedNetwork;
    return matchesTab && matchesNetwork;
  });

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Cabecera idéntica a tu diseño ideal */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200/80 pb-6 dark:border-slate-800">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-pastel-accent">Actualidad Seriéfila</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Noticias, Renovaciones y Cancelaciones
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            El estado oficial de tus series favoritas y los próximos estrenos confirmados.
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 rounded-2xl bg-pastel-accent px-5 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-pastel-accentHover"
          >
            <Plus className="h-4 w-4" />
            {showForm ? 'Cerrar editor' : 'Publicar noticia'}
          </button>
        )}
      </div>

      {/* Formulario Administradora */}
      {isAdmin && showForm && (
        <form onSubmit={handleAddCard} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">Añadir nueva tarjeta a la guía</h2>
            <span className="text-xs text-slate-400">Control visual total</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Vincular del catálogo (opcional)</span>
              <select
                value={selectedCatalogId}
                onChange={(e) => handleSelectCatalogShow(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-pastel-cream px-3.5 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="">-- Serie personalizada --</option>
                {catalog.map((s) => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Título de la serie</span>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Tulsa King"
                className="w-full rounded-xl border border-slate-200 bg-pastel-cream px-3.5 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Temporada (Ej: Season 2)</span>
              <input
                value={seasonText}
                onChange={(e) => setSeasonText(e.target.value)}
                placeholder="Ej: Season 2"
                className="w-full rounded-xl border border-slate-200 bg-pastel-cream px-3.5 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Categoría (Estado)</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as EditorialCardItem['category'])}
                className="w-full rounded-xl border border-slate-200 bg-pastel-cream px-3.5 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="renewed">🟢 Renovada</option>
                <option value="canceled">🔴 Cancelada o Terminada</option>
                <option value="new_year">🔵 Estrenos del año</option>
                <option value="upcoming">🟣 Series Nuevas / Futuras</option>
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Cadena / Plataforma</span>
              <input
                required
                value={network}
                onChange={(e) => setNetwork(e.target.value)}
                placeholder="Ej: Paramount+, CBS, Netflix"
                className="w-full rounded-xl border border-slate-200 bg-pastel-cream px-3.5 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">URL de Carátula (opcional)</span>
              <input
                value={posterUrl}
                onChange={(e) => setPosterUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-xl border border-slate-200 bg-pastel-cream px-3.5 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </label>

            <label className="block space-y-1 sm:col-span-2 lg:col-span-3">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Nota / Sinopsis corta</span>
              <input
                required
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="Ej: En emisión / Renovada: la serie continúa activa con nuevos episodios..."
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
              Guardar y publicar tarjeta
            </button>
          </div>
        </form>
      )}

      {/* Menú con los 5 Botones de Filtro + Selector de Plataforma */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all', label: 'Todas' },
            { id: 'renewed', label: 'Renovadas' },
            { id: 'canceled', label: 'Canceladas o Terminadas' },
            { id: 'new_year', label: 'Estrenos del año' },
            { id: 'upcoming', label: 'Series Nuevas' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`rounded-full px-5 py-2 text-xs font-black transition shadow-sm ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <select
          value={selectedNetwork}
          onChange={(e) => setSelectedNetwork(e.target.value)}
          aria-label="Filtrar por plataforma"
          className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm focus:border-pastel-accent focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
        >
          <option value="all">🌐 Todas las cadenas / plataformas</option>
          {networksList.map((net) => (
            <option key={net} value={net}>{net}</option>
          ))}
        </select>
      </div>

      {/* Cuadrícula de Tarjetas (Idéntica a tu captura de referencia) */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-pastel-accent" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white/60 p-12 text-center dark:border-slate-800 dark:bg-slate-900/50">
          <Tv className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-300">No hay series en este filtro.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => {
            const meta = CATEGORY_META[item.category];
            const Icon = meta.icon;

            return (
              <article
                key={item.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex gap-4">
                  {/* Carátula */}
                  <div className="h-32 w-24 shrink-0 overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800 shadow-sm">
                    {item.posterUrl ? (
                      <img src={item.posterUrl} alt={item.title} className="h-full w-full object-cover transition group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-400">
                        <Tv className="h-6 w-6" />
                      </div>
                    )}
                  </div>

                  {/* Contenido de la tarjeta */}
                  <div className="flex min-w-0 flex-1 flex-col justify-between">
                    <div>
                      {/* Insignia de estado */}
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-[11px] font-extrabold ${meta.badgeClass}`}>
                        <Icon className="h-3 w-3" />
                        {meta.label}
                      </span>

                      {/* Título y Temporada */}
                      <h3 className="mt-2 text-base font-black tracking-tight text-slate-900 dark:text-white">
                        {item.title}
                        {item.seasonText && (
                          <span className="block text-xs font-bold text-pastel-accent">{item.seasonText}</span>
                        )}
                      </h3>

                      {/* Sinopsis corta */}
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                        {item.headline}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Pie de tarjeta: Cadena y Fecha */}
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-400 dark:border-slate-800">
                  <span className="font-extrabold text-slate-700 dark:text-slate-200">{item.network}</span>
                  <span className="flex items-center gap-1 font-medium">
                    <Calendar className="h-3 w-3" />
                    {item.date}
                  </span>
                </div>

                {/* Botón de borrado para administradora */}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleDeleteCard(item.id)}
                    title="Eliminar tarjeta"
                    className="absolute right-3 top-3 rounded-xl bg-white/90 p-1.5 text-slate-400 opacity-0 shadow-sm transition hover:text-rose-600 group-hover:opacity-100 dark:bg-slate-800"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}