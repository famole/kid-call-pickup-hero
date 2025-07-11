# Latest Changes - June 16, 2025

This document summarizes the updates introduced in commit `52d9e4f`.

## Server-side auto-completion for pickup requests

- Added a new SQL migration `supabase/migrations/20250616184042-c2e17ef1-dd03-4d47-8d2f-b1d8128ddb92.sql` which defines a `auto_complete_expired_requests` function and schedules it using `pg_cron` to run every five minutes.
- Updated Supabase types to include the new function.

## Updated client logic

- `autoCompletePickupRequests` now calls the server function instead of performing manual queries and logs progress.
- `startAutoCompletionProcess` acts as a fallback and runs every two minutes.
- `usePickupManagement` and `useOptimizedPickupManagement` remove old timeout logic and rely on the cron job, with additional logging for real-time updates.

## Why

This change moves auto-completion of pickup requests from the client to the server, ensuring reliability even when clients are offline. The client still runs a lightweight backup process.
