# Hourly OneDrive backup — final setup

This backup runs on Supabase every hour at minute 05, even when the app/browser is closed.

## What the server backup includes

- Complete purchase history
- Aapi Khata
- Other Khata, including adjustment/return entries
- One rolling CSV, PDF and Excel workbook in OneDrive folder `Maqsood Karyana Backups`

## One-time deployment

1. In Supabase SQL Editor, run these files in order:
   - `v19_onedrive_cloud_backup.sql`
   - `v21_personal_khata.sql`
   - `v23_other_khata.sql`
   - `v24_other_khata_adjustments.sql`
   - `v19_schedule_cloud_backup.sql` (use exactly the same value as `ONEDRIVE_CRON_SECRET`)

2. Deploy both Edge Functions from this project's `supabase/functions` folder:
   - `onedrive-oauth-callback`
   - `onedrive-backup`

3. Ensure these Supabase secrets are set:
   - `ONEDRIVE_CLIENT_ID`
   - `ONEDRIVE_CLIENT_SECRET`
   - `ONEDRIVE_TENANT_ID`
   - `ONEDRIVE_APP_URL` — exact deployed Admin app URL, with no trailing slash
   - `ONEDRIVE_CRON_SECRET`

4. In Microsoft Entra App Registration, add this Redirect URI exactly:
   `https://sgjthartydvfofefkpsb.supabase.co/functions/v1/onedrive-oauth-callback`

5. Deploy the new Admin app, log in as Admin and select **Connect OneDrive cloud**. Finish Microsoft sign-in. Then click **Backup now** once to test.

## Verify the hourly job

Run this in Supabase SQL Editor:

```sql
select jobid, jobname, schedule, active
from cron.job
where jobname = 'maqsood-onedrive-hourly-backup';
```

Expected: `active = true` and schedule `5 * * * *`.

After OneDrive connection, new files should appear/update at approximately 5 minutes past each hour (Pakistan time may differ from the job run timestamp shown in Supabase).