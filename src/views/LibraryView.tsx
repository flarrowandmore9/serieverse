import { useMemo, useState, type FormEvent } from 'react';
import { ArrowDownAZ, Plus, Trash2, Tv } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '@/components/PageStates';
import { useAsyncData } from '@/hooks/useAsyncData';
import { createFolder, deleteFolder, fetchFolders, fetchListEntries, moveListItem, removeListItem } from '@/lib/userData';

type LibraryViewProps = {
  onOpenShow: (showId: number) => void;
};

type SortMode = 'recent' | 'title';

export default function LibraryView({ onOpenShow }: LibraryViewProps) {
  const folders = useAsyncData(fetchFolders, []);
  const entries = useAsyncData(fetchListEntries, []);
  const [activeFolder, setActiveFolder] = useState<string>('Todas');
  const [newFolder, setNewFolder] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [manageMode, setManageMode] = useState(false);

  const folderNames = useMemo(() => {
    const names = folders.data ?? [];
    return names.includes('Favoritas') ? ['Favoritas', ...names.filter((name) => name !== 'Favoritas')] : names;
  }, [folders.data]);

  const visible = useMemo(() => {
    const filtered = (entries.data ?? []).filter((entry) => activeFolder === 'Todas' || entry.folder === activeFolder);
    if (sortMode === 'title') {
      return [...filtered].sort((a, b) => a.show.title.localeCompare(b.show.title, 'es'));
    }
    return filtered;
  }, [entries.data, activeFolder, sortMode]);

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

  const allTabs = useMemo(() => {
    return ['Todas', ...folderNames.filter((name) => name !== 'Todas')];
  }, [folderNames]);

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
            {allTabs.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setActiveFolder(name)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${activeFolder === name ? 'bg-pastel-accent text-white shadow-sm' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-pastel-rose/40 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700'}`}
              >
                {name}
              </button>
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
            <button
              type="button"
              aria-label="Ordenar"
              title={sortMode === 'recent' ? 'Ordenar por título (A-Z)' : 'Ordenar por últimas añadidas'}
              onClick={() => setSortMode((prev) => (prev === 'recent' ? 'title' : 'recent'))}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-600 ring-1 ring-slate-200 transition hover:bg-pastel-rose/40 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700"
            >
              <ArrowDownAZ className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Eliminar carpetas"
              title="Eliminar carpetas"
              onClick={() => setManageMode((prev) => !prev)}
              className={`flex h-9 w-9 items-center justify-center rounded-full ring-1 transition ${manageMode ? 'bg-rose-100 text-rose-600 ring-rose-300 dark:bg-rose-900/40 dark:ring-rose-700' : 'bg-white text-slate-600 ring-slate-200 hover:bg-pastel-rose/40 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700'}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          {manageMode && folderNames.length > 0 && (
            <div className="flex flex-wrap gap-2 rounded-2xl border border-rose-200 bg-rose-50/50 p-3 dark:border-rose-800 dark:bg-rose-900/20">
              <span className="self-center text-xs font-semibold text-rose-700 dark:text-rose-300">Click para eliminar:</span>
              {folderNames.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => removeFolder(name)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 ring-1 ring-rose-200 transition hover:bg-rose-100 dark:bg-slate-800 dark:ring-rose-700"
                >
                  <Trash2 className="h-3 w-3" />
                  {name}
                </button>
              ))}
            </div>
          )}

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
