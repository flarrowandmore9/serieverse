/*
# Add TV type to shows

1. Modified tables
- `shows`: new column `tv_type` (text, nullable). Stores the kind of program reported by TVMaze, such as "Scripted" for fiction series or "Reality" for non-fiction programs.

2. Purpose
- Lets the catalog keep only scripted and animated series, leaving out talk shows, news and other non-series programs.

3. Security
- No changes to row level security, policies or grants. The column inherits the table's existing access rules.

4. Notes
- Existing rows get a null value until the next catalog sync or cleanup run fills it in.
- Adding a column does not remove or alter any existing data.
*/

ALTER TABLE shows ADD COLUMN IF NOT EXISTS tv_type text;
