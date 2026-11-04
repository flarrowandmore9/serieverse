import { useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import Modal from '@/components/Modal';
import { supabase } from '@/lib/supabase';

type AuthModalProps = {
  onClose: () => void;
};

type Mode = 'login' | 'register';

function translateAuthError(message: string): string {
  if (/invalid login credentials/i.test(message)) return 'Correo o contraseña incorrectos.';
  if (/already registered/i.test(message)) return 'Ya existe una cuenta con este correo.';
  if (/at least 6/i.test(message)) return 'La contraseña debe tener al menos 6 caracteres.';
  return 'No se pudo completar la operación. Inténtalo de nuevo.';
}

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-pastel-cream px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-pastel-accent focus:outline-none focus:ring-2 focus:ring-pastel-accent/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

export default function AuthModal({ onClose }: AuthModalProps) {
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setNotice(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setNotice(null);

    if (mode === 'login') {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      setSubmitting(false);
      if (signInError) {
        setError(translateAuthError(signInError.message));
        return;
      }
      onClose();
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { name: name.trim() } },
    });
    setSubmitting(false);
    if (signUpError) {
      setError(translateAuthError(signUpError.message));
      return;
    }
    if (!data.session) {
      setNotice('Cuenta creada. Ya puedes iniciar sesión.');
      setMode('login');
      return;
    }
    onClose();
  };

  return (
    <Modal title={mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'} onClose={onClose} maxWidth="max-w-md">
      <div className="space-y-5">
        <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-sm font-semibold dark:bg-slate-800">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`rounded-lg py-2 transition ${mode === 'login' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            onClick={() => switchMode('register')}
            className={`rounded-lg py-2 transition ${mode === 'register' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Crear cuenta
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Nombre</span>
              <input required value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className={inputClass} placeholder="Tu nombre" />
            </label>
          )}
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Correo electrónico</span>
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="correo@ejemplo.com" />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Contraseña</span>
            <input
              required
              type="password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder="Mínimo 6 caracteres"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </label>

          {error && <p role="alert" className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">{error}</p>}
          {notice && <p className="rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800">{notice}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-pastel-accent py-3 text-sm font-bold text-white transition hover:bg-pastel-accentHover disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === 'login' ? 'Entrar' : 'Crear mi cuenta'}
          </button>
        </form>
      </div>
    </Modal>
  );
}
