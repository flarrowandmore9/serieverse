/*
# Track show visits and add catalog sort indexes

1. Modified tables
- `shows`: new column `views_count` (integer, default 0). Counts how many times a show was opened in the app.

2. New functions
- `register_show_view(p_show_id bigint)`: adds 1 to `views_count` for the given show. Runs with the owner's rights so visitors can record a visit without being granted write access to the table.

3. Security
- `register_show_view` is executable only by `anon` and `authenticated`; PUBLIC execution is revoked.
- No new write grants on `shows`; visitors cannot edit any other column.

4. Indexes
- `shows_views_count_idx` for the "most visited" ordering.
- `shows_created_at_idx` for the "recently added" ordering.
*/

ALTER TABLE shows ADD COLUMN IF NOT EXISTS views_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS shows_views_count_idx ON shows (views_count DESC);
CREATE INDEX IF NOT EXISTS shows_created_at_idx ON shows (created_at DESC);

CREATE OR REPLACE FUNCTION public.register_show_view(p_show_id bigint)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE shows SET views_count = views_count + 1 WHERE id = p_show_id;
$$;

REVOKE EXECUTE ON FUNCTION public.register_show_view(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_show_view(bigint) TO anon, authenticated;
