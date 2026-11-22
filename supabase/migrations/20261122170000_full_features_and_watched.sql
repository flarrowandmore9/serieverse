-- 1. Añadir columnas faltantes en shows y episodes
ALTER TABLE public.shows ADD COLUMN IF NOT EXISTS show_type text;
ALTER TABLE public.shows ADD COLUMN IF NOT EXISTS franchise text;
ALTER TABLE public.shows ADD COLUMN IF NOT EXISTS is_miniseries boolean NOT NULL DEFAULT false;
ALTER TABLE public.episodes ADD COLUMN IF NOT EXISTS overview_es text;

-- Índice único en tmdb_id (permitiendo múltiples NULL) para sincronización sin duplicados
CREATE UNIQUE INDEX IF NOT EXISTS shows_tmdb_id_unique_idx ON public.shows (tmdb_id) WHERE tmdb_id IS NOT NULL;

-- 2. Permisos completos para que la administradora pueda guardar todos los campos de shows
GRANT INSERT, UPDATE ON public.shows TO authenticated;

-- 3. Tablas para marcar episodios, temporadas y series como "Visto"
CREATE TABLE IF NOT EXISTS public.user_watched_episodes (
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  show_id bigint NOT NULL REFERENCES public.shows(id) ON DELETE CASCADE,
  tvmaze_episode_id integer NOT NULL,
  watched_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tvmaze_episode_id)
);

CREATE INDEX IF NOT EXISTS user_watched_episodes_show_idx ON public.user_watched_episodes (user_id, show_id);

CREATE TABLE IF NOT EXISTS public.user_watched_shows (
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  show_id bigint NOT NULL REFERENCES public.shows(id) ON DELETE CASCADE,
  watched_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, show_id)
);

ALTER TABLE public.user_watched_episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_watched_shows ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, DELETE ON public.user_watched_episodes TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.user_watched_shows TO authenticated;

DROP POLICY IF EXISTS "manage_own_watched_episodes" ON public.user_watched_episodes;
CREATE POLICY "manage_own_watched_episodes" ON public.user_watched_episodes
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "manage_own_watched_shows" ON public.user_watched_shows;
CREATE POLICY "manage_own_watched_shows" ON public.user_watched_shows
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 4. Corregir la sincronización automática diaria apuntando a tu proyecto real
DO $$
BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname IN ('serieverse-daily-sync', 'serieverse-catalog-sync');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'serieverse-daily-sync',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://uohdunnyulksapwshufm.supabase.co/functions/v1/sync-catalog',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"mode": "all"}'::jsonb
  );
  $$
);