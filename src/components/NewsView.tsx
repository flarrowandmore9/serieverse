import { useEffect, useState } from 'react';
import { ExternalLink, Loader2, Newspaper, RefreshCw, Tv } from 'lucide-react';

type BloggerPost = {
  title: string;
  content: string;
  published: string;
  updated: string;
  url: string;
};

export default function NewsView() {
  const [post, setPost] = useState<BloggerPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchBloggerPost = async () => {
    setLoading(true);
    setError(false);
    try {
      // Usamos el feed JSON oficial de tu blog de Blogger
      const response = await fetch('https://flarrowandmore.blogspot.com/feeds/posts/default?alt=json&max-results=5');
      if (!response.ok) throw new Error('No se pudo conectar con el blog');

      const data = await response.json();
      const entries = data.feed?.entry || [];

      // Buscamos el post que contenga "news", "renovadas", "canceladas" o el año actual
      const currentYear = new Date().getFullYear().toString();
      const targetEntry = entries.find((entry: any) => {
        const title = (entry.title?.$t || '').toLowerCase();
        return title.includes('news') || title.includes('renovadas') || title.includes(currentYear);
      }) || entries[0]; // Si no encuentra coincidencia exacta, coge el último publicado

      if (targetEntry) {
        const title = targetEntry.title?.$t || 'Guía de Series';
        const content = targetEntry.content?.$t || targetEntry.summary?.$t || '';
        const published = targetEntry.published?.$t ? targetEntry.published.$t.split('T')[0] : '';
        const updated = targetEntry.updated?.$t ? targetEntry.updated.$t.split('T')[0] : published;
        
        // Encontrar el enlace web original de Blogger
        const altLink = targetEntry.link?.find((l: any) => l.rel === 'alternate')?.href || 'https://flarrowandmore.blogspot.com';

        setPost({
          title,
          content,
          published,
          updated,
          url: altLink,
        });
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBloggerPost();
  }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Cabecera Editorial */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200/80 pb-6 dark:border-slate-800">
        <div>
          <span className="rounded-full bg-pastel-accent/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-pastel-accent">
            Flarrow & More · Sincronización en Directo
          </span>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Guía Oficial de Series
          </h1>
          <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
            Contenido extraído directamente de tu artículo de cabecera en Blogger y actualizado automáticamente.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchBloggerPost}
          disabled={loading}
          className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Actualizar datos
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-pastel-accent" />
          <p className="text-xs font-semibold text-slate-500">Sincronizando con Flarrow & More...</p>
        </div>
      ) : error || !post ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white/60 p-12 text-center dark:border-slate-800 dark:bg-slate-900/50">
          <Newspaper className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-300">No se ha podido cargar el artículo de Blogger.</p>
          <a
            href="https://flarrowandmore.blogspot.com"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-pastel-accent px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-pastel-accentHover"
          >
            Visitar el blog directamente
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      ) : (
        <article className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {/* Tarjeta de Título del Post */}
          <div className="border-b border-slate-100 bg-pastel-cream/50 px-6 py-6 sm:px-8 dark:border-slate-800 dark:bg-slate-950/50">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Tv className="h-4 w-4 text-pastel-accent" />
                Publicado el {post.published} (Actualizado: {post.updated})
              </span>

              <a
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-bold text-pastel-accent hover:underline"
              >
                Ver post original en Blogger
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              {post.title}
            </h2>
          </div>

          {/* Cuerpo del Artículo Estilizado Tipográficamente */}
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