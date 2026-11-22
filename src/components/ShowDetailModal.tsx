import { useState } from 'react';
import { CheckCircle2, Info, Layers, Pencil, Star, Tv } from 'lucide-react';
import Modal from '@/components/Modal';
import ListToggle from '@/components/ListToggle';
import AdminEpisodeEditor from '@/components/AdminEpisodeEditor';
import ShowSeasons from '@/components/ShowSeasons';
import EditShowForm from '@/components/EditShowForm';
import { ErrorState, LoadingState } from '@/components/PageStates';
import { useAuth } from '@/context/AuthContext';
import { useAsyncData } from '@/hooks/useAsyncData';
import { fetchEpisodes, fetchShow } from '@/lib/catalog';
import {
  fetchWatchedState,
  toggleEpisodeWatched,
  toggleSeasonWatched,
  toggleShowWatched,
} from '@/lib/userData';
import { formatDate, formatPlatforms, statusLabel } from '@/lib/format';

type ShowDetailModalProps = {
  showId: number;
  onClose: () => void;
  onRequireLogin: () => void;
};

const showTypeLabels: Record<string, string> = {
  SpinOff: 'Spin-off',
  Reboot: 'Reboot',
  Secuela: 'Secuela',
  Precuela: 'Precuela',
  Anthology: 'Antología',
  Miniseries: 'Miniserie',
};

