ALTER TABLE public.shows ADD COLUMN IF NOT EXISTS show_type text;
ALTER TABLE public.shows ADD COLUMN IF NOT EXISTS franchise text;
ALTER TABLE public.shows ADD COLUMN IF NOT EXISTS tmdb_id integer;
ALTER TABLE public.episodes ADD COLUMN IF NOT EXISTS overview_es text;

CREATE TABLE IF NOT EXISTS public.user_watched_episodes (
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  show_id bigint NOT NULL REFERENCES public.shows(id) ON DELETE CASCADE,
  tvmaze_episode_id integer NOT NULL,
  watched_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tvmaze_episode_id)
);

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
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "manage_own_watched_shows" ON public.user_watched_shows;
CREATE POLICY "manage_own_watched_shows" ON public.user_watched_shows
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());