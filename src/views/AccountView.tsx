import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Camera, Loader2, LogOut, Trash2, UserX } from 'lucide-react';
import { LoadingState } from '@/components/PageStates';
import AccountSecurityForm from '@/components/AccountSecurityForm';
import { useAuth } from '@/context/AuthContext';
import { uploadAvatar, validateAvatarFile } from '@/lib/avatar';
import { deleteOwnAccount, updateOwnProfile } from '@/lib/userData';

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-pastel-cream px-3.5 py-2.5 text-sm text-slate-900 focus:border-pastel-accent focus:outline-none focus:ring-2 focus:ring-pastel-accent/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

export default function AccountView() {
  const { session, profile, refreshProfile, signOut } = useAuth();
  const [name, setName] = useState(profile?.name ?? '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url ?? null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    setName(profile?.name ?? '');
    setAvatarUrl(profile?.avatar_url ?? null);
  }, [profile]);

  const handlePhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !session) return;
    const problem = validateAvatarFile(file);
    if (problem) {
      setError(problem);
      return;
    }
    setUploading(true);
    setError(null);
    setSaved(false);
    try {
      setAvatarUrl(await uploadAvatar(session.user.id, file));
    } catch {
      setError('No se pudo subir la foto. Inténtalo de nuevo.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session) return;
    const cleanName = name.trim();
    if (!cleanName) {
      setError('El nombre no puede estar vacío.');
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateOwnProfile(session.user.id, { name: cleanName, avatar_url: avatarUrl });
      await refreshProfile();
      setSaved(true);
    } catch {
      setError('No se pudieron guardar los cambios. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setError(null);
    try {
      await deleteOwnAccount();
      await signOut();
    } catch {
      setError('No se pudo eliminar la cuenta. Inténtalo de nuevo.');
      setConfirmingDelete(false);
    }
  };

  if (!profile) return <LoadingState label="Cargando tu cuenta..." />;

  return (
    <section className="mx-auto max-w-2xl space-y-8">
      <header className="flex items-center gap-4">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-16 w-16 rounded-full border-2 border-pastel-accent object-cover" />
        ) : (
          <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-pastel-accent bg-pastel-lavender text-xl font-black text-pastel-accentHover dark:bg-pastel-lavenderDark dark:text-pastel-rose">
            {profile.name.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-xl font-bold text-slate-900 dark:text-white">{profile.name}</p>
          <p className="truncate text-sm text-slate-500">{profile.email}</p>
          {profile.is_admin && (
            <span className="mt-1 inline-block rounded-md bg-pastel-rose px-2 py-0.5 text-[11px] font-bold text-pastel-accentHover dark:bg-pastel-roseDark dark:text-pastel-rose">Administradora</span>
          )}
        </div>
      </header>

      <form onSubmit={handleSave} className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Nombre</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className={inputClass} />
        </label>

        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Foto de perfil</p>
            <p className="text-xs text-slate-500">Sube una imagen desde tu dispositivo (JPG, PNG o WebP, máximo 2 MB).</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-pastel-accent px-4 py-2.5 text-sm font-bold text-white transition hover:bg-pastel-accentHover">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              {uploading ? 'Subiendo...' : 'Subir foto'}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={handlePhotoChange} disabled={uploading} />
            </label>
            {avatarUrl && (
              <button
                type="button"
                onClick={() => setAvatarUrl(null)}
                className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
              >
                <Trash2 className="h-4 w-4" />
                Quitar foto
              </button>
            )}
          </div>
        </div>

        {error && <p role="alert" className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">{error}</p>}
        {saved && <p className="text-sm font-medium text-emerald-700">Cambios guardados.</p>}

        <button
          type="submit"
          disabled={saving || uploading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-pastel-accent py-3 text-sm font-bold text-white transition hover:bg-pastel-accentHover disabled:opacity-60"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Guardar cambios
        </button>
      </form>

      <AccountSecurityForm currentEmail={profile.email} />

      <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        <button
          type="button"
          onClick={() => signOut()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-100 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
        {confirmingDelete ? (
          <div className="space-y-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
            <p className="text-sm text-rose-800">Se borrarán tu cuenta, tus carpetas y tu lista. Esta acción no se puede deshacer.</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setConfirmingDelete(false)} className="flex-1 rounded-xl bg-white py-2 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                Cancelar
              </button>
              <button type="button" onClick={handleDelete} className="flex-1 rounded-xl bg-rose-700 py-2 text-sm font-bold text-white hover:bg-rose-800">
                Sí, eliminar
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
          >
            <UserX className="h-4 w-4" />
            Eliminar mi cuenta
          </button>
        )}
      </div>
    </section>
  );
}
