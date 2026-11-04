import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import AdminEpisodes from '@/views/admin/AdminEpisodes';
import AdminSettings from '@/views/admin/AdminSettings';
import AdminShows from '@/views/admin/AdminShows';
import AdminSuggestions from '@/views/admin/AdminSuggestions';
import AdminUsers from '@/views/admin/AdminUsers';

type AdminViewProps = {
  onOpenShow: (showId: number) => void;
};

const TABS = [
  { id: 'users', label: 'Usuarios' },
  { id: 'suggestions', label: 'Sugerencias' },
  { id: 'shows', label: 'Series' },
  { id: 'episodes', label: 'Episodios y calendario' },
  { id: 'settings', label: 'Textos y menú' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function AdminView({ onOpenShow }: AdminViewProps) {
  const [tab, setTab] = useState<TabId>('users');

  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <div className="space-y-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-pastel-accent">
          <ShieldCheck className="h-4 w-4" />
          Panel privado de administradora
        </p>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">Gestión de SerieVerse</h1>
        <p className="text-xs text-slate-500">Solo tu cuenta de administradora ve este panel.</p>
      </div>

      <div role="tablist" className="flex flex-wrap gap-1 rounded-2xl bg-slate-100 p-1 text-xs font-bold dark:bg-slate-800">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={`flex-1 rounded-xl px-4 py-2.5 transition ${
              tab === item.id
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {tab === 'users' && <AdminUsers />}
        {tab === 'suggestions' && <AdminSuggestions />}
        {tab === 'shows' && <AdminShows onOpenShow={onOpenShow} />}
        {tab === 'episodes' && <AdminEpisodes />}
        {tab === 'settings' && <AdminSettings />}
      </div>
    </section>
  );
}
