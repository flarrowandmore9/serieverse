/*
# Daily automatic catalog sync

1. Extensions
- Enables `pg_cron` (runs a job every day) and `pg_net` (lets the database call the sync edge function).

2. Schedule
- Job `serieverse-daily-sync` runs every day at 03:00 UTC.
- It calls the `sync-catalog` edge function, which refreshes series status, premiere/end dates, episode airdates, posters and characters from TVMaze.
- The function skips the run if a full sync already happened in the last 20 hours, so reruns are harmless.

3. Notes
- The function is public (no login needed for cron) and only reads public TVMaze data, so no secret is stored here.
- Re-running is safe: the job is unscheduled by name before it is recreated.
*/

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'serieverse-daily-sync';
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'serieverse-daily-sync',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://bhaqiizhzwrfxfblubbs.supabase.co/functions/v1/sync-catalog',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"mode": "all"}'::jsonb
  );
  $$
);
