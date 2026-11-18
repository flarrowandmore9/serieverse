import { supabase } from '@/lib/supabase';

export type NewsCategory = 'renewed' | 'canceled' | 'announced';

export type SeriesNewsItem = {
  id: string;
  showId?: number | null;
  title: string;
  category: NewsCategory;
  headline: string;
  network: string;
  posterUrl?: string;
  date: string;
  link?: string;
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

  // 2. Obtener noticias reales y recientes mediante un agregador público de feeds de TV
  const autoNews: SeriesNewsItem[] = [];
  try {
    // Usamos un servicio público seguro para parsear noticias de entretenimiento de la temporada
    const res = await fetch('https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fdeadline.com%2Ftag%2Ftv-renewals%2Ffeed%2F');
    if (res.ok) {
      const data = await res.json();
      if (data.items && Array.isArray(data.items)) {
        for (const item of data.items) {
          const titleText = (item.title || '').toLowerCase();
          const contentSnippet = (item.description || '').replace(/<[^>]*>/g, '');

          // Detectar categoría según palabras clave en el titular oficial
          let category: NewsCategory = 'renewed';
          if (titleText.includes('cancel') || titleText.includes('ended') || titleText.includes('axed')) {
            category = 'canceled';
          } else if (titleText.includes('pilot') || titleText.includes('ordered') || titleText.includes('greenlight') || titleText.includes('new series')) {
            category = 'announced';
          }

          // Extraer fecha limpia
          const pubDate = item.pubDate ? item.pubDate.split(' ')[0] : new Date().toISOString().split('T')[0];

          autoNews.push({
            id: `rss-${item.guid || Math.random()}`,
            showId: null,
            title: item.title || 'Actualidad de Series',
            category,
            headline: contentSnippet.slice(0, 160) + '...',
            network: 'Deadline / TV News',
            posterUrl: item.thumbnail || undefined,
            date: pubDate,
            link: item.link,
            isAuto: true,
          });
        }
      }
    }
  } catch {
    // Si la red externa no responde, la app sigue funcionando con las manuales sin inmutarse
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