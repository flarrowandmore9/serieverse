import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

const SHOW_AFTER_PX = 400;

export default function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > SHOW_AFTER_PX);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Subir arriba"
      className="fixed bottom-5 right-5 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-pastel-accent text-white shadow-lg transition hover:bg-pastel-accentHover dark:bg-pastel-accentHover dark:hover:bg-pastel-accent"
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}
