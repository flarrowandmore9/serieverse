import { useEffect, useState } from 'react';
import { Bookmark, BookmarkCheck, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { addToList, createFolder, fetchFolders, fetchListMembership, moveListItem, removeListItem } from '@/lib/userData';
import type { ListMembership } from '@/lib/types';

type ListToggleProps = {
  showId: number;
  onRequireLogin: () => void;
  variant?: 'full' | 'icon';
};

export default function ListToggle({ showId, onRequireLogin, variant = 'full' }: ListToggleProps) {
  const { session } = useAuth();
  const [membership, setMembership] = useState<ListMembership | null>(null);
  const [folders, setFolders] = useState<string[]>(['General']);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    (async () => {
      try {
        const [loadedFolders, loadedMembership] = await Promise.all([fetchFolders(), fetchListMembership(showId)]);
        if (cancelled) return;
        if (loadedFolders.length > 0) setFolders(loadedFolders);
        setMembership(loadedMembership);
      } catch {
        if (!cancelled) setError('No se pudo cargar tu lista.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session, showId]);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch {
      setError('No se pudo guardar el cambio. Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  const toggle = () => {
    if (!session) {
      onRequireLogin();
      return;
    }
    void run(async () => {
      if (membership) {
        await removeListItem(membership.id);
        setMembership(null);
      } else {
        setMembership(await addToList(showId, folders[0] ?? 'General'));
      }
    });
  };

  const changeFolder = (folder: string) => {
    if (!membership) return;
    if (folder === '__new__') {
      const name = window.prompt('Nombre de la nueva carpeta:')?.trim();
      if (!name) return;
      void run(async () => {
        await createFolder(name);
        await moveListItem(membership.id, name);
        setFolders((prev) => (prev.includes(name) ? prev : [...prev, name]));
        setMembership({ ...membership, folder: name });
      });
      return;
    }
    void run(async () => {
      await moveListItem(membership.id, folder);
      setMembership({ ...membership, folder });
    });
  };

  const saved = membership !== null;

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-label={saved ? 'Quitar de Mis Listas' : 'Añadir a Mis Listas'}
        title={saved ? 'Quitar de Mis Listas' : 'Añadir a Mis Listas'}
        className={`flex h-8 w-8 items-center justify-center rounded-[10px] shadow-sm backdrop-blur-md transition hover:scale-110 disabled:opacity-60 ${
          saved ? 'bg-pastel-accent/90 text-white' : 'bg-slate-900/55 text-white hover:bg-slate-900/70'
        }`}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition disabled:opacity-60 ${
          saved ? 'bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100' : 'bg-pastel-accent text-white hover:bg-pastel-accentHover'
        }`}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
        {saved ? 'En mi lista' : 'Añadir a mi lista'}
      </button>

      {saved && (
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <span className="font-semibold">Carpeta</span>
          <select
            value={membership.folder}
            onChange={(e) => changeFolder(e.target.value)}
            disabled={busy}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-pastel-accent/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            {folders.map((folder) => (
              <option key={folder} value={folder}>
                {folder}
              </option>
            ))}
            <option value="__new__">+ Nueva carpeta</option>
          </select>
        </label>
      )}

      {error && <p role="alert" className="w-full text-sm text-rose-700">{error}</p>}
    </div>
  );
}
