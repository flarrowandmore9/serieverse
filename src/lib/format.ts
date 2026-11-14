export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function monthBounds(year: number, monthIndex: number) {
  return {
    start: toIsoDate(new Date(year, monthIndex, 1)),
    end: toIsoDate(new Date(year, monthIndex + 1, 0)),
  };
}

export function parseIsoDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatDate(iso: string | null): string {
  if (!iso) return 'Por confirmar';
  return parseIsoDate(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

export const SHOW_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: '' },
  { value: 'Running', label: 'En Emisión' },
  { value: 'In Development', label: 'En Desarrollo' },
  { value: 'To Be Determined', label: 'Por Confirmar' },
  { value: 'Pilot', label: 'Por Estrenar' },
  { value: 'Ended', label: 'Terminada' },
];

export const SHOW_TYPES_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Serie independiente' },
  { value: 'SpinOff', label: 'Spin-off' },
  { value: 'Reboot', label: 'Reboot' },
  { value: 'Secuela', label: 'Secuela' },
  { value: 'Precuela', label: 'Precuela' },
  { value: 'Anthology', label: 'Antología' },
  { value: 'Miniserie', label: 'Miniseries' },
];

export function statusLabel(status: string | null): { label: string; className: string } {
  switch (status) {
    case 'Running':
      return { label: 'En Emisión', className: 'bg-pastel-sage text-emerald-800 dark:bg-pastel-sageDark dark:text-emerald-200' };
    case 'In Development':
      return { label: 'En Desarrollo', className: 'bg-pastel-rose text-rose-800 dark:bg-pastel-roseDark dark:text-rose-200' };
    case 'To Be Determined':
      return { label: 'Por Confirmar', className: 'bg-pastel-gold text-amber-800 dark:bg-pastel-goldDark dark:text-amber-200' };
    case 'Pilot':
      return { label: 'Por Estrenar', className: 'bg-pastel-lavender text-slate-700 dark:bg-pastel-lavenderDark dark:text-slate-200' };
    case 'Ended':
    case 'Canceled':
      return { label: 'Terminada', className: 'bg-pastel-lavender text-slate-700 dark:bg-pastel-lavenderDark dark:text-slate-200' };
    default:
      return { label: 'Sin Datos', className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200' };
  }
}

export function formatPlatforms(list: string[]): string {
  return list.length > 0 ? list.join(', ') : 'Sin datos';
}

export function parsePlatformInput(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}