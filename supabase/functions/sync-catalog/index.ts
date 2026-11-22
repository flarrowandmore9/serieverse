import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const TVMAZE = "https://api.tvmaze.com";
const TMDB_API = "https://api.themoviedb.org/3";
const STALE_AFTER_MS = 20 * 60 * 60 * 1000;
const TIME_BUDGET_MS = 85_000;
const REQUEST_SPACING_MS = 350;
const BATCH_SIZE = 250;

const ALIAS_MAP: Record<string, string> = {
  "cw": "The CW", "the cw": "The CW",
  "abc": "ABC", "cbs": "CBS", "nbc": "NBC",
  "fox": "FOX", "fox (us)": "FOX",
  "amc": "AMC", "amc+": "AMC",
  "fx": "FX", "fx networks": "FX", "fxx": "FX",
  "starz": "Starz",
  "freeform": "Freeform",
  "showtime": "Showtime",
  "netflix": "Netflix",
  "amazon prime video": "Prime Video", "prime video": "Prime Video", "amazon": "Prime Video",
  "hbo": "HBO", "hbo max": "HBO Max", "max": "HBO Max",
  "disney": "Disney", "disney+": "Disney+", "disney plus": "Disney+",
  "hulu": "Hulu",
  "apple tv": "Apple TV", "apple tv+": "Apple TV", "apple tv plus": "Apple TV",
  "paramount": "Paramount", "paramount network": "Paramount",
  "paramount+": "Paramount+", "paramount plus": "Paramount+",
  "peacock": "Peacock", "peacock tv": "Peacock",
  "skyshowtime": "SkyShowtime",
  "rtve": "RTVE Play", "rtve play": "RTVE Play", "la 1": "RTVE Play", "la 2": "RTVE Play", "tve": "RTVE Play",
  "atresmedia": "Atresmedia", "antena 3": "Atresmedia", "atresplayer": "Atresmedia", "atresplayer premium": "Atresmedia",
  "mediaset": "Mediaset", "telecinco": "Mediaset", "cuatro": "Mediaset", "mitele": "Mediaset",
  "movistar plus+": "Movistar Plus+", "movistar+": "Movistar Plus+", "movistar plus": "Movistar Plus+", "movistar": "Movistar Plus+",
  "filmin": "Filmin",
};

// IDs de Networks y Watch Providers en TMDB para las plataformas solicitadas
const TMDB_US_NETWORK_IDS = [71, 2, 16, 6, 19, 174, 88, 318, 75, 67, 213, 1024, 49, 3186, 2739, 453, 2552, 4330, 3353];
const TMDB_ES_PROVIDER_IDS = [8, 119, 337, 350, 1773, 149, 63, 384, 62, 456, 541]; // Netflix, Prime, Disney+, Apple TV, SkyShowtime, Movistar+, Filmin, Max, Atresplayer, Mitele, RTVE Play
const TMDB_US_PROVIDER_IDS = [8, 9, 337, 350, 531, 384, 15, 386, 43, 37]; // Netflix, Prime, Disney+, Apple, Paramount+, Max, Hulu, Peacock, Starz, Showtime

const TMDB_PROVIDER_MAP: Record<number, string> = {
  8: "Netflix", 9: "Prime Video", 119: "Prime Video",
  337: "Disney+", 350: "Apple TV", 531: "Paramount+",
  1773: "SkyShowtime", 149: "Movistar Plus+", 63: "Filmin",
  384: "HBO Max", 15: "Hulu", 386: "Peacock",
  43: "Starz", 37: "Showtime", 62: "Atresmedia",
  456: "Mediaset", 541: "RTVE Play",
};

function normalizeName(raw?: string | null): string | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase();
  if (!key) return null;
  if (ALIAS_MAP[key]) return ALIAS_MAP[key];
  for (const [alias, canonical] of Object.entries(ALIAS_MAP)) {
    if (alias.length >= 3 && key.includes(alias)) return canonical;
  }
  return raw.trim();
}

