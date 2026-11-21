import { supabase } from '@/lib/supabase';
import { normalizeList, normalizePlatformOrNetwork } from '@/lib/platforms';
import type { Character } from '@/lib/types';

export type SyncedEpisodePayload = {
  tvmaze_episode_id: number;
  show_id: number;
  season: number;
  number: number;
  name: string;
  airdate: string;
  runtime: number | null;
  episode_type: string;
  overview_es?: string | null;
};

export type SyncedShowData = {
  tvmaze_id: number | null;
  tmdb_id?: number | null;
  imdb_id?: string | null;
  title: string;
  synopsis_es: string | null;
  poster_url: string | null;
  rating: number | null;
  tv_status: string | null;
  premiered: string | null;
  genres: string | null;
  network_name: string | null;
  runtime: number | null;
  us_platforms: string[];
  es_platforms: string[];
  characters: Character[];
  episodes: Omit<SyncedEpisodePayload, 'show_id'>[];
};

const TMDB_PROVIDER_NAMES: Record<number, string> = {
  8: 'Netflix',
  119: 'Prime Video',
  337: 'Disney+',
  350: 'Apple TV',
  531: 'Paramount+',
  1773: 'SkyShowtime',
  149: 'Movistar Plus+',
  63: 'Filmin',
  384: 'HBO Max',
  15: 'Hulu',
  386: 'Peacock',
};



export async function fetchFromTmdbById(tmdbId: number): Promise<SyncedShowData> {
  const apiKey = import.meta.env.VITE_TMDB_API_KEY;
  if (!apiKey) throw new Error('Falta VITE_TMDB_API_KEY en el archivo .env');

  const url = `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${apiKey}&language=es-ES&append_to_response=credits,watch/providers,external_ids`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('No se encontró la serie en TMDB.');
  const data = await res.json();

  // Extraer plataformas en EE. UU. y España
  const results = data['watch/providers']?.results ?? {};
  const extractProviders = (region: 'US' | 'ES') => {
    const reg = results[region];
    if (!reg) return [];
    const raw = [...(reg.flatrate ?? []), ...(reg.ads ?? []), ...(reg.free ?? [])];
    return normalizeList(
      raw.map((p: any) => TMDB_PROVIDER_NAMES[p.provider_id] ?? p.provider_name),
    );
  };

  // Extraer reparto principal (máximo 12)
  const rawCast = data.credits?.cast ?? [];
  const characters: Character[] = rawCast.slice(0, 12).map((c: any) => ({
    actor: String(c.name ?? '').trim(),
    character: String(c.character ?? '').trim(),
    image: c.profile_path ? `https://image.tmdb.org/t/p/w300${c.profile_path}` : '',
  })).filter((c: Character) => c.actor);

  // Obtener todas las temporadas y sus episodios con sinopsis en español
  const seasons = Array.isArray(data.seasons)
    ? data.seasons.filter((s: any) => typeof s.season_number === 'number' && s.season_number > 0)
    : [];

  const episodes: Omit<SyncedEpisodePayload, 'show_id'>[] = [];
  for (const seasonInfo of seasons) {
    const seasonNum = seasonInfo.season_number;
    const sRes = await fetch(
      `https://api.themoviedb.org/3/tv/${tmdbId}/season/${seasonNum}?api_key=${apiKey}&language=es-ES`,
    );
    if (!sRes.ok) continue;
    const sData = await sRes.json();
    for (const ep of sData.episodes ?? []) {
      if (ep.episode_number == null || !ep.air_date) continue;
      // Generamos un ID numérico único estable si no viene de TVMaze
      const syntheticEpisodeId = Number(ep.id) || (tmdbId * 100000 + seasonNum * 1000 + Number(ep.episode_number));
      episodes.push({
        tvmaze_episode_id: syntheticEpisodeId,
        season: seasonNum,
        number: Number(ep.episode_number),
        name: ep.name ? String(ep.name) : `Episodio ${ep.episode_number}`,
        airdate: String(ep.air_date),
        runtime: ep.runtime ? Number(ep.runtime) : (data.episode_run_time?.[0] ?? null),
        episode_type: 'regular',
        overview_es: ep.overview ? String(ep.overview).trim() : null,
      });
    }
  }

  const rawNetwork = data.networks?.[0]?.name ?? null;

  return {
    tvmaze_id: null,
    tmdb_id: tmdbId,
    imdb_id: data.external_ids?.imdb_id ?? null,
    title: data.name ?? data.original_name ?? `Serie TMDB #${tmdbId}`,
    synopsis_es: data.overview ? String(data.overview).trim() : null,
    poster_url: data.poster_path ? `https://image.tmdb.org/t/p/original${data.poster_path}` : null,
    rating: data.vote_average ? Number(Number(data.vote_average).toFixed(1)) : null,
    tv_status: data.status ?? null,
    premiered: data.first_air_date ? String(data.first_air_date).split('T')[0] : null,
    genres: Array.isArray(data.genres) ? data.genres.map((g: any) => g.name).join(', ') : null,
    network_name: normalizePlatformOrNetwork(rawNetwork) ?? rawNetwork,
    runtime: data.episode_run_time?.[0] ? Number(data.episode_run_time[0]) : null,
    us_platforms: extractProviders('US'),
    es_platforms: extractProviders('ES'),
    characters,
    episodes,
  };
}

