import { useMemo, useState } from 'react';
import { CheckCircle2, Download, Monitor, Smartphone, Tablet } from 'lucide-react';
import Modal from '@/components/Modal';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';

type InstallSheetProps = {
  onClose: () => void;
};

type Platform = 'ios' | 'android' | 'desktop';

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  const isIpadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  if (/iPhone|iPad|iPod/i.test(ua) || isIpadOs) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
}

const GUIDES: Record<Platform, { title: string; icon: typeof Monitor; steps: string[] }> = {
  ios: {
    title: 'iPhone y iPad',
    icon: Tablet,
    steps: [
      'Abre SerieVerse en Safari.',
      'Pulsa el botón Compartir (el cuadrado con una flecha).',
      'Elige "Añadir a pantalla de inicio".',
    ],
  },
  android: {
    title: 'Android (móvil y tablet)',
    icon: Smartphone,
    steps: [
      'Abre SerieVerse en Chrome.',
      'Pulsa el menú de los tres puntos.',
      'Elige "Instalar aplicación" o "Añadir a la pantalla de inicio".',
    ],
  },
  desktop: {
    title: 'Ordenador (Windows, Mac o Linux)',
    icon: Monitor,
    steps: [
      'Abre SerieVerse en Chrome o Edge.',
      'Pulsa el icono de instalación en la barra de direcciones.',
      'Confirma con "Instalar". La app se abrirá en su propia ventana.',
    ],
  },
};

export default function InstallSheet({ onClose }: InstallSheetProps) {
  const { canPrompt, installed, promptInstall } = useInstallPrompt();
  const [message, setMessage] = useState<string | null>(null);
  const current = useMemo(detectPlatform, []);
  const order: Platform[] = [current, ...(['ios', 'android', 'desktop'] as Platform[]).filter((p) => p !== current)];

  const handleInstall = async () => {
    const accepted = await promptInstall();
    setMessage(accepted ? '¡SerieVerse se está instalando!' : 'Puedes instalarla más tarde desde las instrucciones.');
  };

  return (
    <Modal title="Descargar la app" onClose={onClose} maxWidth="max-w-lg">
      <div className="space-y-6">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          SerieVerse se instala como una app en tu móvil, tablet u ordenador. Se abre a pantalla completa y te avisa de los nuevos episodios.
        </p>

        {installed && (
          <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
            <CheckCircle2 className="h-4 w-4" />
            SerieVerse ya está instalada en este dispositivo.
          </p>
        )}

        {!installed && canPrompt && (
          <button
            type="button"
            onClick={handleInstall}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-pastel-accent py-3 text-sm font-bold text-white transition hover:bg-pastel-accentHover"
          >
            <Download className="h-4 w-4" />
            Instalar ahora
          </button>
        )}
        {message && <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{message}</p>}

        <div className="space-y-3">
          {order.map((platform) => {
            const guide = GUIDES[platform];
            const Icon = guide.icon;
            return (
              <div
                key={platform}
                className={`rounded-2xl border p-4 ${platform === current ? 'border-pastel-accent bg-pastel-rose/60 dark:bg-pastel-roseDark/40' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'}`}
              >
                <div className="mb-3 flex items-center gap-3">
                  <Icon className="h-5 w-5 text-pastel-accent" />
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{guide.title}</p>
                  {platform === current && <span className="ml-auto text-[11px] font-bold text-pastel-accentHover">Tu dispositivo</span>}
                </div>
                <ol className="list-decimal space-y-1.5 pl-5 text-sm text-slate-700 dark:text-slate-300">
                  {guide.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
