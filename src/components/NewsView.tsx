import { useEffect, useState, type FormEvent } from 'react';
import { Calendar, CheckCircle2, Loader2, Newspaper, Plus, Sparkles, Trash2, Tv, XCircle } from 'lucide-react';
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
    label: 'Cancelada',
    badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300',
    icon: XCircle,
  },
  announced: {
    label: 'Nueva Confirmación',
    badgeClass: 'bg-violet-100 text-violet-800 dark:bg-violet-950/80 dark:text-violet-300',
    icon: Sparkles,
  },
};

export default function NewsView({ onOpenShow }: NewsViewProps) {
  const { isAdmin } = useAuth();
  const [news, setNews] = useState<SeriesNewsItem[]>([]);
  const [catalog, setCatalog] = useState<ShowListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | NewsCategory>('all');

  // Estados del formulario rápido de administradora
  const [showForm, setShowForm] = useState(false);
  const [selectedShowId, setSelectedShowId] = useState<string>('');
  const [title, setTitle] = useState('');
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
      const newItem: SeriesNewsItem = {
        id: crypto.randomUUID(),
        showId: selectedShowId ? Number(selectedShowId) : null,
        title: title.trim(),
        category,
        headline: headline.trim(),
        network: network.trim() || undefined,
        posterUrl: posterUrl.trim() || undefined,
        date: new Date().toISOString().split('T')[0],
      };

      const updated = [newItem, ...news];
      await saveSeriesNews(updated);
      setNews(updated);

      setSelectedShowId('');
      setTitle('');
      setHeadline('');
      setNetwork('');
      setPosterUrl('');
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar esta noticia?')) return;
    const updated = news.filter((item) => item.id !== id);
    await saveSeriesNews(updated);
    setNews(updated);
  };

  const filteredNews = filter === 'all' ? news : news.filter((item) => item.category === filter);

  return (
    <section className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-pastel-accent">Actualidad Seriéfila</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
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
            className="flex items-center gap-2 rounded-xl bg-pastel-accent px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-pastel-accentHover"
          >
            <Plus className="h-4 w-4" />
            {showForm ? 'Cerrar editor' : 'Publicar noticia'}
          </button>
        )}
      </div>

      {/* Formulario rápido exclusivo para Administradora */}
      {isAdmin && showForm && (
        <form onSubmit={handlePublish} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Nueva actualización de estado</h2>
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
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Tipo de anuncio</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as NewsCategory)}
                className="w-full rounded-xl border border-slate-200 bg-pastel-cream px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="renewed">🟢 Renovada</option>
                <option value="canceled">🔴 Cancelada</option>
                <option value="announced">✨ Nueva Confirmación / Luz Verde</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Título de la serie</span>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Tulsa King"
                className="w-full rounded-xl border border-slate-200 bg-pastel-cream px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Cadena / Plataforma</span>
              <input
                value={network}
                onChange={(e) => setNetwork(e.target.value)}
                placeholder="Ej: Paramount+, SkyShowtime"
                className="w-full rounded-xl border border-slate-200 bg-pastel-cream px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </label>

            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Titular o detalle corto</span>
              <input
                required
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="Ej: Renovada oficialmente por una 3ª temporada tras batir récords de audiencia."
                className="w-full rounded-xl border border-slate-200 bg-pastel-cream px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </label>

            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">URL de imagen / póster (opcional si ya elegiste serie)</span>
              <input
                value={posterUrl}
                onChange={(e) => setPosterUrl(e.target.value)}
                placeholder="https://..."
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
              Publicar ahora
            </button>
          </div>
        </form>
      )}

      {/* Filtros en pastilla */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'all', label: 'Todas' },
          { id: 'renewed', label: 'Renovadas' },
          { id: 'canceled', label: 'Canceladas' },
          { id: 'announced', label: 'Nuevas Confirmaciones' },
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

      {/* Listado de Noticias */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-pastel-accent" />
        </div>
      ) : filteredNews.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-10 text-center dark:border-slate-700 dark:bg-slate-900/50">
          <Newspaper className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">No hay noticias en esta categoría todavía.</p>
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
                      <span className="truncate font-semibold text-slate-500 dark:text-slate-400">{item.network ?? 'Plataforma por confirmar'}</span>
                      <span className="flex shrink-0 items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {item.date}
                      </span>
                    </div>
                  </div>
                </div>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    title="Eliminar noticia"
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