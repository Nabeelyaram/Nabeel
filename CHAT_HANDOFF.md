# Maqsood Karyana Store - Codex Handoff

Last updated: 2026-08-02 (Asia/Karachi)

## Canonical OneDrive Folder

`C:\Users\HP\OneDrive - National University of Sciences & Technology\Codex Projects\Maqsood-Karyana-Store`

Future work should be performed from this OneDrive folder.

## Current Version

- Latest package: `maqsood-karyana-store-safety-search-v8.zip`
- Main source files: `index.html`, `styles.css`, `app.js`, `sw.js`, `manifest.webmanifest`, `supabase_setup.sql`
- `config.js` contains the live Supabase connection and must remain private.

## Latest Completed Work

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

Version 8 requires no new SQL. If version 7 SQL has already been run, deploy the new frontend files only. Existing rows remain unchanged.

## Safety Rules

1. Never overwrite or delete existing Supabase rows without explicit approval.
2. Keep `config.js` and Supabase keys private.
3. Use additive SQL migrations and versioned ZIP files.
4. Update this handoff after every completed change.

## Continue Command

Tell Codex: `Codex Projects/Maqsood-Karyana-Store se CHAT_HANDOFF.md read karke continue karo.`
