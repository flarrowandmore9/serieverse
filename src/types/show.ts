export interface UnifiedShow {
  id: string; // Ej: 'tvmaze-123' o 'tmdb-456' para evitar colisiones de IDs
  title: string;
  overview: string;
  posterUrl: string;
  backdropUrl: string;
  rating: number;
  genres: string[];
  country: string; // 'US', 'ES', etc.
  source: 'tvmaze' | 'tmdb';
  originalData: any; // Opcional: guarda el objeto original por si necesitas más detalles luego
}