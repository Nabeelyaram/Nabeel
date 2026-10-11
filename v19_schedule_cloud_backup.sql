-- Run ONLY after v19_onedrive_cloud_backup.sql and after adding ONEDRIVE_CRON_SECRET.
-- Replace CHANGE_THIS_TO_THE_SAME_VALUE_AS_ONEDRIVE_CRON_SECRET with your private random value.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule(jobid) from cron.job where jobname = 'maqsood-onedrive-hourly-backup';
select cron.schedule(
  'maqsood-onedrive-hourly-backup',
  '5 * * * *',
  $$select net.http_post(
    url := 'https://sgjthartydvfofefkpsb.supabase.co/functions/v1/onedrive-backup',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-onedrive-cron-secret', 'CHANGE_THIS_TO_THE_SAME_VALUE_AS_ONEDRIVE_CRON_SECRET'),
    body := '{}'::jsonb
  );$$
);
