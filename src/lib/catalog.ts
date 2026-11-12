import { supabase } from '@/lib/supabase';
import type { CalendarEpisode, Episode, EpisodeRole, Show, ShowListItem, SpecialTag } from '@/lib/types';

const LIST_COLUMNS =
  'id, tvmaze_id, title, poster_url, synopsis_es, genres, tv_status, premiered, rating, is_miniseries, imdb_id, network_name, us_platforms, es_platforms';

export type CatalogSort = 'all' | 'popular' | 'recent' | 'visited';

export type CatalogQuery = {
  search: string;
  genre: string;
  sort: CatalogSort;
};

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export async function fetchCatalog({ search, genre, sort }: CatalogQuery, limit: number): Promise<ShowListItem[]> {
  let query = supabase.from('shows').select(LIST_COLUMNS);
  const term = search.trim();
  if (term) query = query.ilike('title', `%${escapeLike(term)}%`);
  if (genre) query = query.ilike('genres', `%${escapeLike(genre)}%`);

  if (sort === 'recent') query = query.order('created_at', { ascending: false });
  else if (sort === 'visited') query = query.order('views_count', { ascending: false });
  else if (sort === 'popular') query = query.order('rating', { ascending: false, nullsFirst: false });

  const { data, error } = await query.order('title').limit(limit);
  if (error) throw new Error(error.message);
  
  console.log("Series encontradas en Supabase:", data); // <-- Añade esto
  return (data ?? []) as ShowListItem[];
}

export async function registerShowView(showId: number): Promise<void> {
  const { error } = await supabase.rpc('register_show_view', { p_show_id: showId });
  if (error) throw new Error(error.message);
}

export async function fetchShow(showId: number): Promise<Show | null> {
  const { data, error } = await supabase.from('shows').select('*').eq('id', showId).maybeSingle();
  if (error) throw new Error(error.message);
  return data as Show | null;
}

export async function fetchEpisodes(showId: number): Promise<Episode[]> {
  const { data, error } = await supabase
    .from('episodes')
    .select('tvmaze_episode_id, season, number, name, airdate, runtime, episode_type, role_override, special_tag')
    .eq('show_id', showId)
    .order('season')
    .order('number');
  if (error) throw new Error(error.message);
  return (data ?? []) as Episode[];
}

export async function fetchShowsForPlatform(platforms: string[], scope: 'us' | 'es'): Promise<ShowListItem[]> {
  const column = scope === 'us' ? 'us_platforms' : 'es_platforms';
  const { data, error } = await supabase
    .from('shows')
    .select(LIST_COLUMNS)
    .overlaps(column, platforms)
    .order('title');
  if (error) throw new Error(error.message);
  return (data ?? []) as ShowListItem[];
}

export async function fetchPlatformOptions(): Promise<{ us: string[]; es: string[] }> {
  const { data, error } = await supabase.from('shows').select('us_platforms, es_platforms');
  if (error) throw new Error(error.message);

  const us = new Set<string>();
  const es = new Set<string>();
  for (const row of (data ?? []) as { us_platforms: string[]; es_platforms: string[] }[]) {
    row.us_platforms.forEach((name) => us.add(name));
    row.es_platforms.forEach((name) => es.add(name));
  }
  return {
    us: [...us].sort((a, b) => a.localeCompare(b, 'es')),
    es: [...es].sort((a, b) => a.localeCompare(b, 'es')),
  };
}

export async function fetchCalendarEpisodes(start: string, end: string): Promise<CalendarEpisode[]> {
  const { data, error } = await supabase
    .from('episodes')
    .select(
      'tvmaze_episode_id, season, number, name, airdate, runtime, role_override, special_tag, show:shows!inner(id, title, poster_url, tv_status)',
    )
    .gte('airdate', start)
    .lte('airdate', end)
    .order('airdate')
    .order('season')
    .order('number');
  if (error) throw new Error(error.message);
  const episodes = (data ?? []) as unknown as Omit<CalendarEpisode, 'role'>[];
  if (episodes.length === 0) return [];

  const { data: roles, error: roleError } = await supabase
    .from('episode_roles')
    .select('tvmaze_episode_id, episode_role')
    .in(
      'tvmaze_episode_id',
      episodes.map((episode) => episode.tvmaze_episode_id),
    );
  if (roleError) throw new Error(roleError.message);

  const roleById = new Map(
    ((roles ?? []) as { tvmaze_episode_id: number; episode_role: EpisodeRole }[]).map((row) => [row.tvmaze_episode_id, row.episode_role]),
  );
  return episodes.map((episode) => ({ ...episode, role: roleById.get(episode.tvmaze_episode_id) ?? 'regular' }));
}

export const SPECIAL_TAG_LABELS: Record<NonNullable<SpecialTag>, string> = {
  crossover: 'Crossover',
  halloween: 'Halloween',
  christmas: 'Navidad',
  special: 'Especial',
};

export const SPECIAL_TAG_STYLES: Record<NonNullable<SpecialTag>, string> = {
  crossover: 'mt-1 ml-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold bg-indigo-100 text-neutral-800 dark:bg-indigo-900/60 dark:text-indigo-100',
  halloween: 'mt-1 ml-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold bg-zinc-100 text-neutral-800 dark:bg-zinc-900/60 dark:text-black-100',
  christmas: 'mt-1 ml-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-100',
  special: 'mt-1 ml-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold bg-sky-100 text-teal-800 dark:bg-sky-900/60 dark:text-teal-100',
};
