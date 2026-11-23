import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { normalizeList, normalizePlatformOrNetwork } from '../../../src/lib/platforms.ts';

const TMDB_PROVIDER_MAP: Record<number, string> = {
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

export async function fetchTmdbWatchProviders(tmdbId: number, apiKey: string) {
  const url = `https://api.themoviedb.org/3/tv/${tmdbId}/watch/providers?api_key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) return { us: [] as string[], es: [] as string[] };
  const json = await res.json();
  const results = json?.results ?? {};

  const extractRegion = (regionCode: string) => {
    const region = results[regionCode];
    if (!region) return [];
    const bucket = [
      ...(region.flatrate ?? []),
      ...(region.ads ?? []),
      ...(region.free ?? []),
    ];
    const names: string[] = [];
    for (const provider of bucket) {
      const mapped = TMDB_PROVIDER_MAP[provider.provider_id] ?? provider.provider_name;
      const norm = normalizePlatformOrNetwork(mapped);
      if (norm) names.push(norm);
    }
    return names;
  };

  return {
    us: normalizeList(extractRegion('US')),
    es: normalizeList(extractRegion('ES')),
  };
}

export async function discoverTmdbShowsByRegion(
  apiKey: string,
  region: 'ES' | 'US',
  pages = 3,
) {
  const collected: any[] = [];
  for (let page = 1; page <= pages; page++) {
    const url = `https://api.themoviedb.org/3/discover/tv?api_key=${apiKey}&language=es-ES&watch_region=${region}&sort_by=popularity.desc&page=${page}`;
    const res = await fetch(url);
    if (!res.ok) break;
    const data = await res.json();
    if (Array.isArray(data.results)) {
      collected.push(...data.results);
    }
  }
  return collected;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const TVMAZE = "https://api.tvmaze.com";
const TMDB_API = "https://api.themoviedb.org/3";
const STALE_AFTER_MS = 20 * 60 * 60 * 1000;
const TIME_BUDGET_MS = 90_000;
const REQUEST_SPACING_MS = 550;
const MAX_PAGES_PER_DISCOVER = 80;
const BATCH_SIZE = 500;

// Lista ampliada con TODAS tus cadenas y plataformas de EE.UU. y España
const US_NETWORKS = new Set(
  [
    "The CW", "ABC", "NBC", "CBS", "FOX", "AMC", "FX", "Starz", "Freeform", "Showtime",
    "Netflix", "Prime Video", "Amazon", "HBO", "HBO Max", "Max", "Warner Bros.", "Disney+", 
    "Disney", "Marvel", "Star Wars", "Hulu", "Apple TV", "Apple TV+", "Paramount", 
    "Paramount+", "Paramount Network", "Peacock", "Universal", "Epix", "MGM+",
  ].map((name) => name.toLowerCase()),
);

const ES_NETWORKS = new Set(
  [
    "RTVE", "TVE", "La 1", "La 2", "Antena 3", "A3Series", "Cuatro", "Telecinco", "La Sexta", "AXN", "FOX",
    "RTVE Play", "Atresmedia", "Atresplayer", "Atresplayer Premium", "Atresplayer Originals", "Atresmedia Televisión", 
    "Mediaset", "Movistar+", "Movistar Plus+", "Movistar Plus", "Movistar", "SkyShowtime", "Filmin", 
    "HBO España", "HBO Max España", "Disney+ España", "Amazon Prime Video España",
  ].map((name) => name.toLowerCase()),
);

const SERIES_TYPES = new Set(["scripted", "animation"]);

type CastMember = {
  person: { name: string; image: { medium?: string } | null } | null;
  character: { name: string; image: { medium?: string } | null } | null;
};

type TvmazeEpisode = {
  id: number;
  season: number | null;
  number: number | null;
  name: string | null;
  airdate: string | null;
  runtime: number | null;
  type: string | null;
};

type TvmazeShow = {
  id: number;
  name: string;
  status: string | null;
  premiered: string | null;
  ended: string | null;
  rating: { average: number | null } | null;
  averageRuntime: number | null;
  runtime: number | null;
  network: { name: string; country: { code: string } | null } | null;
  webChannel: { name: string; country: { code: string } | null } | null;
  genres: string[] | null;
  image: { medium?: string; original?: string } | null;
  summary: string | null;
  type: string | null;
  _embedded?: { episodes?: TvmazeEpisode[]; cast?: CastMember[] };
};

type ShowRow = { 
  id: number; 
  tvmaze_id: number | null; 
  tmdb_id: number | null; 
  title: string 
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchTvmaze(path: string): Promise<Response> {
  let res = await fetch(`${TVMAZE}${path}`);
  for (let attempt = 1; attempt <= 3 && res.status === 429; attempt++) {
    await sleep(3000 * attempt);
    res = await fetch(`${TVMAZE}${path}`);
  }
  return res;
}

async function fetchTmdb(path: string, apiKey: string): Promise<any | null> {
  try {
    const separator = path.includes("?") ? "&" : "?";
    const url = `${TMDB_API}${path}${separator}api_key=${apiKey}&language=es-ES`;
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function stripHtml(html: string | null): string | null {
  if (!html) return null;
  return html.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim();
}

function medianRuntime(episodes: TvmazeEpisode[]): number | null {
  const runtimes = episodes.map((e) => e.runtime).filter((r): r is number => typeof r === "number" && r > 0).sort((a, b) => a - b);
  if (runtimes.length === 0) return null;
  return runtimes[Math.floor(runtimes.length / 2)];
}

function toCharacters(cast: CastMember[] | undefined) {
  return (cast ?? [])
    .filter((c) => c.character?.image?.medium && c.person?.name)
    .slice(0, 12)
    .map((c) => ({
      actor: c.person!.name,
      character: c.character!.name,
      image: c.character!.image!.medium,
    }));
}

function platformFields(networkName: string | null) {
  const key = networkName?.toLowerCase() ?? "";
  return {
    us_platforms: networkName !== null && US_NETWORKS.has(key) ? [networkName] : [],
    es_platforms: networkName !== null && ES_NETWORKS.has(key) ? [networkName] : [],
  };
}

function isNamedNetwork(show: TvmazeShow): boolean {
  const name = show.network?.name ?? show.webChannel?.name ?? null;
  if (!name) return false;
  const key = name.toLowerCase();
  const allNetworks = [...US_NETWORKS, ...ES_NETWORKS];
  // Coincidencia flexible: detecta la plataforma aunque TVMaze devuelva variantes en el nombre
  return allNetworks.some((net) => key.includes(net) || net.includes(key));
}

async function syncShow(supabase: ReturnType<typeof createClient>, show: ShowRow, tmdbApiKey: string): Promise<void> {
  let tvmazeData: TvmazeShow | null = null;
  let episodesData: TvmazeEpisode[] = [];
  let tmdbData: any = null;
  let tmdbId = show.tmdb_id;
  let tvmazeId = show.tvmaze_id;

  if (tvmazeId) {
    const res = await fetchTvmaze(`/shows/${tvmazeId}?embed[]=episodes&embed[]=cast`);
    if (res.ok) {
      tvmazeData = (await res.json()) as TvmazeShow;
      episodesData = tvmazeData._embedded?.episodes ?? [];
    }
  } else if (show.title) {
    try {
      const searchRes = await fetchTvmaze(`/singlesearch/shows?q=${encodeURIComponent(show.title)}&embed[]=episodes&embed[]=cast`);
      if (searchRes.ok) {
        tvmazeData = (await searchRes.json()) as TvmazeShow;
        if (tvmazeData?.id) {
          tvmazeId = tvmazeData.id;
          episodesData = tvmazeData._embedded?.episodes ?? [];
        }
      }
    } catch {
      // Ignorar si no está en TVMaze
    }
  }

  if (!tmdbId && (show.title || tvmazeData?.name)) {
    const searchTitle = show.title || tvmazeData?.name;
    const searchRes = await fetchTmdb(`/search/tv?query=${encodeURIComponent(searchTitle)}`, tmdbApiKey);
    if (searchRes?.results?.[0]) {
      tmdbId = searchRes.results[0].id;
    }
  }

  if (tmdbId) {
    tmdbData = await fetchTmdb(`/tv/${tmdbId}`, tmdbApiKey);
  }

  const networkName = tmdbData?.networks?.[0]?.name ?? tvmazeData?.network?.name ?? tvmazeData?.webChannel?.name ?? null;
  const platforms = platformFields(networkName);

  const posterUrl = tmdbData?.poster_path 
    ? `https://image.tmdb.org/t/p/original${tmdbData.poster_path}` 
    : (tvmazeData?.image?.original ?? tvmazeData?.image?.medium ?? null);

  const synopsis = tmdbData?.overview || stripHtml(tvmazeData?.summary) || null;
  const rating = tmdbData?.vote_average ?? tvmazeData?.rating?.average ?? null;
  const runtime = medianRuntime(episodesData) ?? tvmazeData?.averageRuntime ?? tvmazeData?.runtime ?? null;
  const genres = tmdbData?.genres ? tmdbData.genres.map((g: any) => g.name).join(", ") : ((tvmazeData?.genres ?? []).join(", ") || null);

  const updatePayload: any = {
    tv_type: "scripted", // Forzamos minúscula para que nunca desaparezca del catálogo
    ...platforms,
    tv_status: tmdbData?.status ?? tvmazeData?.status,
    premiered: tmdbData?.first_air_date ?? tvmazeData?.premiered,
    ended: tmdbData?.last_air_date ?? tvmazeData?.ended,
    rating,
    runtime,
    network_name: networkName,
    genres,
    poster_url: posterUrl,
    synopsis_es: synopsis,
    tv_synced_at: new Date().toISOString(),
  };

  if (tmdbId) updatePayload.tmdb_id = tmdbId;
  if (tvmazeId) updatePayload.tvmaze_id = tvmazeId;

  if (tvmazeData?._embedded?.cast) {
    updatePayload.characters = toCharacters(tvmazeData._embedded.cast);
  }

  const { error: updateError } = await supabase
    .from("shows")
    .update(updatePayload)
    .eq("id", show.id);

  if (updateError) throw new Error(updateError.message);

  if (episodesData.length > 0) {
    const episodes = episodesData
      .filter((e) => e.season !== null && e.number !== null && e.airdate)
      .map((e) => ({
        tvmaze_episode_id: e.id,
        show_id: show.id,
        season: e.season!,
        number: e.number!,
        name: e.name,
        airdate: e.airdate!,
        runtime: e.runtime,
        episode_type: e.type,
      }));

    if (episodes.length > 0) {
      await supabase
        .from("episodes")
        .upsert(episodes, { onConflict: "tvmaze_episode_id" });
    }
  }
}

async function discover(supabase: ReturnType<typeof createClient>, fromPage: number, toPage: number, _tmdbApiKey: string) {
  const rows: any[] = [];
  let pages = 0;
  let reachedEnd = false;

  for (let page = fromPage; page <= toPage; page++) {
    const res = await fetchTvmaze(`/shows?page=${page}`);
    if (res.status === 404) {
      reachedEnd = true;
      break;
    }
    if (!res.ok) throw new Error(`TVMaze ${res.status} en la página ${page}`);
    const shows = (await res.json()) as TvmazeShow[];
    
    for (const show of shows) {
      if (SERIES_TYPES.has((show.type ?? "").toLowerCase()) && isNamedNetwork(show)) {
        const networkName = show.network?.name ?? show.webChannel?.name ?? null;
        rows.push({
          tvmaze_id: show.id,
          title: show.name,
          tv_type: "scripted",
          network_name: networkName,
          ...platformFields(networkName),
        });
      }
    }
    pages += 1;
    await sleep(REQUEST_SPACING_MS);
  }

  // PROTECCIÓN ABSOLUTA: NUNCA SE BORRA NINGUNA SERIE
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    await supabase
      .from("shows")
      .upsert(rows.slice(i, i + BATCH_SIZE), { onConflict: "tvmaze_id", ignoreDuplicates: false });
  }

  return { pages, series: rows.length, removed: 0, reachedEnd, nextPage: toPage + 1 };
}

async function syncBatch(supabase: ReturnType<typeof createClient>, tmdbApiKey: string) {
  const started = Date.now();
  const cutoff = new Date(Date.now() - STALE_AFTER_MS).toISOString();
  
  const { data: shows, error } = await supabase
    .from("shows")
    .select("id, tvmaze_id, tmdb_id, title")
    .or(`tv_synced_at.is.null,tv_synced_at.lt.${cutoff}`)
    .order("tv_synced_at", { ascending: true, nullsFirst: true })
    .order("id", { ascending: false })
    .limit(BATCH_SIZE);

  if (error) throw new Error(error.message);

  let synced = 0;
  const failures: string[] = [];
  
  for (const show of (shows ?? []) as ShowRow[]) {
    if (Date.now() - started > TIME_BUDGET_MS) break;
    try {
      await syncShow(supabase, show, tmdbApiKey);
      synced += 1;
    } catch (err) {
      failures.push(err instanceof Error ? err.message : String(err));
    }
    await sleep(REQUEST_SPACING_MS);
  }
  return { synced, failed: failures.length, failures };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const tmdbApiKey = Deno.env.get("TMDB_API_KEY") || "";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (body.mode === "discover") {
      const expected = `Bearer ${supabaseServiceKey}`;
      if (req.headers.get("Authorization") !== expected) {
        return json({ error: "No autorizado" }, 403);
      }
      const fromPage = Number(body.fromPage);
      const toPage = Number(body.toPage);
      if (!Number.isInteger(fromPage) || !Number.isInteger(toPage) || fromPage < 0 || toPage < fromPage || toPage - fromPage >= MAX_PAGES_PER_DISCOVER) {
        return json({ error: "Rango de páginas no válido" }, 400);
      }
      return json(await discover(supabase, fromPage, toPage, tmdbApiKey));
    }

    return json(await syncBatch(supabase, tmdbApiKey));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return json({ error: message }, 500);
  }
});