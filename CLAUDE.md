# Bridge Talent Network — Claude Code Project Context

> **Read this file first.** It contains everything you need to work on the Bridge Talent Network.

---

## CRITICAL RULES

1. **NEVER use mock data, placeholder data, fake data, or hardcoded test data.** Always use real Bridge API responses. If the API is unreachable, throw an error — do not fall back to mock data.
2. **All API calls must use the real BRIDGE_API_KEY** from `.env.local`. Never hardcode API keys.
3. **Never create seed files with fake users/jobs.** The talent directory is populated exclusively from Bridge API data via bulk sync.
4. **If you need test data, fetch it from the real Bridge API** using the development API key.
5. **Environment variables are in `.env.local`** — never commit this file. Always read from `process.env`.
6. **Bridge API + public ATS APIs are the data sources.** We integrate Workable, Greenhouse, Lever, and Ashby public job board APIs (all free, no auth). Do NOT use any third-party data providers beyond these.
7. **No external API keys needed** — only BRIDGE_API_KEY. All ATS APIs (Workable, Greenhouse, Lever, Ashby) are public/unauthenticated.

---

## Current State (MVP)

The app has two main features: a **Talent Directory** (21,720+ Bridge members) and a **Job Board** (sourced from portfolio company ATS systems + manual posting).

### What's Built
- **Talent Directory** (`/talent`) — Searchable, paginated directory of all Bridge members with role category filters
- **Profile Detail Pages** (`/talent/:id`) — Individual member profiles
- **Job Board** (`/jobs`) — Searchable, filterable job listings with company favicons, VC network filter, and multi-ATS sources
- **Job Detail Pages** (`/jobs/:id`) — Full job details with HTML rendering for ATS descriptions + apply button
- **Job Posting** (`/jobs/post`) — Manual job posting form (company/vc/admin only)
- **Portfolio Pages** (`/portfolio`, `/portfolio/:domain`) — VC network listing + tabbed detail pages with Jobs, Portfolio Companies, and Talent Network tabs
- **Multi-ATS Job Sync** — Automated sync of jobs from portfolio companies via Workable, Greenhouse, Lever, and Ashby public APIs. Descriptions stored as HTML for proper formatting.
- **Scheduled Cron Syncs** — Vercel cron jobs for automatic profile sync, job refresh, portfolio data sync, and ATS discovery
- **Portfolio Data Cache** — `VcNetwork` + `PortfolioCompany` tables cache Bridge API portfolio data locally so pages load in <100ms instead of 30-60+ seconds
- **ATS Cache** — `PortfolioAtsCache` table stores discovered ATS mappings for fast scheduled refreshes
- **Company Favicons** — Job cards, portfolio VC cards, and portfolio company cards all show logos via Google's favicon API with CSS initials fallback (server-component compatible, no `onError` needed)
- **Talent-Portfolio Matching** — VC detail page talent tab matches Bridge members to portfolio companies via email domain + company name stem matching (raw SQL)
- **Top nav + sidebar layout** — Fixed top nav (56px) with sidebar (240px); user avatar dropdown in top nav; nav links in sidebar with count badges
- **Bridge JWT SSO** — Login via Bridge API key (dev) or JWT
- **Supabase PostgreSQL** — 21,720 profiles + 5,976 portfolio companies + jobs stored with real data
- **Bulk sync** — Fetches all profiles from Bridge API via `GET /contacts/:id`
- **Search** — By name, company, position, email across all profiles

### What's NOT Built Yet
- Introductions / warm referrals
- Endorsements, referral tracking
- Talent pools, events, messaging
- AI matching, recommended jobs

