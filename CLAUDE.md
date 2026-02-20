# Bridge Talent Network — Claude Code Project Context

> **Read this file first.** It contains everything you need to work on the Bridge Talent Network.

---

## CRITICAL RULES

1. **NEVER use mock data, placeholder data, fake data, or hardcoded test data.** Always use real Bridge API responses. If the API is unreachable, throw an error — do not fall back to mock data.
2. **All API calls must use the real BRIDGE_API_KEY** from `.env.local`. Never hardcode API keys.
3. **Never create seed files with fake users/jobs.** The talent directory is populated exclusively from Bridge API data via bulk sync.
4. **If you need test data, fetch it from the real Bridge API** using the development API key.
5. **Environment variables are in `.env.local`** — never commit this file. Always read from `process.env`.
6. **Bridge API is the ONLY data source.** Do NOT integrate any external ATS APIs (Greenhouse, Lever, Ashby), do NOT build any job scraping pipelines, do NOT use any third-party data providers.
7. **No external API keys needed** — only BRIDGE_API_KEY.

---

## Current State (MVP)

The app is a **Talent Directory MVP** — a single-purpose directory of 21,720+ Bridge network members with real profile data. No job board, no introductions, no other features yet.

### What's Built
- **Talent Directory** (`/talent`) — Searchable, paginated directory of all Bridge members
- **Profile Detail Pages** (`/talent/:id`) — Individual member profiles
- **Top-nav only layout** — No sidebar; user dropdown menu in top nav with sign-out
- **Bridge JWT SSO** — Login via Bridge API key (dev) or JWT
- **Supabase PostgreSQL** — 21,720 profiles stored with real data (names, companies, positions, bios, photos)
- **Bulk sync** — Fetches all profiles from Bridge API via `GET /contacts/:id`
- **Search** — By name, company, position, email across all profiles

### What's NOT Built Yet
- Job board / job posting
- Applications / one-click apply
- Introductions / warm referrals
- Endorsements, referral tracking
- Talent pools, events, messaging
- AI matching, recommended jobs

### Layout
- **Top nav only** — no sidebar navigation. The `Sidebar` component exists at `src/components/layout/sidebar.tsx` but is NOT used in the layout.
- **Dashboard layout** (`src/app/(dashboard)/layout.tsx`) renders only `<TopNav>` + `<main>` (full-width content).
- **Top nav** includes: Bridge logo, "Talent Directory" link, user avatar dropdown (name, email, role badge, sign out).

### Routing
- `/` → redirects to `/talent`
- `/talent` → Talent Directory (main page)
- `/talent/:id` → Profile detail
- `/login` → Login page
- `/jobs`, `/jobs/:id`, `/jobs/post`, `/introductions` → all redirect to `/talent` (placeholder)

---

## Tech Stack

- **Frontend:** Next.js 16.x (App Router, Server Components, Turbopack)
- **UI:** Tailwind CSS + shadcn/ui
- **Backend:** Next.js API routes + Bridge Rails API
- **Database:** Supabase PostgreSQL via Prisma ORM (with `@prisma/adapter-pg`)
- **Auth:** Bridge JWT SSO

---

## Bridge API v1 — Verified Endpoint Status

Base URL: `https://api.brdg.app` — Auth: `Authorization: Bearer <JWT>` + **`Accept: application/json` REQUIRED** (without it, Heroku router returns HTML 404)

Route prefix: `/api/v1/` — NOT `/api/current/` (specs reference the old prefix; codebase uses v1)

| Endpoint | Status | Notes |
|---|---|---|
| `GET /api/v1/users/me` | ✅ Works | Returns `{ user: {...}, message: "..." }` — unwrap `.user` |
| `POST /api/v1/auth/sessions` | ✅ Works | Returns `{ token, user }` on success |
| `GET /api/v1/contacts/bridge_members_ids` | ✅ Works | Returns `{ list: ["uuid", ...] }` — all 21,720 member UUIDs |
| `GET /api/v1/contacts/:id` | ✅ Works | Returns `{ contact: {...} }` — **full profile data** (name, email, company, position, location, bio, profile_pic_url, linkedin_profile_url, username, is_super_connector, icp, tags) |
| `GET /api/v1/contacts/:id/connector_suggestions` | ✅ Works | Who can introduce (requires user JWT) |
| `GET /api/v1/contacts/:id/common_contacts` | ✅ Works | Mutual connections (requires user JWT) |
| `GET /api/v1/search/network_portfolios?domain=X` | ✅ Works | Returns `{ data: [...] }` |
| `GET /api/v1/search/embeddings/by_profile` | ✅ Works | Find similar profiles |
| `GET /api/v1/tags/:domain/details` | ✅ Works | Returns network/org info |
| `GET /api/v1/search/bridge_members` | ❌ 500 error | Server-side crash — do not use |
| `GET /api/v1/search/embeddings` | ❌ 500 error | Server-side crash |
| `GET /api/v1/users/:id` | ❌ 403 | "not able to retrieve this user" for non-self |
| `GET /api/v1/contacts/bridge_members_details/since/:time` | ❌ 404 | Not exposed in v1 |
| `GET /api/v1/contacts/since/:time` | ❌ 404 | Not exposed in v1 |
| `GET /api/v1/user_networks` | ❌ 404 | Not exposed in v1 |
| `GET /api/v1/search/shared_contacts` | ❌ Timeout | Too slow |
| `GET /api/v1/search/global_contacts` | ❌ Timeout | Too slow |

