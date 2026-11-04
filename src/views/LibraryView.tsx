import { useMemo, useState, type FormEvent } from 'react';
import { Plus, Trash2, Tv } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '@/components/PageStates';
import { useAsyncData } from '@/hooks/useAsyncData';
import { createFolder, deleteFolder, fetchFolders, fetchListEntries, moveListItem, removeListItem } from '@/lib/userData';

type LibraryViewProps = {
  onOpenShow: (showId: number) => void;
};

const FIXED_FILTERS = ['Todas', 'Favoritas'] as const;

export default function LibraryView({ onOpenShow }: LibraryViewProps) {
  const folders = useAsyncData(fetchFolders, []);
  const entries = useAsyncData(fetchListEntries, []);
  const [activeFolder, setActiveFolder] = useState<string>('Todas');
  const [newFolder, setNewFolder] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const visible = useMemo(
    () => (entries.data ?? []).filter((entry) => activeFolder === 'Todas' || entry.folder === activeFolder),
    [entries.data, activeFolder],
  );

  const countFor = (folder: string) =>
    (entries.data ?? []).filter((entry) => folder === 'Todas' || entry.folder === folder).length;

  const folderNames = useMemo(() => {
    const names = folders.data ?? [];
    return names.includes('Favoritas') ? ['Favoritas', ...names.filter((name) => name !== 'Favoritas')] : names;
  }, [folders.data]);

  const handleCreateFolder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = newFolder.trim();
    if (!name) return;
    setActionError(null);
    try {
      await createFolder(name);
      setNewFolder('');
      setActiveFolder(name);
      folders.reload();
    } catch {
      setActionError('No se pudo crear la carpeta. Puede que ya exista.');
    }
  };

  const removeFolder = async (name: string) => {
    if (!window.confirm(`¿Eliminar la carpeta "${name}"?`)) return;
    setActionError(null);
    try {
      await deleteFolder(name);
      if (activeFolder === name) setActiveFolder('Todas');
      folders.reload();
      entries.reload();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'No se pudo eliminar la carpeta.');
    }
  };

  const changeFolder = async (itemId: number, folder: string) => {
    setBusyId(itemId);
    setActionError(null);
    try {
      await moveListItem(itemId, folder);
      entries.reload();
    } catch {
      setActionError('No se pudo mover la serie. Inténtalo de nuevo.');
    } finally {
      setBusyId(null);
    }
  };

  const removeEntry = async (itemId: number) => {
    setBusyId(itemId);
    setActionError(null);
    try {
      await removeListItem(itemId);
      entries.reload();
    } catch {
      setActionError('No se pudo quitar la serie. Inténtalo de nuevo.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-pastel-accent">Mis Listas</p>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">Tus series guardadas</h1>
        <p className="max-w-xl text-sm text-slate-600 dark:text-slate-300">Organízalas en carpetas para saber qué ves, qué tienes pendiente y qué te encanta.</p>
      </header>

      {(folders.loading || entries.loading) && <LoadingState label="Cargando tu lista..." />}
      {(folders.error || entries.error) && (
        <ErrorState message={folders.error ?? entries.error ?? ''} onRetry={() => { folders.reload(); entries.reload(); }} />
      )}

      {folders.data && entries.data && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            {[...FIXED_FILTERS, ...folderNames.filter((name) => !FIXED_FILTERS.includes(name as (typeof FIXED_FILTERS)[number]))].map((name) => (
              <div key={name} className="flex items-center gap-1 rounded-full bg-white ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
                <button type="button" onClick={() => setActiveFolder(name)} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${activeFolder === name ? 'bg-pastel-accent text-white shadow-sm' : 'text-slate-700 hover:bg-pastel-rose/40 dark:text-slate-300'}`}>{name} <span className="opacity-70">({countFor(name)})</span></button>
                {!FIXED_FILTERS.includes(name as (typeof FIXED_FILTERS)[number]) && <button type="button" aria-label={`Eliminar carpeta ${name}`} onClick={() => removeFolder(name)} className="mr-1 rounded-full p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-700"><Trash2 className="h-3.5 w-3.5" /></button>}
              </div>
            ))}
            <form onSubmit={handleCreateFolder} className="flex items-center gap-2">
              <input
                value={newFolder}
                onChange={(e) => setNewFolder(e.target.value)}
                maxLength={40}
                placeholder="Nueva carpeta"
                className="w-40 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-pastel-accent focus:outline-none focus:ring-2 focus:ring-pastel-accent/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
              <button
                type="submit"
                aria-label="Crear carpeta"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-pastel-accent text-white transition hover:bg-pastel-accentHover"
              >
                <Plus className="h-4 w-4" />
              </button>
            </form>
          </div>

          {actionError && <p role="alert" className="text-sm font-medium text-rose-700">{actionError}</p>}

          {visible.length === 0 ? (
            <EmptyState message="Esta lista está vacía. Añade series desde el catálogo." />
          ) : (
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {visible.map((entry) => {
                const busy = busyId === entry.id;
                return (
                  <li key={entry.id} className="flex flex-col gap-3">
                    <div className="relative aspect-[2/3] overflow-hidden rounded-2xl bg-slate-200 shadow-sm dark:bg-slate-800">
                      <button
                        type="button"
                        onClick={() => onOpenShow(entry.show.id)}
                        aria-label={`Ver ficha de ${entry.show.title}`}
                        className="absolute inset-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pastel-accent"
                      >
                        {entry.show.poster_url ? (
                          <img src={entry.show.poster_url} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 hover:scale-105" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-slate-400"><Tv className="h-10 w-10" /></span>
                        )}
                      </button>
                      <button
                        type="button"
                        aria-label="Quitar de mi lista"
                        disabled={busy}
                        onClick={() => removeEntry(entry.id)}
                        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-[10px] bg-slate-900/55 text-white shadow-sm backdrop-blur-md transition hover:bg-rose-600 disabled:opacity-60"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="space-y-2">
                      <button type="button" onClick={() => onOpenShow(entry.show.id)} className="line-clamp-2 text-left text-sm font-bold leading-snug text-slate-900 hover:text-pastel-accent dark:text-white">
                        {entry.show.title}
                      </button>
                      <select
                        aria-label={`Carpeta de ${entry.show.title}`}
                        value={entry.folder}
                        disabled={busy}
                        onChange={(e) => changeFolder(entry.id, e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-800 focus:border-pastel-accent focus:outline-none focus:ring-2 focus:ring-pastel-accent/30 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      >
                        {folderNames.map((name) => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
