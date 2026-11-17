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

  // Si se proporciona un ID de TVMaze, traemos toda su información y episodios al instante
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
            tvmaze_episode_id: e.id,
            season: e.season,
            number: e.number,
            name: e.name,
            airdate: e.airdate,
            runtime: e.runtime,
            episode_type: e.type,
          }));
      }
    } catch (err) {
      console.error("Error al obtener datos externos al añadir:", err);
    }
  }

  // Extraemos y filtramos tmdb_id y cualquier campo que no deba ir directo a la tabla principal
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

  // Guardar los episodios asociados si se obtuvieron
  if (episodesToInsert.length > 0 && data?.id) {
    const episodesWithShowId = episodesToInsert.map(e => ({ ...e, show_id: data.id }));
    await supabase.from('episodes').upsert(episodesWithShowId, { onConflict: 'tvmaze_episode_id' });
  }

  return data;
}