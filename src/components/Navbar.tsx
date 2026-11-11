import { useEffect, useState } from 'react';
import { Bookmark, CalendarDays, Clapperboard, LayoutGrid, LogIn, Moon, MessageSquare, Search, Shield, Sun, Tv, Download, UserRound, type LucideIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAppSettings } from '@/hooks/useAppSettings';
import type { ViewId } from '@/lib/types';

type NavbarProps = {
  view: ViewId;
  onNavigate: (view: ViewId) => void;
  onOpenAuth: () => void;
  onOpenInstall: () => void;
  onOpenSearch: () => void;
};

type NavItem = { id: ViewId; label: string; icon: LucideIcon };

const NAV_ITEMS: NavItem[] = [
  { id: 'catalog', label: 'Catálogo', icon: LayoutGrid },
  { id: 'calendar', label: 'Calendario', icon: CalendarDays },
  { id: 'platforms', label: 'Plataformas y Cadenas', icon: Tv },
  { id: 'library', label: 'Mis Listas', icon: Bookmark },
  { id: 'suggestions', label: 'Sugerencias', icon: MessageSquare },
];

export default function Navbar({ view, onNavigate, onOpenAuth, onOpenInstall, onOpenSearch }: NavbarProps) {
  const { session, profile, isAdmin } = useAuth();
  const settings = useAppSettings();
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur-md transition-colors dark:border-slate-800/80 dark:bg-slate-950/90">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <button type="button" onClick={() => onNavigate('catalog')} className="flex shrink-0 items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-pastel-rose via-pastel-lavender to-pastel-sage text-pastel-accent shadow-sm dark:from-pastel-roseDark dark:via-pastel-lavenderDark dark:to-pastel-sageDark dark:text-pastel-rose">
            <Clapperboard className="h-5 w-5" />
          </span>
          <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {settings.hero_title?.includes('Verse') ? settings.hero_title : <>Serie<span className="text-pastel-accent">Verse</span></>}
          </span>
        </button>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Principal">
          <NavButton item={{ id: 'catalog', label: settings.nav_catalog ?? 'Catálogo', icon: LayoutGrid }} active={view === 'catalog'} onClick={() => onNavigate('catalog')} />
          <NavButton item={{ id: 'calendar', label: settings.nav_calendar ?? 'Calendario', icon: CalendarDays }} active={view === 'calendar'} onClick={() => onNavigate('calendar')} />
          <NavButton item={{ id: 'platforms', label: settings.nav_platforms ?? 'Plataformas y Cadenas', icon: Tv }} active={view === 'platforms'} onClick={() => onNavigate('platforms')} />
          <NavButton item={{ id: 'library', label: settings.nav_library ?? 'Mis Listas', icon: Bookmark }} active={view === 'library'} onClick={() => onNavigate('library')} />
          <NavButton item={{ id: 'suggestions', label: settings.nav_suggestions ?? 'Sugerencias', icon: MessageSquare }} active={view === 'suggestions'} onClick={() => onNavigate('suggestions')} />
        </nav>

        {isAdmin && (
              <button
                onClick={handleSyncTMDB}
                disabled={isSyncingTMDB}
                title="Actualizar el catálogo desde TMDB"
                className="hidden lg:flex items-center gap-1.5 bg-[#184E3A] hover:bg-[#123D2D] text-white px-3.5 py-1.5 rounded-full text-xs font-bold transition-all disabled:opacity-60"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingTMDB ? 'animate-spin' : ''}`} />
                {isSyncingTMDB ? 'Actualizando…' : 'Actualizar TMDB'}
              </button>
            )}
        
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenSearch}
            aria-label="Buscar series"
            title="Buscar series"
            className="rounded-xl bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
          >
            <Search className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onOpenInstall}
            className="hidden items-center gap-2 rounded-xl bg-pastel-sage px-3 py-2 text-xs font-semibold text-emerald-800 transition hover:opacity-90 dark:bg-pastel-sageDark dark:text-emerald-200 sm:flex"
          >
            <Download className="h-4 w-4" />
            {settings.btn_download ?? 'Descargar App'}
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => onNavigate('admin')}
              title="Panel de administración"
              aria-current={view === 'admin' ? 'page' : undefined}
              className={`rounded-xl p-2 transition ${
                view === 'admin' ? 'bg-pastel-accent text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              <Shield className="h-4 w-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setDark((value) => !value)}
            title="Modo día / noche"
            className="rounded-xl bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {session && profile ? (
            <button
              type="button"
              onClick={() => onNavigate('account')}
              className={`flex items-center gap-2 rounded-full border border-slate-200 py-1 pl-1 pr-3 text-xs font-bold transition dark:border-slate-800 ${
                view === 'account'
                  ? 'bg-pastel-accent text-white'
                  : 'bg-pastel-lavender text-slate-800 hover:opacity-90 dark:bg-pastel-lavenderDark dark:text-slate-100'
              }`}
            >
              <UserRound className="h-5 w-5 rounded-full bg-white p-0.5 text-pastel-accent" />
              <span className="max-w-[90px] truncate">{profile.name}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="flex items-center gap-2 rounded-xl bg-pastel-accent px-3.5 py-2 text-xs font-bold text-white transition hover:bg-pastel-accentHover"
            >
              <LogIn className="h-4 w-4" />
              Entrar
            </button>
          )}
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto border-t border-slate-100 px-4 py-2 dark:border-slate-800 md:hidden" aria-label="Principal móvil">
        <NavButton item={{ id: 'catalog', label: settings.nav_catalog ?? 'Catálogo', icon: LayoutGrid }} active={view === 'catalog'} onClick={() => onNavigate('catalog')} compact />
        <NavButton item={{ id: 'calendar', label: settings.nav_calendar ?? 'Calendario', icon: CalendarDays }} active={view === 'calendar'} onClick={() => onNavigate('calendar')} compact />
        <NavButton item={{ id: 'platforms', label: settings.nav_platforms ?? 'Plataformas y Cadenas', icon: Tv }} active={view === 'platforms'} onClick={() => onNavigate('platforms')} compact />
        <NavButton item={{ id: 'library', label: settings.nav_library ?? 'Mis Listas', icon: Bookmark }} active={view === 'library'} onClick={() => onNavigate('library')} compact />
        <NavButton item={{ id: 'suggestions', label: settings.nav_suggestions ?? 'Sugerencias', icon: MessageSquare }} active={view === 'suggestions'} onClick={() => onNavigate('suggestions')} compact />
      </nav>
    </header>
  );
}

type NavButtonProps = {
  item: NavItem;
  active: boolean;
  onClick: () => void;
  compact?: boolean;
};

function NavButton({ item, active, onClick, compact = false }: NavButtonProps) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
        active
          ? 'bg-pastel-rose text-pastel-accentHover dark:bg-pastel-roseDark dark:text-pastel-rose'
          : 'text-slate-700 hover:bg-pastel-rose/50 dark:text-slate-200 dark:hover:bg-pastel-roseDark/50'
      } ${compact ? 'whitespace-nowrap' : ''}`}
    >
      <Icon className="h-4 w-4 text-pastel-accent" />
      {item.label}
    </button>
  );
}
