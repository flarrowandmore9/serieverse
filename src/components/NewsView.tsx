import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Calendar, CheckCircle2, Clock, Loader2, Newspaper, Plus, Sparkles, Trash2, Tv, XCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

type NewsItem = {
  id: string;
  title: string;          // Ej: Chicago Fire | Season 16
  category: 'renewed' | 'canceled' | 'new' | 'upcoming';
  headline: string;       // Nota corta, protagónico o sinopsis
  network: string;        // CBS, NBC, Netflix, Movistar+, etc.
  date: string;
};

const NEWS_STORAGE_KEY = 'serieverse_editorial_news_v2';

const CATEGORY_META = {
  renewed: {
    label: 'Renovada',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900',
    icon: CheckCircle2,
    dotColor: 'bg-emerald-500',
  },
  canceled: {
    label: 'Cancelada / Terminada',
    badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-200 dark:border-rose-900',
    icon: XCircle,
    dotColor: 'bg-rose-500',
  },
  new: {
    label: 'Estreno del año',
    badgeClass: 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border-sky-200 dark:border-sky-900',
    icon: Sparkles,
    dotColor: 'bg-sky-500',
  },
  upcoming: {
    label: 'Spin-off / Reboot / Futuras',
    badgeClass: 'bg-violet-100 text-violet-800 dark:bg-violet-950/80 dark:text-violet-300 border-violet-200 dark:border-violet-900',
    icon: Clock,
    dotColor: 'bg-violet-500',
  },
};

