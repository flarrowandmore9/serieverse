import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const TVMAZE = "https://api.tvmaze.com";
const TMDB_API = "https://api.themoviedb.org/3";
const STALE_AFTER_MS = 20 * 60 * 60 * 1000;
const TIME_BUDGET_MS = 90_000;
const REQUEST_SPACING_MS = 350;
const MAX_PAGES_PER_DISCOVER = 80;
const BATCH_SIZE = 500;

const US_NETWORKS = new Set(
  [
    "the cw", "abc", "nbc", "cbs", "fox", "amc", "fx", "fx networks", "fxx",
    "starz", "freeform", "showtime", "paramount+ with showtime",
    "netflix", "prime video", "amazon", "amazon prime video",
    "hbo", "hbo max", "max", "warner bros.", "disney+", "disney",
    "marvel", "star wars", "hulu", "apple tv", "apple tv+",
    "paramount", "paramount+", "paramount network", "peacock", "universal",
  ],
);

const ES_NETWORKS = new Set(
  [
    "rtve", "tve", "la 1", "la 2", "rtve play", "playz",
    "antena 3", "a3series", "atreseries", "cuatro", "telecinco", "la sexta", "lasexta",
    "axn", "fox", "fox españa", "star channel",
    "atresmedia", "atresplayer", "atresplayer premium", "atresplayer originals", "atresmedia televisión",
    "mediaset", "mediaset españa", "mitele", "mitele plus",
    "movistar+", "movistar plus+", "movistar plus", "movistar",
    "skyshowtime", "filmin", "hbo españa", "hbo max españa", "disney+ españa",
  ],
);

// IDs oficiales en TMDB de las cadenas y plataformas requeridas
const TMDB_US_NETWORK_IDS = [
  88,   // FX
  318,  // Starz
  1267, // Freeform
  67,   // Showtime
  4330, // Paramount+
  2076, // Paramount Network
  3353, // Peacock
];

const TMDB_ES_NETWORK_IDS = [
  443,  // La 1 / RTVE
  1015, // RTVE Play
  400,  // Antena 3
  1366, // Atresplayer
  2780, // Atresplayer Premium
  1028, // Telecinco / Mediaset
  1033, // Cuatro
  1034, // La Sexta
  2895, // Movistar Plus+
  1483, // Filmin
];

const PROVIDER_NORMALIZE: Record<string, string> = {
  "netflix": "Netflix",
  "amazon prime video": "Prime Video",
  "disney plus": "Disney+",
  "max": "Max",
  "hbo max": "HBO Max",
  "apple tv plus": "Apple TV+",
  "apple tv+": "Apple TV+",
  "skyshowtime": "SkyShowtime",
  "movistar plus+": "Movistar Plus+",
  "movistar plus": "Movistar Plus+",
  "atresplayer": "Atresplayer",
  "atresplayer premium": "Atresplayer Premium",
  "rtve play": "RTVE Play",
  "filmin": "Filmin",
  "mitele plus": "Mediaset",
  "paramount plus": "Paramount+",
  "paramount+ with showtime": "Showtime",
  "peacock": "Peacock",
  "hulu": "Hulu",
  "starz": "Starz",
  "fxnow": "FX",
  "freeform": "Freeform",
};

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
  externals?: { imdb?: string | null };
  _embedded?: { episodes?: TvmazeEpisode[]; cast?: CastMember[] };
};

