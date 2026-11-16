import { FUNCTIONS_URL, SUPABASE_ANON_KEY, supabase } from '@/lib/supabase';
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
  tvmaze_id?: number | null;
  rating?: number | null;
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

export async function updateShow(id: number, patch: any): Promise<ShowListItem> {
  const cleanPatch = { ...patch };
  // Eliminamos campos que puedan no existir en la tabla de Supabase para evitar que falle el guardado
  delete cleanPatch.show_type;

  const { data, error } = await supabase
    .from('shows')
    .update(cleanPatch)
    .eq('id', id)
    .select('id, tvmaze_id, title, poster_url, synopsis_es, genres, tv_status, premiered, rating, network_name, us_platforms, es_platforms')
    .single();
    
  if (error) {
    console.error("Error detallado al actualizar:", error.message);
    throw new Error(error.message);
  }
  return data as ShowListItem;
}
export async function deleteShow(id: number): Promise<void> {
  const { error } = await supabase.from('shows').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function addShow(showData: {
  tvmaze_id?: number | null;
  tmdb_id?: number | null;
  title: string;
  tv_type?: string;
  synopsis_es?: string | null;
  us_platforms?: string[];
  es_platforms?: string[];
}) {
  let extraData: any = {};
  let episodesToInsert: any[] = [];

  if (showData.tvmaze_id) {
    try {
      const res = await fetch(`https://api.tvmaze.com/shows/${showData.tvmaze_id}?embed[]=episodes&embed[]=cast`);
      if (res.ok) {
        const data = await res.json();
        const networkName = data.network?.name ?? data.webChannel?.name ?? null;
        
        extraData = {
          title: data.name || showData.title,
          synopsis_es: data.summary ? data.summary.replace(/<[^>]*>/g, '').trim() : null,
          poster_url: data.image?.original ?? data.image?.medium ?? null,
          rating: data.rating?.average ?? null,
          tv_status: data.status ?? null,
          premiered: data.premiered ?? null,
          genres: data.genres?.join(', ') || null,
          network_name: networkName,
          runtime: data.averageRuntime ?? data.runtime ?? null,
          characters: (data._embedded?.cast ?? []).slice(0, 12).map((c: any) => ({
            actor: c.person?.name,
            character: c.character?.name,
            image: c.character?.image?.medium
          })).filter((c: any) => c.actor),
        };

        const rawEpisodes = data._embedded?.episodes ?? [];
        episodesToInsert = rawEpisodes
          .filter((e: any) => e.season !== null && e.number !== null && e.airdate)
          .map((e: any) => ({
            tvmaze_episode_id: Number(e.id),
            season: Number(e.season),
            number: Number(e.number),
            name: e.name ? String(e.name) : `Episodio ${e.number}`,
            airdate: String(e.airdate),
            runtime: e.runtime ? Number(e.runtime) : null,
            episode_type: e.type ? String(e.type) : 'regular',
          }));
      }
    } catch (err) {
      console.error("Error al obtener episodios externos:", err);
    }
  }

  const { tmdb_id, ...safeShowData } = showData;

  const { data, error } = await supabase
    .from('shows')
    .insert([{
      ...safeShowData,
      ...extraData,
      tv_type: 'scripted',
      tv_synced_at: new Date().toISOString(),
    }])
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Inserción segura de episodios con bucle individual o por lotes limpios
  if (episodesToInsert.length > 0 && data?.id) {
    const episodesWithShowId = episodesToInsert.map(e => ({ ...e, show_id: data.id }));
    
    // Insertamos en bloques de 100 para evitar saturar la tabla
    for (let i = 0; i < episodesWithShowId.length; i += 100) {
      const batch = episodesWithShowId.slice(i, i + 100);
      await supabase.from('episodes').upsert(batch, { onConflict: 'tvmaze_episode_id' });
    }
  }

  return data;
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

export async function triggerCatalogSync(): Promise<void> {
  const response = await fetch(`${FUNCTIONS_URL}/sync-catalog`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ mode: 'sync', force: true }),
  });

  if (!response.ok) {
    throw new Error('No se pudo sincronizar el catálogo.');
  }
}