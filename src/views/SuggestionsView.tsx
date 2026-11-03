import { useState, type FormEvent } from 'react';
import { CheckCircle2, Loader2, Send } from 'lucide-react';
import { submitSuggestion } from '@/lib/userData';

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-pastel-cream px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-pastel-accent focus:outline-none focus:ring-2 focus:ring-pastel-accent/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

export default function SuggestionsView() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSending(true);
    setError(null);
    try {
      await submitSuggestion({ name: name.trim() || 'Anónimo', email: email.trim(), message: message.trim() });
      setSent(true);
      setMessage('');
    } catch {
      setError('No se pudo enviar tu sugerencia. Inténtalo de nuevo.');
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="mx-auto max-w-2xl space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-pastel-accent">Sugerencias</p>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">Cuéntanos qué te gustaría ver</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">Peticiones de series, mejoras o comentarios. Las revisamos una a una.</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tu nombre (opcional)</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className={inputClass} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Correo para responderte (opcional)</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tu sugerencia</span>
          <textarea
            required
            rows={5}
            maxLength={1000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className={inputClass}
            placeholder="Escribe aquí tu idea..."
          />
        </label>

        {error && <p role="alert" className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">{error}</p>}
        {sent && (
          <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm font-medium text-emerald-800">
            <CheckCircle2 className="h-4 w-4" />
            Gracias, tu sugerencia ha llegado.
          </p>
        )}

        <button
          type="submit"
          disabled={sending}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-pastel-accent py-3 text-sm font-bold text-white transition hover:bg-pastel-accentHover disabled:opacity-60"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Enviar sugerencia
        </button>
      </form>
    </section>
  );
}
