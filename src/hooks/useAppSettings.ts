import { useEffect, useState } from 'react';
import { fetchAppSettings } from '@/lib/admin';

const DEFAULTS: Record<string, string> = {
  nav_catalog: 'Catálogo',
  nav_calendar: 'Calendario',
  nav_platforms: 'Plataformas y Cadenas',
  nav_library: 'Mis Listas',
  nav_suggestions: 'Sugerencias',
  hero_title: 'SerieVerse',
  hero_subtitle: 'Tu catálogo de series de televisión de EE. UU. y España',
  btn_download: 'Instalar App',
};

let cache: Record<string, string> | null = null;

export function useAppSettings(): Record<string, string> {
  const [settings, setSettings] = useState<Record<string, string>>(cache ?? DEFAULTS);

  useEffect(() => {
    if (cache) return;
    fetchAppSettings()
      .then((data) => {
        cache = { ...DEFAULTS, ...data };
        setSettings(cache);
      })
      .catch(() => undefined);
  }, []);

  return settings;
}

export function refreshAppSettings() {
  cache = null;
  return fetchAppSettings().then((data) => {
    cache = { ...DEFAULTS, ...data };
    return cache;
  });
}