### Bridge Design System
The app uses the **Bridge Design System** (skills defined in `bridge-claude-skills/`):
- **Primary color:** Royal `#0038FF`
- **Font:** Mulish (400, 500, 600, 700 weights)
- **Page background:** Slate 05 `#F9F9FA`
- **Color palette:** Charcoal (`#0D1531`), Charcoal 80 (`#3D445A`), Charcoal 70 (`#676C7E`), Slate 100 (`#81879C`), Slate 80 (`#9A9FB0`), Slate 60 (`#B3B7C4`), Slate 30 (`#D9DBE1`), Slate 15 (`#ECEDF0`), Slate 10 (`#F2F3F5`), Slate 05 (`#F9F9FA`)
- **Shadows:** Ds1 `0px 1px 3px rgba(0,0,0,0.1)`, Ds2 `0px 3px 10px rgba(0,0,0,0.1)`, Ds3 `0px 6px 20px rgba(0,0,0,0.1)`, Hover `0px 6px 20px rgba(0,0,0,0.15)`
- **Spacing:** 8px grid only
- **Cards:** `rounded-xl` (12px), Ds1 resting, Hover shadow on hover
- **Badges:** `rounded` (4px), 6 variants: default, info, success, warning, error, purple
- **Buttons/Search/Filters:** `rounded-full` (pill shape)
- **Icons:** Lucide only, NEVER emoji
- **Transitions:** 150ms for color, 200ms for shadow/transform, 300ms ease-out for entrance animations
- **Design tokens:** All defined as CSS variables in `src/app/globals.css`

### Layout
- **Top nav + sidebar** — Fixed top nav (56px) with sidebar (240px) below it.
- **Top nav** (`src/components/layout/top-nav.tsx`) — Bridge logo + "Talent & Job Board" subtitle on left, API health badge (dev only) + user avatar dropdown on right. No nav links in top nav.
- **Sidebar** (`src/components/layout/sidebar.tsx`) — Fixed left sidebar with "ADMIN" section label, 3 nav links (Talent Directory, Jobs, Portfolio) with Lucide icons (16px) + count badges, active state uses Royal 07 bg + Royal text. "Need help?" footer link. White background, Slate 15 right border.
- **Dashboard layout** (`src/app/(dashboard)/layout.tsx`) renders `<TopNav>` + `<Sidebar>` + `<main className="pt-14 pl-60">`. Layout fetches sidebar counts (talent, jobs, portfolio) via `Promise.all` from Prisma.
- **API health badge** — Dev-only (`NODE_ENV !== 'production'`). Calls `GET /api/health` on mount + every 30s. Shows green/yellow/red dot + status text. Hover popover shows API URL, response time, last checked. Hidden entirely in production.

### Routing
- `/` → redirects to `/talent`
- `/talent` → Talent Directory (main page, supports `?role=`, `?q=`, `?page=`)
- `/talent/:id` → Profile detail
- `/jobs` → Job Board (supports `?q=`, `?work_type=`, `?employment_type=`, `?experience_level=`, `?vc=`, `?page=`)
- `/jobs/:id` → Job detail with apply (HTML descriptions rendered properly)
- `/jobs/post` → Post a job (company/vc/admin only)
- `/portfolio` → VC network listing (reads from cached DB data)
- `/portfolio/:domain` → VC detail with tabbed layout (supports `?tab=jobs|companies|talent`, `?page=`)
- `/login` → Login page
- `/introductions` → redirects to `/talent` (placeholder)

---

## Tech Stack

- **Frontend:** Next.js 16.x (App Router, Server Components, Turbopack)
- **UI:** Tailwind CSS + shadcn/ui + Bridge Design System
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
| `GET /api/v1/search/network_portfolios?domain=X` | ✅ Works | Returns `{ data: [...] }` (v1) |
| `GET /api/v4/search/network_portfolios?domain=X` | ✅ Works | JSON:API format, returns 8 portfolio companies for brdg.app |
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

### Talent Directory Sync Strategy

1. `GET /api/v1/contacts/bridge_members_ids` → get all 21,720 member UUIDs
2. `GET /api/v1/contacts/:id` (per member, 10 concurrent) → fetch full profile data
3. Upsert into `talent_profiles` table with name, company, position, bio, photo, LinkedIn, etc.
4. Bulk sync takes ~18 minutes. Delta sync only fetches profiles where `profileSyncedAt` is null.

