import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Calendar, CheckCircle2, Clock, Loader2, Newspaper, Plus, Sparkles, Trash2, Tv, XCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchCatalog } from '@/lib/catalog';
import { fetchSeriesNews, saveSeriesNews, type NewsCategory, type SeriesNewsItem } from '@/lib/news';
import type { ShowListItem } from '@/lib/types';

type NewsViewProps = {
  onOpenShow: (showId: number) => void;
};

const CATEGORY_META: Record<NewsCategory, { label: string; badgeClass: string; icon: typeof CheckCircle2 }> = {
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
  new_2026: {
    label: 'Nueva 2026',
    badgeClass: 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300',
    icon: Sparkles,
  },
  upcoming: {
    label: 'Anunciada (Futuro)',
    badgeClass: 'bg-violet-100 text-violet-800 dark:bg-violet-950/80 dark:text-violet-300',
    icon: Clock,
  },
};

export default function NewsView({ onOpenShow }: NewsViewProps) {
  const { isAdmin } = useAuth();
  const [news, setNews] = useState<SeriesNewsItem[]>([]);
  const [catalog, setCatalog] = useState<ShowListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | NewsCategory>('all');
  const [selectedNetwork, setSelectedNetwork] = useState<string>('all');

  // Formulario rápido de administradora
  const [showForm, setShowForm] = useState(false);
  const [selectedShowId, setSelectedShowId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [seasonText, setSeasonText] = useState(''); // Ej: Season 16 / Spin-off / Reboot
  const [category, setCategory] = useState<NewsCategory>('renewed');
  const [headline, setHeadline] = useState('');
  const [network, setNetwork] = useState('');
  const [posterUrl, setPosterUrl] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchSeriesNews(),
      fetchCatalog({ search: '', genre: '', sort: 'title' }, 500).catch(() => []),
    ]).then(([newsData, showsData]) => {
      setNews(newsData);
      setCatalog(showsData);
      setLoading(false);
    });
  }, []);

  const networks = useMemo(() => {
    const set = new Set<string>();
    news.forEach((n) => {
      if (n.network) set.add(n.network);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [news]);

  const handleSelectCatalogShow = (idStr: string) => {
    setSelectedShowId(idStr);
    const found = catalog.find((s) => String(s.id) === idStr);
    if (found) {
      setTitle(found.title);
      setPosterUrl(found.poster_url ?? '');
      const platform = found.es_platforms?.[0] || found.us_platforms?.[0] || found.network_name || '';
      setNetwork(platform);
    }
  };

  const handlePublish = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !headline.trim()) return;

    setSaving(true);
    try {
      // Combinamos título y temporada al estilo blog si se especifica (ej: Chicago Fire | Season 16)
      const fullTitle = seasonText.trim() ? `${title.trim()} | ${seasonText.trim()}` : title.trim();

      const newItem: SeriesNewsItem = {
        id: crypto.randomUUID(),
        showId: selectedShowId ? Number(selectedShowId) : null,
        title: fullTitle,
        category,
        headline: headline.trim(),
        network: network.trim() || 'Otras plataformas',
        posterUrl: posterUrl.trim() || undefined,
        date: new Date().toISOString().split('T')[0],
        isAuto: false,
      };

      const updated = [newItem, ...news];
      await saveSeriesNews(updated);
      setNews(updated);

      setSelectedShowId('');
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

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar este apunte?')) return;
    const updated = news.filter((item) => item.id !== id);
    await saveSeriesNews(updated);
    setNews(updated);
  };

  const filteredNews = news.filter((item) => {
    const matchesCategory = filter === 'all' || item.category === filter;
    const matchesNetwork = selectedNetwork === 'all' || item.network === selectedNetwork;
    return matchesCategory && matchesNetwork;
  });

  return (
    <section className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-pastel-accent">Temporada 2026 · Flarrow & More</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Renovaciones, Cancelaciones y Nuevas Series 2026
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Seguimiento clasificado por temporada, cadena y notas de producción (Spin-offs, reboots, etc.).
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 rounded-xl bg-pastel-accent px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-pastel-accentHover"
          >
            <Plus className="h-4 w-4" />
            {showForm ? 'Cerrar editor' : 'Añadir apunte al listado'}
          </button>
        )}
      </div>

      {isAdmin && showForm && (
        <form onSubmit={handlePublish} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Añadir entrada estilo blog</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Vincular serie del catálogo (opcional)</span>
              <select
                value={selectedShowId}
                onChange={(e) => handleSelectCatalogShow(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-pastel-cream px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="">-- Serie nueva / No está en catálogo --</option>
                {catalog.map((s) => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Sección del post</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as NewsCategory)}
                className="w-full rounded-xl border border-slate-200 bg-pastel-cream px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="renewed">🟢 Renovada</option>
                <option value="canceled">🔴 Cancelada / Terminada</option>
                <option value="new_2026">🔵 Nueva 2026 (con fecha)</option>
                <option value="upcoming">🟣 Futuras / Spin-off / Reboot / Anunciadas</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Título de la serie</span>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Chicago Fire"
                className="w-full rounded-xl border border-slate-200 bg-pastel-cream px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Temporada o Nota corta (Opcional)</span>
              <input
                value={seasonText}
                onChange={(e) => setSeasonText(e.target.value)}
                placeholder="Ej: Season 16 / Spin-off / Reboot"
                className="w-full rounded-xl border border-slate-200 bg-pastel-cream px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Cadena / Plataforma</span>
              <input
                required
                value={network}
                onChange={(e) => setNetwork(e.target.value)}
                placeholder="Ej: NBC, Paramount+, Netflix"
                className="w-full rounded-xl border border-slate-200 bg-pastel-cream px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">URL de carátula (opcional)</span>
              <input
                value={posterUrl}
                onChange={(e) => setPosterUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-xl border border-slate-200 bg-pastel-cream px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </label>

            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Nota / Sinopsis o detalles del proyecto</span>
              <input
                required
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="Ej: Protagonizada por tal actor, proyecto procedimental en desarrollo..."
                className="w-full rounded-xl border border-slate-200 bg-pastel-cream px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </label>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-pastel-accent px-5 py-2.5 text-xs font-bold text-white hover:bg-pastel-accentHover disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Añadir al listado
            </button>
          </div>
        </form>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all', label: 'Todas' },
            { id: 'renewed', label: 'Renovadas' },
            { id: 'canceled', label: 'Canceladas / Terminadas' },
            { id: 'new_2026', label: 'Nuevas 2026' },
            { id: 'upcoming', label: 'Spin-offs / Reboots / Anunciadas' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id as typeof filter)}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
                filter === tab.id
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-white text-slate-600 hover:bg-pastel-rose/50 dark:bg-slate-900 dark:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <select
          value={selectedNetwork}
          onChange={(e) => setSelectedNetwork(e.target.value)}
          aria-label="Filtrar por cadena o plataforma"
          className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm focus:border-pastel-accent focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
        >
          <option value="all">Todas las cadenas y plataformas</option>
          {networks.map((net) => (
            <option key={net} value={net}>{net}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-pastel-accent" />
        </div>
      ) : filteredNews.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-10 text-center dark:border-slate-700 dark:bg-slate-900/50">
          <Newspaper className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
            No hay apuntes en este filtro todavía.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredNews.map((item) => {
            const meta = CATEGORY_META[item.category];
            const Icon = meta.icon;
            return (
              <article
                key={item.id}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex gap-4 p-4">
                  <div
                    onClick={() => item.showId && onOpenShow(item.showId)}
                    className={`h-28 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800 ${item.showId ? 'cursor-pointer' : ''}`}
                  >
                    {item.posterUrl ? (
                      <img src={item.posterUrl} alt={item.title} className="h-full w-full object-cover transition group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-400">
                        <Tv className="h-6 w-6" />
                      </div>
                    )}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col justify-between">
                    <div>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${meta.badgeClass}`}>
                        <Icon className="h-3 w-3" />
                        {meta.label}
                      </span>

                      <h3
                        onClick={() => item.showId && onOpenShow(item.showId)}
                        className={`mt-2 line-clamp-1 text-base font-black text-slate-900 dark:text-white ${item.showId ? 'cursor-pointer hover:text-pastel-accent' : ''}`}
                      >
                        {item.title}
                      </h3>

                      <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                        {item.headline}
                      </p>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="truncate font-bold text-pastel-accent">{item.network}</span>
                      <span className="flex shrink-0 items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {item.date}
                      </span>
                    </div>
                  </div>
                </div>

                {isAdmin && !item.isAuto && (
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    title="Eliminar apunte"
                    className="absolute right-2.5 top-2.5 rounded-lg bg-white/90 p-1.5 text-slate-400 opacity-0 shadow-sm transition hover:text-rose-600 group-hover:opacity-100 dark:bg-slate-800"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}