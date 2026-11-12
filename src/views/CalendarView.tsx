import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Pencil, Plus, Tv } from 'lucide-react';
import AdminCalendarEditor from '@/components/AdminCalendarEditor';
import { EmptyState, ErrorState, LoadingState } from '@/components/PageStates';
import { useAuth } from '@/context/AuthContext';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useToday } from '@/hooks/useToday';
import { fetchCalendarEpisodes, SPECIAL_TAG_LABELS, SPECIAL_TAG_STYLES } from '@/lib/catalog';
import { formatDate, monthBounds, parseIsoDate, toIsoDate } from '@/lib/format';
import type { CalendarEpisode, EpisodeRole, SpecialTag } from '@/lib/types';

type CalendarViewProps = {
  onOpenShow: (showId: number) => void;
};

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTHS = Array.from({ length: 12 }, (_, index) =>
  new Date(2000, index, 1).toLocaleDateString('es-ES', { month: 'long' }),
);
const YEAR_SPAN = 10;
const MAX_CHIPS_PER_DAY = 2;

const ROLE_LEGEND: { role: EpisodeRole; label: string; chip: string; dot: string }[] = [
  { role: 'regular', label: 'Emisión Normal', chip: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-100', dot: 'bg-slate-300 dark:bg-slate-500' },
  { role: 'series_premiere', label: 'Estreno Serie', chip: 'bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-100', dot: 'bg-sky-400' },
  { role: 'season_premiere', label: 'Estreno Temporada', chip: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-100', dot: 'bg-emerald-400' },
    { role: 'mid_season_finale', label: 'Final Mitad Temporada', chip: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-100', dot: 'bg-amber-400' },
  { role: 'season_finale', label: 'Final Temporada', chip: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-100', dot: 'bg-rose-400' },
];

const ROLE_CHIP: Record<EpisodeRole, string> = Object.fromEntries(ROLE_LEGEND.map((item) => [item.role, item.chip])) as Record<EpisodeRole, string>;

function buildMonthGrid(year: number, monthIndex: number): (string | null)[] {
  const firstWeekday = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells: (string | null)[] = Array(firstWeekday).fill(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(toIsoDate(new Date(year, monthIndex, day)));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function CalendarView({ onOpenShow }: CalendarViewProps) {
  const today = useToday();
  const todayDate = parseIsoDate(today);
  const [cursor, setCursor] = useState({ year: todayDate.getFullYear(), month: todayDate.getMonth() });
  const [selectedDay, setSelectedDay] = useState<string | null>(today);
  const [editor, setEditor] = useState<{ episode: CalendarEpisode | null } | null>(null);
  const { isAdmin } = useAuth();

  const bounds = monthBounds(cursor.year, cursor.month);
  const calendar = useAsyncData(() => fetchCalendarEpisodes(bounds.start, bounds.end), [bounds.start, bounds.end]);

  const episodesByDay = useMemo(() => {
    const map = new Map<string, CalendarEpisode[]>();
    for (const episode of calendar.data ?? []) {
      const list = map.get(episode.airdate) ?? [];
      list.push(episode);
      map.set(episode.airdate, list);
    }
    return map;
  }, [calendar.data]);

  const cells = useMemo(() => buildMonthGrid(cursor.year, cursor.month), [cursor]);
  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  const selectedEpisodes = selectedDay ? (episodesByDay.get(selectedDay) ?? []) : [];
  const years = Array.from({ length: YEAR_SPAN * 2 + 1 }, (_, index) => todayDate.getFullYear() - YEAR_SPAN + index);

  const shiftMonth = (delta: number) => {
    setCursor((prev) => {
      const next = new Date(prev.year, prev.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
    setSelectedDay(null);
  };

  const goToToday = () => {
    setCursor({ year: todayDate.getFullYear(), month: todayDate.getMonth() });
    setSelectedDay(today);
  };

  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-pastel-accent">Calendario</p>
        <h1 className="text-2xl font-black capitalize text-slate-900 dark:text-white sm:text-3xl">Estrenos de {monthLabel}</h1>
        <p className="max-w-xl text-sm text-slate-600 dark:text-slate-300">Calendario de episodios de series que siguen en emisión o se estrenarán próximamente.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                aria-label="Mes anterior"
                className="flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition hover:bg-pastel-rose/60 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                aria-label="Mes siguiente"
                className="flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition hover:bg-pastel-rose/60 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <select
                aria-label="Mes"
                value={cursor.month}
                onChange={(e) => {
                  setCursor((prev) => ({ ...prev, month: Number(e.target.value) }));
                  setSelectedDay(null);
                }}
                className="rounded-xl border border-slate-200 bg-pastel-cream px-3 py-2 text-sm font-semibold capitalize text-slate-800 focus:border-pastel-accent focus:outline-none focus:ring-2 focus:ring-pastel-accent/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                {MONTHS.map((name, index) => (
                  <option key={name} value={index}>
                    {name}
                  </option>
                ))}
              </select>
              <select
                aria-label="Año"
                value={cursor.year}
                onChange={(e) => {
                  setCursor((prev) => ({ ...prev, year: Number(e.target.value) }));
                  setSelectedDay(null);
                }}
                className="rounded-xl border border-slate-200 bg-pastel-cream px-3 py-2 text-sm font-semibold text-slate-800 focus:border-pastel-accent focus:outline-none focus:ring-2 focus:ring-pastel-accent/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={goToToday}
                className="rounded-xl bg-pastel-accent px-3.5 py-2 text-sm font-bold text-white transition hover:bg-pastel-accentHover"
              >
                Hoy
              </button>
            </div>
          </div>

          <ul className="mb-4 flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium text-slate-600 dark:text-slate-300">
            {ROLE_LEGEND.map((item) => (
              <li key={item.role} className="flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-full ${item.dot}`} />
                {item.label}
              </li>
            ))}
          </ul>

          <div className="grid grid-cols-7 gap-1 pb-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {WEEKDAYS.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          {calendar.loading && <LoadingState label="Cargando estrenos..." />}
          {calendar.error && <ErrorState message={calendar.error} onRetry={calendar.reload} />}

          {calendar.data && (
            <div className="grid grid-cols-7 gap-1">
              {cells.map((iso, index) => {
                if (!iso) return <div key={`empty-${index}`} className="min-h-20 rounded-xl sm:min-h-24" />;
                const dayEpisodes = episodesByDay.get(iso) ?? [];
                const isToday = iso === today;
                const isPast = iso < today;
                const isSelected = iso === selectedDay;
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => setSelectedDay(iso)}
                    className={`flex min-h-20 flex-col gap-1 rounded-xl border p-1.5 text-left transition sm:min-h-24 sm:p-2 ${
                      isSelected
                        ? 'border-pastel-accent bg-white shadow-sm ring-2 ring-pastel-accent/20 dark:bg-slate-900'
                        : isPast
                          ? 'border-transparent bg-slate-50 hover:border-slate-200 dark:bg-slate-800/40 dark:hover:border-slate-700'
                          : 'border-transparent hover:border-slate-200 hover:bg-pastel-cream dark:hover:border-slate-700 dark:hover:bg-slate-800'
                    } ${isPast ? 'opacity-70' : ''}`}
                  >
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                        isToday
                          ? 'bg-pastel-accent text-white ring-2 ring-pastel-accent/40 ring-offset-2 dark:ring-offset-slate-900'
                          : isPast
                            ? 'text-slate-400 dark:text-slate-500'
                            : 'text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {parseIsoDate(iso).getDate()}
                    </span>
                    {dayEpisodes.slice(0, MAX_CHIPS_PER_DAY).map((episode) => (
                      <span
                        key={episode.tvmaze_episode_id}
                        className={`line-clamp-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold sm:text-[11px] ${
                          isPast ? 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400' : episode.special_tag ? SPECIAL_TAG_STYLES[episode.special_tag] : ROLE_CHIP[episode.role]
                        }`}
                      >
                        {episode.show.title}
                      </span>
                    ))}
                    {dayEpisodes.length > MAX_CHIPS_PER_DAY && (
                      <span className={`text-[10px] font-semibold ${isPast ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'}`}>
                        +{dayEpisodes.length - MAX_CHIPS_PER_DAY} más
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {selectedDay ? formatDate(selectedDay) : 'Selecciona un día'}
          </h2>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setEditor({ episode: null })}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-pastel-accent/60 px-3 py-2.5 text-sm font-bold text-pastel-accent transition hover:bg-pastel-rose/40"
            >
              <Plus className="h-4 w-4" />
              Añadir episodio
            </button>
          )}
          {calendar.data && selectedDay && selectedEpisodes.length === 0 && (
            <EmptyState message="No hay episodios programados este día." />
          )}
          <ul className="space-y-3">
            {selectedEpisodes.map((episode) => {
              const legend = ROLE_LEGEND.find((item) => item.role === episode.role);
              return (
                <li key={episode.tvmaze_episode_id} className="flex items-stretch gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenShow(episode.show.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex h-14 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                      {episode.show.poster_url ? (
                        <img src={episode.show.poster_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Tv className="h-5 w-5 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{episode.show.title}</p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        T{episode.season} · E{episode.number}
                        {episode.name ? ` · ${episode.name}` : ''}
                      </p>
                      {legend && legend.role !== 'regular' && (
                        <span className={`mt-1 inline-block rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${ROLE_CHIP[episode.role]}`}>
                          {legend.label}
                        </span>
                      )}
                      {episode.special_tag && (
                        <span className={`mt-1 ml-1 inline-block rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${SPECIAL_TAG_STYLES[episode.special_tag]}`}>
                          {SPECIAL_TAG_LABELS[episode.special_tag]}
                        </span>
                      )}
                    </div>
                  </button>
                  {isAdmin && (
                    <button
                      type="button"
                      aria-label={`Editar episodio de ${episode.show.title}`}
                      onClick={() => setEditor({ episode })}
                      className="flex w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-pastel-rose hover:text-pastel-accent dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </aside>
      </div>
      {editor && (
        <AdminCalendarEditor
          episode={editor.episode}
          defaultDate={selectedDay ?? today}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            calendar.reload();
          }}
        />
      )}
    </section>
  );
}
