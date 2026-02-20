# Bridge Talent & Job Portal — Complete Session Summary

> Use this document to continue work in a new chat. It contains everything decided, built, and clarified during the planning session.

---

## What We Built

A **Talent Portal + Job Portal** for Bridge's VC Network platform (alongside the existing Perks Portal). Three user types: job seekers/talent, portfolio companies, and VC/fund managers.

**Tech Stack:** Next.js 14+ (App Router), Tailwind CSS, shadcn/ui, TypeScript, PostgreSQL, Bridge Rails API

---

## Key Decisions Made

1. **Bridge API is the ONLY data source** — No external ATS APIs (Greenhouse, Lever, Ashby), no job scraping pipelines, no third-party data providers
2. **Jobs are posted manually** by portfolio companies through the Talent Portal UI
3. **All user profiles come from Bridge API** — synced via API key from the existing Bridge backend
4. **No mock data ever** — Claude Code must always use real Bridge API responses
5. **Only BRIDGE_API_KEY needed** — stored in `.env.local`, no other external API keys required
6. **SSO via Bridge JWT** — users authenticate through Bridge, no separate registration
7. **Bridge already has vector embeddings** (`/search/embeddings`) — reuse for AI job matching
8. **Bridge already has intro system** — reuse for warm referrals in hiring

---

## Bridge Backend Analysis

We analyzed the Bridge backend repo (`gitlab.com/intropath/intro-backend`) — a **Ruby on Rails** app.

### Key Bridge API Endpoints

```
# Auth
POST /api/current/auth/sessions          → Login, returns JWT
POST /api/current/auth/supabase_token    → Get Supabase token

# User Profiles
GET  /api/current/users/me               → Current user (full profile + global_profile + ICP)
GET  /api/current/users/:id              → User by ID
GET  /api/current/users/show_by_email    → User by email

# Search
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

# Network
GET  /api/current/user_networks          → User's network memberships
GET  /api/current/tags/:domain/details   → Network details

# Webhooks
GET  /api/current/webhooks/available_webhooks → Available events
POST /api/current/webhooks               → Register webhook
```

### Bridge Data Model

**User** (`users` table): id (UUID), email, first_name, last_name, username, bio, profile_pic_url, confirmed_at, deleting (soft delete), sid (bigserial)

**GlobalProfile** (`global_profiles` table — 1:1 with User): bio, linkedin_profile_url, company, company_website, position, location, twitter_handle_url, is_super_connector, no_organization

**ICP/Org** (`orgs` table — via user_sid): roles (array), industries (array), description

**NetworkDomainUser**: Maps users to VC networks with roles (member, guest, api_admin)

**User#as_json returns**: id, email, first_name, last_name, bio, profile_pic_url, username, global_profile (with all professional fields + email_references), network_domains (domain, role, has_portfolios), investor_network_domains, icp (roles, industries, context, public flag), roles, features, registration_source

---

## Competitive Analysis Done

### Getro (getro.com/vc)
- 850+ networks, $210-500/mo
- Products: GetroJobs, GetroConnect, GetroAPI, Intelligent Job Posts
- Strengths: Zero-maintenance auto job scraping, warm intro automation, hire attribution
- Weaknesses: No rich profiles, no community, no endorsements

### Consider (consider.com)
- 8 sub-products across 3 lines (Talent Sourcing, Talent Circle, Recruiter Intelligence)
- Client churn: Insight Partners and AirTree Ventures switched to Getro
- Features: Talent circles, Gen AI email sequences, Chrome extension, Slack auto-referrals

### Wellfound (wellfound.com)
- Public marketplace, 10M+ candidates, free tier
- Acquired Hirefly (agentic AI) Jan 2026
- Key insight: Salary transparency is #1 candidate draw
- Not a direct competitor — different model (public vs private network)

### Bridge Wins With
Rich profiles + endorsements + warm intros + community + platform ecosystem (Perks + Talent)