type ShowRow = {
  id: number;
  tvmaze_id: number | null;
  imdb_id: string | null;
  title: string;
  synopsis_es: string | null;
  us_platforms: string[] | null;
  es_platforms: string[] | null;
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
  if (!apiKey) return null;
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

function normalizeProvider(name: string): string | null {
  const key = name.trim().toLowerCase();
  if (PROVIDER_NORMALIZE[key]) return PROVIDER_NORMALIZE[key];
  if (US_NETWORKS.has(key) || ES_NETWORKS.has(key)) return name.trim();
  return null;
}

function mergePlatforms(existing: string[] | null, networkName: string | null, providers: any, region: "US" | "ES"): string[] {
  const set = new Set<string>(existing ?? []);
  const targetSet = region === "US" ? US_NETWORKS : ES_NETWORKS;

  if (networkName && targetSet.has(networkName.toLowerCase())) {
    set.add(normalizeProvider(networkName) ?? networkName);
  }

  const regionData = providers?.results?.[region];
  const list = [...(regionData?.flatrate ?? []), ...(regionData?.free ?? []), ...(regionData?.ads ?? [])];
  for (const item of list) {
    if (item?.provider_name) {
      const normalized = normalizeProvider(item.provider_name);
      if (normalized) set.add(normalized);
    }
  }
  return [...set];
}

function isNamedNetwork(show: TvmazeShow): boolean {
  const candidates = [show.network?.name, show.webChannel?.name].filter(Boolean) as string[];
  return candidates.some((name) => {
    const key = name.toLowerCase();
    return US_NETWORKS.has(key) || ES_NETWORKS.has(key);
  });
}

function isSeries(show: TvmazeShow): boolean {
  return SERIES_TYPES.has((show.type ?? "").toLowerCase());
}

async function syncShow(supabase: ReturnType<typeof createClient>, show: ShowRow, tmdbApiKey: string): Promise<void> {
  let tvmazeData: TvmazeShow | null = null;
  let episodesData: TvmazeEpisode[] = [];
  let tmdbData: any = null;
  let tmdbProviders: any = null;

  if (show.tvmaze_id) {
    const res = await fetchTvmaze(`/shows/${show.tvmaze_id}?embed[]=episodes&embed[]=cast`);
    if (res.ok) {
      tvmazeData = (await res.json()) as TvmazeShow;
      episodesData = tvmazeData._embedded?.episodes ?? [];
    }
  }

  let tmdbId: number | null = null;
  const imdbId = show.imdb_id ?? tvmazeData?.externals?.imdb ?? null;

  if (imdbId && tmdbApiKey) {
    const findRes = await fetchTmdb(`/find/${encodeURIComponent(imdbId)}?external_source=imdb_id`, tmdbApiKey);
    if (findRes?.tv_results?.[0]) {
      tmdbId = findRes.tv_results[0].id;
    }
  }

  if (!tmdbId && tmdbApiKey) {
    const searchRes = await fetchTmdb(`/search/tv?query=${encodeURIComponent(show.title)}`, tmdbApiKey);
    if (searchRes?.results?.[0]) {
      tmdbId = searchRes.results[0].id;
    }
  }

  if (tmdbId && tmdbApiKey) {
    [tmdbData, tmdbProviders] = await Promise.all([
      fetchTmdb(`/tv/${tmdbId}`, tmdbApiKey),
      fetchTmdb(`/tv/${tmdbId}/watch/providers`, tmdbApiKey),
    ]);
  }

  const networkName =
    tmdbData?.networks?.[0]?.name ??
    tvmazeData?.network?.name ??
    tvmazeData?.webChannel?.name ??
    null;

  const usPlatforms = mergePlatforms(show.us_platforms, networkName, tmdbProviders, "US");
  const esPlatforms = mergePlatforms(show.es_platforms, networkName, tmdbProviders, "ES");

  const posterUrl = tmdbData?.poster_path
    ? `https://image.tmdb.org/t/p/original${tmdbData.poster_path}`
    : (tvmazeData?.image?.original ?? tvmazeData?.image?.medium ?? null);

  const tmdbOverview = typeof tmdbData?.overview === "string" && tmdbData.overview.trim() ? tmdbData.overview.trim() : null;
  const synopsis = tmdbOverview || stripHtml(tvmazeData?.summary) || null;
  const rating = tmdbData?.vote_average ? Number(tmdbData.vote_average.toFixed(1)) : (tvmazeData?.rating?.average ?? null);
  const runtime = medianRuntime(episodesData) ?? tvmazeData?.averageRuntime ?? tvmazeData?.runtime ?? (tmdbData?.episode_run_time?.[0] ?? null);
  const genres = tmdbData?.genres?.length
    ? tmdbData.genres.map((g: any) => g.name).join(", ")
    : ((tvmazeData?.genres ?? []).join(", ") || null);

  const updatePayload: Record<string, unknown> = {
    tv_type: tvmazeData?.type ?? "Scripted",
    us_platforms: usPlatforms,
    es_platforms: esPlatforms,
    tv_status: tmdbData?.status ?? tvmazeData?.status,
    premiered: tmdbData?.first_air_date ?? tvmazeData?.premiered,
    ended: tmdbData?.last_air_date ?? tvmazeData?.ended,
    rating,
    runtime,
    network_name: networkName,
    genres,
    poster_url: posterUrl,
    synopsis_source: synopsis,
    tv_synced_at: new Date().toISOString(),
  };

  if (imdbId) updatePayload.imdb_id = imdbId;
  if (!show.synopsis_es && tmdbOverview) {
    updatePayload.synopsis_es = tmdbOverview;
  }
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
      const { error: episodeError } = await supabase
        .from("episodes")
        .upsert(episodes, { onConflict: "tvmaze_episode_id" });
      if (episodeError) throw new Error(episodeError.message);
    }
  }
}

