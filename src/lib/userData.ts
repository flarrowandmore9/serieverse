import { supabase } from '@/lib/supabase';
import type { ListEntry, ListMembership } from '@/lib/types';

export async function fetchFolders(): Promise<string[]> {
  const { data, error } = await supabase.from('user_folders').select('name').order('created_at');
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => row.name as string);
}

export async function createFolder(name: string): Promise<void> {
  const { error } = await supabase.from('user_folders').insert({ name });
  if (error) throw new Error(error.message);
}

export async function deleteFolder(name: string): Promise<void> {
  if (name === 'Favoritas') {
    throw new Error('La carpeta Favoritas no se puede eliminar.');
  }
  const { error } = await supabase.from('user_folders').delete().eq('name', name);
  if (error) throw new Error('Vacía la carpeta antes de eliminarla.');
}

export async function fetchListEntries(): Promise<ListEntry[]> {
  const { data, error } = await supabase
    .from('user_list_items')
    .select('id, folder, show:shows(id, title, poster_url, tv_status, us_platforms, es_platforms)')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ListEntry[];
}

export async function fetchListMembership(showId: number): Promise<ListMembership | null> {
  const { data, error } = await supabase
    .from('user_list_items')
    .select('id, folder')
    .eq('show_id', showId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as ListMembership | null;
}

export async function addToList(showId: number, folder: string): Promise<ListMembership> {
  const { data, error } = await supabase
    .from('user_list_items')
    .insert({ show_id: showId, folder })
    .select('id, folder')
    .single();
  if (error) throw new Error(error.message);
  return data as ListMembership;
}

export async function moveListItem(itemId: number, folder: string): Promise<void> {
  const { error } = await supabase.from('user_list_items').update({ folder }).eq('id', itemId);
  if (error) throw new Error(error.message);
}

export async function removeListItem(itemId: number): Promise<void> {
  const { error } = await supabase.from('user_list_items').delete().eq('id', itemId);
  if (error) throw new Error(error.message);
}

export async function submitSuggestion(input: { name: string; email: string; message: string }): Promise<void> {
  const { error } = await supabase.from('suggestions').insert({
    name: input.name,
    email: input.email || null,
    message: input.message,
  });
  if (error) throw new Error(error.message);
}

export async function updateOwnProfile(userId: string, patch: { name: string; avatar_url: string | null }) {
  const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
  if (error) throw new Error(error.message);
}

export async function deleteOwnAccount(): Promise<void> {
  const { error } = await supabase.rpc('delete_my_account');
  if (error) throw new Error(error.message);
}

export type WatchedState = {
  episodeIds: number[];
  showWatched: boolean;
  isAuthenticated: boolean;
};

const EP_KEY = 'serieverse_watched_episodes_v1';
const SHOW_KEY = 'serieverse_watched_shows_v1';

function readIds(key: string): Set<number> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = JSON.parse(localStorage.getItem(key) || '[]');
    return new Set(Array.isArray(raw) ? raw.map(Number).filter(Number.isFinite) : []);
  } catch {
    return new Set();
  }
}

function writeIds(key: string, set: Set<number>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify([...set]));
  } catch {
    // Ignorar
  }
}

export async function fetchWatchedState(showId: number): Promise<WatchedState> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) {
    return { episodeIds: [], showWatched: false, isAuthenticated: false };
  }

  try {
    const [epRes, showRes] = await Promise.all([
      supabase.from('user_watched_episodes').select('tvmaze_episode_id').eq('user_id', userId).eq('show_id', showId),
      supabase.from('user_watched_shows').select('show_id').eq('user_id', userId).eq('show_id', showId).maybeSingle(),
    ]);

    const dbEp = (epRes.data ?? []).map((r: { tvmaze_episode_id: number }) => r.tvmaze_episode_id);
    return {
      episodeIds: epRes.error ? [] : dbEp,
      showWatched: showRes.error ? false : Boolean(showRes.data),
      isAuthenticated: true,
    };
  } catch {
    return {
      episodeIds: [],
      showWatched: false,
      isAuthenticated: true,
    };
  }
}

export async function toggleEpisodeWatched(showId: number, episodeId: number, watched: boolean): Promise<boolean> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) return false;

  const localEp = readIds(EP_KEY);
  if (watched) localEp.add(episodeId);
  else localEp.delete(episodeId);
  writeIds(EP_KEY, localEp);

  try {
    if (watched) {
      await supabase
        .from('user_watched_episodes')
        .upsert({ user_id: userId, show_id: showId, tvmaze_episode_id: episodeId }, { onConflict: 'user_id,tvmaze_episode_id' });
    } else {
      await supabase
        .from('user_watched_episodes')
        .delete()
        .eq('user_id', userId)
        .eq('tvmaze_episode_id', episodeId);
    }
  } catch {
    // Mantiene estado local
  }
  return true;
}

export async function toggleSeasonWatched(showId: number, episodeIds: number[], watched: boolean): Promise<boolean> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId || episodeIds.length === 0) return false;

  const localEp = readIds(EP_KEY);
  for (const id of episodeIds) {
    if (watched) localEp.add(id);
    else localEp.delete(id);
  }
  writeIds(EP_KEY, localEp);

  try {
    if (watched) {
      const rows = episodeIds.map((tvmaze_episode_id) => ({ user_id: userId, show_id: showId, tvmaze_episode_id }));
      await supabase.from('user_watched_episodes').upsert(rows, { onConflict: 'user_id,tvmaze_episode_id' });
    } else {
      await supabase.from('user_watched_episodes').delete().eq('user_id', userId).in('tvmaze_episode_id', episodeIds);
    }
  } catch {
    // Mantiene estado local
  }
  return true;
}

export async function toggleShowWatched(showId: number, allEpisodeIds: number[], watched: boolean): Promise<boolean> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) return false;

  const localShows = readIds(SHOW_KEY);
  if (watched) localShows.add(showId);
  else localShows.delete(showId);
  writeIds(SHOW_KEY, localShows);

  await toggleSeasonWatched(showId, allEpisodeIds, watched);

  try {
    if (watched) {
      await supabase.from('user_watched_shows').upsert({ user_id: userId, show_id: showId }, { onConflict: 'user_id,show_id' });
    } else {
      await supabase.from('user_watched_shows').delete().eq('user_id', userId).eq('show_id', showId);
    }
  } catch {
    // Mantiene estado local
  }
  return true;
}

