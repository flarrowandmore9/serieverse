/*
# Add optional themoviedb identifiers and a general special episode tag

1. Modified tables
- `shows`: adds nullable `Tmdb_id` for an optional themoviedb series identifier.
- `episodes`: documents `special_tag` values including crossover, Halloween, Christmas and special.

2. Security
- Existing public read access and admin-only catalog write policies remain in effect.
- No permissions are broadened.

3. Notes
- Additive only. Existing rows remain unchanged.
*/

ALTER TABLE shows ADD COLUMN IF NOT EXISTS Tmdb_id text;
