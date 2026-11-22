import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Check, CheckCheck, ChevronDown } from 'lucide-react';
import { formatDate } from '@/lib/format';
import { SPECIAL_TAG_LABELS, SPECIAL_TAG_STYLES } from '@/lib/catalog';
import { fetchWatchedState, toggleEpisodeWatched, toggleSeasonWatched } from '@/lib/userData';
import type { Episode, EpisodeRole } from '@/lib/types';

type ShowSeasonsProps = {
  episodes: Episode[];
  showId?: number;
  onRequireLogin?: () => void;
};

const ROLE_LABELS: Partial<Record<EpisodeRole, string>> = {
  series_premiere: 'Estreno',
  season_premiere: 'Estreno Temporada',
  mid_season_finale: 'Final Mitad Temporada',
  season_finale: 'Final Temporada',
};

const ROLE_STYLES: Partial<Record<EpisodeRole, string>> = {
  series_premiere: 'mt-1 ml-1 inline-block rounded-md px-1.5 py-0.5 text-[10px] font-semibold bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-100',
  season_premiere: 'mt-1 ml-1 inline-block rounded-md px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-100',
  mid_season_finale: 'mt-1 ml-1 inline-block rounded-md px-1.5 py-0.5 text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-100',
  season_finale: 'mt-1 ml-1 inline-block rounded-md px-1.5 py-0.5 text-[10px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-100 ',
};

function EpisodeOverview({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const [hasMoreThanThreeLines, setHasMoreThanThreeLines] = useState(false);
  const pRef = useRef<HTMLParagraphElement | null>(null);

  useLayoutEffect(() => {
    const el = pRef.current;
    if (!el || expanded) return;
    setHasMoreThanThreeLines(el.scrollHeight > el.clientHeight + 1);
  }, [text, expanded]);

  return (
    <div className="mt-1 space-y-0.5">
      <p
        ref={pRef}
        className={`text-xs leading-relaxed text-slate-600 dark:text-slate-300 ${expanded ? '' : 'line-clamp-2'}`}
      >
        {text}
      </p>
      {hasMoreThanThreeLines && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="text-[11px] font-bold text-pastel-accent hover:underline"
        >
          {expanded ? 'Leer menos' : 'Leer más'}
        </button>
      )}
    </div>
  );
}

export default function ShowSeasons({ episodes, showId = 0, onRequireLogin }: ShowSeasonsProps) {
  const [watchedIds, setWatchedIds] = useState<Set<number>>(() => new Set());
  const [openSeason, setOpenSeason] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    fetchWatchedState(showId)
      .then((state) => {
        if (active) setWatchedIds(new Set(state.episodeIds));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [showId]);

  const seasons = useMemo(() => {
    const grouped = new Map<number, Episode[]>();
    for (const episode of episodes) {
      const list = grouped.get(episode.season) ?? [];
      list.push(episode);
      grouped.set(episode.season, list);
    }
    return [...grouped.entries()].sort(([a], [b]) => a - b);
  }, [episodes]);

  const handleToggleEpisode = async (episodeId: number) => {
    const nextWatched = !watchedIds.has(episodeId);
    const ok = await toggleEpisodeWatched(showId, episodeId, nextWatched);
    if (!ok) {
      onRequireLogin?.();
      return;
    }
    setWatchedIds((prev) => {
      const copy = new Set(prev);
      if (nextWatched) copy.add(episodeId);
      else copy.delete(episodeId);
      return copy;
    });
  };

  const handleToggleSeason = async (list: Episode[]) => {
    const ids = list.map((e) => e.tvmaze_episode_id);
    const allWatched = ids.length > 0 && ids.every((id) => watchedIds.has(id));
    const nextWatched = !allWatched;
    const ok = await toggleSeasonWatched(showId, ids, nextWatched);
    if (!ok) {
      onRequireLogin?.();
      return;
    }
    setWatchedIds((prev) => {
      const copy = new Set(prev);
      for (const id of ids) {
        if (nextWatched) copy.add(id);
        else copy.delete(id);
      }
      return copy;
    });
  };

  if (seasons.length === 0) {
    return <p className="text-sm text-slate-500">Todavía no hay episodios cargados para esta serie.</p>;
  }

  return (
    <div className="space-y-4 rounded-2xl border border-pastel-accent/25 bg-pastel-cream/60 p-4 dark:bg-slate-800/60">
      {seasons.map(([season, list]) => {
        const isOpen = openSeason === season;
        const seasonWatchedCount = list.filter((e) => watchedIds.has(e.tvmaze_episode_id)).length;
        const allSeasonWatched = list.length > 0 && seasonWatchedCount === list.length;

        return (
          <div key={season} className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-2 px-4 py-3 transition hover:bg-pastel-cream/60 dark:hover:bg-slate-800">
              <button
                type="button"
                onClick={() => setOpenSeason(isOpen ? null : season)}
                aria-expanded={isOpen}
                className="flex flex-1 items-center justify-between text-left"
              >
                <p className="text-xs font-black uppercase tracking-wide text-pastel-accent">
                  Temporada {season} · {list.length} episodios
                </p>
                <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
              </button>

              <button
                type="button"
                onClick={() => handleToggleSeason(list)}
                title={allSeasonWatched ? 'Desmarcar temporada como vista' : 'Marcar temporada como vista'}
                className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition ${
                  allSeasonWatched
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200'
                }`}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                {allSeasonWatched ? 'Vista' : 'Marcar temporada'}
              </button>
            </div>

            {isOpen && (
              <ul className="divide-y divide-slate-200 border-t border-slate-200 dark:divide-slate-700 dark:border-slate-700">
                {list.map((episode) => {
                  const role = episode.role_override ?? 'regular';
                  const showRoleBadge = role !== 'regular';
                  const showSpecialBadge = episode.special_tag !== null && episode.special_tag !== undefined;
                  const isWatched = watchedIds.has(episode.tvmaze_episode_id);
                  const overview = (episode as Episode & { overview_es?: string | null }).overview_es;

                  return (
                    <li key={episode.tvmaze_episode_id} className="flex items-start justify-between gap-3 px-4 py-2.5 text-sm">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                          <span className="shrink-0 font-bold text-pastel-accent">E{episode.number}</span>
                          <span className={isWatched ? 'line-through opacity-70' : ''}>{episode.name ?? 'Sin título'}</span>
                          {showRoleBadge && (
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${ROLE_STYLES[role]}`}>{ROLE_LABELS[role]}</span>
                          )}
                          {showSpecialBadge && episode.special_tag !== null && (
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${SPECIAL_TAG_STYLES[episode.special_tag]}`}>{SPECIAL_TAG_LABELS[episode.special_tag]}</span>
                          )}
                        </div>
                        {overview && overview.trim() !== '' && <EpisodeOverview text={overview} />}
                      </div>

                      <div className="flex shrink-0 items-center gap-2.5">
                        <span className="text-xs text-slate-500">
                          {formatDate(episode.airdate)}
                          {episode.runtime ? ` · ${episode.runtime} min` : ''}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggleEpisode(episode.tvmaze_episode_id)}
                          aria-label={isWatched ? `Marcar E${episode.number} como no visto` : `Marcar E${episode.number} como visto`}
                          title={isWatched ? 'Visto' : 'Marcar como visto'}
                          className={`flex h-7 w-7 items-center justify-center rounded-lg border transition ${
                            isWatched
                              ? 'border-emerald-500 bg-emerald-500 text-white'
                              : 'border-slate-300 bg-white text-slate-500 hover:border-pastel-accent hover:text-pastel-accent dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      </div>
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