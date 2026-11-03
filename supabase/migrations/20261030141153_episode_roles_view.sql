/*
# Episode roles for calendar colors

1. New View
- `episode_roles`: one row per episode with its role in the season:
  - `series_premiere`: first episode of the first season.
  - `season_premiere`: first episode of any later season.
  - `season_finale`: last episode of its season.
  - `mid_season_finale`: the episode at the middle of seasons with 8 or more episodes (approximate, TVMaze does not flag it).
  - `regular`: any other episode.

2. Security
- The view runs with the caller's permissions (security_invoker), so it only exposes what `episodes` already exposes.
- SELECT is granted to anon and authenticated, the same roles that can read episodes.

3. Important notes
- No data is changed. Re-running is safe: the view is replaced with CREATE OR REPLACE.
*/

CREATE OR REPLACE VIEW episode_roles WITH (security_invoker = true) AS
WITH season_sizes AS (
  SELECT show_id, season, max(number) AS last_number
  FROM episodes
  GROUP BY show_id, season
)
SELECT
  e.tvmaze_episode_id,
  CASE
    WHEN e.season = 1 AND e.number = 1 THEN 'series_premiere'
    WHEN e.number = 1 THEN 'season_premiere'
    WHEN e.number = s.last_number THEN 'season_finale'
    WHEN s.last_number >= 8 AND e.number = s.last_number / 2 THEN 'mid_season_finale'
    ELSE 'regular'
  END AS episode_role
FROM episodes e
JOIN season_sizes s ON s.show_id = e.show_id AND s.season = e.season;

GRANT SELECT ON episode_roles TO anon, authenticated;
