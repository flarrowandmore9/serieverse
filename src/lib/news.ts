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
};

const NEWS_SETTING_KEY = 'series_news';

export async function fetchSeriesNews(): Promise<SeriesNewsItem[]> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', NEWS_SETTING_KEY)
    .maybeSingle();

  if (error || !data?.value) return [];
  try {
    const parsed = JSON.parse(data.value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveSeriesNews(items: SeriesNewsItem[]): Promise<void> {
  const { error } = await supabase
    .from('app_settings')
    .upsert({ key: NEWS_SETTING_KEY, value: JSON.stringify(items) }, { onConflict: 'key' });

  if (error) throw new Error(error.message);
}