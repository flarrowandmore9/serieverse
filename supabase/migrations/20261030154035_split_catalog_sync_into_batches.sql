/*
# Split catalog sync into rolling batches

1. What changes
- The once-a-day job that tried to refresh every show in one run is replaced by a job that runs every 2 minutes.
- Each run refreshes only a batch of shows that have never been synced or whose data is older than 20 hours, within a time limit, so the whole catalog stays current without timing out.

2. Scheduled jobs
- Removes `serieverse-daily-sync` (daily at 03:00 UTC).
- Adds `serieverse-catalog-sync` (every 2 minutes) calling the catalog sync function in sync mode.

3. Security
- No table, policy, or grant changes.

4. Notes
- Idempotent: the old job is removed only if it exists, and the new job replaces any earlier job with the same name.
*/

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'serieverse-daily-sync') THEN
    PERFORM cron.unschedule('serieverse-daily-sync');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'serieverse-catalog-sync') THEN
    PERFORM cron.unschedule('serieverse-catalog-sync');
  END IF;
END $$;

SELECT cron.schedule(
  'serieverse-catalog-sync',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://bhaqiizhzwrfxfblubbs.supabase.co/functions/v1/sync-catalog',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"mode": "sync"}'::jsonb
  );
  $$
);
