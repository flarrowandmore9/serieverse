import { useMemo, useState } from 'react';
import { Check, CheckCheck, ChevronDown } from 'lucide-react';
import { formatDate } from '@/lib/format';
import { SPECIAL_TAG_LABELS, SPECIAL_TAG_STYLES } from '@/lib/catalog';
import type { Episode, EpisodeRole } from '@/lib/types';

type ShowSeasonsProps = {
  episodes: Episode[];
  watchedIds: Set<number>;
  onToggleEpisode: (episodeId: number, nextWatched: boolean) => void;
  onToggleSeason: (episodeIds: number[], nextWatched: boolean) => void;
};

const ROLE_LABELS: Partial<Record<EpisodeRole, string>> = {
  series_premiere: 'Estreno',
  season_premiere: 'Estreno Temporada',
  mid_season_finale: 'Final Mitad Temporada',
  season_finale: 'Final Temporada',
};

const ROLE_STYLES: Partial<Record<EpisodeRole, string>> = {
  series_premiere: 'inline-block rounded-md px-1.5 py-0.5 text-[10px] font-semibold bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-100',
  season_premiere: 'inline-block rounded-md px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-100',
  mid_season_finale: 'inline-block rounded-md px-1.5 py-0.5 text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-100',
  season_finale: 'inline-block rounded-md px-1.5 py-0.5 text-[10px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-100',
};

export default function ShowSeasons({ episodes, watchedIds, onToggleEpisode, onToggleSeason }: ShowSeasonsProps) {
  const seasons = useMemo(() => {
    const grouped = new Map<number, Episode[]>();
    for (const episode of episodes) {
      const list = grouped.get(episode.season) ?? [];
      list.push(episode);
      grouped.set(episode.season, list);
    }
    return [...grouped.entries()].sort(([a], [b]) => a - b);
  }, [episodes]);

  const [openSeason, setOpenSeason] = useState<number | null>(seasons[0]?.[0] ?? null);

  if (seasons.length === 0) {
    return <p className="text-sm text-slate-500">Todavía no hay episodios cargados para esta serie.</p>;
  }

  return (
    <div className="space-y-4 rounded-2xl border border-pastel-accent/25 bg-pastel-cream/60 p-4 dark:bg-slate-800/60">
      {seasons.map(([season, list]) => {
        const isOpen = openSeason === season;
        const seasonEpIds = list.map((e) => e.tvmaze_episode_id);
        const watchedCount = seasonEpIds.filter((id) => watchedIds.has(id)).length;
        const allSeasonWatched = list.length > 0 && watchedCount === list.length;

        return (
          <div key={season} className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-2 px-4 py-3 transition hover:bg-pastel-cream/60 dark:hover:bg-slate-800">
              <button
                type="button"
                onClick={() => setOpenSeason(isOpen ? null : season)}
                aria-expanded={isOpen}
                className="flex flex-1 items-center justify-between text-left"
              >
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-pastel-accent">
                    Temporada {season} · {list.length} episodios
                    {watchedCount > 0 && (
                      <span className="ml-2 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        ({watchedCount}/{list.length} vistos)
                      </span>
                    )}
                  </p>
                </div>
                <ChevronDown className={`mr-2 h-4 w-4 text-slate-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
              </button>

              <button
                type="button"
                onClick={() => onToggleSeason(seasonEpIds, !allSeasonWatched)}
                title={allSeasonWatched ? 'Desmarcar temporada como vista' : 'Marcar temporada como vista'}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition ${
                  allSeasonWatched
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-pastel-rose/50 hover:text-pastel-accent dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                {allSeasonWatched ? 'Temporada vista' : 'Marcar temporada'}
              </button>
            </div>

            {isOpen && (
              <ul className="divide-y divide-slate-200 border-t border-slate-200 dark:divide-slate-700 dark:border-slate-700">
                {list.map((episode) => {
                  const role = episode.role_override ?? 'regular';
                  const showRoleBadge = role !== 'regular';
                  const showSpecialBadge = episode.special_tag !== null && episode.special_tag !== undefined;
                  const isWatched = watchedIds.has(episode.tvmaze_episode_id);

                  return (
                    <li key={episode.tvmaze_episode_id} className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="shrink-0 text-xs font-bold text-pastel-accent">E{episode.number}</span>
                          <span className={`text-xs font-bold ${isWatched ? 'text-slate-400 line-through dark:text-slate-500' : 'text-slate-900 dark:text-white'}`}>
                            {episode.name ?? 'Sin título'}
                          </span>
                          {showRoleBadge && (
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${ROLE_STYLES[role]}`}>
                              {ROLE_LABELS[role]}
                            </span>
                          )}
                          {showSpecialBadge && episode.special_tag !== null && (
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${SPECIAL_TAG_STYLES[episode.special_tag]}`}>
                              {SPECIAL_TAG_LABELS[episode.special_tag]}
                            </span>
                          )}
                        </div>

                        {episode.overview_es && (
                          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                            {episode.overview_es}
                          </p>
                        )}

                        <p className="text-[11px] text-slate-500">
                          {formatDate(episode.airdate)}
                          {episode.runtime ? ` · ${episode.runtime} min` : ''}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => onToggleEpisode(episode.tvmaze_episode_id, !isWatched)}
                        title={isWatched ? 'Marcar como no visto' : 'Marcar episodio como visto'}
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border transition ${
                          isWatched
                            ? 'border-emerald-500 bg-emerald-500 text-white shadow-xs'
                            : 'border-slate-200 bg-slate-50 text-slate-400 hover:border-pastel-accent hover:text-pastel-accent dark:border-slate-700 dark:bg-slate-800'
                        }`}
                      >
                        <Check className="h-4 w-4" />
                      </button>
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
