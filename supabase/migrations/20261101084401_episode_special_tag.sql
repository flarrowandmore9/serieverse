/*
# Add special_tag column to episodes

1. Modified tables
- `episodes`: new column `special_tag` (text, nullable). Values: null (normal),
  'crossover', 'halloween', 'christmas'. Set by admin or detected automatically.

2. Security
- Existing admin-only UPDATE/DELETE policies on `episodes` cover the new column.
- SELECT access already granted to anon + authenticated.

3. Notes
- Purely additive: no data is removed or changed.
*/

ALTER TABLE episodes ADD COLUMN IF NOT EXISTS special_tag text;
