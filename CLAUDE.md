# Bridge Talent & Job Portal — Claude Code Project Context

> **Read this file first.** It contains everything you need to build the Bridge Talent & Job Portal.

---

## CRITICAL RULES

1. **NEVER use mock data, placeholder data, fake data, or hardcoded test data.** Always use real Bridge API responses. If the API is unreachable, throw an error — do not fall back to mock data.
2. **All API calls must use the real BRIDGE_API_KEY** from `.env.local`. Never hardcode API keys.
3. **Never create seed files with fake users/jobs.** The talent directory and job board must be populated exclusively from Bridge API data and real user input.
4. **If you need test data, fetch it from the real Bridge API** using the development API key.
5. **Environment variables are in `.env.local`** — never commit this file. Always read from `process.env`.
6. **Bridge API is the ONLY data source.** Do NOT integrate any external ATS APIs (Greenhouse, Lever, Ashby), do NOT build any job scraping pipelines, do NOT use any third-party data providers. ALL user profiles, network data, and professional data come from Bridge API. Jobs are posted manually by portfolio companies through the Talent Portal UI.
7. **No external API keys needed** — only BRIDGE_API_KEY. Ignore any references to Greenhouse, Lever, Ashby, or scraper configs in other spec files — those were competitive analysis ideas, not implementation requirements.

---

## Project Overview

Build a **Talent Portal + Job Portal** for Bridge's VC Network platform. This is a new module alongside the existing Perks Portal. It connects portfolio companies with vetted, network-endorsed talent through AI-powered matching and warm introductions.

### Three User Types

1. **Job Seekers / Talent** — Professionals in the Bridge network looking for opportunities
2. **Portfolio Companies** — Companies in VC portfolios posting jobs and hiring
3. **VC / Fund Managers** — Partners managing the network, curating talent, tracking hires

### Tech Stack

- **Frontend:** Next.js 14+ (App Router, Server Components)
- **UI:** Tailwind CSS + shadcn/ui
- **Backend:** Next.js API routes + Bridge Rails API (existing)
- **Database:** PostgreSQL (extend existing Bridge DB + new Talent tables)
- **Auth:** Bridge JWT SSO (existing authentication system)
- **AI/Search:** Bridge embedding infrastructure (existing vector search)
- **Real-time:** Supabase (Bridge already has Supabase token endpoint)
- **Background Jobs:** Sidekiq (existing) + Next.js cron
- **Email:** SendGrid (existing Bridge integration)
- **Analytics:** Mixpanel (existing Bridge integration)

---

## Bridge Backend (Existing System)

The Bridge backend is a **Ruby on Rails** application at `gitlab.com/intropath/intro-backend`.

### Key Bridge API Endpoints for This Project

```
# Auth
POST /api/current/auth/sessions          → Login, returns JWT
POST /api/current/auth/supabase_token    → Get Supabase token

# User Profiles
GET  /api/current/users/me               → Current user (full profile + global_profile + ICP)
GET  /api/current/users/:id              → User by ID
GET  /api/current/users/show_by_email    → User by email

# Search (Critical for Talent Directory)
GET  /api/current/search/bridge_members  → Search all Bridge members
GET  /api/current/search/embeddings      → Semantic vector search
GET  /api/current/search/embeddings/by_profile → Find similar profiles
GET  /api/current/search/network_portfolios → Portfolio companies
GET  /api/current/search/network_investors  → Investors

# Delta Sync
GET  /api/current/contacts/bridge_members_details/since/:time → Updated members
GET  /api/current/introductions/since/:time → New intros
GET  /api/current/network_asks/since/:time  → New asks

# Introductions (Warm Referrals)
POST /api/current/introductions           → Create introduction
GET  /api/current/contacts/:id/connector_suggestions → Who can introduce
GET  /api/current/contacts/:id/common_contacts → Mutual connections

# Network Domains (VC Network Membership)
GET  /api/current/user_networks          → User's network memberships
GET  /api/current/tags/:domain/details   → Network details

# Webhooks
GET  /api/current/webhooks/available_webhooks → Available events
POST /api/current/webhooks               → Register webhook

# API Token
POST /api/current/api_tokens             → Create API token (for server-to-server)
```

### Bridge Data Model

**User** (`users` table):
- id (UUID), email, first_name, last_name, username, bio, profile_pic_url
- confirmed_at, terms_accepted_at, deleting (soft delete flag)

**GlobalProfile** (`global_profiles` table — 1:1 with User):
- bio, linkedin_profile_url, company, company_website, position, location
- twitter_handle_url, is_super_connector, no_organization

**ICP** (`orgs` table — via user_sid):
- roles (array), industries (array), description (context text)

**NetworkDomainUser** — maps users to VC network domains with roles (member, guest, api_admin)

