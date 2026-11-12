import { Star, Tv } from 'lucide-react';
import ListToggle from '@/components/ListToggle';
import { statusLabel } from '@/lib/format';
import type { ShowListItem } from '@/lib/types';

type ShowCardProps = {
  show: ShowListItem;
  onOpen: (showId: number) => void;
  onRequireLogin: () => void;
};

const CAPSULE = 'rounded-lg bg-slate-900/60 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm backdrop-blur-md';

export default function ShowCard({ show, onOpen, onRequireLogin }: ShowCardProps) {
  const status = statusLabel(show.tv_status);
  const platform = show.es_platforms[0] ?? show.us_platforms[0] ?? show.network_name ?? 'Sin plataforma';

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
          <p className="mt-0.5 line-clamp-1 text-[9px] font-medium text-slate-500 dark:text-slate-400">{show.genres ?? 'Sin género'}</p>
        </button>
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          {show.rating !== null ? (
            <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600">
              <Star className="h-3 w-3 fill-current" />
              {show.rating}
            </span>
          ) : <span />}
          <div className="flex min-w-0 items-center gap-1 flex-wrap justify-end">
            {show.is_miniseries && (
              <span className="shrink-0 rounded-full bg-pastel-gold px-1.5 py-px text-[8px] font-bold text-amber-800 dark:bg-pastel-goldDark dark:text-amber-200">Miniserie</span>
            )}
            {show.is_spinoff && (
              <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-px text-[8px] font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">Spin-off</span>
            )}
            {show.is_reboot && (
              <span className="shrink-0 rounded-full bg-purple-100 px-1.5 py-px text-[8px] font-bold text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">Reboot</span>
            )}
            {show.is_secuela && (
              <span className="shrink-0 rounded-full bg-blue-100 px-1.5 py-px text-[8px] font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">Secuela</span>
            )}
            {show.is_prequel && (
              <span className="shrink-0 rounded-full bg-emerald-100 px-1.5 py-px text-[8px] font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">Precuela</span>
            )}
            <span className={`shrink-0 rounded-full px-1.5 py-px text-[8px] font-bold ${status.className}`}>{status.label}</span>
          </div>
        </div>
      </div>
    </article>
  );
}