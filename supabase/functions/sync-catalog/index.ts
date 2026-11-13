import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const TVMAZE = "https://api.tvmaze.com";
const STALE_AFTER_MS = 20 * 60 * 60 * 1000;
const TIME_BUDGET_MS = 90_000;
const REQUEST_SPACING_MS = 550;
const MAX_PAGES_PER_DISCOVER = 8000;
const BATCH_SIZE = 500;

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

type ShowRow = { id: number; tvmaze_id: number; title: string };

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

function platformFields(data: TvmazeShow) {
  const source = data.network ?? data.webChannel;
  const name = source?.name ?? null;
  const countryCode = source?.country?.code ?? null;
  const key = name?.toLowerCase() ?? "";

  const isEs = name !== null && (ES_NETWORKS.has(key) || countryCode === "ES");
  const isUs = name !== null && US_NETWORKS.has(key) && !isEs;

  return {
    us_platforms: isUs ? [name] : [],
    es_platforms: isEs ? [name] : [],
  };
}

function catalogFields(data: TvmazeShow) {
  return {
    tv_type: data.type,
    ...platformFields(data),
    tv_status: data.status,
    premiered: data.premiered,
    ended: data.ended,
    rating: data.rating?.average ?? null,
    runtime: data.averageRuntime ?? data.runtime ?? null,
    network_name: data.network?.name ?? data.webChannel?.name ?? null,
    genres: (data.genres ?? []).join(", ") || null,
    poster_url: data.image?.original ?? data.image?.medium ?? null,
    synopsis_source: stripHtml(data.summary),
  };
}

function isNamedNetwork(show: TvmazeShow): boolean {
  return [show.network?.name, show.webChannel?.name]
    .filter((name): name is string => typeof name === "string")
    .some((name) => US_NETWORKS.has(name.toLowerCase()) || ES_NETWORKS.has(name.toLowerCase()));
}

function isSeries(show: TvmazeShow): boolean {
  return SERIES_TYPES.has((show.type ?? "").toLowerCase());
}

async function syncShow(supabase: ReturnType<typeof createClient>, show: ShowRow): Promise<void> {
  const res = await fetchTvmaze(`/shows/${show.tvmaze_id}?embed[]=episodes&embed[]=cast`);
  if (!res.ok) throw new Error(`TVMaze ${res.status} para ${show.title}`);
  const data = (await res.json()) as TvmazeShow;
  const episodesData = data._embedded?.episodes ?? [];

  const { error: updateError } = await supabase
    .from("shows")
    .update({
      ...catalogFields(data),
      runtime: medianRuntime(episodesData),
      characters: toCharacters(data._embedded?.cast),
      tv_synced_at: new Date().toISOString(),
    })
    .eq("id", show.id);
  if (updateError) throw new Error(updateError.message);

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

async function discover(supabase: ReturnType<typeof createClient>, fromPage: number, toPage: number) {
  const rows: (ReturnType<typeof platformFields> & { tvmaze_id: number; title: string; tv_type: string | null })[] = [];
  const removeIds: number[] = [];
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
    for (const show of shows.filter(isNamedNetwork)) {
      if (isSeries(show)) rows.push({ tvmaze_id: show.id, title: show.name, tv_type: show.type, ...platformFields(show) });
      else removeIds.push(show.id);
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

  for (let i = 0; i < removeIds.length; i += BATCH_SIZE) {
    const { error } = await supabase.from("shows").delete().in("tvmaze_id", removeIds.slice(i, i + B_BATCH_SIZE));
    if (error) throw new Error(error.message);
  }

  return { pages, series: rows.length, removed: removeIds.length, reachedEnd, nextPage: toPage + 1 };
}

async function syncBatch(supabase: ReturnType<typeof createClient>) {
  const started = Date.now();
  const cutoff = new Date(Date.now() - STALE_AFTER_MS).toISOString();
  const { data: shows, error } = await supabase
    .from("shows")
    .select("id, tvmaze_id, title")
    .not("tvmaze_id", "is", null)
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
      await syncShow(supabase, show);
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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (body.mode === "discover") {
      const fromPage = Number(body.fromPage);
      const toPage = Number(body.toPage);
      if (!Number.isInteger(fromPage) || !Number.isInteger(toPage) || fromPage < 0 || toPage < fromPage || toPage - fromPage >= MAX_PAGES_PER_DISCOVER) {
        return json({ error: "Rango de páginas no válido" }, 400);
      }
      return json(await discover(supabase, fromPage, toPage));
    }

    return json(await syncBatch(supabase));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return json({ error: message }, 500);
  }
});