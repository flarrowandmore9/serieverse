import { supabase } from '@/lib/supabase';

export type NewsCategory = 'renewed' | 'canceled' | 'new_2026' | 'upcoming';

export type SeriesNewsItem = {
  id: string;
  showId?: number | null;
  title: string;
  category: NewsCategory;
  headline: string;
  network: string;
  posterUrl?: string;
  date: string;
  isAuto?: boolean;
};

const NEWS_SETTING_KEY = 'series_news';
const CURRENT_YEAR = new Date().getFullYear(); // 2026

export async function fetchSeriesNews(): Promise<SeriesNewsItem[]> {
  // 1. Noticias publicadas manualmente por ti (siempre tienen prioridad arriba del todo)
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

  const autoNews: SeriesNewsItem[] = [];

  // 2. Filtrar series de tu catálogo con actividad real en 2026 (o temporada 2025-2026)
  const { data: catalogShows } = await supabase
    .from('shows')
    .select('id, title, tv_status, poster_url, network_name, es_platforms, us_platforms, premiered, ended')
    .limit(300);

  if (catalogShows) {
    for (const show of catalogShows) {
      if (manualNews.some((m) => m.showId === show.id || m.title.toLowerCase() === show.title.toLowerCase())) {
        continue;
      }

      const status = (show.tv_status ?? '').toLowerCase();
      const platform = show.es_platforms?.[0] || show.us_platforms?.[0] || show.network_name || 'Otras plataformas';
      const premieredYear = show.premiered ? Number(show.premiered.slice(0, 4)) : null;
      const endedYear = show.ended ? Number(show.ended.slice(0, 4)) : null;

      // A) Canceladas / Terminadas ESTE AÑO (2026)
      if ((status.includes('cancel') || status === 'ended') && endedYear === CURRENT_YEAR) {
        autoNews.push({
          id: `auto-cancel-${show.id}`,
          showId: show.id,
          title: show.title,
          category: 'canceled',
          headline: `Cancelada o finalizada oficialmente en ${CURRENT_YEAR} (${platform}).`,
          network: platform,
          posterUrl: show.poster_url ?? undefined,
          date: show.ended || `${CURRENT_YEAR}-01-01`,
          isAuto: true,
        });
      }
      // B) Nuevas series estrenadas en 2026
      else if (premieredYear === CURRENT_YEAR && (status === 'running' || status.includes('returning') || status.includes('development'))) {
        autoNews.push({
          id: `auto-new-${show.id}`,
          showId: show.id,
          title: show.title,
          category: 'new_2026',
          headline: `Nueva serie estrenada en ${CURRENT_YEAR} a través de ${platform}.`,
          network: platform,
          posterUrl: show.poster_url ?? undefined,
          date: show.premiered || `${CURRENT_YEAR}-01-01`,
          isAuto: true,
        });
      }
      // C) Renovadas / En emisión activa en 2026 (excluye series veteranas paradas)
      else if ((status === 'running' || status.includes('returning')) && (!endedYear || endedYear >= CURRENT_YEAR)) {
        autoNews.push({
          id: `auto-renew-${show.id}`,
          showId: show.id,
          title: show.title,
          category: 'renewed',
          headline: `Renovada / En emisión oficial durante la temporada ${CURRENT_YEAR} en ${platform}.`,
          network: platform,
          posterUrl: show.poster_url ?? undefined,
          date: show.premiered || `${CURRENT_YEAR}-01-01`,
          isAuto: true,
        });
      }
    }
  }

  // 3. Nuevas series anunciadas para estrenarse más adelante (2027 en adelante) desde TMDB
  const tmdbKey = import.meta.env.VITE_TMDB_API_KEY;
  if (tmdbKey) {
    try {
      const nextYearStart = `${CURRENT_YEAR + 1}-01-01`;
      const res = await fetch(
        `https://api.themoviedb.org/3/discover/tv?api_key=${tmdbKey}&language=es-ES&sort_by=popularity.desc&first_air_date.gte=${nextYearStart}&page=1`
      );
      if (res.ok) {
        const tmdbJson = await res.json();
        const upcoming = (tmdbJson.results ?? []).slice(0, 12);

        for (const item of upcoming) {
          if (!item.name) continue;
          if (manualNews.some((m) => m.title.toLowerCase() === item.name.toLowerCase())) continue;

          autoNews.push({
            id: `auto-upcoming-${item.id}`,
            showId: null,
            title: item.name,
            category: 'upcoming',
            headline: item.overview || `Anunciada oficialmente. Estreno previsto a partir de ${CURRENT_YEAR + 1}.`,
            network: 'Estreno futuro',
            posterUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : undefined,
            date: item.first_air_date || nextYearStart,
            isAuto: true,
          });
        }
      }
    } catch {
      // Continuar sin bloquear si falla TMDB
    }
  }

  return [...manualNews, ...autoNews];
}

export async function saveSeriesNews(items: SeriesNewsItem[]): Promise<void> {
  const manualOnly = items.filter((item) => !item.isAuto);
  const { error } = await supabase
    .from('app_settings')
    .upsert({ key: NEWS_SETTING_KEY, value: JSON.stringify(manualOnly) }, { onConflict: 'key' });

  if (error) throw new Error(error.message);
}