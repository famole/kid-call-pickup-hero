# Kid Call Pickup Hero - Project Overview

This document provides a high level overview of the application, its structure and the main features it offers.

## Purpose

Kid Call Pickup Hero streamlines how schools handle student pickups. Parents can request pickups and receive notifications while staff manage requests through an admin interface.

## Technologies

- **React** and **TypeScript** built with **Vite**
- **Tailwind CSS** and **shadcn/ui** for styling
- **Supabase** for authentication, database access and real-time updates
- **TanStack React Query** for data fetching
- **Bun** for running tests

## Directory Structure

- `src/components` – Reusable UI components. Includes subfolders for admin views and the parent dashboard.
- `src/pages` – Route pages registered in `App.tsx`.
- `src/hooks` – Custom hooks for fetching data, auth logic and state management.
- `src/services` – Supabase interactions such as parent, student and pickup operations.
- `src/context` – React context providers, including authentication.
- `src/integrations/supabase` – Generated types and Supabase client.
- `supabase` – Database configuration and SQL migrations.
- `docs` – Project documentation.

## Key Features

- **Authentication** with Supabase, supporting both email/password and OAuth flows. Preloaded parents can set their password during onboarding.
- **Parent Dashboard** shows children and active pickup requests with real-time updates when authorized users request pickups.
- **Admin Panel** lets staff manage classes, students and parents, view reports and run stress tests.
- **Pickup Management** allows staff to mark requests as called. A scheduled Supabase function automatically completes expired requests after five minutes.
- **Stress Test Tools** simulate concurrent users to test Supabase functions and app performance.
- **Database Migrations** define tables, relationships and server-side jobs.

## Testing

Run all tests using:

```sh
bun run test
```

Generate a coverage report with:

```sh
bun run coverage
```

## Deployment

Build the project with `npm run build` (or `npm run build:dev` for a development build) and publish it through [Lovable](https://lovable.dev). You can connect a custom domain in the project settings.

