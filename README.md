# Bridge Talent Network

A talent directory for the Bridge VC network platform. Browse 21,700+ vetted professionals with real profiles, search by name, company, or role, and view detailed member profiles — all powered by the Bridge API.

## Features

- **Talent Directory** — Searchable, paginated grid of all Bridge network members
- **Real Profile Data** — Names, companies, positions, bios, photos, LinkedIn links synced from Bridge API
- **Profile Detail Pages** — Full member profiles with contact info, roles, and industries
- **Bridge SSO** — Authenticate via Bridge JWT (no separate registration)
- **Super Connector Badges** — Highlights high-value networkers in the directory

## Tech Stack

- **Framework:** Next.js 16 (App Router, Server Components, Turbopack)
- **UI:** Tailwind CSS + shadcn/ui
- **Database:** Supabase PostgreSQL via Prisma ORM
- **Auth:** Bridge JWT SSO
- **API:** Bridge API v1 (`api.brdg.app`)

## Getting Started

### Prerequisites

- Node.js 18+
- A Bridge API key (JWT token)
- A Supabase project (or any PostgreSQL database)

### Setup

1. Clone the repo:
   ```bash
   git clone https://github.com/nryn3008-png/bridge-talent-portal.git
   cd bridge-talent-portal
   npm install
   ```

2. Create `.env.local`:
   ```env
   BRIDGE_API_URL=https://api.brdg.app
   BRIDGE_API_KEY=<your-bridge-jwt>
   DATABASE_URL=postgresql://<user>:<password>@<host>:6543/postgres?pgbouncer=true&connection_limit=1
   JWT_SESSION_SECRET=<random-secret>
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   NODE_ENV=development
   ```

3. Create `.env` (for Prisma CLI):
   ```env
   DATABASE_URL=postgresql://<user>:<password>@<host>:6543/postgres?pgbouncer=true&connection_limit=1
   ```

4. Push the database schema:
   ```bash
   # If using Supabase, temporarily switch .env to session pooler (port 5432) for DDL
   npx prisma db push
   # Then switch .env back to transaction pooler (port 6543) for runtime
   ```

5. Start the dev server:
   ```bash
   npm run dev
   ```

6. Login — in your browser console:
   ```js
   fetch('/api/auth/login', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ useApiKey: true, apiKey: '<your-bridge-jwt>' })
   })
   ```

7. Sync profiles — trigger a bulk sync to populate the directory:
   ```bash
   curl -b <session-cookie> -X POST http://localhost:3000/api/sync \
     -H 'Content-Type: application/json' \
     -d '{"mode":"bulk"}'
   ```
   This fetches all ~21,700 member profiles from Bridge API (takes ~18 minutes).

## Project Structure

```
src/
  app/
    (auth)/login/              Login page
    (dashboard)/
      layout.tsx               Top-nav layout
      talent/page.tsx           Talent directory (main page)
      talent/[id]/page.tsx      Profile detail page
    api/
      auth/                    Login, logout, session
      sync/                    Bulk/delta profile sync
      talent/                  Talent CRUD endpoints
  components/
    layout/top-nav.tsx         Top navigation with user dropdown
    talent/                    TalentCard, search bar, directory grid
    ui/                        shadcn/ui primitives
  lib/
    auth/session.ts            JWT session management
    bridge-api/                Bridge API client, types, helpers
    db/prisma.ts               Prisma client singleton
    sync/profile-sync.ts       Profile sync service
prisma/
  schema.prisma                Database schema (11 models)
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server on port 3000 |
| `npm run build` | Production build with TypeScript checking |
| `npx prisma db push` | Push schema to database |
| `npx prisma generate` | Regenerate Prisma client after schema changes |

## License

Private — Bridge internal project.