### Job Sync Strategy (Multi-ATS)

**Two-phase architecture** separates heavy discovery from lightweight refresh:

1. **ATS Discovery** (weekly cron or manual): Probes portfolio company domains against 4 ATS public APIs (Workable, Greenhouse, Lever, Ashby) in parallel → saves mapping to `PortfolioAtsCache` table
2. **Job Refresh** (every 6 hours cron): Reads cached ATS mappings → fetches jobs directly from known providers → fast, no probing
3. Each job gets `externalId: "{provider}:{id}"` for dedup (e.g., `greenhouse:127817`, `ashby:cedc8928-...`)
4. Upsert: existing → update fields; new → create; missing from source → set `status: 'closed'`
5. Sources: `workable`, `greenhouse`, `lever`, `ashby`, `manual`
6. Manual trigger: `POST /api/sync { "type": "portfolio_jobs" }` (admin/vc only)

### Scheduled Cron Jobs

Configured in `vercel.json`, authenticated via `CRON_SECRET` env var, handled by `GET /api/cron`.

| Cron | Schedule | What it does |
|---|---|---|
| `?type=profiles` | Every 6 hours | Delta sync — fetches new/unsynced Bridge member profiles |
| `?type=jobs` | Every 6 hours (offset) | Refreshes jobs from all cached ATS accounts (~120 companies, ~2 min) |
| `?type=portfolio` | Daily (2 AM) | Syncs VC network details + portfolio companies from Bridge API to local DB |
| `?type=discovery` | Weekly (Sunday 3 AM) | Probes unchecked portfolio domains for new ATS accounts (150 per run, reads domains from cached DB) |

**Environment variables for cron:**
- `CRON_SECRET` — Bearer token for authenticating Vercel cron requests
- `PORTFOLIO_VC_DOMAINS` — Comma-separated VC domains (e.g., `techstars.com,angelinvest.ventures`)

