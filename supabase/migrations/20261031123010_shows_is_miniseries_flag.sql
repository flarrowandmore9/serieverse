/*
# Mark classification flags to shows

1. Modified tables
- `shows`: new column `is_spinoff`, `is_reboot`, `is_secuela`, `is_prequel` (boolean, not null, default false). Existing rows default to false.

2. Security
- No new tables or policies. Existing admin-only update policy on `shows` covers the new column.
- The column is readable through the existing public SELECT access on `shows`.

3. Notes
- Purely additive: no data is removed or changed.
*/

ALTER TABLE shows 
ADD COLUMN IF NOT EXISTS is_spinoff BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_reboot BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_secuela BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_prequel BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_miniseries boolean NOT NULL DEFAULT false;
