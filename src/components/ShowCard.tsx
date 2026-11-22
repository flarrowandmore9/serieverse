import { useState, useEffect } from 'react';
import { Check, Star, Tv } from 'lucide-react';
import ListToggle from '@/components/ListToggle';
import { fetchWatchedState } from '@/lib/userData';
import type { ShowListItem } from '@/lib/types';

type ShowCardProps = {
  show: ShowListItem;
  onOpen: (showId: number) => void;
  onRequireLogin: () => void;
};

const CAPSULE = 'rounded-lg bg-slate-900/60 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm backdrop-blur-md';

const showTypeLabels: Record<string, string> = {
  SpinOff: 'Spin-off',
  Reboot: 'Reboot',
  Secuela: 'Secuela',
  Precuela: 'Precuela',
  Anthology: 'Antología',
  Miniseries: 'Miniserie',
};

export default function ShowCard({ show, onOpen, onRequireLogin }: ShowCardProps) {
  const platform = show.es_platforms?.[0] ?? show.us_platforms?.[0] ?? show.network_name ?? 'Sin plataforma';

  const [customData, setCustomData] = useState<{ show_type?: string; franchise?: string }>({});
  const [isWatched, setIsWatched] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`show_custom_${show.id}`);
      if (saved) {
        setCustomData(JSON.parse(saved));
      }
    } catch {
      // Ignorar errores de formato JSON
    }
  }, [show.id]);

  useEffect(() => {
    let active = true;
    fetchWatchedState(show.id)
      .then((state) => {
        if (active) setIsWatched(state.showWatched || state.episodeIds.length > 0);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [show.id]);

  const rawShowType = show.show_type ?? customData.show_type;
  const showType = rawShowType ? (showTypeLabels[rawShowType] ?? rawShowType) : null;
  const franchise = show.franchise ?? customData.franchise;

  const genresText = show.genres ?? 'Sin género';
  const subtitleText = [genresText, showType, franchise].filter(Boolean).join(' · ');

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
        <button
          type="button"
          onClick={() => onOpen(show.id)}
          aria-label={`Ver ficha de ${show.title}`}
          className="absolute inset-0 z-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pastel-accent"
        />
        {show.poster_url ? (
          <img
            src={show.poster_url}
            alt=""
            loading="lazy"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-slate-400">
            <Tv className="h-10 w-10" />
          </div>
        )}
        <span className={`pointer-events-none absolute left-2 top-2 z-10 max-w-[65%] truncate ${CAPSULE}`}>{platform}</span>
        <div className="absolute right-2 top-2 z-10">
          <ListToggle showId={show.id} onRequireLogin={onRequireLogin} variant="icon" />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <button
          type="button"
          onClick={() => onOpen(show.id)}
          className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-pastel-accent"
        >
          <h3 className="line-clamp-1 text-[11px] font-bold text-slate-900 dark:text-white">{show.title}</h3>
          <p className="mt-0.5 line-clamp-1 text-[9px] font-medium text-slate-500 dark:text-slate-400">
            {subtitleText}
          </p>
        </button>
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          {show.rating !== null ? (
            <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600">
              <Star className="h-3 w-3 fill-current" />
              {show.rating}
            </span>
          ) : <span />}

          {isWatched && (
            <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
              <Check className="h-2.5 w-2.5" />
              Vista
            </span>
          )}
        </div>
      </div>
    </article>
  );
}