**Key method:** `User#as_json` returns the complete profile including:
- global_profile (with email_references)
- network_domains (with role and has_portfolios flag)
- investor_network_domains
- icp (roles, industries, context, public flag)
- features (feature flags)
- roles (user roles)

### Bridge API Authentication

- **API Key:** For server-to-server sync. Create via `POST /api/current/api_tokens`
- **JWT:** For user-authenticated requests. Get via `POST /api/current/auth/sessions`
- Use API key for: bulk import, delta sync, background jobs
- Use JWT for: user-specific actions, profile edits, intro requests

---

## Project File Structure

```
bridge-talent-portal/
├── CLAUDE.md                              ← YOU ARE HERE
├── specs/
│   └── product-spec.md                    ← Full product specification
├── technical/
│   ├── architecture.md                    ← System architecture + DB schema
│   └── api-integration-spec.md            ← Bridge API mapping (50+ endpoints)
├── design/
│   └── design-spec.md                     ← UI components, tokens, layouts
└── competitive-analysis/
    ├── getro-analysis.md                  ← Getro competitive analysis
    ├── consider-analysis.md               ← Consider deep dive
    ├── wellfound-analysis.md              ← Wellfound analysis
    └── three-way-comparison.md            ← Bridge vs all competitors
```

---

## Implementation Order

### Phase 1: Foundation (Weeks 1-6)

1. **Project setup** — Next.js 14 + Tailwind + shadcn/ui + TypeScript
2. **Bridge API client** — `lib/bridge-api/client.ts` with API key auth
3. **Auth/SSO** — Bridge JWT login + session management
4. **Database** — Talent Network tables (see `technical/architecture.md` Section 2)
5. **Profile sync** — Bulk import Bridge users → talent_profiles
6. **Talent directory** — Searchable directory with Bridge's smart_member_search
7. **Job board** — Manual posting by portfolio companies + display with filters
8. **One-click apply** — Pre-filled from Bridge profile
9. **Role-based access** — Talent vs. Company vs. VC views

### Phase 2: Intelligence (Weeks 7-12)

11. **AI matching** — Use Bridge embeddings for job↔talent matching
12. **Recommended jobs** — Personalized feed based on match scores
13. **Warm intro flow** — "Request Intro" using Bridge intro system
14. **Connector suggestions** — "Who can introduce you" on job pages
15. **Delta sync** — Real-time profile updates via `/since/:time`
16. **Passive interest** — "Open to CTO roles in AI" signaling
17. **Application tracking** — Status pipeline (applied → hired)

### Phase 3: Community & Trust (Weeks 13-18)

18. **Endorsement system** — VC/founder/peer endorsement badges
19. **Referral tracking** — Who referred → who hired
20. **Talent pools** — VC-curated collections
21. **Events** — Hiring fairs, office hours
22. **Mentorship** — Matching and scheduling
23. **Direct messaging** — Hiring conversations

### Phase 4: Analytics & Scale (Weeks 19-24)

24. **Hire attribution** — Track network intros → hires
25. **VC dashboard** — Network analytics, portfolio hiring health
26. **Salary benchmarking** — Anonymized, aggregated data
27. **Advanced ATS sync** — 2-way sync with ATS platforms
28. **Chrome extension** — Talent sourcing from LinkedIn
29. **Slack integration** — Referral notifications

---

## Key Technical Decisions

1. **Extend Bridge DB, don't create separate** — New tables live alongside Bridge tables in same PostgreSQL instance
2. **Bridge API for reads, direct DB for Talent-specific writes** — Read user data through API, write talent_profiles/jobs/applications directly
3. **Leverage existing embeddings** — Don't rebuild vector search; use Bridge's `/search/embeddings` endpoints
4. **SSO first** — No separate registration; all users auth through Bridge
5. **Incremental sync** — Use `/since/:time` endpoints for 15-minute refresh cycles
6. **Progressive enhancement** — Core features work without JS; AI features enhance progressively

---

## Competitive Context

Bridge competes with:
- **Getro** ($210-500/mo) — Job aggregator with auto-scraping. No rich profiles, no community.
- **Consider** (Enterprise) — Talent circles + recruiter tools. Has client churn problems.
- **Wellfound** (Free-$499/mo) — Public marketplace with 10M+ candidates. Not private.

**Bridge wins with:** Rich profiles + endorsements + warm intros + community + platform ecosystem (Perks + Talent)

See `competitive-analysis/` for detailed analysis of each competitor.

---

## Environment Setup

```env
# Bridge API (Required — the ONLY external dependency)
BRIDGE_API_URL=https://api.brdg.app
BRIDGE_API_KEY=<your_bridge_api_token>

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# App
NEXT_PUBLIC_APP_URL=https://talent.brdg.app
NODE_ENV=development
```

