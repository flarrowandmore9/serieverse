import { useMemo, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';

type ShowPickerProps = {
  shows: { id: number; title: string }[];
  value: string;
  onChange: (value: string) => void;
};

const inputClass = 'w-full rounded-xl border border-slate-200 bg-pastel-cream py-2.5 pl-9 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-pastel-accent focus:outline-none focus:ring-2 focus:ring-pastel-accent/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

export default function ShowPicker({ shows, value, onChange }: ShowPickerProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const selected = shows.find((show) => String(show.id) === value);

  const matches = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('es');
    return shows.filter((show) => show.title.toLocaleLowerCase('es').includes(term));
  }, [shows, query]);

  const choose = (id: number) => {
    onChange(String(id));
    setQuery('');
    setOpen(false);
  };

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        value={open ? query : (selected?.title ?? '')}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        placeholder={shows.length ? 'Escribe para buscar una serie' : 'Cargando series...'}
        disabled={shows.length === 0}
        role="combobox"
        aria-expanded={open}
        aria-label="Buscar serie"
        className={inputClass}
      />
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      {open && (
        <ul role="listbox" className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {matches.length === 0 && <li className="px-3 py-2 text-xs text-slate-500">Ninguna serie coincide</li>}
          {matches.map((show) => (
            <li key={show.id}>
              <button
                type="button"
                role="option"
                aria-selected={String(show.id) === value}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(show.id)}
                className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-800 transition hover:bg-pastel-rose/50 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                <span className="truncate">{show.title}</span>
                {String(show.id) === value && <Check className="h-4 w-4 shrink-0 text-pastel-accent" />}
              </button>
            </li>
          ))}

        </ul>
      )}
    </div>
  );
}
