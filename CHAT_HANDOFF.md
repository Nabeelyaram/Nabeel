# Maqsood Karyana Store - Codex Handoff

Last updated: 2026-08-27 (Asia/Karachi)

## Canonical OneDrive Folder

`C:\Users\HP\OneDrive - National University of Sciences & Technology\Codex Projects\Maqsood-Karyana-Store`

Future work should be performed from this OneDrive folder.

## Current Version

- Latest package: `maqsood-karyana-store-summary-trash-backup-v16.zip`
- Main source files: `index.html`, `styles.css`, `app.js`, `sw.js`, `manifest.webmanifest`, `supabase_setup.sql`
- `config.js` contains the live Supabase connection and must remain private.

## Latest Completed Work

- Version 16 adds monthly summary, repeat-purchase reminders, rolling CSV/PDF/month-sheet Excel backup, and 30-day Trash with 10-second Undo and Restore.
- `v16_add_trash.sql` is required once; it only adds nullable `deleted_at`.

- Version 15 moves OneDrive backup controls to History and removes Paid vs Baqaya comparison UI, Payment filter and Total Baki quick insight.
- Khata ledger records and existing Supabase purchase data remain unchanged.

- Version 14 creates/opens `Maqsood Karyana Backups` inside the OneDrive location selected by the user.

- Version 13 removes manual Purchase Date and the duplicate History date column; new entries use current Pakistan date/day/time.
- Quick Add displays all saved and household catalogue items and adds a third 36-item local sprite (about 90 mapped pictures total).
- OneDrive local-folder backup uses the File System Access API after a one-time folder selection.
- New entries debounce backup for one hour, then overwrite the single `maqsood-karyana-history-auto.csv` file; overdue backup runs on next authenticated app open.

- Version 12 fixes missing Quick Add pictures using root-level sprites that are easier to deploy and cache.
- A dedicated 18-item sprite matches the user’s visible catalogue; a second sprite covers 36 common grocery items.
- Historical rows without `entered_at` show their purchase-date weekday plus fixed 09:00 PM, not “Purana record”.
- New rows show their real Pakistan weekday, full date and current saved time.

- Version 11 adds Tableau/Excel-style cross-filter drill-down: trend dates and top items are clickable and can be combined.
- Drill-down shows matching count, total, average, highest amount and clickable matching records.
- 36 generated, unbranded grocery thumbnails are bundled locally under `item-images`; runtime internet image hotlinks were removed.
- New records save `entered_at`; History shows Pakistan weekday/date/time. Offline draft timestamps remain the original entry time after sync.

- Version 10 makes the dashboard interactive with 7D, 30D, 90D and All-time live period controls.
- Trend total, line graph, comparison, top-item donut and paid-vs-due view all recalculate for the selected period.
- Trend points show exact date/bucket and amount on mouse hover, keyboard focus or mobile tap.
- Long periods automatically aggregate into weekly or monthly buckets.

- Professional automatic dashboard added with a 30-day spending trend, period comparison, top-item donut chart and paid-vs-due health graph.
- Voice item-name typing added using the browser Speech Recognition API (`ur-PK`); Chrome/Edge and microphone permission are recommended.
- Entry view now shows online image cards for frequent, saved and common grocery items.
- Clicking an image card fills the item name only; the amount and existing final confirmation are still required before saving.
- Image failures use a safe letter fallback.
- Version 9 changes only frontend files and does not delete or modify existing Supabase rows.

- Entry form simplified to Date, Item and Total Amount.
- Aaj ka total and item count appear in the header.
- First use on a device asks for a profile name.
- New records store who entered them using `entered_by`.
- Offline entries remain as local drafts and sync when internet returns.
- Duplicate-safe sync uses `client_ref`.
- Existing purchase records are not replaced or deleted.
- Every new/edit save shows a final detail confirmation.
- Same date, item and amount produces a duplicate warning.
- Amounts above Rs 1,000 produce a large-amount warning.
- History can be searched by minimum and maximum amount.

## Required Supabase Step

Version 16 requires that both `v11_add_entered_at.sql` and `v16_add_trash.sql` have been run once. Both migrations are additive.

## Safety Rules

1. Never overwrite or delete existing Supabase rows without explicit approval.
2. Keep `config.js` and Supabase keys private.
3. Use additive SQL migrations and versioned ZIP files.
4. Update this handoff after every completed change.

## Continue Command

Tell Codex: `Codex Projects/Maqsood-Karyana-Store se CHAT_HANDOFF.md read karke continue karo.`
