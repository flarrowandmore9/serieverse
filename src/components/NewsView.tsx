import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Calendar, CheckCircle2, Clock, Edit3, Loader2, Plus, RefreshCw, Settings, Sparkles, Trash2, Tv, X, XCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchCatalog } from '@/lib/catalog';
import { supabase } from '@/lib/supabase';
import type { ShowListItem } from '@/lib/types';

type EditorialCard = {
  id: string;
  showId?: number | null;
  title: string;
  season: string;
  category: 'renewed' | 'canceled' | 'estrenos' | 'nuevas';
  network: string;
  date: string;
  posterUrl?: string;
};

type NewsViewProps = {
  onOpenShow: (showId: number) => void;
};

const EDITORIAL_CARDS_KEY = 'serieverse_exact_editorial_cards_v6';
const BLOGGER_FEED_KEY = 'serieverse_blogger_feed_url';

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
  estrenos: {
    label: 'Estrenos del año',
    badgeClass: 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300',
    icon: Sparkles,
  },
  nuevas: {
    label: 'Series Nuevas',
    badgeClass: 'bg-violet-100 text-violet-800 dark:bg-violet-950/80 dark:text-violet-300',
    icon: Clock,
  },
};

export default function NewsView({ onOpenShow }: NewsViewProps) {
  const { isAdmin } = useAuth();
  const [cards, setCards] = useState<EditorialCard[]>([]);
  const [catalog, setCatalog] = useState<ShowListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'renewed' | 'canceled' | 'estrenos' | 'nuevas'>('all');
  const [selectedNetwork, setSelectedNetwork] = useState<string>('all');

  const [showConfig, setShowConfig] = useState(false);
  const [bloggerUrl, setBloggerUrl] = useState('https://flarrowandmore.blogspot.com/feeds/posts/default?alt=json');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedShowId, setSelectedShowId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [season, setSeason] = useState('');
  const [category, setCategory] = useState<EditorialCard['category']>('renewed');
  const [network, setNetwork] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [posterUrl, setPosterUrl] = useState('');
  const [saving, setSaving] = useState(false);

  // Carga inicial estable sin recargas en bucle
  useEffect(() => {
    let isMounted = true;
    async function init() {
      try {
        const [cardsData, showsData, savedUrl] = await Promise.all([
          fetchCards(),
          fetchCatalog({ search: '', genre: '', sort: 'title' }, 3000).catch(() => []),
          fetchBloggerConfig(),
        ]);
        if (isMounted) {
          setCards(cardsData);
          setCatalog(showsData);
          if (savedUrl) setBloggerUrl(savedUrl);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    init();
    return () => {
      isMounted = false;
    };
  }, []);

  const fetchCards = async () => {
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', EDITORIAL_CARDS_KEY)
      .maybeSingle();

    if (data?.value) {
      try {
        const parsed = JSON.parse(data.value);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  };

  const fetchBloggerConfig = async () => {
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', BLOGGER_FEED_KEY)
      .maybeSingle();
    if (data?.value) {
      try {
        const parsed = JSON.parse(data.value);
        return parsed.url || '';
      } catch {}
    }
    return '';
  };

  const saveCards = async (updated: EditorialCard[]) => {
    setCards(updated);
    await supabase
      .from('app_settings')
      .upsert({ key: EDITORIAL_CARDS_KEY, value: JSON.stringify(updated) }, { onConflict: 'key' });
  };

  const handleSyncBlogger = async () => {
    const targetUrl = bloggerUrl.trim() || 'https://flarrowandmore.blogspot.com/feeds/posts/default?alt=json';
    setSyncing(true);
    try {
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
      const res = await fetch(proxyUrl);
      if (!res.ok) throw new Error('Error al conectar');

      const json = await res.json();
      const feedData = JSON.parse(json.contents);
      const entries = feedData.feed?.entry || [];

      if (entries.length === 0) {
        alert('No se encontraron entradas en el feed.');
        setSyncing(false);
        return;
      }

      const latestPost = entries[0];
      const contentHtml = latestPost.content?.$t || latestPost.summary?.$t || '';
      const pubDate = latestPost.published?.$t ? latestPost.published.$t.split('T')[0] : new Date().toISOString().split('T')[0];

      const tempCards: EditorialCard[] = [...cards];
      const parser = new DOMParser();
      const doc = parser.parseFromString(contentHtml, 'text/html');
      const listItems = doc.querySelectorAll('li, p, strong, h3, h4');

      listItems.forEach((el) => {
        const text = el.textContent?.trim() || '';
        if (text.length < 2 || text.length > 100) return;

        const lower = text.toLowerCase();
        let cat: EditorialCard['category'] = 'renewed';
        if (lower.includes('cancel') || lower.includes('terminad')) cat = 'canceled';
        else if (lower.includes('estreno')) cat = 'estrenos';
        else if (lower.includes('nueva')) cat = 'nuevas';

        const matchedShow = catalog.find((s) => text.toLowerCase().includes(s.title.toLowerCase()));

        if (matchedShow) {
          const exists = tempCards.some((c) => c.title.toLowerCase() === matchedShow.title.toLowerCase());
          if (!exists) {
            tempCards.unshift({
              id: crypto.randomUUID(),
              showId: matchedShow.id,
              title: matchedShow.title,
              season: 'Temporada Actual',
              category: cat,
              network: matchedShow.es_platforms?.[0] || matchedShow.network_name || 'TV',
              date: matchedShow.first_air_date || pubDate,
              posterUrl: matchedShow.poster_url || undefined,
            });
          }
        }
      });

      await saveCards(tempCards);
      alert('¡Sincronización completada con éxito!');
    } catch {
      alert('No se ha podido sincronizar debido a restricciones del navegador. Puedes gestionar tus series cómodamente de forma manual.');
    } finally {
      setSyncing(false);
    }
  };

  const handleSelectCatalogShow = (idStr: string) => {
    setSelectedShowId(idStr);
    const found = catalog.find((s) => String(s.id) === idStr);
    if (found) {
      setTitle(found.title);
      setPosterUrl(found.poster_url ?? '');
      setNetwork(found.es_platforms?.[0] || found.us_platforms?.[0] || found.network_name || '');
      if (found.first_air_date) setDate(found.first_air_date);
    }
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setSelectedShowId('');
    setTitle('');
    setSeason('');
    setCategory('renewed');
    setNetwork('');
    setDate(new Date().toISOString().split('T')[0]);
    setPosterUrl('');
    setShowForm(true);
  };

  const handleOpenEdit = (card: EditorialCard) => {
    setEditingId(card.id);
    setSelectedShowId(card.showId ? String(card.showId) : '');
    setTitle(card.title);
    setSeason(card.season);
    setCategory(card.category);
    setNetwork(card.network);
    setDate(card.date || new Date().toISOString().split('T')[0]);
    setPosterUrl(card.posterUrl || '');
    setShowForm(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !network.trim()) return;

    setSaving(true);
    try {
      let finalPoster = posterUrl.trim();
      if (selectedShowId && !finalPoster) {
        const found = catalog.find((s) => String(s.id) === selectedShowId);
        if (found?.poster_url) finalPoster = found.poster_url;
      }

      if (editingId) {
        const updated = cards.map((c) =>
          c.id === editingId
            ? {
                ...c,
                showId: selectedShowId ? Number(selectedShowId) : null,
                title: title.trim(),
                season: season.trim(),
                category,
                network: network.trim(),
                date,
                posterUrl: finalPoster || undefined,
              }
            : c
        );
        await saveCards(updated);
      } else {
        const newCard: EditorialCard = {
          id: crypto.randomUUID(),
          showId: selectedShowId ? Number(selectedShowId) : null,
          title: title.trim(),
          season: season.trim(),
          category,
          network: network.trim(),
          date,
          posterUrl: finalPoster || undefined,
        };
        await saveCards([newCard, ...cards]);
      }

      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar esta serie de la guía?')) return;
    const updated = cards.filter((c) => c.id !== id);
    await saveCards(updated);
  };

  const networksList = useMemo(() => {
    const set = new Set<string>();
    cards.forEach((c) => {
      if (c.network) set.add(c.network);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [cards]);

  const filteredCards = cards.filter((c) => {
    const matchesTab = activeTab === 'all' || c.category === activeTab;
    const matchesNetwork = selectedNetwork === 'all' || c.network === selectedNetwork;
    return matchesTab && matchesNetwork;
  });

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Cabecera */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200/80 pb-6 dark:border-slate-800">
        <div>
          <span className="rounded-full bg-pastel-accent/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-pastel-accent">
            Actualidad Seriéfila · Flarrow & More
          </span>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Noticias, Renovaciones y Cancelaciones
          </h1>
          <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
            El estado oficial de tus series favoritas y los próximos estrenos confirmados.
          </p>
        </div>

        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowConfig(true)}
              className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >
              <Settings className="h-4 w-4" />
              Configurar Blog
            </button>

            <button
              type="button"
              onClick={handleSyncBlogger}
              disabled={syncing}
              className="flex items-center gap-1.5 rounded-2xl border border-pastel-accent bg-pastel-accent/10 px-4 py-3 text-xs font-bold text-pastel-accent shadow-sm transition hover:bg-pastel-accent/20"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              Sincronizar Post
            </button>

            <button
              type="button"
              onClick={handleOpenCreate}
              className="flex items-center gap-2 rounded-2xl bg-pastel-accent px-5 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-pastel-accentHover"
            >
              <Plus className="h-4 w-4" />
              Publicar noticia
            </button>
          </div>
        )}
      </div>

      {/* Modal de Configuración */}
      {isAdmin && showConfig && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-md dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Configurar Feed de Blogger</h2>
            <button type="button" onClick={() => setShowConfig(false)} className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Introduce la URL del feed JSON de tu blog: <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">https://flarrowandmore.blogspot.com/feeds/posts/default?alt=json</code>
          </p>
          <input
            value={bloggerUrl}
            onChange={(e) => setBloggerUrl(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-pastel-cream px-3.5 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={async () => {
                await supabase.from('app_settings').upsert(
                  { key: BLOGGER_FEED_KEY, value: JSON.stringify({ url: bloggerUrl }) },
                  { onConflict: 'key' }
                );
                setShowConfig(false);
                alert('URL guardada.');
              }}
              className="rounded-xl bg-pastel-accent px-5 py-2 text-xs font-bold text-white hover:bg-pastel-accentHover"
            >
              Guardar
            </button>
          </div>
        </div>
      )}

      {/* Formulario Administradora */}
      {isAdmin && showForm && (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-md dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
              {editingId ? 'Editar serie en la guía' : 'Publicar nueva serie'}
            </h2>
            <button type="button" onClick={() => setShowForm(false)} className="text-xs font-bold text-slate-400 hover:text-slate-600">
              Cancelar
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Buscar en Catálogo (Carátula automática)</span>
              <select
                value={selectedShowId}
                onChange={(e) => handleSelectCatalogShow(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-pastel-cream px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="">-- Seleccionar serie de la app --</option>
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
                placeholder="Ej: Criminal Minds"
                className="w-full rounded-xl border border-slate-200 bg-pastel-cream px-3.5 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Temporada / Subtítulo</span>
              <input
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                placeholder="Ej: Season 3 / Evolution S3"
                className="w-full rounded-xl border border-slate-200 bg-pastel-cream px-3.5 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Estado / Categoría</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as EditorialCard['category'])}
                className="w-full rounded-xl border border-slate-200 bg-pastel-cream px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="renewed">🟢 Renovada</option>
                <option value="canceled">🔴 Cancelada o Terminada</option>
                <option value="estrenos">🔵 Estrenos del año</option>
                <option value="nuevas">🟣 Series Nuevas</option>
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
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Fecha</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-pastel-cream px-3.5 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </label>

            <label className="block space-y-1 sm:col-span-2 lg:col-span-3">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">URL de la Carátula (Manual por si no está en el catálogo)</span>
              <input
                value={posterUrl}
                onChange={(e) => setPosterUrl(e.target.value)}
                placeholder="https://image.tmdb.org/t/p/w500/... o enlace directo de imagen"
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
              {editingId ? 'Guardar cambios' : 'Publicar noticia'}
            </button>
          </div>
        </form>
      )}

      {/* Menú de Filtros */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all', label: 'Todas' },
            { id: 'renewed', label: 'Renovadas' },
            { id: 'canceled', label: 'Canceladas o Terminadas' },
            { id: 'estrenos', label: 'Estrenos del año' },
            { id: 'nuevas', label: 'Series Nuevas' },
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
          aria-label="Filtrar por cadena o plataforma"
          className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm focus:border-pastel-accent focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
        >
          <option value="all">🌐 Todas las cadenas y plataformas</option>
          {networksList.map((net) => (
            <option key={net} value={net}>{net}</option>
          ))}
        </select>
      </div>

      {/* Cuadrícula de Tarjetas */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-pastel-accent" />
        </div>
      ) : filteredCards.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white/60 p-12 text-center dark:border-slate-800 dark:bg-slate-900/50">
          <Tv className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-300">No hay series registradas en este filtro.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCards.map((card) => {
            const meta = CATEGORY_META[card.category];
            const Icon = meta.icon;

            return (
              <article
                key={card.id}
                className="group relative flex overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
              >
                {/* Carátula Oficial más grande y clicable para abrir la serie */}
                <div 
                  onClick={() => card.showId && onOpenShow(card.showId)}
                  title={card.showId ? "Ver ficha completa de la serie" : "Serie personalizada"}
                  className={`h-28 w-32 shrink-0 overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800 ${card.showId ? 'cursor-pointer transition-transform hover:scale-[1.03]' : ''}`}
                >
                  {card.posterUrl ? (
                    <img src={card.posterUrl} alt={card.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-400">
                      <Tv className="h-6 w-6" />
                    </div>
                  )}
                </div>

                {/* Contenido de la Tarjeta */}
                <div className="ml-4 flex flex-1 flex-col justify-between">
                  <div>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${meta.badgeClass}`}>
                      <Icon className="h-3 w-3" />
                      {meta.label}
                    </span>

                    <h3 
                      onClick={() => card.showId && onOpenShow(card.showId)}
                      className={`mt-1.5 text-base font-black tracking-tight text-slate-900 dark:text-white ${card.showId ? 'cursor-pointer hover:text-pastel-accent transition-colors' : ''}`}
                    >
                      {card.title}
                    </h3>

                    {card.season && (
                      <p className="text-xs font-bold text-pastel-accent">
                        {card.season}
                      </p>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-400 dark:border-slate-800">
                    <span className="font-semibold text-slate-500 dark:text-slate-400 truncate max-w-[100px]">
                      {card.network}
                    </span>

                    <span className="flex items-center gap-1 shrink-0">
                      <Calendar className="h-3 w-3" />
                      {card.date}
                    </span>
                  </div>
                </div>

                {/* Botones de Administradora (Editar / Borrar) */}
                {isAdmin && (
                  <div className="absolute right-3 top-3 flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(card)}
                      title="Editar serie"
                      className="rounded-lg bg-white/90 p-1.5 text-slate-600 shadow-sm transition hover:text-pastel-accent dark:bg-slate-800 dark:text-slate-200"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(card.id)}
                      title="Eliminar"
                      className="rounded-lg bg-white/90 p-1.5 text-slate-600 shadow-sm transition hover:text-rose-600 dark:bg-slate-800 dark:text-slate-200"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}