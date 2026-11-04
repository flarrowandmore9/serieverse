import { X } from 'lucide-react';

type LegalNoticeModalProps = {
  onClose: () => void;
};

export default function LegalNoticeModal({ onClose }: LegalNoticeModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-labelledby="legal-title">
      <div className="w-full max-w-lg space-y-5 rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-pastel-accent">Información legal</p>
            <h2 id="legal-title" className="mt-1 text-2xl font-black text-slate-900 dark:text-white">Aviso legal</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar aviso legal"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-pastel-rose/60 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          <p>SerieVerse es un proyecto informativo, sin ánimo de lucro, creado por Flarrow & More.</p>
          <p>Los datos de series y episodios proceden de las APIs de TVMaze e IMDb, o han sido añadidos manualmente por Flarrow & More.</p>
          <p>Los títulos, carátulas, logotipos y marcas registradas pertenecen a sus respectivos dueños. Esta web no está afiliada ni avalada por ellos.</p>
          <p>Las plataformas y cadenas se mencionan únicamente como referencia informativa.</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-xl bg-pastel-accent px-4 py-2.5 text-sm font-bold text-white transition hover:bg-pastel-accentHover"
        >
          Entendido
        </button>
      </div>
    </div>
  );
}
