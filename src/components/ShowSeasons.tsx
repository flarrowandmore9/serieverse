import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { formatDate } from '@/lib/format';
import { SPECIAL_TAG_LABELS, SPECIAL_TAG_STYLES } from '@/lib/catalog';
import type { Episode, EpisodeRole } from '@/lib/types';

type ShowSeasonsProps = {
  episodes: Episode[];
};

const ROLE_LABELS: Partial<Record<EpisodeRole, string>> = {
  series_premiere: 'Estreno',
  season_premiere: 'Estreno T.',
  season_finale: 'Final T.',
  mid_season_finale: 'Final Mitad T',
};

const ROLE_STYLES: Partial<Record<EpisodeRole, string>> = {
  series_premiere: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-100',
  season_premiere: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-100',
  season_finale: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-100',
  mid_season_finale: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-100',
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
                {list.map((episode) => {
                  const role = episode.role_override ?? 'regular';
                  const showRoleBadge = role !== 'regular';
                  const showSpecialBadge = episode.special_tag !== null && episode.special_tag !== undefined;
                  return (
                    <li key={episode.tvmaze_episode_id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="shrink-0 font-bold text-pastel-accent">E{episode.number}</span>
                        <span className="truncate text-slate-800 dark:text-slate-200">{episode.name ?? 'Sin título'}</span>
                        {showRoleBadge && (
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${ROLE_STYLES[role]}`}>{ROLE_LABELS[role]}</span>
                        )}
                        {showSpecialBadge && episode.special_tag !== null && (
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${SPECIAL_TAG_STYLES[episode.special_tag]}`}>{SPECIAL_TAG_LABELS[episode.special_tag]}</span>
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
