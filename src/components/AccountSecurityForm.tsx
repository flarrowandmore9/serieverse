import { useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-pastel-cream px-3.5 py-2.5 text-sm text-slate-900 focus:border-pastel-accent focus:outline-none focus:ring-2 focus:ring-pastel-accent/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

type Feedback = { type: 'ok' | 'error'; text: string };

function translateError(message: string): string {
  if (/at least 6/i.test(message)) return 'La contraseña debe tener al menos 6 caracteres.';
  if (/already (registered|been registered|exists)/i.test(message)) return 'Ya existe una cuenta con ese correo.';
  if (/same password/i.test(message)) return 'La nueva contraseña debe ser distinta a la actual.';
  return 'No se pudo guardar el cambio. Inténtalo de nuevo.';
}

export default function AccountSecurityForm({ currentEmail }: { currentEmail: string }) {
  const [email, setEmail] = useState(currentEmail);
  const [password, setPassword] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState<Feedback | null>(null);
  const [passwordFeedback, setPasswordFeedback] = useState<Feedback | null>(null);

  const handleEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const clean = email.trim();
    if (!clean || clean === currentEmail) {
      setEmailFeedback({ type: 'error', text: 'Escribe un correo distinto al actual.' });
      return;
    }
    setSavingEmail(true);
    setEmailFeedback(null);
    const { error } = await supabase.auth.updateUser({ email: clean });
    setSavingEmail(false);
    setEmailFeedback(
      error
        ? { type: 'error', text: translateError(error.message) }
        : { type: 'ok', text: 'Correo actualizado. Se usará en tu próximo inicio de sesión.' },
    );
  };

  const handlePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingPassword(true);
    setPasswordFeedback(null);
    const { error } = await supabase.auth.updateUser({ password });
    setSavingPassword(false);
    if (error) {
      setPasswordFeedback({ type: 'error', text: translateError(error.message) });
      return;
    }
    setPassword('');
    setPasswordFeedback({ type: 'ok', text: 'Contraseña actualizada.' });
  };

  const feedbackClass = (feedback: Feedback) =>
    feedback.type === 'ok' ? 'text-sm font-medium text-emerald-700 dark:text-emerald-300' : 'text-sm font-medium text-rose-700 dark:text-rose-300';

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
      <div>
        <p className="text-sm font-bold text-slate-900 dark:text-white">Seguridad</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">Cambia el correo o la contraseña de tu cuenta.</p>
      </div>

      <form onSubmit={handleEmail} className="space-y-3">
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Correo electrónico</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        </label>
        {emailFeedback && <p role="status" className={feedbackClass(emailFeedback)}>{emailFeedback.text}</p>}
        <button
          type="submit"
          disabled={savingEmail}
          className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-800 transition hover:bg-pastel-rose disabled:opacity-60 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
        >
          {savingEmail && <Loader2 className="h-4 w-4 animate-spin" />}
          Cambiar correo
        </button>
      </form>

      <form onSubmit={handlePassword} className="space-y-3 border-t border-slate-100 pt-6 dark:border-slate-800">
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Nueva contraseña</span>
          <input
            type="password"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            placeholder="Mínimo 6 caracteres"
            autoComplete="new-password"
          />
        </label>
        {passwordFeedback && <p role="status" className={feedbackClass(passwordFeedback)}>{passwordFeedback.text}</p>}
        <button
          type="submit"
          disabled={savingPassword || password.length < 6}
          className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-800 transition hover:bg-pastel-rose disabled:opacity-60 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
        >
          {savingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
          Cambiar contraseña
        </button>
      </form>
    </div>
  );
}
