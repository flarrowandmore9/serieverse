import { UnifiedShow } from '../../types/show';

export function adaptTMDBShow(show: any): UnifiedShow {
  return {
    id: `tmdb-${show.id}`,
    title: show.name || show.original_name,
    overview: show.overview || 'Sin descripción disponible.',
    // TMDB devuelve una ruta parcial para las imágenes, aquí le añadimos la URL base oficial de TMDB (tamaño w500 para pósters)
    posterUrl: show.poster_path ? `https://image.tmdb.org/t/p/w500${show.poster_path}` : '',
    backdropUrl: show.backdrop_path ? `https://image.tmdb.org/t/p/original${show.backdrop_path}` : '',
    rating: show.vote_average || 0,
    genres: show.genre_ids ? show.genre_ids.map(String) : [],
    // TMDB suele devolver un array de países de origen, cogemos el primero o por defecto 'US'
    country: show.origin_country?.[0] || 'US',
    source: 'tmdb',
    originalData: show
  };
}