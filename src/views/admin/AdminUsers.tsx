import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '@/components/PageStates';
import { useAsyncData } from '@/hooks/useAsyncData';
import { deleteUserAccount, fetchAllProfiles } from '@/lib/admin';
import { formatDate } from '@/lib/format';

export default function AdminUsers() {
  const users = useAsyncData(fetchAllProfiles, []);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const removeUser = async (userId: string, name: string) => {
    if (!window.confirm(`¿Eliminar la cuenta de ${name}? Se borrarán sus datos.`)) return;
    setBusyId(userId);
    setActionError(null);
    try {
      await deleteUserAccount(userId);
      users.reload();
    } catch {
      setActionError('No se pudo eliminar la cuenta. Inténtalo de nuevo.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      {users.loading && <LoadingState label="Cargando usuarios..." />}
      {users.error && <ErrorState message={users.error} onRetry={users.reload} />}
      {actionError && <p role="alert" className="text-sm text-rose-700">{actionError}</p>}
      {users.data && users.data.length === 0 && <EmptyState message="Todavía no hay usuarios registrados." />}
      {users.data && users.data.length > 0 && (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          {users.data.map((user) => (
            <li key={user.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="" loading="lazy" className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700" />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pastel-rose text-sm font-bold text-pastel-accentHover dark:bg-pastel-roseDark dark:text-pastel-rose">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="flex items-center gap-2 truncate text-sm font-bold text-slate-900 dark:text-white">
                    {user.name}
                    {user.is_admin && <span className="rounded bg-pastel-rose px-1.5 py-0.5 text-[10px] font-bold text-pastel-accentHover dark:bg-pastel-roseDark dark:text-pastel-rose">Admin</span>}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Registro: {formatDate(user.created_at.slice(0, 10))}</p>
                </div>
              </div>
              {!user.is_admin && (
                <button
                  type="button"
                  aria-label={`Eliminar a ${user.name}`}
                  disabled={busyId === user.id}
                  onClick={() => removeUser(user.id, user.name)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
