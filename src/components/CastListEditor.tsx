import { Plus, Trash2 } from 'lucide-react';
import type { Character } from '@/lib/types';

type CastListEditorProps = {
  value: Character[];
  onChange: (cast: Character[]) => void;
};

const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-pastel-accent focus:outline-none focus:ring-2 focus:ring-pastel-accent/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

export default function CastListEditor({ value, onChange }: CastListEditorProps) {
  const updateMember = (index: number, patch: Partial<Character>) =>
    onChange(value.map((member, position) => (position === index ? { ...member, ...patch } : member)));

  const removeMember = (index: number) => onChange(value.filter((_, position) => position !== index));

  const addMember = () => onChange([...value, { actor: '', character: '', image: '' }]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Reparto principal</span>
        <button type="button" onClick={addMember} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-pastel-accent transition hover:bg-pastel-rose/40">
          <Plus className="h-3.5 w-3.5" />
          Añadir persona
        </button>
      </div>
      {value.length === 0 && <p className="text-xs text-slate-500">Esta serie no tiene reparto cargado.</p>}
      <ul className="space-y-2">
        {value.map((member, index) => (
          <li key={index} className="grid gap-2 rounded-xl border border-slate-200 bg-pastel-cream/60 p-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-center dark:border-slate-700 dark:bg-slate-800/60">
            <input aria-label="Actor" placeholder="Actor" value={member.actor} onChange={(e) => updateMember(index, { actor: e.target.value })} className={inputClass} />
            <input aria-label="Personaje" placeholder="Personaje" value={member.character} onChange={(e) => updateMember(index, { character: e.target.value })} className={inputClass} />
            <input aria-label="URL de la foto" placeholder="URL de la foto" value={member.image} onChange={(e) => updateMember(index, { image: e.target.value })} className={inputClass} />
            <button type="button" aria-label="Quitar persona" onClick={() => removeMember(index)} className="flex h-9 w-9 items-center justify-center justify-self-end rounded-lg text-slate-500 transition hover:bg-rose-50 hover:text-rose-700 dark:text-slate-300">
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