**Testing cron locally:** `curl -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/cron?type=jobs"`

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
│   └── schema.prisma                      ← DB schema (13 models)
├── prisma.config.ts                       ← Prisma config with dotenv
├── src/
│   ├── app/
│   │   ├── (auth)/login/page.tsx          ← Login page
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx                 ← Dashboard layout (top-nav + sidebar + main)
│   │   │   ├── page.tsx                   ← Redirects to /talent
│   │   │   ├── talent/page.tsx            ← Main talent directory (role filters)
│   │   │   ├── talent/[id]/page.tsx       ← Profile detail
│   │   │   ├── profile/page.tsx           ← User's own profile
│   │   │   ├── jobs/page.tsx              ← Job board (search, filters, VC filter, favicons)
│   │   │   ├── jobs/[id]/page.tsx         ← Job detail with HTML description rendering
│   │   │   ├── jobs/post/page.tsx         ← Post a job form (company/vc/admin)
│   │   │   ├── portfolio/page.tsx         ← VC network listing (reads from cached DB)
│   │   │   ├── portfolio/[domain]/page.tsx ← VC detail with tabbed layout (Jobs/Companies/Talent)
│   │   │   └── introductions/page.tsx     ← Redirects to /talent
│   │   └── api/
│   │       ├── auth/                      ← Login, logout, me
│   │       ├── health/route.ts            ← Bridge API health check (dev, no auth)
│   │       ├── sync/route.ts              ← Profile + job sync trigger (manual, auth required)
│   │       ├── cron/route.ts             ← Scheduled sync endpoint (Vercel cron, CRON_SECRET auth)
│   │       ├── talent/                    ← Talent CRUD API
│   │       ├── jobs/                      ← Jobs API (list, detail, apply)
│   │       └── ...                        ← Other API routes (scaffolded)
│   ├── components/
│   │   ├── layout/
│   │   │   ├── top-nav.tsx                ← Top navigation (logo + subtitle + API badge + avatar)
│   │   │   └── sidebar.tsx                ← Sidebar navigation (3 nav links + counts + help footer)
│   │   ├── talent/
│   │   │   ├── talent-card.tsx            ← Member card component (Bridge tokens, Lucide icons)
│   │   │   ├── talent-directory-client.tsx ← Directory grid + empty states (search/roles moved to page)
│   │   │   ├── talent-search-bar.tsx      ← Inline search input (39px, pill, white bg)
│   │   │   ├── role-filter-dropdown.tsx   ← Role filter dropdown (replaces inline chips)
│   │   │   ├── view-toggle.tsx            ← People/Companies toggle (37px, Slate 05 bg)
│   │   │   ├── company-card.tsx           ← Company card with logo + avatar preview
│   │   │   └── company-directory-client.tsx ← Company grid + empty states
│   │   ├── jobs/
│   │   │   ├── job-card.tsx               ← Job listing card (with favicons + source badge)
│   │   │   ├── job-filters.tsx            ← Search + filter dropdowns + VC network filter
│   │   │   ├── job-post-form.tsx          ← Manual job posting form
│   │   │   └── job-apply-button.tsx       ← Apply with cover note
│   │   ├── portfolio/
│   │   │   ├── vc-card.tsx                ← VC network card (server component, Google favicon)
│   │   │   ├── portfolio-company-card.tsx  ← Portfolio company card (server component, Google favicon, optional jobCount)
│   │   │   ├── vc-detail-tabs.tsx         ← Client tab bar for VC detail page (Jobs/Companies/Talent)
│   │   │   └── sync-portfolio-jobs-button.tsx ← Sync trigger button (admin/vc only)
│   │   └── ui/                            ← shadcn/ui primitives
│   ├── lib/
│   │   ├── auth/session.ts                ← JWT session management
│   │   ├── bridge-api/
│   │   │   ├── client.ts                  ← HTTP client (bridgeGet, bridgePost)
│   │   │   ├── types.ts                   ← BridgeUser, BridgeContact, BridgeMember, BridgePortfolio types
│   │   │   ├── users.ts                   ← getCurrentUser, getContactById, getBridgeMemberIds
│   │   │   ├── search.ts                  ← Network search + v4 portfolio fetching
│   │   │   ├── portfolio.ts               ← fetchVcDetails, fetchPortfolioCompanies (Bridge API)
│   │   │   └── introductions.ts           ← Intro endpoints
│   │   ├── db/prisma.ts                   ← Prisma client singleton
│   │   ├── portfolio-talent-match.ts      ← Talent-to-portfolio matching (email domain + company stem, raw SQL)
│   │   ├── role-categories.ts             ← Role category filters for talent directory
│   │   └── sync/
│   │       ├── profile-sync.ts            ← Bulk/delta profile sync service
│   │       ├── portfolio-sync.ts          ← Syncs VC details + portfolio companies to local DB
│   │       ├── job-sync.ts                ← Job sync + cache-based refresh + discovery
│   │       ├── ats-discovery.ts           ← Unified multi-ATS discovery (probes 4 providers)
│   │       ├── workable-client.ts         ← Workable public widget API client
│   │       ├── greenhouse-client.ts       ← Greenhouse public Job Board API client
│   │       ├── lever-client.ts            ← Lever public Postings API client
│   │       ├── ashby-client.ts            ← Ashby public Job Board API client
│   │       └── ats-config.ts              ← Portfolio company → ATS provider mapping
│   └── types/prisma.ts                    ← Re-exports Prisma models
├── bridge-claude-skills/                  ← Bridge Design System skills (authoritative)
│   ├── bridge-design-system/SKILL.md      ← Design tokens, colors, typography, spacing
│   ├── frontend-developer/SKILL.md        ← Implementation patterns + references/
│   ├── ui-designer/SKILL.md               ← Visual design principles
│   ├── ux-consultant/SKILL.md             ← UX audit heuristics
│   └── ux-copywriter/SKILL.md             ← Copy patterns, voice/tone
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
- **Job** — Jobs from multi-ATS sync + manual posting. Key fields: title, description, companyDomain, source (`manual` | `workable` | `greenhouse` | `lever` | `ashby`), externalId (unique, for dedup), status, applyUrl, workType, employmentType, experienceLevel, skillsRequired
- **VcNetwork** — Caches VC/network details from Bridge API `GET /api/v1/tags/:domain/details`. Fields: domain (unique), title, description, location, isVc, founders, industries, industriesInvestIn (JSON). Synced daily by `?type=portfolio` cron.
- **PortfolioCompany** — Caches portfolio company data from Bridge API v4 `network_portfolios`. Fields: domain, vcDomain (FK to VcNetwork), description, industries, status, funded, investDate. Composite unique on `[domain, vcDomain]`. ~5,976 rows across 3 VCs.
- **PortfolioAtsCache** — Caches discovered ATS mappings (companyDomain → provider + slug). Used by scheduled cron for fast job refreshes without re-probing.
- **Application, Endorsement, Referral, TalentPool, Event** — scaffolded but not populated yet

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
CRON_SECRET=<random-string-for-cron-auth>
PORTFOLIO_VC_DOMAINS=brdg.app,techstars.com,angelinvest.ventures,orangedao.xyz

