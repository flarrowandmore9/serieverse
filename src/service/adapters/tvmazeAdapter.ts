import { UnifiedShow } from '../../types/show';

export function adaptTVMazeShow(show: any): UnifiedShow {
  return {
    id: `tvmaze-${show.id}`,
    title: show.name,
    // TVMaze a veces devuelve etiquetas HTML en la sinopsis (como <p>, <b>). Esto las limpia:
    overview: show.summary ? show.summary.replace(/<[^>]*>?/gm, '') : 'Sin descripción disponible.',
    posterUrl: show.image?.medium || show.image?.original || '',
    backdropUrl: show.image?.original || '',
    rating: show.rating?.average || 0,
    genres: show.genres || [],
    country: show.network?.country?.code || show.webChannel?.country?.code || 'US',
    source: 'tvmaze',
    originalData: show
  };
}