export default function NewsView() {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'renewed' | 'canceled' | 'new' | 'upcoming'>('all');
  const [selectedNetwork, setSelectedNetwork] = useState<string>('all');

  // Estados del formulario de administración
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [seasonText, setSeasonText] = useState(''); // Ej: Season 16
  const [category, setCategory] = useState<NewsItem['category']>('renewed');
  const [headline, setHeadline] = useState('');
  const [network, setNetwork] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', NEWS_STORAGE_KEY)
      .maybeSingle();

    if (data?.value) {
      try {
        const parsed = JSON.parse(data.value);
        if (Array.isArray(parsed)) setItems(parsed);
      } catch {
        setItems([]);
      }
    } else {
      // Datos iniciales de ejemplo que encajan con tu estilo
      setItems([
        {
          id: '1',
          title: 'Chicago Fire | Season 16',
          category: 'renewed',
          headline: 'Renovada oficialmente por la cadena tras mantener excelentes datos de audiencia.',
          network: 'NBC',
          date: '2026-11-16',
        },
        {
          id: '2',
          title: 'The Hunting Party | Season 2',
          category: 'canceled',
          headline: 'Cancelada tras la emisión de su segunda tanda de episodios.',
          network: 'NBC',
          date: '2026-11-16',
        },
      ]);
    }
    setLoading(false);
  };

  const saveNewsItems = async (newItems: NewsItem[]) => {
    setItems(newItems);
    await supabase
      .from('app_settings')
      .upsert({ key: NEWS_STORAGE_KEY, value: JSON.stringify(newItems) }, { onConflict: 'key' });
  };

  const handleAddItem = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !headline.trim() || !network.trim()) return;

    setSaving(true);
    try {
      const fullTitle = seasonText.trim() ? `${title.trim()} | ${seasonText.trim()}` : title.trim();

      const newItem: NewsItem = {
        id: crypto.randomUUID(),
        title: fullTitle,
        category,
        headline: headline.trim(),
        network: network.trim(),
        date: new Date().toISOString().split('T')[0],
      };

      const updated = [newItem, ...items];
      await saveNewsItems(updated);

      setTitle('');
      setSeasonText('');
      setHeadline('');
      setNetwork('');
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!window.confirm('¿Eliminar este apunte de la guía?')) return;
    const updated = items.filter((i) => i.id !== id);
    await saveNewsItems(updated);
  };

  // Extraer redes/plataformas disponibles para el filtro superior
  const networks = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (i.network) set.add(i.network);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filteredItems = items.filter((item) => {
    const matchesTab = activeTab === 'all' || item.category === activeTab;
    const matchesNetwork = selectedNetwork === 'all' || item.network === selectedNetwork;
    return matchesTab && matchesNetwork;
  });

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Cabecera Estética */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200/80 pb-6 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-pastel-accent/10 px-3 py-1 text-[11px] font-bold tracking-wider text-pastel-accent uppercase">
              Flarrow & More · Especial Temporada
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Guía de Renovaciones y Cancelaciones
          </h1>
          <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
            El seguimiento definitivo de series renovadas, canceladas, estrenos y futuros proyectos ordenados por plataforma.
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 rounded-2xl bg-pastel-accent px-5 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-pastel-accentHover"
          >
            <Plus className="h-4 w-4" />
            {showForm ? 'Cerrar editor' : 'Añadir apunte editorial'}
          </button>
        )}
      </div>

      {/* Formulario de Administradora limpio y estético */}
      {isAdmin && showForm && (
        <form onSubmit={handleAddItem} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">Nuevo apunte para la guía</h2>
            <span className="text-xs text-slate-400">Se añadirá instantáneamente a la app</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Temporada / Subtítulo (Opcional)</span>
              <input
                value={seasonText}
                onChange={(e) => setSeasonText(e.target.value)}
                placeholder="Ej: Season 16 / Spin-off"
                className="w-full rounded-xl border border-slate-200 bg-pastel-cream px-3.5 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Categoría</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as NewsItem['category'])}
                className="w-full rounded-xl border border-slate-200 bg-pastel-cream px-3.5 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="renewed">🟢 Renovada</option>
                <option value="canceled">🔴 Cancelada / Terminada</option>
                <option value="new">🔵 Estreno del año</option>
                <option value="upcoming">🟣 Spin-off / Reboot / Futuras</option>
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Cadena / Plataforma</span>
              <input
                required
                value={network}
                onChange={(e) => setNetwork(e.target.value)}
                placeholder="Ej: NBC, Netflix, Paramount+"
                className="w-full rounded-xl border border-slate-200 bg-pastel-cream px-3.5 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </label>

            <label className="block space-y-1 sm:col-span-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Nota corta o detalle del proyecto</span>
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
              Publicar en la guía
            </button>
          </div>
        </form>
      )}

      {/* Barra de Filtros (Pestañas + Selector de Plataforma) */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all', label: 'Todas' },
            { id: 'renewed', label: 'Renovadas' },
            { id: 'canceled', label: 'Canceladas' },
            { id: 'new', label: 'Estrenos' },
            { id: 'upcoming', label: 'Futuras / Reboots' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`rounded-2xl px-4 py-2 text-xs font-extrabold transition shadow-sm ${
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
          <option value="all">🌐 Todas las cadenas y plataformas</option>
          {networks.map((net) => (
            <option key={net} value={net}>{net}</option>
          ))}
        </select>
      </div>

      {/* Listado de Tarjetas Estéticas */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-pastel-accent" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white/60 p-12 text-center dark:border-slate-800 dark:bg-slate-900/50">
          <Newspaper className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-300">No hay apuntes registrados en esta categoría.</p>
          <p className="mt-1 text-xs text-slate-400">Selecciona otro filtro o añade uno nuevo desde el panel de administración.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => {
            const meta = CATEGORY_META[item.category];
            const Icon = meta.icon;
            return (
              <article
                key={item.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-extrabold ${meta.badgeClass}`}>
                      <Icon className="h-3 w-3" />
                      {meta.label}
                    </span>
                    <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">
                      {item.network}
                    </span>
                  </div>

                  <h3 className="mt-3.5 text-base font-black tracking-tight text-slate-900 dark:text-white group-hover:text-pastel-accent transition-colors">
                    {item.title}
                  </h3>

                  <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    {item.headline}
                  </p>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-400 dark:border-slate-800/80">
                  <span className="flex items-center gap-1 font-medium">
                    <Calendar className="h-3 w-3" />
                    Actualizado el {item.date}
                  </span>

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item.id)}
                      title="Eliminar apunte"
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}