# .env (Prisma CLI only — NEVER committed)
DATABASE_URL=postgresql://...@pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

---

## Development Workflow

- **Dev server:** `npm run dev` (port 3000). Kill stale processes first: `kill $(lsof -ti:3000)`
- **Build check:** `npm run build` — catches TypeScript errors; run before declaring work done
- **DB schema push:** See "Schema Push Workflow" above (must use session pooler port 5432)
- **Prisma regenerate:** `npx prisma generate` — run after any schema change
- **Profile bulk sync:** Login then `POST /api/sync {"mode":"bulk"}` — fetches all 21,720 profiles (~18 min)
- **Profile delta sync:** `POST /api/sync {"mode":"delta"}` — only fetches profiles not yet synced
- **Job sync:** `POST /api/sync {"type":"jobs"}` — fetches jobs from cached ATS accounts
- **Portfolio sync:** `POST /api/sync {"type":"portfolio"}` — syncs VC details + portfolio companies to local DB
- **Dev login:** In browser console: `fetch('/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ useApiKey:true, apiKey:'<BRIDGE_API_KEY>' }) })`
- **Next.js version:** 16.x (Turbopack). `middleware.ts` convention is deprecated.

## Codebase Gotchas

- **Sidebar is active** — Layout uses top-nav + sidebar. Sidebar is a client component (`usePathname` for active state), counts are passed as props from the server layout.
- **`src/types/prisma.ts`** — manually re-exports Prisma models; update it whenever models change in `prisma/schema.prisma`
- **DEV_SESSION fallback** — `src/app/(dashboard)/layout.tsx` uses `DEV_SESSION` (role: `admin`, bridgeJwt from `BRIDGE_API_KEY`) when no session cookie exists. Individual pages still call `getSession()` and redirect to `/login` if null.
- **Dev login bypass** — POST `/api/auth/login` with `{ useApiKey: true, apiKey: "<bridge_jwt>" }` authenticates with a raw JWT (dev-only). The `BRIDGE_API_KEY` in `.env.local` IS a valid Bridge user JWT for Connor Murphy (CEO).
- **`confirmed` vs `confirmed_at`** — Bridge API v1 returns `confirmed: true` (boolean); `confirmed_at` may be null even for confirmed users. Auth check uses `user.confirmed || user.confirmed_at`
- **Prisma null safety** — `prisma` from `src/lib/db/prisma.ts` can be `null` when `DATABASE_URL` is not set. Every API route must guard: `if (!prisma) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })`
- **Bridge API `Accept` header** — All requests to `api.brdg.app` MUST include `Accept: application/json`. Without it, Heroku returns HTML 404. This is handled in `src/lib/bridge-api/client.ts`.
- **Response wrapping** — `/api/v1/users/*` responses wrap in `{ user: {...} }`. `/api/v1/contacts/:id` wraps in `{ contact: {...} }`. Both are unwrapped by helper functions.
- **Broken endpoints** — `search/bridge_members` (500), `search/embeddings` (500), `users/:id` for non-self (403), `contacts/bridge_members_details/since/:time` (404), `user_networks` (404). These are commented out in the codebase with `⚠️ BROKEN` warnings.
- **Job `source` field** — `'manual'` (UI-posted) or `'workable'` | `'greenhouse'` | `'lever'` | `'ashby'` (synced from ATS). The `JobPostForm` always sets `source: 'manual'`.
- **Job `externalId` field** — Unique, format `{provider}:{id}` (e.g., `greenhouse:127817`, `ashby:cedc8928-...`). Used for dedup during sync. `null` for manually posted jobs.
- **Job descriptions are HTML** — ATS sources (Greenhouse, Lever, Ashby) store HTML descriptions. The job detail page auto-detects HTML via regex and renders with `dangerouslySetInnerHTML`. Manual/Workable jobs render as plain text with `whitespace-pre-wrap`. Job card previews always strip HTML.
- **Company favicons** — Job cards, VC cards, and portfolio company cards all use Google's favicon API: `https://www.google.com/s2/favicons?domain={domain}&sz=64`. CSS initials fallback rendered behind the image (absolute span + `z-10` on img). Server-component compatible — no `onError` handler, no `useState`, no `'use client'`.
- **VC detail page tabs** — `/portfolio/:domain` uses URL-param tabs (`?tab=jobs|companies|talent`). The `VcDetailTabs` client component renders shadcn Tabs (line variant) with `<Link>` navigation. All 3 tab counts are fetched in parallel via `Promise.all`; only the active tab's paginated data is loaded. Default tab is `jobs`.
- **Talent-portfolio matching** — `src/lib/portfolio-talent-match.ts` matches `TalentProfile` records to portfolio companies using raw SQL. Two strategies: (1) email domain match — `SPLIT_PART(email, '@', 2) = ANY(domains)`, (2) company name stem match — strip TLD from portfolio domains and match against `LOWER(company)`. Note: `TalentProfile.company` stores names ("Techstars"), while `PortfolioCompany.domain` stores domains ("techstars.com") — there's no FK between them.
- **Portfolio data is cached in DB** — `VcNetwork` + `PortfolioCompany` tables. Portfolio and jobs pages read from DB (fast). Bridge API `fetchPortfolioCompanies()` is only used by the sync service, NOT by page-load code paths. The `?type=portfolio` cron refreshes daily. Manual trigger: `POST /api/sync {"type":"portfolio"}`.
- **Workable public API** — `GET https://apply.workable.com/api/v1/widget/accounts/{slug}/` — no auth needed. Returns `{ jobs: [...], total: N }`. Only provides title, department, location, shortcode, URL — no full descriptions.
- **Portfolio ATS config** — Static mapping in `src/lib/sync/ats-config.ts`. Currently only Quantive uses Workable; other 7 companies are `manual_only`. Add new entries when portfolio companies adopt ATS with public APIs.
- **Profile pics** — Most Bridge users don't have profile pics. The app uses initials avatars as fallback.
- **Bridge Design System skills** — `bridge-claude-skills/` folder contains authoritative skill files: `bridge-design-system/SKILL.md` (tokens, colors, typography), `frontend-developer/SKILL.md` (implementation patterns), `ui-designer/SKILL.md`, `ux-consultant/SKILL.md`, `ux-copywriter/SKILL.md`. Always follow these for UI changes.
- **Talent directory controls row** — Search bar, role filter dropdown, vertical divider, and view toggle are all rendered on ONE horizontal flex row in `talent/page.tsx` (not inside child components). The client components (`talent-directory-client.tsx`, `company-directory-client.tsx`) no longer render their own search bars or role filters.
- **Role filter is a dropdown** — `role-filter-dropdown.tsx` uses shadcn `DropdownMenu` (not inline chips). The role categories data is defined in `src/lib/role-categories.ts` and passed as props from the page.
- **Badge system** — `src/components/ui/badge.tsx` has 6 Bridge variants: `default` (Slate), `info` (Sky/Royal), `success` (Kelly), `warning` (Honey), `error` (Ruby), `purple`. Legacy variants (`secondary`, `outline`, `destructive`) are kept for backward compat.
- **Talent directory header** — Uses a 36px Royal blue rounded-12px icon with Users lucide icon + 18px Bold title inline, with subtitle below. This pattern is defined in the Figma design (node `4892:2527`).

