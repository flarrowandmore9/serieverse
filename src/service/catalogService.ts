import { UnifiedShow } from '../types/show';
import { adaptTVMazeShow } from './adapters/tvmazeAdapter';
import { adaptTMDBShow } from './adapters/tmdbAdapter';

// Leemos la clave de TMDB de las variables de entorno de Vite
const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;

export async function getUnifiedCatalog(): Promise<UnifiedShow[]> {
  try {
    // 1. Petición a TVMaze (obtenemos una lista general de series)
    const tvmazePromise = fetch('https://api.tvmaze.com/shows')
      .then(res => res.json())
      .then(data => (Array.isArray(data) ? data.slice(0, 30).map(adaptTVMazeShow) : []))
      .catch(err => {
        console.error('Error al cargar TVMaze:', err);
        return [];
      });

    // 2. Preparar cabeceras para TMDB usando Bearer Token
    const tmdbHeaders = {
      accept: 'application/json',
      Authorization: `Bearer ${TMDB_API_KEY}`
    };

    // 3. Peticiones a TMDB para EE. UU. (US) y España (ES) en paralelo
    const tmdbUSPromise = fetch(
      'https://api.themoviedb.org/3/discover/tv?sort_by=popularity.desc&origin_country=US&language=es-ES',
      { headers: tmdbHeaders }
    )
      .then(res => res.json())
      .then(data => (data.results ? data.results.map(adaptTMDBShow) : []))
      .catch(err => {
        console.error('Error al cargar TMDB de EE.UU.:', err);
        return [];
      });

    const tmdbESPromise = fetch(
      'https://api.themoviedb.org/3/discover/tv?sort_by=popularity.desc&origin_country=ES&language=es-ES',
      { headers: tmdbHeaders }
    )
      .then(res => res.json())
      .then(data => (data.results ? data.results.map(adaptTMDBShow) : []))
      .catch(err => {
        console.error('Error al cargar TMDB de España:', err);
        return [];
      });

    // Esperar a que todas las peticiones terminen a la vez
    const [tvmazeShows, tmdbUSShows, tmdbESShows] = await Promise.all([
      tvmazePromise,
      tmdbUSPromise,
      tmdbESPromise
    ]);

    // 4. Unir todos los catálogos en un solo array
    const combinedShows = [...tvmazeShows, ...tmdbUSShows, ...tmdbESShows];

    // 5. Eliminar posibles series duplicadas basándonos en el título (normalizado en minúsculas)
    const uniqueShowsMap = new Map<string, UnifiedShow>();
    for (const show of combinedShows) {
      const normalizedTitle = show.title.toLowerCase().trim();
      if (!uniqueShowsMap.has(normalizedTitle)) {
        uniqueShowsMap.set(normalizedTitle, show);
      }
    }

    return Array.from(uniqueShowsMap.values());
  } catch (error) {
    console.error('Error general al obtener el catálogo unificado:', error);
    return [];
  }
}