import { supabase } from '@/lib/supabase';
import type { Character, Episode, EpisodeRole, Profile, ShowListItem, SpecialTag, Suggestion, SuggestionStatus } from '@/lib/types';

export type ShowInput = {
  tvmaze_id: number | null;
  imdb_id: string | null;
  title: string;
  synopsis_es: string | null;
  us_platforms: string[];
  es_platforms: string[];
};

export type ShowPatch = {
  title: string;
  synopsis_es: string | null;
  us_platforms: string[];
  es_platforms: string[];
  tv_status: string | null;
  genres: string | null;
  network_name: string | null;
  poster_url: string | null;
  runtime: number | null;
  characters: Character[];
  is_miniseries: boolean;
};

export type EpisodePatch = {
  show_id?: number;
  season?: number;
  number?: number;
  name: string | null;
  airdate: string;
  runtime: number | null;
  episode_type?: string | null;
  role_override?: EpisodeRole | null;
  special_tag?: SpecialTag;
};

export type NewEpisodeInput = {
  show_id: number;
  season: number;
  number: number;
  name: string | null;
  airdate: string;
  runtime: number | null;
  episode_type: string | null;
  special_tag: SpecialTag;
};

const US_NETWORKS = new Set(
  [
    "The CW", "ABC", "NBC", "CBS", "FOX", "AMC", "FX", "Starz", "Freeform", "Showtime",
    "Netflix", "Prime Video", "HBO", "HBO Max", "Warner Bros.", "Disney+", "Disney", "Marvel", "Star Wars", "Hulu", "Apple TV", "Apple TV+", "Paramount", "Paramount+", "Paramount Network", "Peacock", "Universal",
  ].map((name) => name.toLowerCase()),
);

const ES_NETWORKS = new Set(
  [
    "RTVE", "TVE", "La 1", "La 2", "Antena 3", "A3Series", "Cuatro", "Telecinco", "La Sexta", "AXN", "FOX",
    "RTVE Play", "Atresmedia", "Atresplayer", "Atresplayer Premium", "Atresplayer Originals", "Atresmedia Televisión", "Mediaset", "Movistar Plus+", "SkyShowtime", "Filmin", "HBO España", "HBO Max España", "Disney+ España",
  ].map((name) => name.toLowerCase()),
);

export async function fetchAllProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Profile[];
}

export async function deleteUserAccount(userId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_delete_user', { target: userId });
  if (error) throw new Error(error.message);
}

export async function fetchSuggestions(): Promise<Suggestion[]> {
  const { data, error } = await supabase.from('suggestions').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Suggestion[];
}

export async function setSuggestionStatus(id: number, status: SuggestionStatus): Promise<void> {
  const { error } = await supabase.from('suggestions').update({ status }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteSuggestion(id: number): Promise<void> {
  const { error } = await supabase.from('suggestions').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function updateShow(id: number, patch: ShowPatch): Promise<ShowListItem> {
  const { data, error } = await supabase
    .from('shows')
    .update(patch)
    .eq('id', id)
    .select('id, tvmaze_id, title, poster_url, synopsis_es, genres, tv_status, premiered, rating, is_miniseries, imdb_id, network_name, us_platforms, es_platforms')
    .single();
  if (error) throw new Error(error.message);
  return data as ShowListItem;
}

export async function deleteShow(id: number): Promise<void> {
  const { error } = await supabase.from('shows').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function addShow(input: ShowInput): Promise<number> {
  const { data, error } = await supabase.from('shows').insert(input).select('id').single();
  if (error) throw new Error(error.message);
  return (data as { id: number }).id;
}

// NUEVA FUNCIÓN DIRECTA: Importa series desde TVMaze y las guarda en Supabase sin errores de servidor
export async function importTvmazeCatalogDirectly(fromPage: number = 0, toPage: number = 5) {
  let importedCount = 0;
  
  for (let page = fromPage; page <= toPage; page++) {
    try {
      const res = await fetch(`https://api.tvmaze.com/shows?page=${page}`);
      if (res.status === 404) break;
      if (!res.ok) continue;
      
      const shows = await res.json();
      const rowsToInsert = [];

      for (const show of shows) {
        const type = (show.type ?? "").toLowerCase();
        if (type !== "scripted" && type !== "animation") continue;

        const source = show.network ?? show.webChannel;
        const name = source?.name ?? null;
        const countryCode = source?.country?.code ?? null;
        const key = name?.toLowerCase() ?? "";

        const isEs = name !== null && (ES_NETWORKS.has(key) || countryCode === "ES");
        const isUs = name !== null && US_NETWORKS.has(key) && !isEs;

        if (!isUs && !isEs) continue;

        const cleanSummary = show.summary ? show.summary.replace(/<[^>]*>/g, "") : null;

        rowsToInsert.push({
          tvmaze_id: show.id,
          title: show.name,
          tv_type: show.type,
          tv_status: show.status,
          premiered: show.premiered,
          ended: show.ended,
          rating: show.rating?.average ?? null,
          runtime: show.averageRuntime ?? show.runtime ?? null,
          network_name: name,
          genres: (show.genres ?? []).join(", ") || null,
          poster_url: show.image?.original ?? show.image?.medium ?? null,
          synopsis_source: cleanSummary,
          us_platforms: isUs ? [name] : [],
          es_platforms: isEs ? [name] : [],
        });
      }

      if (rowsToInsert.length > 0) {
        const { error } = await supabase.from('shows').upsert(rowsToInsert, { onConflict: 'tvmaze_id' });
        if (!error) {
          importedCount += rowsToInsert.length;
        } else {
          console.error(`Error en página ${page}:`, error.message);
        }
      }

      // Pequeña pausa para no saturar la API de TVMaze
      await new Promise(r => setTimeout(r, 600));
    } catch (err) {
      console.error(`Fallo en página ${page}:`, err);
    }
  }

  return { success: true, importedCount };
}

export async function fetchEpisodesForAdmin(showId: number): Promise<Episode[]> {
  const { data, error } = await supabase
    .from('episodes')
    .select('tvmaze_episode_id, show_id, season, number, name, airdate, runtime, episode_type, role_override, special_tag')
    .eq('show_id', showId)
    .order('season', { ascending: true })
    .order('number', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Episode[];
}

export async function updateEpisode(episodeId: number, patch: EpisodePatch): Promise<void> {
  const { data, error } = await supabase
    .from('episodes')
    .update(patch)
    .eq('tvmaze_episode_id', episodeId)
    .select('tvmaze_episode_id');
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error('No se actualizó ningún episodio.');
}

export async function addEpisode(input: NewEpisodeInput): Promise<number> {
  const { data, error } = await supabase.rpc('admin_add_episode', {
    p_show_id: input.show_id,
    p_season: input.season,
    p_number: input.number,
    p_name: input.name,
    p_airdate: input.airdate,
    p_runtime: input.runtime,
    p_episode_type: input.episode_type,
  });
  if (error) throw new Error(error.message);
  return data as number;
}

export async function deleteEpisode(episodeId: number): Promise<void> {
  const { error } = await supabase.from('episodes').delete().eq('tvmaze_episode_id', episodeId);
  if (error) throw new Error(error.message);
}

export type AppSetting = { key: string; value: string };

export async function fetchAppSettings(): Promise<Record<string, string>> {
  const { data, error } = await supabase.from('app_settings').select('key, value');
  if (error) throw new Error(error.message);
  return Object.fromEntries((data as AppSetting[] ?? []).map((row) => [row.key, row.value]));
}

export async function upsertAppSetting(key: string, value: string): Promise<void> {
  const { error } = await supabase
    .from('app_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) throw new Error(error.message);
}