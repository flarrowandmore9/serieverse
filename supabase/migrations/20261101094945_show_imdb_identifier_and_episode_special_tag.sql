/*
# Add optional IMDb identifiers and a general special episode tag

1. Modified tables
- `shows`: adds nullable `imdb_id` for an optional IMDb series identifier.
- `episodes`: documents `special_tag` values including crossover, Halloween, Christmas and special.

2. Security
- Existing public read access and admin-only catalog write policies remain in effect.
- No permissions are broadened.

3. Notes
- Additive only. Existing rows remain unchanged.
*/

ALTER TABLE shows ADD COLUMN IF NOT EXISTS imdb_id text;
