/*
# Manual series, calendar category overrides and admin episode creation

## Plain-English summary
1. Series can now exist without a TVMaze ID, so the administrator can add shows that TVMaze does not list yet.
2. Each episode can have a manually chosen category (season premiere, mid-season finale, season finale, series premiere or regular). When no category is chosen, the automatic one is still used.
3. The administrator can create new episodes for any show through a protected database function.

## 1. Changes to `shows`
- `tvmaze_id` is no longer required. Existing rows keep their values. The uniqueness rule still applies to every value that is filled in.

## 2. Changes to `episodes`
- New optional column `role_override` with a fixed list of allowed categories. Empty means "use the automatic category".

## 3. Changes to the `episode_roles` view
- Uses `role_override` when it is set, otherwise the same automatic rules as before.
- Keeps `security_invoker = true`, so row-level security of the caller still applies.

## 4. Security
- `episode_roles` is read-only for application roles. INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES and TRIGGER are revoked from `anon` and `authenticated`.
- New function `admin_add_episode` checks `is_admin()` before inserting. It is revoked from `PUBLIC` and `anon`, and granted only to `authenticated`.
- Manually created episodes get negative IDs, so they never collide with TVMaze episode IDs.

## Important notes
1. No data is removed or converted.
2. The daily TVMaze sync is updated in the same release so it skips series without a TVMaze ID.
*/

ALTER TABLE shows ALTER COLUMN tvmaze_id DROP NOT NULL;

ALTER TABLE episodes ADD COLUMN IF NOT EXISTS role_override text;

ALTER TABLE episodes DROP CONSTRAINT IF EXISTS episodes_role_override_check;
ALTER TABLE episodes ADD CONSTRAINT episodes_role_override_check
  CHECK (role_override IS NULL OR role_override IN ('series_premiere', 'season_premiere', 'mid_season_finale', 'season_finale', 'regular'));

CREATE OR REPLACE VIEW episode_roles WITH (security_invoker = true) AS
WITH season_sizes AS (
  SELECT show_id, season, max(number) AS last_number, count(*) AS episode_count
  FROM episodes
  GROUP BY show_id, season
)
SELECT
  e.tvmaze_episode_id,
  COALESCE(
    e.role_override,
    CASE
      WHEN e.season = 1 AND e.number = 1 THEN 'series_premiere'
      WHEN e.number = 1 THEN 'season_premiere'
      WHEN s.last_number > 40 OR s.episode_count > 40 THEN 'regular'
      WHEN e.number = s.last_number THEN 'season_finale'
      WHEN s.last_number >= 8 AND e.number = (s.last_number / 2) THEN 'mid_season_finale'
      ELSE 'regular'
    END
  ) AS episode_role
FROM episodes e
JOIN season_sizes s ON s.show_id = e.show_id AND s.season = e.season;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON episode_roles FROM anon, authenticated;
GRANT SELECT ON episode_roles TO anon, authenticated;

CREATE OR REPLACE FUNCTION admin_add_episode(
  p_show_id bigint,
  p_season integer,
  p_number integer,
  p_name text,
  p_airdate date,
  p_runtime integer,
  p_episode_type text
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id bigint;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Solo la administradora puede añadir episodios';
  END IF;

  SELECT LEAST(0, COALESCE(MIN(tvmaze_episode_id), 0)) - 1 INTO new_id FROM episodes;

  INSERT INTO episodes (tvmaze_episode_id, show_id, season, number, name, airdate, runtime, episode_type)
  VALUES (new_id, p_show_id, p_season, p_number, NULLIF(TRIM(p_name), ''), p_airdate, p_runtime, p_episode_type);

  RETURN new_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION admin_add_episode(bigint, integer, integer, text, date, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_add_episode(bigint, integer, integer, text, date, integer, text) TO authenticated;
