/*
# Restore daily SerieVerse catalog synchronization

1. Purpose
- Ensures the catalog refresh job exists even if the original scheduling migration was recorded while the job creation was unavailable.
- The job runs once per day at 03:00 UTC and calls the public sync-catalog Edge Function.

2. Existing objects used
- `pg_cron` schedules the recurring job.
- `pg_net` sends the asynchronous HTTP request.
- No tables, columns, policies, grants, or user records are created or modified.

3. Safety
- Any older job with the same name is removed before recreation.
- Re-running this migration creates one job, not duplicates.
*/

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname = 'serieverse-daily-sync';
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
    body := '{"mode":"sync"}'::jsonb
  );
  $$
);