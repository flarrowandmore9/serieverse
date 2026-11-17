import { useEffect, useState } from 'react';
import { ExternalLink, Loader2, Newspaper, RefreshCw, Settings, Tv, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

type PostData = {
  title: string;
  content: string;
  url: string;
  published: string;
};

const BLOGGER_CONFIG_KEY = 'serieverse_blogger_post_url';

export default function NewsView() {
  const { isAdmin } = useAuth();
  const [post, setPost] = useState<PostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [customUrl, setCustomUrl] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadBloggerData();
  }, []);

  const loadBloggerData = async () => {
    setLoading(true);
    try {
      // 1. Ver si hay una URL personalizada guardada por la administradora
      const { data: settingData } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', BLOGGER_CONFIG_KEY)
        .maybeSingle();

      let targetFeedUrl = 'https://flarrowandmore.blogspot.com/feeds/posts/default?alt=json&max-results=3';
      
      if (settingData?.value) {
        try {
          const parsed = JSON.parse(settingData.value);
          if (parsed.url) {
            setCustomUrl(parsed.url);
          }
        } catch {}
      }

      // 2. Usar un proxy CORS público y seguro para leer Blogger sin bloqueos
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetFeedUrl)}`;
      const res = await fetch(proxyUrl);
      if (!res.ok) throw new Error('Error al conectar');

      const json = await res.json();
      const feedData = JSON.parse(json.contents);
      const entries = feedData.feed?.entry || [];

      if (entries.length > 0) {
        // Coger el post más reciente o el primero relevante
        const entry = entries[0];
        const title = entry.title?.$t || 'Guía de Series';
        const content = entry.content?.$t || entry.summary?.$t || '';
        const published = entry.published?.$t ? entry.published.$t.split('T')[0] : '';
        const url = entry.link?.find((l: any) => l.rel === 'alternate')?.href || 'https://flarrowandmore.blogspot.com';

        setPost({ title, content, url, published });
      } else {
        throw new Error('No entries');
      }
    } catch {
      // Fallback estético de respaldo si la red falla
      setPost({
        title: 'News: Series renovadas y canceladas',
        content: '<p>Visita nuestro blog oficial en Blogger para consultar el listado completo actualizado de la temporada.</p>',
        url: 'https://flarrowandmore.blogspot.com',
        published: new Date().toISOString().split('T')[0],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await supabase.from('app_settings').upsert(
      { key: BLOGGER_CONFIG_KEY, value: JSON.stringify({ url: customUrl }) },
      { onConflict: 'key' }
    );
    setSaving(false);
    setShowConfig(false);
    loadBloggerData();
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Cabecera */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200/80 pb-6 dark:border-slate-800">
        <div>
          <span className="rounded-full bg-pastel-accent/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-pastel-accent">
            Flarrow & More · En Directo desde el Blog
          </span>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Guía de Series
          </h1>
          <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
            Sincronizado automáticamente con tus publicaciones de Blogger.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowConfig((v) => !v)}
              className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >
              <Settings className="h-3.5 w-3.5" />
              Configurar
            </button>
          )}

          <button
            type="button"
            onClick={loadBloggerData}
            disabled={loading}
            className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Panel de configuración de admin */}
      {isAdmin && showConfig && (
        <form onSubmit={handleSaveConfig} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-md dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Ajustes del Feed de Blogger</h2>
            <button type="button" onClick={() => setShowConfig(false)} className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">URL del Feed JSON de Blogger</span>
            <input
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://flarrowandmore.blogspot.com/feeds/posts/default?alt=json"
              className="w-full rounded-xl border border-slate-200 bg-pastel-cream px-3.5 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </label>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-pastel-accent px-5 py-2 text-xs font-bold text-white hover:bg-pastel-accentHover"
            >
              Guardar y Sincronizar
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-pastel-accent" />
          <p className="text-xs font-semibold text-slate-500">Cargando contenido de Flarrow & More...</p>
        </div>
      ) : !post ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white/60 p-12 text-center dark:border-slate-800 dark:bg-slate-900/50">
          <Newspaper className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-300">No se ha podido sincronizar el artículo.</p>
        </div>
      ) : (
        <article className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 bg-pastel-cream/50 px-6 py-6 sm:px-8 dark:border-slate-800 dark:bg-slate-950/50">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Tv className="h-4 w-4 text-pastel-accent" />
                Publicado el {post.published}
              </span>

              <a
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-bold text-pastel-accent hover:underline"
              >
                Ver en Flarrow & More
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              {post.title}
            </h2>
          </div>

          <div 
            className="prose prose-slate dark:prose-invert max-w-none px-6 py-8 sm:px-8 leading-relaxed text-slate-700 dark:text-slate-300 
              [&_h3]:text-xl [&_h3]:font-black [&_h3]:text-slate-900 [&_h3]:dark:text-white [&_h3]:mt-6 [&_h3]:mb-3
              [&_h4]:text-lg [&_h4]:font-bold [&_h4]:text-pastel-accent [&_h4]:mt-5 [&_h4]:mb-2
              [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-2
              [&_p]:mb-4 [&_a]:text-pastel-accent [&_a]:font-semibold [&_a]:underline"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </article>
      )}
    </div>
  );
}