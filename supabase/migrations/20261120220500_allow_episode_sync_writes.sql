SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE tablename = 'episodes';

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.episodes TO authenticated;

ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "episodes_admin_all" ON public.episodes;

CREATE POLICY "episodes_admin_all"
ON public.episodes
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_admin = true
  )
);