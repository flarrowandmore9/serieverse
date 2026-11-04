/*
# Fix daily catalog sync URLs and schedule

1. Purpose
- The existing cron jobs pointed to an incorrect Supabase project URL (`bhaqiizhzwrfxfblubbs.supabase.co`).
- The correct project URL is `uohdunnyulksapwshufm.supabase.co`.
- This migration unschedules the old jobs and recreates them with the correct URL.
- Also consolidates to a single daily job at 03:00 UTC (the every-2-minute job is removed to avoid
  unnecessary load; the daily sync is sufficient for catalog updates).

2. Existing objects used
- `pg_cron` schedules the recurring job.
- `pg_net` sends the asynchronous HTTP request.
- No tables, columns, policies, grants, or user records are created or modified.

3. Safety
- All old jobs with matching names are removed before recreation.
- Re-running this migration creates one job, not duplicates.
*/

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname IN ('serieverse-daily-sync', 'serieverse-catalog-sync');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'serieverse-daily-sync',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://uohdunnyulksapwshufm.supabase.co/functions/v1/sync-catalog',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"mode":"sync"}'::jsonb
  );
  $$
);
