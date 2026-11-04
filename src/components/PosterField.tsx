import { useState, type ChangeEvent } from 'react';
import { Image as ImageIcon, Loader2, Upload } from 'lucide-react';
import { uploadShowPoster, validatePosterFile } from '@/lib/showPoster';

type PosterFieldProps = {
  value: string;
  onChange: (url: string) => void;
};

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-pastel-cream px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-pastel-accent focus:outline-none focus:ring-2 focus:ring-pastel-accent/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

export default function PosterField({ value, onChange }: PosterFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const problem = validatePosterFile(file);
    if (problem) {
      setError(problem);
      return;
    }
    setUploading(true);
    setError(null);
    try {
      onChange(await uploadShowPoster(file));
    } catch {
      setError('No se pudo subir la imagen. Inténtalo de nuevo.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Carátula</span>
      <div className="flex items-start gap-4">
        <div className="h-32 w-[85px] shrink-0 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
          {value ? (
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-slate-400">
              <ImageIcon className="h-6 w-6" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <label className={`inline-flex cursor-pointer items-center gap-2 rounded-xl bg-pastel-accent px-4 py-2 text-sm font-bold text-white transition hover:bg-pastel-accentHover ${uploading ? 'opacity-60' : ''}`}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Subir imagen
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} disabled={uploading} className="sr-only" />
          </label>
          <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="o pega la URL de una imagen" className={inputClass} />
          {error && <p role="alert" className="text-xs font-medium text-rose-700">{error}</p>}
        </div>
      </div>
    </div>
  );
}
