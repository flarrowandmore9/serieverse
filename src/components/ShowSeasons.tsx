import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { formatDate } from '@/lib/format';
import type { Episode } from '@/lib/types';

type ShowSeasonsProps = {
  episodes: Episode[];
};

export default function ShowSeasons({ episodes }: ShowSeasonsProps) {
  const seasons = useMemo(() => {
    const grouped = new Map<number, Episode[]>();
    for (const episode of episodes) {
      const list = grouped.get(episode.season) ?? [];
      list.push(episode);
      grouped.set(episode.season, list);
    }
    return [...grouped.entries()].sort(([a], [b]) => a - b);
  }, [episodes]);

  const [openSeason, setOpenSeason] = useState<number | null>(null);

  if (seasons.length === 0) {
    return <p className="text-sm text-slate-500">Todavía no hay episodios cargados para esta serie.</p>;
  }

  return (
    <div className="space-y-3">
      {seasons.map(([season, list]) => {
        const isOpen = openSeason === season;
        const firstAirdate = list[0]?.airdate ?? null;
        const lastAirdate = list[list.length - 1]?.airdate ?? null;
        return (
          <div key={season} className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setOpenSeason(isOpen ? null : season)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-3 bg-pastel-cream px-4 py-3 text-left transition hover:bg-pastel-rose/40 dark:bg-slate-800 dark:hover:bg-slate-700"
            >
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Temporada {season}</p>
                <p className="text-xs text-slate-500">
                  {list.length} episodios · {formatDate(firstAirdate)} al {formatDate(lastAirdate)}
                </p>
              </div>
              <ChevronDown className={`h-4 w-4 text-pastel-accent transition ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
              <ul className="divide-y divide-slate-100">
                {list.map((episode) => (
                  <li key={episode.tvmaze_episode_id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                    <span className="min-w-0 truncate text-slate-800 dark:text-slate-200">
                      <span className="mr-2 font-bold text-pastel-accent">E{episode.number}</span>
                      {episode.name ?? 'Sin título'}
                    </span>
                    <span className="shrink-0 text-xs text-slate-500">
                      {formatDate(episode.airdate)}
                      {episode.runtime ? ` · ${episode.runtime} min` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