---

## Important Notes

- Bridge users have `deleting: true` flag for soft deletes — exclude from Talent Network
- Only sync `confirmed_at != nil` users (confirmed email)
- Respect `icp.public` flag — don't expose private ICP data
- Salary data is NEVER synced to Bridge — Talent Network only, visible only to user
- `is_super_connector` on GlobalProfile identifies high-value networkers
- `User#as_json` is the canonical profile shape — match this in the Bridge API client types
- Bridge uses `sid` (bigserial) alongside `id` (UUID) — some relations use `sid` as FK

---

## Development Workflow

- **Dev server:** `npm run dev` (port 3000). Kill stale processes first: `kill $(lsof -ti:3000)`
- **Build check:** `npm run build` — catches TypeScript errors across the whole codebase; run before declaring work done
- **Scraper audit:** `grep -r "scrape\|greenhouse\|lever\|ashby\|ats_job_id\|source_url" src/ prisma/` — run if touching job-related code to catch ATS residue
- **DB setup:** `npx prisma db push` — applies schema to local PostgreSQL (requires `DATABASE_URL` in `.env.local`)
- **Next.js version:** Running 16.x (Turbopack). `middleware.ts` convention is deprecated — use `proxy` instead when touching auth middleware
- **Dev login:** In browser console run: `fetch('/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ useApiKey:true, apiKey:'<BRIDGE_API_KEY from .env.local>' }) })` — sets a real session cookie so all pages work

## Codebase Gotchas

- **`src/types/prisma.ts`** — manually re-exports Prisma models; update it whenever models are added or removed from `prisma/schema.prisma`
- **Dev session fallback** — `src/app/(dashboard)/layout.tsx` uses a hardcoded `DEV_SESSION` (role: `admin`) when no real session cookie exists. BUT individual pages call `getSession()` directly and redirect if null — so the fallback only helps layout, not auth guards. Run the dev login above to get a real cookie.
- **Dev login bypass** — POST `/api/auth/login` with `{ useApiKey: true, apiKey: "<bridge_jwt>" }` lets you authenticate with a raw Bridge JWT (dev-only, blocked in production). The BRIDGE_API_KEY value in `.env.local` IS a valid Bridge user JWT for Connor Murphy (CEO).
- **Job `source` field** — always `'manual'`; no other values are valid. Do not add UI branches for other source types
- **`confirmed` vs `confirmed_at`** — Bridge API v1 returns `confirmed: true` (boolean); `confirmed_at` may be null even for confirmed users. Auth check uses `user.confirmed || user.confirmed_at`
- **Prisma null safety** — `prisma` from `src/lib/db/prisma.ts` can be `null` when `DATABASE_URL` is not set. Every API route must guard: `if (!prisma) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })`

## Bridge API v1 — Verified Endpoint Status

Base URL: `https://api.brdg.app` — Auth: `Authorization: Bearer <JWT>` + **`Accept: application/json` REQUIRED** (without it, Heroku router returns HTML 404 instead of hitting Rails)

Route prefix: `/api/v1/` — NOT `/api/current/` (specs reference the old prefix; codebase uses v1)

| Endpoint | Status | Notes |
|---|---|---|
| `GET /api/v1/users/me` | ✅ Works | Returns `{ user: {...}, message: "..." }` — unwrap `.user` |
| `POST /api/v1/auth/sessions` | ✅ Works | Returns `{ token, user }` on success |
| `GET /api/v1/contacts/bridge_members_ids` | ✅ Works | Returns `{ list: ["uuid", ...] }` — full network UUID list |
| `GET /api/v1/search/network_portfolios?domain=X` | ✅ Works | Returns `{ data: [...] }` |
| `GET /api/v1/tags/:domain/details` | ✅ Works | Returns network/org info |
| `GET /api/v1/search/bridge_members` | ❌ 500 error | Server-side crash — do not use |
| `GET /api/v1/search/embeddings` | ❌ 500 error | Server-side crash |
| `GET /api/v1/users/:id` | ❌ 403 | "not able to retrieve this user" for non-self |
| `GET /api/v1/contacts/bridge_members_details/since/:time` | ❌ 404 | Not exposed in v1 |
| `GET /api/v1/user_networks` | ❌ 404 | Not exposed in v1 |

**Talent Directory sync strategy:** Use `bridge_members_ids` to get all UUIDs → store placeholder `talent_profiles` rows → fetch live profile data via `users/me` (own JWT) on the detail page. The `search/bridge_members` bulk search endpoint is broken server-side.

**User response wrapping:** All `/api/v1/users/*` responses wrap the user object: `{ "user": {...}, "message": "..." }`. The `getCurrentUser()` in `src/lib/bridge-api/users.ts` unwraps this automatically.