---

## Project Folder Structure

```
bridge-talent-portal/
├── .env.local                             ← Bridge API key (already set)
├── .claude/
│   └── commands/
│       └── start-phase1.md                ← Claude Code prompt for Phase 1
├── CLAUDE.md                              ← Main context file (read first)
├── specs/
│   └── product-spec.md                    ← Full product specification
├── technical/
│   ├── architecture.md                    ← System architecture + DB schema + API design
│   └── api-integration-spec.md            ← 50+ Bridge API endpoints mapped
├── design/
│   └── design-spec.md                     ← Design tokens, components, page layouts
└── competitive-analysis/
    ├── getro-analysis.md
    ├── consider-analysis.md
    ├── wellfound-analysis.md
    └── three-way-comparison.md
```

---

## CLAUDE.md Critical Rules

These are embedded in CLAUDE.md and must be preserved:

1. NEVER use mock data, placeholder data, fake data, or hardcoded test data
2. All API calls must use the real BRIDGE_API_KEY from `.env.local`
3. Never create seed files with fake users/jobs
4. If you need test data, fetch from real Bridge API
5. Environment variables in `.env.local` — never commit
6. Bridge API is the ONLY data source — no ATS APIs, no scraping
7. No external API keys needed — only BRIDGE_API_KEY

---

## Phase 1 Implementation Order

1. **Project setup** — Next.js 14 + Tailwind + shadcn/ui + TypeScript
2. **Bridge API client** — `lib/bridge-api/client.ts` with API key auth
3. **Auth/SSO** — Bridge JWT login + session management
4. **Database** — Talent Network tables (talent_profiles, jobs, applications, endorsements, referrals, talent_pools, events, bridge_sync_log)
5. **Profile sync** — Bulk import Bridge users → talent_profiles
6. **Talent directory** — Searchable directory with Bridge's smart_member_search
7. **Job board** — Manual posting by portfolio companies + display with filters
8. **One-click apply** — Pre-filled from Bridge profile
9. **Role-based access** — Talent vs. Company vs. VC views

---

## New Database Tables (Talent Network)

- **talent_profiles** — Extends Bridge user with: talent_status, open_to_roles, skills, experience_years, salary (private), work_preference, visibility, endorsements, referral_score
- **jobs** — Manual posting only: title, description, requirements, salary, location, work_type, skills_required, source='manual', status, visibility
- **applications** — job_id, talent_id, status pipeline (applied→reviewed→interviewing→offered→hired→rejected), match_score, referred_by, intro_id
- **endorsements** — VC/founder/peer endorsements with badges
- **referrals** — Track referrer → talent → job → hire
- **talent_pools** — VC-curated collections with auto-rules
- **events** — Network events (hiring fairs, office hours)
- **bridge_sync_log** — Track sync operations

---

## Data Flow

```
Bridge API (real users, profiles, network data)
        ↓ (API Key auth)
Talent Network Sync Service
        ↓
Talent Network DB (talent_profiles + new fields)
        ↓
Next.js Frontend (talent directory, job board, applications)
```

Portfolio companies post jobs → stored in local jobs table
Talent applies → stored in local applications table
All user profile data → fetched from Bridge API

---

## .env.local Setup

```env
# Bridge API (Required — the ONLY external dependency)
BRIDGE_API_URL=https://api.brdg.app
BRIDGE_API_KEY=<your_token_already_set>

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

---

## Changes Made During Session

- Removed all ATS/scraping references from all spec files
- Removed Greenhouse, Lever, Ashby API keys from env files
- Removed scraper_configs database table
- Removed Job Scraping Pipeline section from architecture
- Removed scraper folder from file structure
- Updated all phase checklists to remove scraping tasks
- Updated data strategy to show Bridge API as only source
- Added critical no-mock-data rules to CLAUDE.md
- Created Claude Code command at `.claude/commands/start-phase1.md`
