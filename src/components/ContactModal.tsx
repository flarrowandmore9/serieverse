import { X } from 'lucide-react';

type ContactModalProps = {
  onClose: () => void;
};

export default function ContactModal({ onClose }: ContactModalProps) {
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
            <p>
              Correo: <a href="mailto:flarrowandmore@gmail.com" className="font-semibold text-pastel-accent hover:underline">flarrowandmore@gmail.com</a>
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <a href="https://instagram.com/flarrowandmore" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-pastel-rose px-3 py-2 text-xs font-bold text-slate-800 transition hover:opacity-80 dark:text-slate-100">
                Instagram
              </a>
              <a href="https://twitter.com/flarrowandmore" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-pastel-lavender px-3 py-2 text-xs font-bold text-slate-800 transition hover:opacity-80 dark:text-slate-100">
                X / Twitter
              </a>
              <a href="https://tiktok.com/@flarrowandmore" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-pastel-sage px-3 py-2 text-xs font-bold text-emerald-800 transition hover:opacity-80 dark:text-emerald-100">
                TikTok
              </a>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-xl bg-pastel-accent px-4 py-2.5 text-sm font-bold text-white transition hover:bg-pastel-accentHover"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