function normalizeList(items: (string | null | undefined)[]): string[] {
  const out = new Set<string>();
  for (const item of items) {
    const n = normalizeName(item);
    if (n) out.add(n);
  }
  return [...out];
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchTmdb(path: string, apiKey: string): Promise<any | null> {
  if (!apiKey) return null;
  const sep = path.includes("?") ? "&" : "?";
  const isBearer = apiKey.startsWith("eyJ");
  const url = isBearer
    ? `${TMDB_API}${path}${sep}language=es-ES`
    : `${TMDB_API}${path}${sep}api_key=${apiKey}&language=es-ES`;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (isBearer) headers.Authorization = `Bearer ${apiKey}`;

  try {
    const res = await fetch(url, { headers });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function discoverFromTmdb(supabase: ReturnType<typeof createClient>, apiKey: string) {
  if (!apiKey) return 0;
  const discoveredMap = new Map<number, any>();

  // 1. Cadenas de EE. UU. (FX, Starz, Freeform, Showtime, Paramount, Peacock, etc.)
  for (const netId of TMDB_US_NETWORK_IDS) {
    for (let page = 1; page <= 2; page++) {
      const data = await fetchTmdb(`/discover/tv?with_networks=${netId}&sort_by=popularity.desc&page=${page}`, apiKey);
      for (const item of data?.results ?? []) {
        if (item?.id) discoveredMap.set(item.id, item);
      }
      await sleep(150);
    }
  }

  // 2. Plataformas en España (Movistar Plus+, Filmin, SkyShowtime, Atresmedia, Mediaset, etc.)
  for (const provId of TMDB_ES_PROVIDER_IDS) {
    for (let page = 1; page <= 2; page++) {
      const data = await fetchTmdb(
        `/discover/tv?watch_region=ES&with_watch_providers=${provId}&sort_by=popularity.desc&page=${page}`,
        apiKey,
      );
      for (const item of data?.results ?? []) {
        if (item?.id) discoveredMap.set(item.id, item);
      }
      await sleep(150);
    }
  }

  // 3. Plataformas en EE. UU. (Paramount+, Peacock, Showtime, Starz, etc.)
  for (const provId of TMDB_US_PROVIDER_IDS) {
    const data = await fetchTmdb(
      `/discover/tv?watch_region=US&with_watch_providers=${provId}&sort_by=popularity.desc&page=1`,
      apiKey,
    );
    for (const item of data?.results ?? []) {
      if (item?.id) discoveredMap.set(item.id, item);
    }
    await sleep(150);
  }

  let insertedOrUpdated = 0;
  for (const [tmdbId, basic] of discoveredMap.entries()) {
    const { data: existing } = await supabase
      .from("shows")
      .select("id")
      .eq("tmdb_id", tmdbId)
      .maybeSingle();

    if (existing) continue;

    // También buscamos por título exacto para enlazar series ya creadas por TVMaze sin duplicar
    const title = basic.name || basic.original_name;
    if (!title) continue;

    const { data: byTitle } = await supabase
      .from("shows")
      .select("id, tmdb_id")
      .ilike("title", title)
      .limit(1)
      .maybeSingle();

    if (byTitle) {
      if (!byTitle.tmdb_id) {
        await supabase.from("shows").update({ tmdb_id: tmdbId, tv_synced_at: null }).eq("id", byTitle.id);
      }
      continue;
    }

    const { error } = await supabase.from("shows").insert({
      tmdb_id: tmdbId,
      title,
      synopsis_es: basic.overview || null,
      poster_url: basic.poster_path ? `https://image.tmdb.org/t/p/original${basic.poster_path}` : null,
      premiered: basic.first_air_date || null,
      rating: basic.vote_average ? Number(Number(basic.vote_average).toFixed(1)) : null,
      tv_type: "scripted",
      tv_synced_at: null,
    });

    if (!error) insertedOrUpdated += 1;
  }

  return insertedOrUpdated;
}

async function syncSingleShow(supabase: ReturnType<typeof createClient>, show: any, apiKey: string) {
  let tvmazeData: any = null;
  let episodesData: any[] = [];
  let tmdbId: number | null = show.tmdb_id ?? null;
  let tvmazeId: number | null = show.tvmaze_id ?? null;

  if (tvmazeId) {
    const res = await fetch(`${TVMAZE}/shows/${tvmazeId}?embed[]=episodes&embed[]=cast`);
    if (res.ok) {
      tvmazeData = await res.json();
      episodesData = tvmazeData._embedded?.episodes ?? [];
    }
  } else if (show.title) {
    const res = await fetch(`${TVMAZE}/singlesearch/shows?q=${encodeURIComponent(show.title)}&embed[]=episodes&embed[]=cast`);
    if (res.ok) {
      tvmazeData = await res.json();
      if (tvmazeData?.id) {
        tvmazeId = tvmazeData.id;
        episodesData = tvmazeData._embedded?.episodes ?? [];
      }
    }
  }

  if (!tmdbId && apiKey && (show.title || tvmazeData?.name)) {
    const search = await fetchTmdb(`/search/tv?query=${encodeURIComponent(show.title || tvmazeData.name)}`, apiKey);
    if (search?.results?.[0]?.id) tmdbId = search.results[0].id;
  }

  let tmdbData: any = null;
  if (tmdbId && apiKey) {
    tmdbData = await fetchTmdb(`/tv/${tmdbId}?append_to_response=credits,watch/providers,external_ids`, apiKey);
  }

  const rawNet = tmdbData?.networks?.[0]?.name ?? tvmazeData?.network?.name ?? tvmazeData?.webChannel?.name ?? show.network_name ?? null;
  const networkName = normalizeName(rawNet) ?? rawNet;

  const providers = tmdbData?.["watch/providers"]?.results ?? {};
  const extractProv = (regCode: "US" | "ES") => {
    const reg = providers[regCode];
    if (!reg) return [];
    const bucket = [...(reg.flatrate ?? []), ...(reg.ads ?? []), ...(reg.free ?? [])];
    return normalizeList(bucket.map((p: any) => TMDB_PROVIDER_MAP[p.provider_id] ?? p.provider_name));
  };

  const usPlatforms = normalizeList([...(show.us_platforms ?? []), ...extractProv("US"), ...(networkName ? [networkName] : [])]);
  const esPlatforms = normalizeList([...(show.es_platforms ?? []), ...extractProv("ES")]);

  const characters = tmdbData?.credits?.cast?.length
    ? tmdbData.credits.cast.slice(0, 12).map((c: any) => ({
        actor: c.name ?? "",
        character: c.character ?? "",
        image: c.profile_path ? `https://image.tmdb.org/t/p/w300${c.profile_path}` : "",
      })).filter((c: any) => c.actor)
    : (tvmazeData?._embedded?.cast ?? []).slice(0, 12).map((c: any) => ({
        actor: c.person?.name ?? "",
        character: c.character?.name ?? "",
        image: c.character?.image?.medium ?? c.person?.image?.medium ?? "",
      })).filter((c: any) => c.actor);

  // Obtener sinopsis en español de los episodios desde TMDB
  const esEpisodeMap = new Map<string, { name?: string; overview?: string; airdate?: string; runtime?: number }>();
  if (tmdbId && apiKey && Array.isArray(tmdbData?.seasons)) {
    for (const s of tmdbData.seasons.filter((s: any) => s.season_number > 0)) {
      const sData = await fetchTmdb(`/tv/${tmdbId}/season/${s.season_number}`, apiKey);
      for (const ep of sData?.episodes ?? []) {
        esEpisodeMap.set(`${s.season_number}-${ep.episode_number}`, {
          name: ep.name,
          overview: ep.overview,
          airdate: ep.air_date,
          runtime: ep.runtime,
        });
      }
      await sleep(120);
    }
  }

  const posterUrl = tmdbData?.poster_path
    ? `https://image.tmdb.org/t/p/original${tmdbData.poster_path}`
    : (tvmazeData?.image?.original ?? tvmazeData?.image?.medium ?? show.poster_url ?? null);

  await supabase.from("shows").update({
    tvmaze_id: tvmazeId,
    tmdb_id: tmdbId,
    imdb_id: tmdbData?.external_ids?.imdb_id ?? tvmazeData?.externals?.imdb ?? show.imdb_id ?? null,
    synopsis_es: tmdbData?.overview || show.synopsis_es || (tvmazeData?.summary ? tvmazeData.summary.replace(/<[^>]*>/g, "").trim() : null),
    poster_url: posterUrl,
    tv_status: tmdbData?.status ?? tvmazeData?.status ?? show.tv_status ?? null,
    premiered: tmdbData?.first_air_date ?? tvmazeData?.premiered ?? show.premiered ?? null,
    ended: tmdbData?.last_air_date ?? tvmazeData?.ended ?? null,
    rating: tmdbData?.vote_average ? Number(Number(tmdbData.vote_average).toFixed(1)) : (tvmazeData?.rating?.average ?? show.rating ?? null),
    runtime: tmdbData?.episode_run_time?.[0] ?? tvmazeData?.averageRuntime ?? tvmazeData?.runtime ?? show.runtime ?? null,
    network_name: networkName,
    genres: tmdbData?.genres?.length ? tmdbData.genres.map((g: any) => g.name).join(", ") : ((tvmazeData?.genres ?? []).join(", ") || show.genres || null),
    us_platforms: usPlatforms,
    es_platforms: esPlatforms,
    characters: characters.length ? characters : (show.characters ?? []),
    tv_type: "scripted",
    tv_synced_at: new Date().toISOString(),
  }).eq("id", show.id);

  // Guardar episodios combinando TVMaze + sinopsis en español de TMDB
  const epRows: any[] = [];
  const seenSeasonEp = new Set<string>();

  for (const e of episodesData) {
    if (e.season == null || e.number == null || !e.airdate) continue;
    const key = `${e.season}-${e.number}`;
    seenSeasonEp.add(key);
    const esInfo = esEpisodeMap.get(key);
    epRows.push({
      tvmaze_episode_id: e.id,
      show_id: show.id,
      season: e.season,
      number: e.number,
      name: esInfo?.name || e.name,
      overview_es: esInfo?.overview || null,
      airdate: e.airdate,
      runtime: e.runtime ?? esInfo?.runtime ?? null,
      episode_type: e.type ?? "regular",
    });
  }

  // Si la serie solo está en TMDB (como muchas españolas de Atresmedia, Movistar+, Filmin), creamos sus episodios desde TMDB
  if (tmdbId && esEpisodeMap.size > 0) {
    for (const [key, info] of esEpisodeMap.entries()) {
      if (seenSeasonEp.has(key) || !info.airdate) continue;
      const [sStr, eStr] = key.split("-");
      const sNum = Number(sStr);
      const eNum = Number(eStr);
      const syntheticId = -(tmdbId * 10000 + sNum * 100 + eNum);
      epRows.push({
        tvmaze_episode_id: syntheticId,
        show_id: show.id,
        season: sNum,
        number: eNum,
        name: info.name || `Episodio ${eNum}`,
        overview_es: info.overview || null,
        airdate: info.airdate,
        runtime: info.runtime ?? null,
        episode_type: "regular",
      });
    }
  }

  for (let i = 0; i < epRows.length; i += 100) {
    await supabase.from("episodes").upsert(epRows.slice(i, i + 100), { onConflict: "tvmaze_episode_id" });
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const tmdbApiKey = Deno.env.get("TMDB_API_KEY") || "";

    const discovered = await discoverFromTmdb(supabase, tmdbApiKey);

    const started = Date.now();
    const cutoff = new Date(Date.now() - STALE_AFTER_MS).toISOString();
    let query = supabase.from("shows").select("*");
    if (!body.force) {
      query = query.or(`tv_synced_at.is.null,tv_synced_at.lt.${cutoff}`);
    }
    const { data: shows, error } = await query
      .order("tv_synced_at", { ascending: true, nullsFirst: true })
      .limit(BATCH_SIZE);

    if (error) throw new Error(error.message);

    let synced = 0;
    for (const show of shows ?? []) {
      if (Date.now() - started > TIME_BUDGET_MS) break;
      try {
        await syncSingleShow(supabase, show, tmdbApiKey);
        synced += 1;
      } catch {
        // Continuar con la siguiente serie sin interrumpir el lote
      }
      await sleep(REQUEST_SPACING_MS);
    }

    return json({ ok: true, discovered, synced });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Error desconocido" }, 500);
  }
});