export async function fetchFromTvmazeById(tvmazeId: number): Promise<SyncedShowData> {
  const res = await fetch(`https://api.tvmaze.com/shows/${tvmazeId}?embed[]=episodes&embed[]=cast`);
  if (!res.ok) throw new Error('No se encontró la serie en TVMaze.');
  const data = await res.json();

  const rawNetwork = data.network?.name ?? data.webChannel?.name ?? null;
  const normalizedNet = normalizePlatformOrNetwork(rawNetwork) ?? rawNetwork;

  const rawCast = data._embedded?.cast ?? [];
  const characters: Character[] = rawCast.slice(0, 12).map((item: any) => ({
    actor: String(item.person?.name ?? '').trim(),
    character: String(item.character?.name ?? '').trim(),
    image: item.character?.image?.medium ?? item.person?.image?.medium ?? '',
  })).filter((c: Character) => c.actor);

  const rawEpisodes = data._embedded?.episodes ?? [];
  const episodes: Omit<SyncedEpisodePayload, 'show_id'>[] = rawEpisodes
    .filter((e: any) => e.season !== null && e.number !== null && e.airdate)
    .map((e: any) => ({
      tvmaze_episode_id: Number(e.id),
      season: Number(e.season),
      number: Number(e.number),
      name: e.name ? String(e.name) : `Episodio ${e.number}`,
      airdate: String(e.airdate),
      runtime: e.runtime ? Number(e.runtime) : null,
      episode_type: e.type ? String(e.type) : 'regular',
      overview_es: null,
    }));

  // Si la serie tiene imdb_id y hay clave de TMDB, intentamos enriquecer sinopsis en español y plataformas
  let synopsisEs = data.summary ? String(data.summary).replace(/<[^>]*>/g, '').trim() : null;
  let esPlatforms: string[] = [];
  let usPlatforms: string[] = normalizedNet ? [normalizedNet] : [];
  let tmdbId: number | null = null;

  const imdbId = data.externals?.imdb ?? null;
  const apiKey = import.meta.env.VITE_TMDB_API_KEY;
  if (imdbId && apiKey) {
    try {
      const findRes = await fetch(
        `https://api.themoviedb.org/3/find/${imdbId}?api_key=${apiKey}&external_source=imdb_id&language=es-ES`,
      );
      if (findRes.ok) {
        const findData = await findRes.json();
        const match = findData.tv_results?.[0];
        if (match?.id) {
          tmdbId = Number(match.id);
          const tmdbExtra = await fetchFromTmdbById(tmdbId);
          if (tmdbExtra.synopsis_es) synopsisEs = tmdbExtra.synopsis_es;
          if (tmdbExtra.es_platforms.length) esPlatforms = tmdbExtra.es_platforms;
          if (tmdbExtra.us_platforms.length) usPlatforms = normalizeList([...usPlatforms, ...tmdbExtra.us_platforms]);

          // Copiamos las sinopsis en español de los episodios que coincidan en temporada y número
          const esOverviewMap = new Map(
            tmdbExtra.episodes.map((ep) => [`${ep.season}-${ep.number}`, ep.overview_es]),
          );
          for (const ep of episodes) {
            const ov = esOverviewMap.get(`${ep.season}-${ep.number}`);
            if (ov) ep.overview_es = ov;
          }
        }
      }
    } catch {
      // Si falla el enriquecimiento opcional, seguimos con los datos de TVMaze
    }
  }

  return {
    tvmaze_id: tvmazeId,
    tmdb_id: tmdbId,
    imdb_id: imdbId,
    title: data.name ?? `Serie TVMaze #${tvmazeId}`,
    synopsis_es: synopsisEs,
    poster_url: data.image?.original ?? data.image?.medium ?? null,
    rating: data.rating?.average ? Number(data.rating.average) : null,
    tv_status: data.status ?? null,
    premiered: data.premiered ? String(data.premiered).split('T')[0] : null,
    genres: Array.isArray(data.genres) ? data.genres.join(', ') : null,
    network_name: normalizedNet,
    runtime: data.averageRuntime ?? data.runtime ?? null,
    us_platforms: usPlatforms,
    es_platforms: esPlatforms,
    characters,
    episodes,
  };
}

export async function saveSyncedEpisodes(
  showId: number,
  episodes: Omit<SyncedEpisodePayload, 'show_id'>[],
): Promise<{ savedToDb: boolean; total: number }> {
  if (!episodes.length) return { savedToDb: true, total: 0 };

  const rows = episodes.map((ep) => ({
    tvmaze_episode_id: ep.tvmaze_episode_id,
    show_id: showId,
    season: ep.season,
    number: ep.number,
    name: ep.name,
    airdate: ep.airdate,
    runtime: ep.runtime,
    episode_type: ep.episode_type,
  }));

  try {
    localStorage.setItem(`serieverse_synced_episodes_${showId}`, JSON.stringify(episodes));
  } catch {
    // Ignorar si no hay espacio local
  }

  try {
    for (let i = 0; i < rows.length; i += 100) {
      const batch = rows.slice(i, i + 100);
      const { error } = await supabase
        .from('episodes')
        .upsert(batch, { onConflict: 'tvmaze_episode_id' });
      if (error) throw new Error(error.message);
    }
    return { savedToDb: true, total: rows.length };
  } catch {
    return { savedToDb: false, total: rows.length };
  }
}