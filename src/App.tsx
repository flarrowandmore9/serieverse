import { useState } from 'react';
import Navbar from '@/components/Navbar';
import AuthModal from '@/components/AuthModal';
import InstallSheet from '@/components/InstallSheet';
import LegalNoticeModal from '@/components/LegalNoticeModal';
import ContactModal from '@/components/ContactModal';
import ShowDetailModal from '@/components/ShowDetailModal';
import SearchModal from '@/components/SearchModal';
import ScrollToTopButton from '@/components/ScrollToTopButton';
import SignInPrompt from '@/components/SignInPrompt';
import { LoadingState } from '@/components/PageStates';
import { useAuth } from '@/context/AuthContext';
import { registerShowView } from '@/lib/catalog';
import AccountView from '@/views/AccountView';
import AdminView from '@/views/AdminView';
import CalendarView from '@/views/CalendarView';
import CatalogView from '@/views/CatalogView';
import LibraryView from '@/views/LibraryView';
import PlatformsView from '@/views/PlatformsView';
import SuggestionsView from '@/views/SuggestionsView';
import type { ViewId } from '@/lib/types';

export default function App() {
  const { session, isAdmin, loading } = useAuth();
  const [view, setView] = useState<ViewId>('catalog');
  const [selectedShowId, setSelectedShowId] = useState<number | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);
  const [legalOpen, setLegalOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  const openAuth = () => setAuthOpen(true);
  const closeAuth = () => setAuthOpen(false);
  const navigate = (next: ViewId) => {
    setView(next);
    window.scrollTo({ top: 0 });
  };

  const renderView = () => {
    const openShow = (showId: number) => {
      setSelectedShowId(showId);
      registerShowView(showId).catch(() => undefined);
    };
    if (loading) return <LoadingState label="Cargando SerieVerse..." />;

    switch (view) {
      case 'catalog':
        return <CatalogView onOpenShow={openShow} onRequireLogin={openAuth} />;
      case 'calendar':
        return <CalendarView onOpenShow={openShow} />;
      case 'platforms':
        return <PlatformsView onOpenShow={openShow} onRequireLogin={openAuth} />;
      case 'suggestions':
        return <SuggestionsView />;
      case 'library':
        return session ? (
          <LibraryView onOpenShow={openShow} />
        ) : (
          <SignInPrompt message="Inicia sesión para guardar series en tu lista y organizarlas en carpetas." onSignIn={openAuth} />
        );
      case 'account':
        return session ? (
          <AccountView />
        ) : (
          <SignInPrompt message="Inicia sesión para ver y editar tu cuenta." onSignIn={openAuth} />
        );
      case 'admin':
        return isAdmin ? (
          <AdminView onOpenShow={openShow} />
        ) : (
          <CatalogView onOpenShow={openShow} onRequireLogin={openAuth} />
        );
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-pastel-cream text-pastel-textPrimary dark:bg-pastel-creamDark dark:text-pastel-textPrimaryDark">
      <Navbar view={view} onNavigate={navigate} onOpenAuth={openAuth} onOpenInstall={() => setInstallOpen(true)} onOpenSearch={() => setSearchOpen(true)} />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">{renderView()}</main>

      <footer className="mt-12 border-t border-slate-200/80 bg-white py-8 text-center transition-colors dark:border-slate-800/80 dark:bg-slate-950">
        <p className="text-sm font-extrabold text-slate-900 dark:text-white">SerieVerse</p>
        <p className="mt-1 text-xs text-slate-500">
          Creada por <strong className="font-bold text-pastel-accent">Flarrow & More</strong> · Datos de TVMaze y TMDB (The Movie db), actualizados cada día
        </p>
        <button
          type="button"
          onClick={() => setLegalOpen(true)}
          className="mt-3 text-xs font-semibold text-slate-500 underline-offset-4 transition hover:text-pastel-accent hover:underline"
        >
          Aviso legal
        </button>
        <span className="mx-1 text-slate-300">·</span>
        <button
          type="button"
          onClick={() => setContactOpen(true)}
          className="text-xs font-semibold text-slate-500 underline-offset-4 transition hover:text-pastel-accent hover:underline"
        >
          Contacto
        </button>
      </footer>

      {searchOpen && (
        <SearchModal
          onClose={() => setSearchOpen(false)}
          onSelect={(showId) => {
            setSearchOpen(false);
            setSelectedShowId(showId);
          }}
        />
      )}
      {selectedShowId !== null && (
        <ShowDetailModal showId={selectedShowId} onClose={() => setSelectedShowId(null)} onRequireLogin={openAuth} />
      )}
      {authOpen && <AuthModal onClose={closeAuth} />}
      {installOpen && <InstallSheet onClose={() => setInstallOpen(false)} />}
      {legalOpen && <LegalNoticeModal onClose={() => setLegalOpen(false)} />}
      {contactOpen && <ContactModal onClose={() => setContactOpen(false)} />}
      <ScrollToTopButton />
    </div>
  );
}
