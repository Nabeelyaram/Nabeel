# Maqsood Karyana Store

## Version 17 update

- Two separately installable packages: Simple User App and `ADMIN Maqsood Karyana Store`.
- Simple User password is `1234`. Existing owner password remains the Admin password.
- Dashboard, Analytics, Khata, Backup, Trash, amount filters and User Activity are Admin-only.
- Smart Reminders removed.
- Simple users retain Add Saman, basic History and Items.
- Edit/delete/restore and Khata actions are written to the Admin-only activity log with profile name and Pakistan time.
- Run `v17_admin_roles_audit.sql` once after the earlier v11 and v16 migrations.

## Version 16 update

- Monthly summary shows current total, entry count, previous-month total and percentage comparison.
- Frequently purchased reminders estimate average repeat interval from at least two distinct purchase dates.
- OneDrive rolling backup now writes complete CSV, complete PDF and a month-sheet Excel-readable `.xls` workbook.
- Purchase deletion is soft-delete to 30-day Trash. A 10-second Undo appears immediately, Restore remains available in History, and expired Trash is permanently purged after 30 days.
- Run `v16_add_trash.sql` once before deploying the frontend. Existing rows remain active.

## Version 15 update

- OneDrive History Auto Backup panel moved from Overview to History.
- Paid vs Baqaya account-health card removed.
- Payment filter and Total Baki Raqam quick insight removed.
- Khata ledger data remains unchanged.

## Version 14 update

- When the user selects their synced OneDrive location, the app creates/opens a child folder named `Maqsood Karyana Backups` and keeps the single rolling CSV inside it.

## Version 13 update

- Manual Purchase Date removed from Add Saman and the duplicate History date column removed. New purchases use the real current Pakistan date/day/time automatically.
- Quick Add now lists all saved items plus an expanded household catalogue instead of showing only 18 cards.
- A third 36-item household sprite covers noodles, pantry, cleaning, personal care, baby care and household supplies. Together the bundled sprites cover about 90 common items.
- OneDrive folder backup system added for desktop Chrome/Edge. The user selects a synced OneDrive folder once.
- Each new record resets a one-hour debounce timer. When due, the app overwrites one file named `maqsood-karyana-history-auto.csv`, avoiding daily duplicate files.
- If the app is closed at the due time, the overdue backup runs when the authenticated app is next opened and the folder permission is available.

## Version 12 update

- Quick Add pictures now use two root-level sprite files, so deployment no longer depends only on a nested image folder.
- The 18 items visible in the supplied screenshot have dedicated product pictures; 36 additional common grocery items use the bundled core sprite.
- Historical rows without `entered_at` now display the weekday calculated from `purchase_date` with a fixed `09:00 PM` time instead of “Purana record”.
- New rows continue to show their real Pakistan weekday, full date and current saved time.

## Version 11 update

Version 11 mein Tableau/Excel-style interactive drill-down add hua hai. Trend point ya Top Saman item click karne par matching entries, total, average, highest amount aur individual records show hote hain. Date aur item selections combine bhi ho sakti hain; record click se filtered History khulti hai.

- 36 common grocery pictures app ke andar locally bundled hain; runtime internet image hotlink nahi hoti.
- New entry ke sath exact `entered_at` timestamp save hota hai.
- History Pakistan timezone mein weekday, date aur save time show karti hai.
- Offline draft ka asal entry time bhi sync ke baad preserve hota hai.
- Supabase SQL Editor mein `v11_add_entered_at.sql` ek dafa run karna required hai. Migration additive hai aur purani rows delete/replace nahi karti.

## Version 10 update

- Dashboard ab interactive aur genuinely dynamic hai.
- 7 days, 30 days, 90 days aur All-time period live select kiya ja sakta hai.
- Spending line graph, total, previous-period comparison, top-item donut aur paid-vs-baqaya selected period ke mutabiq foran update hote hain.
- Graph ke har point par hover, keyboard focus ya mobile tap se date aur exact amount show hota hai.
- Long periods automatically weekly/monthly buckets mein group hote hain taa-ke graph readable rahe.
- Koi database migration nahi aur koi purana record delete/replace nahi hota.

