import { useEffect, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import ShowCard from '@/components/ShowCard';
import { EmptyState, ErrorState, LoadingState } from '@/components/PageStates';
import { fetchCatalog, type CatalogSort } from '@/lib/catalog';
import { useAsyncData } from '@/hooks/useAsyncData';

type CatalogViewProps = {
  onOpenShow: (showId: number) => void;
  onRequireLogin: () => void;
};

const SORT_OPTIONS: { value: CatalogSort; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'popular', label: 'Populares' },
  { value: 'visited', label: 'Más visitadas' },
  { value: 'recent', label: 'Últimas añadidas' },
  ];

const GENRE_OPTIONS: { value: string; label: string }[] = [
  { value: 'Drama', label: 'Drama' },
  { value: 'Comedy', label: 'Comedia' },
  { value: 'Crime', label: 'Crimen' },
  { value: 'Thriller', label: 'Thriller' },
  { value: 'Mystery', label: 'Misterio' },
  { value: 'Science-Fiction', label: 'Ciencia ficción' },
  { value: 'Fantasy', label: 'Fantasía' },
  { value: 'Horror', label: 'Terror' },
  { value: 'Action', label: 'Acción' },
  { value: 'Adventure', label: 'Aventura' },
  { value: 'Romance', label: 'Romance' },
  { value: 'Anime', label: 'Anime' },
  { value: 'Family', label: 'Familiar' },
  { value: 'Medical', label: 'Médico' },
  { value: 'Legal', label: 'Legal' },
  { value: 'Supernatural', label: 'Sobrenatural' },
  { value: 'Espionage', label: 'Espionaje' },
  { value: 'War', label: 'Bélica' },
  { value: 'History', label: 'Histórica' },
  { value: 'Children', label: 'Infantil' },
  { value: 'Sports', label: 'Deportes' },
  { value: 'Music', label: 'Musical' },
  { value: 'Nature', label: 'Naturaleza' },
];

const PAGE_SIZE = 24;
const SEARCH_DELAY_MS = 300;

export default function CatalogView({ onOpenShow, onRequireLogin }: CatalogViewProps) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [genre, setGenre] = useState('');
  const [sort, setSort] = useState<CatalogSort>('all');
  const [limit, setLimit] = useState(PAGE_SIZE);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search);
      setLimit(PAGE_SIZE);
    }, SEARCH_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [search]);

  const catalog = useAsyncData(
    () => fetchCatalog({ search: debouncedSearch, genre, sort }, limit),
    [debouncedSearch, genre, sort, limit],
  );

  const shows = catalog.data ?? [];
  const canLoadMore = shows.length === limit;

  const changeSort = (next: CatalogSort) => {
    setSort(next);
    setLimit(PAGE_SIZE);
  };

  const changeGenre = (next: string) => {
    setGenre(next);
    setLimit(PAGE_SIZE);
  };

  return (
    <section className="space-y-6">
      <div className="space-y-6 rounded-3xl border border-slate-200 bg-gradient-to-r from-pastel-rose/60 via-pastel-lavender/60 to-pastel-sage/60 p-6 shadow-sm dark:border-slate-800 dark:from-pastel-roseDark/40 dark:via-pastel-lavenderDark/40 dark:to-pastel-sageDark/40 sm:p-8">
        <div className="space-y-2">
          <span className="inline-block rounded-full bg-white/80 px-3 py-1 text-[11px] font-bold text-pastel-accent shadow-sm dark:bg-slate-900/80 dark:text-pastel-rose">
            Tu radar de series EE. UU. y España
          </span>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl lg:text-4xl">
            Explora todas las series, temporadas y fechas oficiales.
          </h1>
        </div>

        <label className="relative block">
          <span className="sr-only">Buscar series</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cualquier serie americana o española..."
            className="w-full rounded-2xl border border-slate-200 bg-white/90 py-3 pl-11 pr-4 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-pastel-accent dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-100"
          />
        </label>
      </div>

      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800 md:flex-row md:items-center">
        <div className="flex flex-wrap gap-2">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => changeSort(option.value)}
              aria-pressed={sort === option.value}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                sort === option.value
                  ? 'bg-pastel-rose text-pastel-accentHover shadow-sm dark:bg-pastel-roseDark dark:text-pastel-rose'
                  : 'bg-white text-slate-700 hover:bg-pastel-rose/40 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <label className="relative inline-flex items-center">
          <span className="sr-only">Filtrar por género</span>
          <select
            value={genre}
            onChange={(e) => changeGenre(e.target.value)}
            className="appearance-none rounded-full border border-slate-200 bg-white py-1.5 pl-4 pr-9 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-pastel-accent focus:outline-none focus:ring-2 focus:ring-pastel-accent dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="">Todos los géneros</option>
            {GENRE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 h-3.5 w-3.5 text-slate-500" />
        </label>
      </div>

      {catalog.loading && <LoadingState label="Buscando series en el catálogo oficial..." />}
      {catalog.error && <ErrorState message={catalog.error} onRetry={catalog.reload} />}
      {catalog.data && shows.length === 0 && <EmptyState message="No hay series que coincidan con tu búsqueda." />}
      {catalog.data && shows.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 md:grid-cols-4 lg:grid-cols-5">
            {shows.map((show) => (
              <ShowCard key={show.id} show={show} onOpen={onOpenShow} onRequireLogin={onRequireLogin} />
            ))}
          </div>
          {canLoadMore && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setLimit((current) => current + PAGE_SIZE)}
                className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-pastel-rose/40 dark:bg-slate-800 dark:text-slate-200"
              >
                Mostrar más series
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
