Read the CLAUDE.md file in the project root first. Then read specs/product-spec.md, technical/architecture.md, technical/api-integration-spec.md, and design/design-spec.md.

You are building the Bridge Talent & Job Portal — Phase 1: Foundation.

## What to build

A Next.js 14+ application (App Router) with Tailwind CSS and shadcn/ui that connects to the Bridge API to create a talent directory and job board for a VC network.

## Phase 1 tasks in order

1. **Project setup** — Initialize Next.js 14+ with App Router, TypeScript, Tailwind CSS, shadcn/ui. Set up the project structure as defined in technical/architecture.md Section 1.2.

2. **Bridge API client** — Create `lib/bridge-api/client.ts` that authenticates using BRIDGE_API_KEY from `.env.local`. Implement methods for: getUser, getUserByEmail, getCurrentUser, searchBridgeMembers, getUserNetworks. Use real API calls only — never mock data.

3. **Auth/SSO** — Implement Bridge JWT authentication. Users log in through Bridge (`POST /api/current/auth/sessions`), receive a JWT, and that JWT is used for all authenticated requests. Create auth middleware, session management, and protected route wrappers.

4. **Database** — Set up PostgreSQL with the Talent Network tables defined in technical/architecture.md Section 2.1: talent_profiles, jobs, applications, endorsements, referrals, talent_pools, talent_pool_members, events, event_rsvps, bridge_sync_log. Include all indexes.

5. **Profile sync** — Build the Bridge → Talent Network sync service. On first login, fetch the user's full profile from Bridge API (`GET /api/current/users/me`) including global_profile, network_domains, icp, and create/update the corresponding talent_profile record. Map fields as defined in technical/api-integration-spec.md Section 10.1.

6. **Talent directory** — Build the searchable talent directory page. Fetch Bridge members via `/api/current/search/bridge_members`. Display talent cards with: avatar, name, position, company, location, skills, talent status, endorsement badges, mutual connections count. Add filters for: role type, location, skills, availability, network. Follow the design spec in design/design-spec.md Section 4.2 for card layout.

7. **Job board** — Build the job posting and browsing system. Portfolio companies can post jobs through a structured form (title, description, requirements, salary range, work type, location, experience level, skills, visibility). All users can browse and filter jobs. Display job cards following design/design-spec.md Section 4.1. Jobs are stored in the local jobs table — NO external scraping or ATS integration.

8. **One-click apply** — When a talent views a job, they can apply with one click. The application form is pre-filled from their Bridge profile (name, email, headline, company). Optional fields: cover note, resume upload. Applications are stored in the applications table.

9. **Role-based access** — Detect user role from Bridge data (talent vs portfolio company vs VC admin) using network_domains and investor_network_domains. Show/hide navigation items and features based on role. Talent sees jobs + apply. Companies see jobs + post + applications received. VCs see everything + analytics.

## Critical rules

- NEVER use mock data. Every API call must hit the real Bridge API using the BRIDGE_API_KEY from .env.local
- NEVER integrate external ATS APIs (Greenhouse, Lever, Ashby) or build scraping pipelines
- Bridge API is the ONLY external data source
- All jobs are posted manually by portfolio companies through the UI
- Follow the component specs in design/design-spec.md for all UI elements
- Use shadcn/ui components as the base — don't build custom components from scratch when shadcn has them
- Use Server Components by default, Client Components only when needed (interactivity, hooks, browser APIs)

## Bridge API reference

Base URL: from BRIDGE_API_URL env var
Auth: Bearer token using BRIDGE_API_KEY for server calls, JWT for user calls

Key endpoints:
- `GET /api/current/users/me` — Current user full profile (includes global_profile, network_domains, icp)
- `GET /api/current/users/:id` — User by ID
- `GET /api/current/search/bridge_members` — Search all members
- `GET /api/current/user_networks` — User network memberships
- `GET /api/current/contacts/:id/connector_suggestions` — Who can introduce
- `GET /api/current/contacts/:id/common_contacts` — Mutual connections
- `POST /api/current/auth/sessions` — Login (returns JWT)

## Start building

Begin with task 1 (project setup) and work through each task sequentially. After completing each task, verify it works before moving to the next. Show me progress as you go.
