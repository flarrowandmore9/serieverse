ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read episodes" ON public.episodes;
CREATE POLICY "Allow read episodes"
ON public.episodes
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert episodes" ON public.episodes;
CREATE POLICY "Allow authenticated insert episodes"
ON public.episodes
FOR INSERT
TO authenticated, anon
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update episodes" ON public.episodes;
CREATE POLICY "Allow authenticated update episodes"
ON public.episodes
FOR UPDATE
TO authenticated, anon
USING (true)
WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.episodes TO anon, authenticated;