export default function ShowDetailModal({ showId, onClose, onRequireLogin }: ShowDetailModalProps) {
  const { session, isAdmin } = useAuth();
  const [editing, setEditing] = useState(false);
  const [editingEpisodes, setEditingEpisodes] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'seasons'>('info');

  const detail = useAsyncData(async () => {
    const [show, episodes, watched] = await Promise.all([
      fetchShow(showId),
      fetchEpisodes(showId),
      fetchWatchedState(showId),
    ]);
    if (!show) throw new Error('not-found');
    return { show, episodes, watched };
  }, [showId, session?.user?.id]);

  const show = detail.data?.show ?? null;
  const episodes = detail.data?.episodes ?? [];
  const watchedIds = detail.data?.watched.watchedEpisodeIds ?? new Set<number>();
  const isShowWatched = detail.data?.watched.isShowWatched ?? false;
  const status = statusLabel(show?.tv_status ?? null);

  const rawShowType = show?.show_type;
  const showType = rawShowType ? (showTypeLabels[rawShowType] ?? rawShowType) : null;
  const franchise = show?.franchise;

  const handleToggleShowWatched = async () => {
    if (!session) {
      onRequireLogin();
      return;
    }
    if (!show) return;
    const allIds = episodes.map((e) => e.tvmaze_episode_id);
    await toggleShowWatched(show.id, allIds, !isShowWatched);
    detail.reload();
  };

  const handleToggleSeasonWatched = async (episodeIds: number[], nextWatched: boolean) => {
    if (!session) {
      onRequireLogin();
      return;
    }
    if (!show) return;
    await toggleSeasonWatched(show.id, episodeIds, nextWatched);
    detail.reload();
  };

  const handleToggleEpisodeWatched = async (episodeId: number, nextWatched: boolean) => {
    if (!session) {
      onRequireLogin();
      return;
    }
    if (!show) return;
    await toggleEpisodeWatched(show.id, episodeId, nextWatched);
    detail.reload();
  };

  return (
    <Modal title={editing ? 'Editar serie' : (show?.title ?? 'Serie')} onClose={onClose} maxWidth="max-w-4xl">
      {detail.loading && <LoadingState label="Cargando serie..." />}
      {detail.error && <ErrorState message={detail.error} onRetry={detail.reload} />}

      {show && editing && (
        <EditShowForm
          show={show}
          onCancel={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            detail.reload();
          }}
        />
      )}

      {show && !editing && (
        <div className="space-y-6">
          <div className="flex flex-col gap-5 sm:flex-row">
            <div className="mx-auto w-40 shrink-0 overflow-hidden rounded-2xl bg-slate-100 shadow-lg ring-1 ring-slate-200 sm:mx-0 sm:w-48 dark:ring-slate-700">
              {show.poster_url ? (
                <img src={show.poster_url} alt={show.title} className="aspect-[2/3] w-full object-cover" />
              ) : (
                <div className="flex aspect-[2/3] items-center justify-center text-slate-400">
                  <Tv className="h-10 w-10" />
                </div>
              )}
            </div>

            <div className="flex-1 space-y-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">{show.title}</h2>
                  <span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${status.className}`}>{status.label}</span>
                  {show.is_miniseries && (
                    <span className="rounded-lg bg-pastel-gold px-2.5 py-1 text-xs font-bold text-amber-800">Miniserie</span>
                  )}
                </div>

                <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
                  <span><span className="font-semibold text-slate-700 dark:text-slate-300">Estreno:</span> {formatDate(show.premiered)}</span>
                  <span aria-hidden="true">·</span>
                  <span><span className="font-semibold text-slate-700 dark:text-slate-300">Emisión:</span> {show.network_name ?? 'Sin datos'}</span>
                  <span aria-hidden="true">·</span>
                  <span><span className="font-semibold text-slate-700 dark:text-slate-300">Duración Media:</span> {show.runtime ? `${show.runtime} min` : 'Sin datos'}</span>
                </p>

                <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
                  <span><span className="font-semibold text-slate-700 dark:text-slate-300">Género:</span> {show.genres ?? 'Sin datos'}</span>

                  {showType && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span><span className="font-semibold text-slate-700 dark:text-slate-300">Tipo de Serie:</span> {showType}</span>
                    </>
                  )}

                  {franchise && franchise.trim() !== '' && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span><span className="font-semibold text-slate-700 dark:text-slate-300">Franquicia:</span> {franchise}</span>
                    </>
                  )}
                </p>
              </div>

              <div className="flex flex-col divide-y divide-slate-200 rounded-xl bg-slate-50 text-sm sm:flex-row sm:divide-x sm:divide-y-0 dark:divide-slate-700 dark:bg-slate-800/80">
                <p className="flex-1 px-4 py-2.5">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">Ver en EE.UU:</span>{' '}
                  <span className="font-bold text-slate-900 dark:text-slate-100">{formatPlatforms(show.us_platforms)}</span>
                </p>
                <p className="flex-1 px-4 py-2.5">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">Ver en España:</span>{' '}
                  <span className="font-bold text-slate-900 dark:text-slate-100">{formatPlatforms(show.es_platforms)}</span>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <ListToggle showId={show.id} onRequireLogin={onRequireLogin} />

                <button
                  type="button"
                  onClick={handleToggleShowWatched}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                    isShowWatched
                      ? 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-700'
                      : 'border border-slate-200 bg-white text-slate-700 hover:border-emerald-500 hover:text-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {isShowWatched ? 'Serie vista' : 'Marcar serie vista'}
                </button>

                {show.rating !== null && (
                  <span className="flex items-center gap-1 rounded-xl bg-amber-50 px-3 py-2 text-sm font-bold text-amber-600 ring-1 ring-amber-200 dark:bg-amber-900/30 dark:ring-amber-800">
                    <Star className="h-4 w-4 fill-current" />
                    {show.rating}
                  </span>
                )}

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 transition hover:border-pastel-accent hover:text-pastel-accent dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <Pencil className="h-4 w-4" />
                    Editar serie
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="border-b border-slate-200 dark:border-slate-800">
            <div role="tablist" aria-label="Contenido de la serie" className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'info'}
                  onClick={() => setActiveTab('info')}
                  className={`flex items-center gap-1.5 border-b-2 px-0.5 pb-3 text-sm font-bold transition ${activeTab === 'info' ? 'border-pastel-accent text-pastel-accent' : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                >
                  <Info className="h-4 w-4" />
                  Información
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'seasons'}
                  onClick={() => setActiveTab('seasons')}
                  className={`flex items-center gap-1.5 border-b-2 px-0.5 pb-3 text-sm font-bold transition ${activeTab === 'seasons' ? 'border-pastel-accent text-pastel-accent' : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                >
                  <Layers className="h-4 w-4" />
                  Temporadas ({episodes.length ? new Set(episodes.map((episode) => episode.season)).size : 0})
                </button>
              </div>

              {isAdmin && activeTab === 'seasons' && (
                <button
                  type="button"
                  onClick={() => setEditingEpisodes((prev) => !prev)}
                  className="mb-2 flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-pastel-rose hover:text-pastel-accent dark:bg-slate-800 dark:text-slate-200"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {editingEpisodes ? 'Volver a vista normal' : 'Editar episodios (Admin)'}
                </button>
              )}
            </div>
          </div>

          {activeTab === 'info' ? (
            <section className="space-y-5">
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Sinopsis</h4>
                <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{show.synopsis_es ?? 'Sin sinopsis disponible.'}</p>
              </div>
              {show.characters && show.characters.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Reparto Principal</h4>
                  <ul className="grid grid-cols-2 gap-2">
                    {show.characters.slice(0, 8).map((member) => (
                      <li key={`${member.actor}-${member.character}`} className="flex items-center gap-2.5 rounded-xl bg-pastel-cream p-2 dark:bg-slate-800">
                        <img src={member.image} alt={member.character} loading="lazy" className="h-10 w-10 shrink-0 rounded-full object-cover" />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">{member.character}</p>
                          <p className="truncate text-[11px] text-slate-500">{member.actor}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          ) : (
            <section className="space-y-4">
              {isAdmin && editingEpisodes ? (
                <AdminEpisodeEditor
                  show={{ id: show.id, title: show.title }}
                  episodes={episodes}
                  onChanged={detail.reload}
                />
              ) : (
                <ShowSeasons
                  episodes={episodes}
                  watchedIds={watchedIds}
                  onToggleEpisode={handleToggleEpisodeWatched}
                  onToggleSeason={handleToggleSeasonWatched}
                />
              )}
            </section>
          )}
        </div>
      )}
    </Modal>
  );
}