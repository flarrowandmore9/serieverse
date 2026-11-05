import { useState, type FormEvent } from 'react';
import { Loader2, Mail, Send, X } from 'lucide-react';
import { submitSuggestion } from '@/lib/userData';

type ContactModalProps = {
  onClose: () => void;
};

export default function ContactModal({ onClose }: ContactModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim() || !message.trim()) return;
    setStatus('sending');
    try {
      await submitSuggestion({ name: name.trim(), email: email.trim(), message: message.trim() });
      setStatus('sent');
      setName('');
      setEmail('');
      setMessage('');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-labelledby="contact-title">
      <div className="w-full max-w-lg space-y-5 rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-pastel-accent">Contacto</p>
            <h2 id="contact-title" className="mt-1 text-2xl font-black text-slate-900 dark:text-white">Escríbenos</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar contacto"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-pastel-rose/60 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          <p>¿Tienes alguna duda, sugerencia o problema con la aplicación? Escríbenos por cualquiera de estos medios:</p>
          <div className="space-y-3 rounded-xl bg-pastel-cream/70 p-4 dark:bg-slate-800/70">
            <p className="font-semibold text-slate-900 dark:text-white">Flarrow & More</p>
            <p className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-pastel-accent" />
              <a href="mailto:flarrowandmoreweb@gmail.com" className="font-semibold text-pastel-accent hover:underline">flarrowandmoreweb@gmail.com</a>
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <a href="https://instagram.com/flarrowandmore" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-pastel-rose px-3 py-2 text-xs font-bold text-slate-800 transition hover:opacity-80 dark:text-slate-100">
                Instagram
              </a>
              <a href="https://twitter.com/flarrowandmore" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-pastel-lavender px-3 py-2 text-xs font-bold text-slate-800 transition hover:opacity-80 dark:text-slate-100">
                X / Twitter
              </a>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
          <p className="text-sm font-bold text-slate-900 dark:text-white">Formulario de contacto</p>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate-500">Tu nombre</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={80}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-pastel-accent focus:outline-none focus:ring-2 focus:ring-pastel-accent/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              placeholder="¿Cómo te llamas?"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate-500">Tu email (opcional)</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={120}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-pastel-accent focus:outline-none focus:ring-2 focus:ring-pastel-accent/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              placeholder="tucorreo@ejemplo.com"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate-500">Mensaje</span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              maxLength={1000}
              rows={4}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-pastel-accent focus:outline-none focus:ring-2 focus:ring-pastel-accent/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              placeholder="Escribe tu mensaje aquí..."
            />
          </label>
          {status === 'sent' && (
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">¡Mensaje enviado! Gracias por escribirnos.</p>
          )}
          {status === 'error' && (
            <p className="text-xs font-semibold text-rose-700">No se pudo enviar el mensaje. Inténtalo más tarde o escríbenos por email.</p>
          )}
          <button
            type="submit"
            disabled={status === 'sending'}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-pastel-accent px-4 py-2.5 text-sm font-bold text-white transition hover:bg-pastel-accentHover disabled:opacity-60"
          >
            {status === 'sending' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar mensaje
          </button>
        </form>

        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
