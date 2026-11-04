import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { formatDate } from '@/lib/format';
import { SPECIAL_TAG_LABELS, SPECIAL_TAG_STYLES } from '@/lib/catalog';
import type { Episode, EpisodeRole } from '@/lib/types';

type ShowSeasonsProps = {
  episodes: Episode[];
};

const ROLE_LABELS: Record<Exclude<EpisodeRole, 'regular'>, string> = {
  series_premiere: 'Estreno de Serie',
  season_premiere: 'Estreno de Temporada',
  season_finale: 'Final de Temporada',
  mid_season_finale: 'Final Mitad Temporada',
};

const ROLE_STYLES: Record<Exclude<EpisodeRole, 'regular'>, string> = {
  series_premiere: 'bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-100',
  season_premiere: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-100',
  season_finale: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-100',
  mid_season_finale: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-100',
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
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {list.map((episode) => {
                  const role = episode.role_override;
                  const hasSpecialTag = episode.special_tag && episode.special_tag !== null;
                  const hasRoleBadge = role && role !== 'regular';
                  return (
                    <li key={episode.tvmaze_episode_id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                      <div className="min-w-0 flex-1">
                        <span className="truncate text-slate-800 dark:text-slate-200">
                          <span className="mr-2 font-bold text-pastel-accent">E{episode.number}</span>
                          {episode.name ?? 'Sin título'}
                        </span>
                        {(hasRoleBadge || hasSpecialTag) && (
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {hasRoleBadge && role && role !== 'regular' && (
                              <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${ROLE_STYLES[role]}`}>
                                {ROLE_LABELS[role]}
                              </span>
                            )}
                            {hasSpecialTag && episode.special_tag && (
                              <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${SPECIAL_TAG_STYLES[episode.special_tag]}`}>
                                {SPECIAL_TAG_LABELS[episode.special_tag]}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <span className="shrink-0 text-xs text-slate-500">
                        {formatDate(episode.airdate)}
                        {episode.runtime ? ` · ${episode.runtime} min` : ''}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