### Talent Directory Sync Strategy (Current)

1. `GET /api/v1/contacts/bridge_members_ids` → get all 21,720 member UUIDs
2. `GET /api/v1/contacts/:id` (per member, 10 concurrent) → fetch full profile data
3. Upsert into `talent_profiles` table with name, company, position, bio, photo, LinkedIn, etc.
4. Bulk sync takes ~18 minutes. Delta sync only fetches profiles where `profileSyncedAt` is null.

### `/contacts/:id` Response Shape

```json
{
  "contact": {
    "id": "uuid",
    "name": "Full Name",
    "given_name": "First",
    "email": "email@...",
    "company": "Company",
    "position": "Title",
    "location": "",
    "bio": "Bio text...",
    "profile_pic_url": null,
    "linkedin_profile_url": "https://linkedin.com/in/...",
    "is_super_connector": false,
    "is_member": true,
    "username": "username",
    "icp": { "roles": [...], "industries": [...] },
    "tags": [{"id": "...", "name": "Network Name"}]
  }
}
```

---

## Project File Structure

```
bridge-talent-portal/
├── CLAUDE.md                              ← YOU ARE HERE
├── prisma/
│   └── schema.prisma                      ← DB schema (11 models)
├── prisma.config.ts                       ← Prisma config with dotenv
├── src/
│   ├── app/
│   │   ├── (auth)/login/page.tsx          ← Login page
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx                 ← Top-nav only layout (no sidebar)
│   │   │   ├── page.tsx                   ← Redirects to /talent
│   │   │   ├── talent/page.tsx            ← Main talent directory
│   │   │   ├── talent/[id]/page.tsx       ← Profile detail
│   │   │   ├── profile/page.tsx           ← User's own profile
│   │   │   ├── jobs/page.tsx              ← Redirects to /talent
│   │   │   └── introductions/page.tsx     ← Redirects to /talent
│   │   └── api/
│   │       ├── auth/                      ← Login, logout, me
│   │       ├── sync/route.ts              ← Bulk/delta sync trigger
│   │       ├── talent/                    ← Talent CRUD API
│   │       ├── jobs/                      ← Jobs API (scaffolded)
│   │       └── ...                        ← Other API routes (scaffolded)
│   ├── components/
│   │   ├── layout/
│   │   │   ├── top-nav.tsx                ← Top navigation with user dropdown
│   │   │   └── sidebar.tsx                ← NOT USED (kept for future)
│   │   ├── talent/
│   │   │   ├── talent-card.tsx            ← Member card component
│   │   │   ├── talent-directory-client.tsx ← Directory grid + search
│   │   │   └── talent-search-bar.tsx      ← Search input
│   │   ├── jobs/                          ← Job components (scaffolded)
│   │   └── ui/                            ← shadcn/ui primitives
│   ├── lib/
│   │   ├── auth/session.ts                ← JWT session management
│   │   ├── bridge-api/
│   │   │   ├── client.ts                  ← HTTP client (bridgeGet, bridgePost)
│   │   │   ├── types.ts                   ← BridgeUser, BridgeContact, BridgeMember types
│   │   │   ├── users.ts                   ← getCurrentUser, getContactById, getBridgeMemberIds
│   │   │   ├── search.ts                  ← Network search (some broken endpoints)
│   │   │   └── introductions.ts           ← Intro endpoints
│   │   ├── db/prisma.ts                   ← Prisma client singleton
│   │   └── sync/profile-sync.ts           ← Bulk/delta profile sync service
│   └── types/prisma.ts                    ← Re-exports Prisma models
├── specs/                                 ← Product spec docs
├── technical/                             ← Architecture & API docs
├── design/                                ← Design spec docs
└── competitive-analysis/                  ← Competitor analysis
```

---

## Database (Supabase PostgreSQL)

### Connection Details
- **Runtime:** Transaction pooler (port 6543, pgbouncer) — used in `DATABASE_URL` for app queries
- **Schema operations:** Session pooler (port 5432) — **must** use this for `prisma db push` (DDL). Transaction pooler hangs on DDL.
- **Both `.env` AND `.env.local` need `DATABASE_URL`** — `prisma.config.ts` loads from `.env` (via `dotenv/config`), app loads from `.env.local`