---

## Key Files for Common Tasks

| Task | File(s) |
|---|---|
| Change top nav | `src/components/layout/top-nav.tsx` |
| Change sidebar nav | `src/components/layout/sidebar.tsx` |
| Change page layout | `src/app/(dashboard)/layout.tsx` |
| API health check | `src/app/api/health/route.ts` |
| Modify talent cards | `src/components/talent/talent-card.tsx` |
| Modify talent page | `src/app/(dashboard)/talent/page.tsx` |
| Modify role filter dropdown | `src/components/talent/role-filter-dropdown.tsx` |
| Modify role category definitions | `src/lib/role-categories.ts` |
| Modify search | `src/components/talent/talent-search-bar.tsx` |
| Modify view toggle | `src/components/talent/view-toggle.tsx` |
| Modify design tokens | `src/app/globals.css` |
| Modify jobs page | `src/app/(dashboard)/jobs/page.tsx` |
| Modify job cards | `src/components/jobs/job-card.tsx` |
| Modify job filters | `src/components/jobs/job-filters.tsx` |
| Modify job posting | `src/components/jobs/job-post-form.tsx` |
| Modify job sync | `src/lib/sync/job-sync.ts` |
| Modify ATS discovery | `src/lib/sync/ats-discovery.ts` |
| Modify cron schedules | `vercel.json` + `src/app/api/cron/route.ts` |
| Add ATS company mapping | `src/lib/sync/ats-config.ts` |
| Modify ATS clients | `src/lib/sync/workable-client.ts`, `greenhouse-client.ts`, `lever-client.ts`, `ashby-client.ts` |
| Add Bridge API call | `src/lib/bridge-api/users.ts` or `search.ts` |
| Add Bridge API type | `src/lib/bridge-api/types.ts` |
| Change DB schema | `prisma/schema.prisma` → push → generate |
| Modify profile sync | `src/lib/sync/profile-sync.ts` |
| Modify portfolio sync | `src/lib/sync/portfolio-sync.ts` |
| Modify portfolio page | `src/app/(dashboard)/portfolio/page.tsx` |
| Modify portfolio detail | `src/app/(dashboard)/portfolio/[domain]/page.tsx` |
| Modify VC detail tabs | `src/components/portfolio/vc-detail-tabs.tsx` |
| Modify VC cards | `src/components/portfolio/vc-card.tsx` |
| Modify portfolio company cards | `src/components/portfolio/portfolio-company-card.tsx` |
| Modify talent-portfolio matching | `src/lib/portfolio-talent-match.ts` |
| Bridge API portfolio calls | `src/lib/bridge-api/portfolio.ts` |
| Auth / session | `src/lib/auth/session.ts` |
| Login page | `src/app/(auth)/login/page.tsx` |

---

## GitHub

Repository: `https://github.com/nryn3008-png/bridge-talent-portal.git`
