import { useEffect, useState } from 'react';
import { Tv } from 'lucide-react';
import ShowCard from '@/components/ShowCard';
import { EmptyState, ErrorState, LoadingState } from '@/components/PageStates';
import { useAsyncData } from '@/hooks/useAsyncData';
import { fetchPlatformOptions, fetchShowsForPlatform } from '@/lib/catalog';

type PlatformsViewProps = { onOpenShow: (showId: number) => void; onRequireLogin: () => void };
type Region = 'us' | 'es';
type Category = 'networks' | 'platforms';
type Choice = { label: string; names: string[] };

const REGIONS: { value: Region; label: string }[] = [
  { value: 'us', label: 'Estados Unidos' },
  { value: 'es', label: 'España' },
];

const CHOICES: Record<Region, Record<Category, Choice[]>> = {
  es: {
    networks: [
      { label: 'RTVE', names: ['RTVE', 'TVE', 'La 1', 'La 2'] },
      { label: 'Antena 3', names: ['Antena 3', 'A3Series'] },
      { label: 'Cuatro', names: ['Cuatro'] },
      { label: 'Telecinco', names: ['Telecinco'] },
      { label: 'La Sexta', names: ['La Sexta'] },
      { label: 'AXN', names: ['AXN'] },
      { label: 'FOX', names: ['FOX'] },
    ],
    platforms: [
      { label: 'RTVE Play', names: ['RTVE Play'] },
      { label: 'Atresmedia', names: ['Atresplayer', 'Atresplayer Premium', 'Atresplayer Originals', 'Atresmedia Televisión'] },
      { label: 'Mediaset', names: ['Mediaset'] },
      { label: 'Netflix ᴇs', names: ['Netflix ᴇs'] },
      { label: 'Prime Video ᴇs', names: ['Prime Video ᴇs'] },
      { label: 'HBO ᴇs', names: ['HBO ᴇs', 'HBO Max ᴇs'] },
      { label: 'Disney+ ᴇs', names: ['Disney+ ᴇs'] },
      { label: 'Movistar Plus+', names: ['Movistar Plus+'] },
      { label: 'SkyShowtime', names: ['SkyShowtime'] },
      { label: 'Filmin', names: ['Filmin'] },
    ],
  },
  us: {
    networks: [
      { label: 'The CW', names: ['The CW'] },
      { label: 'ABC', names: ['ABC'] },
      { label: 'NBC', names: ['NBC'] },
      { label: 'CBS', names: ['CBS'] },
      { label: 'FOX', names: ['FOX'] },
      { label: 'AMC', names: ['AMC'] },
      { label: 'FX', names: ['FX'] },
      { label: 'Starz', names: ['Starz'] },
      { label: 'Freeform', names: ['Freeform'] },
      { label: 'Showtime', names: ['Showtime'] },
    ],
    platforms: [
      { label: 'Netflix', names: ['Netflix'] },
      { label: 'Prime Video', names: ['Prime Video'] },
      { label: 'HBO', names: ['HBO', 'HBO Max', 'Warner Bros.'] },
      { label: 'Disney+', names: ['Disney+', 'Disney', 'Marvel', 'Star Wars'] },
      { label: 'Hulu', names: ['Hulu'] },
      { label: 'Apple TV', names: ['Apple TV', 'Apple TV+'] },
      { label: 'Paramount', names: ['Paramount', 'Paramount+', 'Paramount Network'] },
      { label: 'Peacock', names: ['Peacock', 'Universal'] },
    ],
  },
};

export default function PlatformsView({ onOpenShow, onRequireLogin }: PlatformsViewProps) {
  const [region, setRegion] = useState<Region>('us');
  const [category, setCategory] = useState<Category>('networks');
  const [platform, setPlatform] = useState<Choice | null>(null);
  const options = useAsyncData(fetchPlatformOptions, []);
  const choices = CHOICES[region][category];

  useEffect(() => {
    setPlatform(choices[0] ?? null);
  }, [region, category]);

  const shows = useAsyncData(
    () => (platform ? fetchShowsForPlatform(platform.names, region) : Promise.resolve([])),
    [platform, region],
  );

  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-pastel-accent">Plataformas y cadenas</p>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">Encuentra series por dónde las ves</h1>
        <p className="max-w-xl text-sm text-slate-600 dark:text-slate-300">Elige un país, una categoría y después una cadena o plataforma.</p>
      </header>

      <div className="flex flex-wrap gap-3">
        <div className="inline-flex rounded-xl bg-slate-100 p-1 text-sm font-semibold dark:bg-slate-800">
          {REGIONS.map((item) => <button key={item.value} type="button" onClick={() => setRegion(item.value)} className={`rounded-lg px-5 py-2 transition ${region === item.value ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100'}`}>{item.label}</button>)}
        </div>
        <div className="inline-flex rounded-xl bg-pastel-rose/60 p-1 text-sm font-semibold dark:bg-slate-800">
          {(['networks', 'platforms'] as Category[]).map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={`rounded-lg px-5 py-2 transition ${category === item ? 'bg-pastel-accent text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}>{item === 'networks' ? 'Cadenas' : 'Plataformas'}</button>)}
        </div>
      </div>

      {options.loading && <LoadingState label="Cargando plataformas..." />}
      {options.error && <ErrorState message={options.error} onRetry={options.reload} />}
      {options.data && choices.length === 0 && <EmptyState message={`Todavía no hay ${category === 'networks' ? 'cadenas' : 'plataformas'} para esta región.`} />}

      {options.data && choices.length > 0 && <div className="space-y-8">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label={category === 'networks' ? 'Cadenas' : 'Plataformas'}>
          {choices.map((choice) => <button key={choice.label} type="button" role="tab" aria-selected={platform?.label === choice.label} onClick={() => setPlatform(choice)} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${platform?.label === choice.label ? 'bg-pastel-accent text-white shadow-sm' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-pastel-rose/40 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700'}`}>{choice.label}</button>)}
        </div>
        {shows.loading && <LoadingState label="Cargando series..." />}
        {shows.error && <ErrorState message={shows.error} onRetry={shows.reload} />}
        {shows.data && <>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{shows.data.length} {shows.data.length === 1 ? 'serie' : 'series'} en {platform?.label}</p>
          {shows.data.length === 0 ? <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 text-slate-500 dark:border-slate-800 dark:bg-slate-900"><Tv className="h-5 w-5 shrink-0" /><p className="text-sm">Aún no hay series asignadas aquí.</p></div> : <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">{shows.data.map((show) => <ShowCard key={show.id} show={show} onOpen={onOpenShow} onRequireLogin={onRequireLogin} />)}</div>}
        </>}
      </div>}
    </section>
  );
}