### Schema Push Workflow
```bash
# 1. Temporarily set .env to session pooler (port 5432) for DDL
# 2. Run: npx prisma db push
# 3. Switch .env back to transaction pooler (port 6543) for runtime
# 4. Run: npx prisma generate (if schema changed)
```

### Key Models
- **TalentProfile** — 21,720 rows with real data: firstName, lastName, email, company, position, location, bio, profilePicUrl, linkedinUrl, username, isSuperConnector, profileSyncedAt
- **Job, Application, Endorsement, Referral, TalentPool, Event** — scaffolded but not populated yet

---

## Environment Setup

```env
# .env.local (app runtime — NEVER committed)
BRIDGE_API_URL=https://api.brdg.app
BRIDGE_API_KEY=<your_bridge_jwt>
DATABASE_URL=postgresql://...@pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
JWT_SESSION_SECRET=<random-string>
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# .env (Prisma CLI only — NEVER committed)
DATABASE_URL=postgresql://...@pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

---

## Development Workflow

- **Dev server:** `npm run dev` (port 3000). Kill stale processes first: `kill $(lsof -ti:3000)`
- **Build check:** `npm run build` — catches TypeScript errors; run before declaring work done
- **DB schema push:** See "Schema Push Workflow" above (must use session pooler port 5432)
- **Prisma regenerate:** `npx prisma generate` — run after any schema change
- **Bulk sync:** Login then `POST /api/sync {"mode":"bulk"}` — fetches all 21,720 profiles (~18 min)
- **Delta sync:** `POST /api/sync {"mode":"delta"}` — only fetches profiles not yet synced
- **Dev login:** In browser console: `fetch('/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ useApiKey:true, apiKey:'<BRIDGE_API_KEY>' }) })`
- **Next.js version:** 16.x (Turbopack). `middleware.ts` convention is deprecated.

## Codebase Gotchas

- **No sidebar** — Layout uses top-nav only. The sidebar component file exists but is not imported anywhere.
- **`src/types/prisma.ts`** — manually re-exports Prisma models; update it whenever models change in `prisma/schema.prisma`
- **DEV_SESSION fallback** — `src/app/(dashboard)/layout.tsx` uses `DEV_SESSION` (role: `admin`, bridgeJwt from `BRIDGE_API_KEY`) when no session cookie exists. Individual pages still call `getSession()` and redirect to `/login` if null.
- **Dev login bypass** — POST `/api/auth/login` with `{ useApiKey: true, apiKey: "<bridge_jwt>" }` authenticates with a raw JWT (dev-only). The `BRIDGE_API_KEY` in `.env.local` IS a valid Bridge user JWT for Connor Murphy (CEO).
- **`confirmed` vs `confirmed_at`** — Bridge API v1 returns `confirmed: true` (boolean); `confirmed_at` may be null even for confirmed users. Auth check uses `user.confirmed || user.confirmed_at`
- **Prisma null safety** — `prisma` from `src/lib/db/prisma.ts` can be `null` when `DATABASE_URL` is not set. Every API route must guard: `if (!prisma) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })`
- **Bridge API `Accept` header** — All requests to `api.brdg.app` MUST include `Accept: application/json`. Without it, Heroku returns HTML 404. This is handled in `src/lib/bridge-api/client.ts`.
- **Response wrapping** — `/api/v1/users/*` responses wrap in `{ user: {...} }`. `/api/v1/contacts/:id` wraps in `{ contact: {...} }`. Both are unwrapped by helper functions.
- **Broken endpoints** — `search/bridge_members` (500), `search/embeddings` (500), `users/:id` for non-self (403), `contacts/bridge_members_details/since/:time` (404), `user_networks` (404). These are commented out in the codebase with `⚠️ BROKEN` warnings.
- **Job `source` field** — always `'manual'`; no other values valid. Do not add UI branches for other source types.
- **Profile pics** — Most Bridge users don't have profile pics. The app uses initials avatars as fallback.

---

## Key Files for Common Tasks

| Task | File(s) |
|---|---|
| Change navigation | `src/components/layout/top-nav.tsx` |
| Change page layout | `src/app/(dashboard)/layout.tsx` |
| Modify talent cards | `src/components/talent/talent-card.tsx` |
| Modify talent page | `src/app/(dashboard)/talent/page.tsx` |
| Modify search | `src/components/talent/talent-search-bar.tsx` |
| Add Bridge API call | `src/lib/bridge-api/users.ts` or `search.ts` |
| Add Bridge API type | `src/lib/bridge-api/types.ts` |
| Change DB schema | `prisma/schema.prisma` → push → generate |
| Modify sync logic | `src/lib/sync/profile-sync.ts` |
| Auth / session | `src/lib/auth/session.ts` |
| Login page | `src/app/(auth)/login/page.tsx` |

---

## GitHub

Repository: `https://github.com/nryn3008-png/bridge-talent-portal.git`
