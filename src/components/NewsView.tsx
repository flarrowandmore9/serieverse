import { useEffect, useState, type FormEvent } from 'react';
import { Calendar, CheckCircle2, ExternalLink, Loader2, Newspaper, Plus, Sparkles, Trash2, Tv, XCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchSeriesNews, saveSeriesNews, type NewsCategory, type SeriesNewsItem } from '@/lib/news';

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
    label: 'Nuevo Proyecto / Estreno',
    badgeClass: 'bg-violet-100 text-violet-800 dark:bg-violet-950/80 dark:text-violet-300',
    icon: Sparkles,
  },
};

export default function NewsView({}: NewsViewProps) {
  const { isAdmin } = useAuth();
  const [news, setNews] = useState<SeriesNewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | NewsCategory>('all');

  // Formulario rápido de administradora
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<NewsCategory>('renewed');
  const [headline, setHeadline] = useState('');
  const [network, setNetwork] = useState('');
  const [posterUrl, setPosterUrl] = useState('');
  const [link, setLink] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSeriesNews().then((data) => {
      setNews(data);
      setLoading(false);
    });
  }, []);

  const handlePublish = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !headline.trim()) return;

    setSaving(true);
    try {
      const newItem: SeriesNewsItem = {
        id: crypto.randomUUID(),
        title: title.trim(),
        category,
        headline: headline.trim(),
        network: network.trim() || 'Flarrow & More',
        posterUrl: posterUrl.trim() || undefined,
        link: link.trim() || undefined,
        date: new Date().toISOString().split('T')[0],
        isAuto: false,
      };

      const updated = [newItem, ...news];
      await saveSeriesNews(updated);
      setNews(updated);

      setTitle('');
      setHeadline('');
      setNetwork('');
      setPosterUrl('');
      setLink('');
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
          <p className="text-xs font-bold uppercase tracking-wider text-pastel-accent">Actualidad Internacional</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Noticias, Renovaciones y Cancelaciones en Directo
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Últimas horas de la industria seriéfila en tiempo real y comunicados oficiales.
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 rounded-xl bg-pastel-accent px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-pastel-accentHover"
          >
            <Plus className="h-4 w-4" />
            {showForm ? 'Cerrar editor' : 'Publicar exclusiva manual'}
          </button>
        )}
      </div>

      {isAdmin && showForm && (
        <form onSubmit={handlePublish} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Publicar titular en la app</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Tipo de noticia</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as NewsCategory)}
                className="w-full rounded-xl border border-slate-200 bg-pastel-cream px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="renewed">🟢 Renovada</option>
                <option value="canceled">🔴 Cancelada</option>
                <option value="announced">✨ Nuevo Proyecto</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Cadena / Fuente</span>
              <input
                value={network}
                onChange={(e) => setNetwork(e.target.value)}
                placeholder="Ej: Deadline, Paramount+, Netflix"
                className="w-full rounded-xl border border-slate-200 bg-pastel-cream px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </label>

            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Titular de la noticia</span>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Tulsa King renovada oficialmente por una temporada 3"
                className="w-full rounded-xl border border-slate-200 bg-pastel-cream px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </label>

            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Resumen o nota corta</span>
              <input
                required
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="Breve descripción del anuncio..."
                className="w-full rounded-xl border border-slate-200 bg-pastel-cream px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">URL de imagen (opcional)</span>
              <input
                value={posterUrl}
                onChange={(e) => setPosterUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-xl border border-slate-200 bg-pastel-cream px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Enlace a la noticia completa (opcional)</span>
              <input
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://deadline.com/..."
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
              Publicar
            </button>
          </div>
        </form>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'all', label: 'Todas' },
          { id: 'renewed', label: 'Renovadas' },
          { id: 'canceled', label: 'Canceladas' },
          { id: 'announced', label: 'Nuevos Proyectos' },
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

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-pastel-accent" />
        </div>
      ) : filteredNews.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-10 text-center dark:border-slate-700 dark:bg-slate-900/50">
          <Newspaper className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">No hay noticias en este filtro.</p>
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
                  <div className="h-28 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
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

                      <h3 className="mt-2 line-clamp-2 text-sm font-black text-slate-900 dark:text-white">
                        {item.link ? (
                          <a href={item.link} target="_blank" rel="noopener noreferrer" className="hover:text-pastel-accent transition flex items-center gap-1">
                            {item.title}
                            <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
                          </a>
                        ) : (
                          item.title
                        )}
                      </h3>

                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                        {item.headline}
                      </p>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="truncate font-semibold text-pastel-accent">{item.network}</span>
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