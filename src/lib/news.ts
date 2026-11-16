import { supabase } from '@/lib/supabase';

export type NewsCategory = 'renewed' | 'canceled' | 'announced';

export type SeriesNewsItem = {
  id: string;
  showId?: number | null;
  title: string;
  category: NewsCategory;
  headline: string;
  network?: string;
  posterUrl?: string;
  date: string;
  isAuto?: boolean;
};

const NEWS_SETTING_KEY = 'series_news';

export async function fetchSeriesNews(): Promise<SeriesNewsItem[]> {
  // 1. Obtener noticias manuales guardadas por la administradora
  const { data: settingData } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', NEWS_SETTING_KEY)
    .maybeSingle();

  let manualNews: SeriesNewsItem[] = [];
  if (settingData?.value) {
    try {
      const parsed = JSON.parse(settingData.value);
      if (Array.isArray(parsed)) manualNews = parsed;
    } catch {
      manualNews = [];
    }
  }

  // 2. Generar noticias automáticas desde tu propio catálogo en Supabase
  const autoNews: SeriesNewsItem[] = [];
  const { data: catalogShows } = await supabase
    .from('shows')
    .select('id, title, tv_status, poster_url, network_name, es_platforms, us_platforms, premiered, tv_synced_at')
    .order('tv_synced_at', { ascending: false, nullsFirst: false })
    .limit(60);

  if (catalogShows) {
    for (const show of catalogShows) {
      const status = (show.tv_status ?? '').toLowerCase();
      const platform = show.es_platforms?.[0] || show.us_platforms?.[0] || show.network_name || 'Plataforma oficial';
      const dateStr = (show.tv_synced_at || show.premiered || new Date().toISOString()).split('T')[0];

      // Evitar duplicar si ya la publicaste manualmente
      if (manualNews.some((m) => m.showId === show.id || m.title.toLowerCase() === show.title.toLowerCase())) {
        continue;
      }

      if (status.includes('cancel') || status === 'ended') {
        autoNews.push({
          id: `auto-cancel-${show.id}`,
          showId: show.id,
          title: show.title,
          category: 'canceled',
          headline: `Serie finalizada o cancelada oficialmente tras completar su emisión en ${platform}.`,
          network: platform,
          posterUrl: show.poster_url ?? undefined,
          date: dateStr,
          isAuto: true,
        });
      } else if (status === 'running' || status.includes('returning')) {
        autoNews.push({
          id: `auto-renew-${show.id}`,
          showId: show.id,
          title: show.title,
          category: 'renewed',
          headline: `En emisión / Renovada: la serie continúa activa con nuevos episodios en ${platform}.`,
          network: platform,
          posterUrl: show.poster_url ?? undefined,
          date: dateStr,
          isAuto: true,
        });
      }
    }
  }

  // 3. Obtener nuevas series confirmadas / próximos estrenos desde TMDB (si hay API Key configurada)
  const tmdbKey = import.meta.env.VITE_TMDB_API_KEY;
  if (tmdbKey) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(
        `https://api.themoviedb.org/3/discover/tv?api_key=${tmdbKey}&language=es-ES&sort_by=popularity.desc&first_air_date.gte=${today}&page=1`
      );
      if (res.ok) {
        const tmdbJson = await res.json();
        const upcoming = (tmdbJson.results ?? []).slice(0, 12);

        for (const item of upcoming) {
          if (!item.name) continue;
          if (manualNews.some((m) => m.title.toLowerCase() === item.name.toLowerCase())) continue;

          autoNews.push({
            id: `auto-tmdb-${item.id}`,
            showId: null,
            title: item.name,
            category: 'announced',
            headline: item.overview
              ? item.overview
              : `Estreno confirmado próximamente (${item.first_air_date || 'Fecha por anunciar'}).`,
            network: 'Próximo estreno',
            posterUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : undefined,
            date: item.first_air_date || today,
            isAuto: true,
          });
        }
      }
    } catch {
      // Si falla la red externa, continúa mostrando el resto sin romper nada
    }
  }

  return [...manualNews, ...autoNews];
}

export async function saveSeriesNews(items: SeriesNewsItem[]): Promise<void> {
  // Guardamos solo las manuales en app_settings para no saturar la base de datos con las automáticas
  const manualOnly = items.filter((item) => !item.isAuto);
  const { error } = await supabase
    .from('app_settings')
    .upsert({ key: NEWS_SETTING_KEY, value: JSON.stringify(manualOnly) }, { onConflict: 'key' });

  if (error) throw new Error(error.message);
}