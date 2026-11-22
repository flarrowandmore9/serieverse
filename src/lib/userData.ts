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

export async function fetchWatchedState(showId: number): Promise<{ watchedEpisodeIds: Set<number>; isShowWatched: boolean }> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    return { watchedEpisodeIds: new Set(), isShowWatched: false };
  }

  const [epRes, showRes] = await Promise.all([
    supabase.from('user_watched_episodes').select('tvmaze_episode_id').eq('show_id', showId),
    supabase.from('user_watched_shows').select('show_id').eq('show_id', showId).maybeSingle(),
  ]);

  const watchedEpisodeIds = new Set<number>(
    ((epRes.data ?? []) as { tvmaze_episode_id: number }[]).map((r) => r.tvmaze_episode_id),
  );
  return {
    watchedEpisodeIds,
    isShowWatched: Boolean(showRes.data),
  };
}

export async function toggleEpisodeWatched(showId: number, episodeId: number, watched: boolean): Promise<void> {
  if (watched) {
    const { error } = await supabase
      .from('user_watched_episodes')
      .upsert({ show_id: showId, tvmaze_episode_id: episodeId }, { onConflict: 'user_id,tvmaze_episode_id' });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from('user_watched_episodes')
      .delete()
      .eq('tvmaze_episode_id', episodeId);
    if (error) throw new Error(error.message);
  }
}

export async function toggleSeasonWatched(showId: number, episodeIds: number[], watched: boolean): Promise<void> {
  if (episodeIds.length === 0) return;
  if (watched) {
    const rows = episodeIds.map((id) => ({ show_id: showId, tvmaze_episode_id: id }));
    const { error } = await supabase
      .from('user_watched_episodes')
      .upsert(rows, { onConflict: 'user_id,tvmaze_episode_id' });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from('user_watched_episodes')
      .delete()
      .in('tvmaze_episode_id', episodeIds);
    if (error) throw new Error(error.message);
  }
}

export async function toggleShowWatched(showId: number, allEpisodeIds: number[], watched: boolean): Promise<void> {
  if (watched) {
    const { error } = await supabase
      .from('user_watched_shows')
      .upsert({ show_id: showId }, { onConflict: 'user_id,show_id' });
    if (error) throw new Error(error.message);
    await toggleSeasonWatched(showId, allEpisodeIds, true);
  } else {
    const { error } = await supabase
      .from('user_watched_shows')
      .delete()
      .eq('show_id', showId);
    if (error) throw new Error(error.message);
    await toggleSeasonWatched(showId, allEpisodeIds, false);
  }
}

export type WatchedState = {
  episodeIds: number[];
  showWatched: boolean;
};

const LOCAL_EPISODES_KEY = 'serieverse_watched_episodes_v1';
const LOCAL_SHOWS_KEY = 'serieverse_watched_shows_v1';

function readLocalSet(key: string): Set<number> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = JSON.parse(localStorage.getItem(key) || '[]');
    return new Set(Array.isArray(raw) ? raw.map(Number).filter(Number.isFinite) : []);
  } catch {
    return new Set();
  }
}

function writeLocalSet(key: string, values: Set<number>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify([...values]));
  } catch {
    // Ignorar errores de cuota
  }
}

export async function fetchWatchedState(showId: number): Promise<WatchedState> {
  const localEp = readLocalSet(LOCAL_EPISODES_KEY);
  const localShows = readLocalSet(LOCAL_SHOWS_KEY);

  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) {
      return { episodeIds: [...localEp], showWatched: localShows.has(showId) };
    }

    const [epRes, showRes] = await Promise.all([
      supabase
        .from('user_watched_episodes')
        .select('tvmaze_episode_id')
        .eq('user_id', userId)
        .eq('show_id', showId),
      supabase
        .from('user_watched_shows')
        .select('show_id')
        .eq('user_id', userId)
        .eq('show_id', showId)
        .maybeSingle(),
    ]);

    if (epRes.error || showRes.error) {
      return { episodeIds: [...localEp], showWatched: localShows.has(showId) };
    }

    const dbEpIds = (epRes.data ?? []).map((r: { tvmaze_episode_id: number }) => r.tvmaze_episode_id);
    const merged = new Set<number>([...dbEpIds, ...localEp]);
    return {
      episodeIds: [...merged],
      showWatched: Boolean(showRes.data) || localShows.has(showId),
    };
  } catch {
    return { episodeIds: [...localEp], showWatched: localShows.has(showId) };
  }
}

export async function toggleEpisodeWatched(
  showId: number,
  episodeId: number,
  nextWatched: boolean,
): Promise<void> {
  const localEp = readLocalSet(LOCAL_EPISODES_KEY);
  if (nextWatched) localEp.add(episodeId);
  else localEp.delete(episodeId);
  writeLocalSet(LOCAL_EPISODES_KEY, localEp);

  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return;

    if (nextWatched) {
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
    // Mantiene el estado local aunque no haya sesión o tabla remota
  }
}

export async function toggleSeasonWatched(
  showId: number,
  episodeIds: number[],
  markAllWatched: boolean,
): Promise<void> {
  const localEp = readLocalSet(LOCAL_EPISODES_KEY);
  for (const id of episodeIds) {
    if (markAllWatched) localEp.add(id);
    else localEp.delete(id);
  }
  writeLocalSet(LOCAL_EPISODES_KEY, localEp);

  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId || episodeIds.length === 0) return;

    if (markAllWatched) {
      const rows = episodeIds.map((tvmaze_episode_id) => ({
        user_id: userId,
        show_id: showId,
        tvmaze_episode_id,
      }));
      await supabase.from('user_watched_episodes').upsert(rows, { onConflict: 'user_id,tvmaze_episode_id' });
    } else {
      await supabase
        .from('user_watched_episodes')
        .delete()
        .eq('user_id', userId)
        .in('tvmaze_episode_id', episodeIds);
    }
  } catch {
    // Mantiene el estado local
  }
}