/*
# Add classification flags to shows

1. Modified tables
- `shows`: added columns `is_spinoff`, `is_reboot`, `is_secuela`, `is_prequel` (boolean, not null, default false).

2. Security
- Existing admin-only update policy covers these new columns.
- Readable through existing public SELECT access.
*/

ALTER TABLE shows 
ADD COLUMN IF NOT EXISTS is_spinoff BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_reboot BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_secuela BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_prequel BOOLEAN NOT NULL DEFAULT FALSE;