async function discoverFromTmdb(supabase: ReturnType<typeof createClient>, tmdbApiKey: string): Promise<number> {
  if (!tmdbApiKey) return 0;
  let added = 0;

  const queries = [
    ...TMDB_US_NETWORK_IDS.map((id) => `/discover/tv?with_networks=${id}&sort_by=popularity.desc&page=1`),
    ...TMDB_ES_NETWORK_IDS.map((id) => `/discover/tv?with_networks=${id}&sort_by=popularity.desc&page=1`),
    `/discover/tv?watch_region=ES&with_watch_providers=149|63|1927|541&sort_by=popularity.desc&page=1`,
    `/discover/tv?watch_region=US&with_watch_providers=531|386|37|43&sort_by=popularity.desc&page=1`,
  ];

  for (const path of queries) {
    const res = await fetchTmdb(path, tmdbApiKey);
    const results = res?.results ?? [];

    for (const item of results.slice(0, 15)) {
      if (!item?.name) continue;
      const { data: existing } = await supabase
        .from("shows")
        .select("id")
        .ilike("title", item.name)
        .limit(1);

      if (existing && existing.length > 0) continue;

      let tvmazeId: number | null = null;
      const tvmRes = await fetchTvmaze(`/singlesearch/shows?q=${encodeURIComponent(item.name)}`);
      if (tvmRes.ok) {
        const tvmJson = await tvmRes.json();
        if (tvmJson?.id) tvmazeId = tvmJson.id;
      }

      const payload: Record<string, unknown> = {
        title: item.name,
        poster_url: item.poster_path ? `https://image.tmdb.org/t/p/original${item.poster_path}` : null,
        synopsis_es: item.overview || null,
        premiered: item.first_air_date || null,
        rating: item.vote_average ? Number(item.vote_average.toFixed(1)) : null,
        us_platforms: [],
        es_platforms: [],
      };
      if (tvmazeId) payload.tvmaze_id = tvmazeId;

      const { error } = await supabase.from("shows").insert(payload);
      if (!error) added += 1;
      await sleep(200);
    }
  }

  return added;
}

async function discover(supabase: ReturnType<typeof createClient>, fromPage: number, toPage: number, tmdbApiKey: string) {
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
      if (isSeries(show) && isNamedNetwork(show)) {
        const networkName = show.network?.name ?? show.webChannel?.name ?? null;
        rows.push({
          tvmaze_id: show.id,
          imdb_id: show.externals?.imdb ?? null,
          title: show.name,
          tv_type: show.type,
          network_name: networkName,
          us_platforms: mergePlatforms([], networkName, null, "US"),
          es_platforms: mergePlatforms([], networkName, null, "ES"),
        });
      }
    }
    pages += 1;
    await sleep(REQUEST_SPACING_MS);
  }

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const { error } = await supabase
      .from("shows")
      .upsert(rows.slice(i, i + BATCH_SIZE), { onConflict: "tvmaze_id" });
    if (error) throw new Error(error.message);
  }

  const tmdbAdded = await discoverFromTmdb(supabase, tmdbApiKey);

  return { pages, series: rows.length, tmdbAdded, reachedEnd, nextPage: toPage + 1 };
}

async function syncBatch(supabase: ReturnType<typeof createClient>, tmdbApiKey: string, force = false) {
  const started = Date.now();
  const cutoff = new Date(Date.now() - STALE_AFTER_MS).toISOString();

  let query = supabase
    .from("shows")
    .select("id, tvmaze_id, imdb_id, title, synopsis_es, us_platforms, es_platforms");

  if (!force) {
    query = query.or(`tv_synced_at.is.null,tv_synced_at.lt.${cutoff}`);
  } else {
    query = query.order("tv_synced_at", { ascending: true, nullsFirst: true });
  }

  const { data: shows, error } = await query
    .order("tv_synced_at", { ascending: true, nullsFirst: true })
    .order("id", { ascending: false })
    .limit(force ? 60 : BATCH_SIZE);

  if (error) throw new Error(error.message);

  let discoveredNew = 0;
  if (force) {
    discoveredNew = await discoverFromTmdb(supabase, tmdbApiKey);
  }

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

  return { synced, discoveredNew, failed: failures.length, failures };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const tmdbApiKey = Deno.env.get("TMDB_API_KEY") || Deno.env.get("VITE_TMDB_API_KEY") || "";

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

    const force = Boolean(body.force);
    return json(await syncBatch(supabase, tmdbApiKey, force));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return json({ error: message }, 500);
  }
});