## Version 9 update

Version 9 ke liye koi naya SQL run nahi karna. Purana Supabase data delete, replace ya migrate nahi hota.

- Overview par automatic professional visual dashboard add hua hai.
- Last 30 days spending trend aur previous 30 days comparison automatically calculate hota hai.
- Top spending items donut graph aur Paid vs Baqaya health graph show hota hai.
- Add Saman form mein Urdu/Pakistan voice typing button add hua hai. Voice support Chrome/Edge aur microphone permission par depend karti hai.
- Frequent, saved aur common saman ki online picture cards automatically show hoti hain.
- Picture card click karne par item name entry form mein fill ho jata hai; record tab tak save nahi hota jab tak amount aur final confirmation complete na ho.
- Online picture unavailable ho to letter fallback show hota hai.

## Version 8 update

Version 8 ke liye koi naya SQL run nahi karna. Purana data bilkul change nahi hota.

- Save se pehle date, item aur amount ki confirmation aati hai.
- Same date, item aur amount dobara add ho to duplicate warning aati hai.
- Rs 1,000 tak amount normal hai; Rs 1,000 se zyada par bari amount warning aati hai.
- History mein minimum aur maximum amount se search ki ja sakti hai.

## Version 7 database setup

`supabase_setup.sql` ko Supabase SQL Editor mein dobara run karein. Is se purana data delete ya replace nahi hota; sirf `entered_by` aur offline sync ke liye `client_ref` columns safely add hote hain.

- Har device par pehli dafa sirf naam poocha jata hai.
- Nayi entry ke sath entry karne wale ka naam save hota hai.
- Internet band ho to entry isi device mein offline draft rehti hai.
- Internet wapas aane par draft automatically Supabase mein sync hoti hai.
- Aaj ka total aur item count app ke upar nazar aata hai.

Mobile-first PWA for daily grocery purchases, paid/unpaid balances, item catalogue, history and analytics.

## Supabase

1. Create a new Supabase project.
2. Open SQL Editor.
3. In `supabase_setup.sql`, change the initial password `Maqsood123@`.
4. Run the complete SQL file once.
5. Open Project Settings > API.
6. Put Project URL and anon/publishable key in `config.js`.

Never put the `service_role` key in this app.

## GitHub and Vercel

Upload the files inside this folder to the root of a GitHub repository. Import that repository into Vercel. No build command is required because this is a static app.

## Login

The first login uses the password configured in `supabase_setup.sql`. A secure random session token remains valid for 7 days. Press Logout to end it immediately.

## Data and exports

- A new item name is automatically added to the searchable item dropdown.
- The dropdown merges quantity and spelling variants into one household name, for example `Chawal 2 kilo` becomes `Chawal`.
- History opens with the complete date range by default. Add From/To dates only when a limited report is required.
- `old_register_verified_import.sql` replaces only the previously imported handwritten-register rows and keeps daily app records unchanged.
- After the corrected import, Supabase should report **164 rows**, **Rs 25,189**, and **0 zero-amount rows**.
- The corrected workbook is the final source. Do not run the older v4 import because its names and total were not final.
- Dashboard Khata shows the verified-list sum, later app purchases, their combined sum, previous balance, payments and final remaining amount separately.
- Analytics combines common spelling/quantity variants such as `Ghee 1 kilo` with `Ghee`, `Patti` with `Chai Patti`, and `Chawal 2 kilo` with `Chawal`.
- CSV downloads the currently filtered history.
- Print / PDF opens the browser print screen. On mobile or desktop choose **Save as PDF** for a PDF file.
- The app shell works offline. New purchases can be kept as local drafts and automatically synced when internet returns; existing database records load/edit karne ke liye internet chahiye.
