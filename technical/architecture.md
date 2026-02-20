# Technical Architecture — Bridge Talent & Job Portal

> **For:** Claude Code Development Reference
> **Stack:** Next.js 14+ / Rails API / PostgreSQL / Supabase
> **Date:** February 2026

---

## 1. System Architecture

### 1.1 High-Level Overview

```
                    ┌─────────────────────────┐
                    │      Client Layer        │
                    │                          │
                    │  Next.js App (SSR/RSC)  │
                    │  - App Router           │
                    │  - Server Components    │
                    │  - Client Components    │
                    │  - Tailwind + shadcn/ui │
                    └───────────┬─────────────┘
                                │
                    ┌───────────▼─────────────┐
                    │     API Gateway          │
                    │                          │
                    │  Next.js API Routes      │
                    │  + Bridge Rails API      │
                    │  /api/current/           │
                    └───────────┬─────────────┘
                                │
            ┌───────────────────┼───────────────────┐
            ▼                   ▼                   ▼
   ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
   │ Bridge Core DB │ │ Talent Network │ │ Background     │
   │ (PostgreSQL)   │ │ DB Extension   │ │ Workers        │
   │                │ │ (PostgreSQL)   │ │                │
   │ - users        │ │ - talent_profs │ │ - Sync service │
   │ - global_prof  │ │ - jobs         │ │ - AI matching  │
   │ - contacts     │ │ - applications │ │ - Notifications│
   │ - intros       │ │ - endorsements │ │ - Email        │
   │ - orgs (ICP)   │ │ - referrals    │ │                │
   │ - asks         │ │ - events       │ │                │
   └────────────────┘ └────────────────┘ └────────────────┘
            │                   │                   │
            └───────────────────┼───────────────────┘
                                ▼
                    ┌────────────────────────┐
                    │   Shared Services       │
                    │                         │
                    │ - Vector Search (embeds)│
                    │ - Supabase (realtime)   │
                    │ - SendGrid (email)      │
                    │ - S3 (file storage)     │
                    │ - Sidekiq (jobs)        │
                    │ - Redis (cache)         │
                    └────────────────────────┘
```

### 1.2 Frontend Architecture

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth group layout
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/              # Authenticated layout
│   │   ├── layout.tsx            # Sidebar + nav
│   │   ├── page.tsx              # Dashboard home
│   │   ├── jobs/
│   │   │   ├── page.tsx          # Job board (browse all)
│   │   │   ├── [id]/page.tsx     # Job detail
│   │   │   ├── post/page.tsx     # Post a job (company)
│   │   │   ├── recommended/      # AI-recommended jobs
│   │   │   ├── saved/            # Saved/bookmarked jobs
│   │   │   └── my-applications/  # Talent's applications
│   │   ├── talent/
│   │   │   ├── page.tsx          # Talent directory
│   │   │   ├── [id]/page.tsx     # Talent profile
│   │   │   ├── pools/            # Talent pools (VC)
│   │   │   ├── saved/            # Saved candidates
│   │   │   └── referrals/        # Referral tracking
│   │   ├── introductions/
│   │   │   ├── page.tsx          # Intro dashboard
│   │   │   ├── request/          # Request intro
│   │   │   └── history/          # Intro history
│   │   ├── community/
│   │   │   ├── events/
│   │   │   ├── mentorship/
│   │   │   ├── messages/
│   │   │   └── resources/
│   │   ├── analytics/            # VC admin only
│   │   │   ├── overview/
│   │   │   ├── hiring/
│   │   │   ├── attribution/
│   │   │   └── portfolio/
│   │   ├── profile/
│   │   │   ├── page.tsx          # Edit profile
│   │   │   └── settings/
│   │   └── company/
│   │       ├── [domain]/         # Company page
│   │       ├── jobs/             # Company's posted jobs
│   │       └── settings/
│   └── api/                      # Next.js API routes
│       ├── auth/
│       ├── jobs/
│       ├── talent/
│       ├── match/
│       ├── endorsements/
│       ├── referrals/
│       └── webhooks/
├── components/
│   ├── ui/                       # shadcn/ui components
│   ├── layout/                   # Layout components
│   │   ├── sidebar.tsx
│   │   ├── navbar.tsx
│   │   └── mobile-nav.tsx
│   ├── jobs/                     # Job-related components
│   │   ├── job-card.tsx
│   │   ├── job-list.tsx
│   │   ├── job-filters.tsx
│   │   ├── job-detail.tsx
│   │   ├── job-apply-modal.tsx
│   │   ├── job-post-form.tsx
│   │   └── match-score-badge.tsx
│   ├── talent/                   # Talent-related components
│   │   ├── talent-card.tsx
│   │   ├── talent-list.tsx
│   │   ├── talent-filters.tsx
│   │   ├── talent-profile.tsx
│   │   ├── endorsement-badge.tsx
│   │   └── skill-tags.tsx
│   ├── intros/                   # Introduction components
│   │   ├── intro-request.tsx
│   │   ├── intro-card.tsx
│   │   └── connector-suggestions.tsx
│   ├── analytics/                # Dashboard components
│   │   ├── stats-card.tsx
│   │   ├── hiring-pipeline.tsx
│   │   └── attribution-chart.tsx
│   └── shared/                   # Shared components
│       ├── search-bar.tsx
│       ├── avatar.tsx
│       ├── company-logo.tsx
│       ├── badge.tsx
│       └── empty-state.tsx
├── lib/
│   ├── bridge-api/               # Bridge API client
│   │   ├── client.ts             # HTTP client with API key auth
│   │   ├── users.ts              # User endpoints
│   │   ├── search.ts             # Search endpoints
│   │   ├── introductions.ts      # Intro endpoints
│   │   ├── networks.ts           # Network domain endpoints
│   │   └── types.ts              # TypeScript types
│   ├── db/                       # Database
│   │   ├── schema.ts             # Drizzle/Prisma schema
│   │   ├── migrations/
│   │   └── seed.ts
│   ├── ai/                       # AI matching
│   │   ├── embeddings.ts         # Vector search client
│   │   ├── matcher.ts            # Job-candidate matching
│   │   └── parser.ts             # Job description parser
│   ├── auth/                     # Authentication
│   │   ├── bridge-sso.ts         # Bridge JWT SSO
│   │   ├── session.ts            # Session management
│   │   └── middleware.ts         # Auth middleware
│   └── utils/
│       ├── api.ts
│       ├── formatting.ts
│       └── constants.ts
├── hooks/                        # Custom React hooks
│   ├── use-bridge-user.ts
│   ├── use-jobs.ts
│   ├── use-talent-search.ts
│   └── use-match-score.ts
├── stores/                       # State management (Zustand)
│   ├── auth-store.ts
│   ├── job-store.ts
│   └── talent-store.ts
└── types/                        # TypeScript definitions
    ├── user.ts
    ├── job.ts
    ├── talent-profile.ts
    ├── endorsement.ts
    └── application.ts
```

### 1.3 Backend Architecture

The Talent Network extends Bridge's existing Rails API. New Talent-specific endpoints are added via Next.js API routes, while Bridge data is accessed through the existing Rails API.

```
Bridge Rails API (existing)          Talent Network API (new)
─────────────────────────           ──────────────────────────
/api/current/users/                 /api/jobs/
/api/current/search/                /api/talent/
/api/current/introductions/         /api/match/
/api/current/contacts/              /api/endorsements/
/api/current/webhooks/              /api/referrals/
/api/current/asks/                  /api/applications/
/api/current/user_networks/         /api/events/
                                    /api/analytics/
                                    /api/scraper/
```

---

## 2. Database Schema (Talent Network Extension)

### 2.1 New Tables

```sql
-- Talent profiles (extends Bridge user data with job-seeking fields)
CREATE TABLE talent_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bridge_user_id UUID NOT NULL UNIQUE,    -- FK to Bridge users.id
  talent_status VARCHAR(20) DEFAULT 'not_looking',  -- actively_looking, passively_open, not_looking
  open_to_roles TEXT[],                   -- Array of role titles
  skills TEXT[],                          -- Array of skills
  experience_years INTEGER,
  salary_min INTEGER,
  salary_max INTEGER,
  salary_currency VARCHAR(3) DEFAULT 'USD',
  work_preference VARCHAR(10),           -- remote, hybrid, onsite
  willing_to_relocate BOOLEAN DEFAULT false,
  preferred_locations TEXT[],
  education JSONB DEFAULT '[]',          -- [{school, degree, field, year}]
  visibility VARCHAR(20) DEFAULT 'network_only',  -- network_only, portfolio_only, public
  profile_completeness FLOAT DEFAULT 0,
  last_job_search_at TIMESTAMP,
  referral_score FLOAT DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Job listings
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_domain VARCHAR(255) NOT NULL,   -- Network domain (company identifier)
  posted_by UUID NOT NULL,                -- Bridge user_id of poster
  bridge_ask_id UUID,                     -- Optional link to Bridge ask
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  requirements TEXT,
  department VARCHAR(100),
  employment_type VARCHAR(20),            -- full_time, part_time, contract, internship
  experience_level VARCHAR(20),           -- entry, mid, senior, lead, executive
  salary_min INTEGER,
  salary_max INTEGER,
  salary_currency VARCHAR(3) DEFAULT 'USD',
  show_salary BOOLEAN DEFAULT true,
  location VARCHAR(255),
  work_type VARCHAR(10),                  -- remote, hybrid, onsite
  skills_required TEXT[],
  source VARCHAR(20) DEFAULT 'manual',    -- manual (posted via Talent Portal UI)
  status VARCHAR(20) DEFAULT 'active',    -- active, paused, closed, filled
  visibility VARCHAR(20) DEFAULT 'network', -- network, portfolio_only, public
  apply_url VARCHAR(500),
  embedding VECTOR(1536),                 -- For AI matching
  expires_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Job applications
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id),
  talent_id UUID NOT NULL REFERENCES talent_profiles(id),
  bridge_user_id UUID NOT NULL,
  status VARCHAR(20) DEFAULT 'applied',   -- applied, reviewed, interviewing, offered, hired, rejected, withdrawn
  cover_note TEXT,
  resume_url VARCHAR(500),
  screening_answers JSONB DEFAULT '{}',
  referred_by UUID,                       -- Bridge user_id of referrer
  intro_id UUID,                          -- Bridge introduction_id if warm intro
  match_score FLOAT,
  match_breakdown JSONB,                  -- {skills: 0.9, experience: 0.8, network: 0.7}
  reviewed_at TIMESTAMP,
  responded_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Endorsements
CREATE TABLE endorsements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  talent_id UUID NOT NULL REFERENCES talent_profiles(id),
  endorser_bridge_user_id UUID NOT NULL,  -- Who endorsed
  endorser_type VARCHAR(20) NOT NULL,     -- vc_partner, founder, peer, colleague
  endorsement_text TEXT,
  skills_endorsed TEXT[],
  relationship VARCHAR(50),               -- worked_together, invested_in, mentored, etc.
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Referrals
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id),
  referrer_bridge_user_id UUID NOT NULL,
  referred_talent_id UUID NOT NULL REFERENCES talent_profiles(id),
  bridge_intro_id UUID,                   -- Link to Bridge introduction
  status VARCHAR(20) DEFAULT 'pending',   -- pending, accepted, applied, hired, declined
  note TEXT,
  reward_status VARCHAR(20),              -- pending, eligible, paid
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Talent pools (VC-curated collections)
CREATE TABLE talent_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_by UUID NOT NULL,               -- Bridge user_id (VC admin)
  network_domain VARCHAR(255) NOT NULL,   -- VC domain
  auto_rules JSONB,                       -- Auto-populate rules {skills: [...], roles: [...]}
  visibility VARCHAR(20) DEFAULT 'vc_only', -- vc_only, shared_with_portfolio
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE talent_pool_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID NOT NULL REFERENCES talent_pools(id),
  talent_id UUID NOT NULL REFERENCES talent_profiles(id),
  added_by UUID,                          -- null if auto-added
  note TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(pool_id, talent_id)
);

-- Events
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_type VARCHAR(20),                 -- hiring_fair, office_hours, fireside_chat, networking
  hosted_by UUID NOT NULL,
  network_domain VARCHAR(255),
  location VARCHAR(255),
  is_virtual BOOLEAN DEFAULT true,
  virtual_link VARCHAR(500),
  starts_at TIMESTAMP NOT NULL,
  ends_at TIMESTAMP NOT NULL,
  max_attendees INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE event_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id),
  bridge_user_id UUID NOT NULL,
  status VARCHAR(20) DEFAULT 'going',     -- going, maybe, not_going
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, bridge_user_id)
);

-- Sync tracking
CREATE TABLE bridge_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type VARCHAR(20) NOT NULL,         -- bulk, delta, webhook
  entity_type VARCHAR(20) NOT NULL,       -- users, profiles, intros, asks
  last_synced_at TIMESTAMP NOT NULL,
  records_synced INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'completed', -- running, completed, failed
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_talent_profiles_status ON talent_profiles(talent_status);
CREATE INDEX idx_talent_profiles_skills ON talent_profiles USING GIN(skills);
CREATE INDEX idx_talent_profiles_roles ON talent_profiles USING GIN(open_to_roles);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_company ON jobs(company_domain);
CREATE INDEX idx_jobs_skills ON jobs USING GIN(skills_required);
CREATE INDEX idx_jobs_embedding ON jobs USING ivfflat(embedding vector_cosine_ops);
CREATE INDEX idx_applications_job ON applications(job_id);
CREATE INDEX idx_applications_talent ON applications(talent_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_endorsements_talent ON endorsements(talent_id);
CREATE INDEX idx_referrals_job ON referrals(job_id);
CREATE INDEX idx_referrals_referrer ON referrals(referrer_bridge_user_id);
```

---

## 3. API Design

### 3.1 Talent Network API Endpoints

```
# Authentication (Bridge SSO)
POST   /api/auth/bridge-sso          # Exchange Bridge JWT for Talent Network session

# Talent Profiles
GET    /api/talent                    # List/search talent (with filters)
GET    /api/talent/:id                # Get talent profile
PUT    /api/talent/:id                # Update talent profile
POST   /api/talent/sync               # Trigger Bridge profile sync
GET    /api/talent/me                  # Current user's talent profile

# Jobs
GET    /api/jobs                       # List/search jobs (with filters)
GET    /api/jobs/:id                   # Get job detail
POST   /api/jobs                       # Post new job (company only)
PUT    /api/jobs/:id                   # Update job
DELETE /api/jobs/:id                   # Close/delete job
GET    /api/jobs/recommended           # AI-recommended jobs for current user
GET    /api/jobs/:id/match-score       # Get match score for current user

# Applications
POST   /api/jobs/:id/apply             # Apply to job
GET    /api/applications               # My applications (talent)
GET    /api/jobs/:id/applications      # Applications for a job (company)
PUT    /api/applications/:id/status    # Update application status

# Matching
GET    /api/match/jobs                 # AI-matched jobs for talent
GET    /api/match/talent/:jobId        # AI-matched talent for job
POST   /api/match/compute              # Compute match score

# Endorsements
POST   /api/endorsements               # Create endorsement
GET    /api/endorsements/talent/:id    # Get endorsements for talent
DELETE /api/endorsements/:id           # Remove endorsement

# Referrals
POST   /api/referrals                  # Create referral
GET    /api/referrals                  # My referrals
GET    /api/referrals/leaderboard      # Top referrers

# Talent Pools (VC only)
GET    /api/pools                      # List my pools
POST   /api/pools                      # Create pool
PUT    /api/pools/:id                  # Update pool
POST   /api/pools/:id/members          # Add talent to pool
DELETE /api/pools/:id/members/:tid     # Remove from pool

# Events
GET    /api/events                     # List events
POST   /api/events                     # Create event
POST   /api/events/:id/rsvp            # RSVP to event

# Analytics (VC only)
GET    /api/analytics/overview         # Network overview stats
GET    /api/analytics/hiring           # Hiring pipeline stats
GET    /api/analytics/attribution      # Hire attribution data
GET    /api/analytics/portfolio/:domain  # Portfolio company stats

```

### 3.2 Bridge API Client

```typescript
// lib/bridge-api/client.ts

interface BridgeAPIConfig {
  baseUrl: string;        // Bridge API base URL
  apiKey: string;         // Bridge API token
}

class BridgeAPIClient {
  // User profiles
  getUser(id: string): Promise<BridgeUser>
  getUserByEmail(email: string): Promise<BridgeUser>
  getCurrentUser(jwt: string): Promise<BridgeUser>
  searchMembers(query: string): Promise<BridgeUser[]>

  // Search
  searchBridgeMembers(params: SearchParams): Promise<BridgeUser[]>
  searchNetworkPortfolios(params: SearchParams): Promise<Portfolio[]>
  searchNetworkInvestors(params: SearchParams): Promise<Investor[]>
  searchEmbeddings(query: string): Promise<EmbeddingResult[]>
  searchByProfile(profileId: string): Promise<EmbeddingResult[]>

  // Introductions
  createIntro(params: IntroParams): Promise<Introduction>
  getConnectorSuggestions(contactId: string): Promise<Connector[]>
  getCommonContacts(contactId: string): Promise<Contact[]>

  // Delta sync
  getMembersSince(timestamp: number): Promise<BridgeUser[]>
  getIntrosSince(timestamp: number): Promise<Introduction[]>
  getAsksSince(timestamp: number): Promise<Ask[]>

  // Network
  getNetworkDomainDetails(domain: string): Promise<NetworkDomain>
  getUserNetworks(userId: string): Promise<NetworkMembership[]>

  // Webhooks
  registerWebhook(url: string, events: string[]): Promise<Webhook>
}
```

---

## 4. AI Matching Engine

### 5.1 Matching Pipeline

```
Input: Candidate Profile + Job Listing
                    │
    ┌───────────────┼───────────────┐
    ▼               ▼               ▼
┌────────┐   ┌──────────┐   ┌──────────┐
│ Skill  │   │ Semantic │   │ Network  │
│ Match  │   │ Embed    │   │ Proximity│
│ Score  │   │ Score    │   │ Score    │
│        │   │          │   │          │
│ Compare│   │ cosine(  │   │ Shared   │
│ arrays │   │  profile,│   │ contacts,│
│        │   │  job)    │   │ same VC, │
│        │   │          │   │ intros   │
└───┬────┘   └────┬─────┘   └────┬─────┘
    │              │              │
    └──────────────┼──────────────┘
                   ▼
           ┌──────────────┐
           │ Weighted     │
           │ Composite    │
           │ Score        │
           │              │
           │ skills: 0.3  │
           │ semantic: 0.4│
           │ network: 0.2 │
           │ behavior: 0.1│
           └──────┬───────┘
                  ▼
           ┌──────────────┐
           │ Match Score  │
           │ 0-100%       │
           │ + breakdown  │
           └──────────────┘
```

### 5.2 Matching Weights

| Factor | Weight | Source |
|--------|--------|--------|
| Semantic similarity (profile↔job embedding) | 0.40 | Bridge `/search/embeddings` |
| Skills overlap | 0.25 | Talent profile skills ∩ job skills_required |
| ICP alignment | 0.15 | Bridge `icp.roles` and `icp.industries` |
| Network proximity | 0.12 | Shared connections, same VC, mutual intros |
| Behavioral signals | 0.08 | Recent activity, saved jobs, profile views |

---

## 6. Authentication Flow

### 6.1 Bridge SSO

```
User clicks "Login" on Talent Network
          │
          ▼
Redirect to Bridge login
(POST /api/current/auth/sessions)
          │
          ▼
Bridge returns JWT
          │
          ▼
Talent Network exchanges JWT
(POST /api/auth/bridge-sso)
          │
          ▼
Verify JWT → Fetch Bridge user profile
          │
          ▼
Create/update talent_profile record
          │
          ▼
Issue Talent Network session cookie
          │
          ▼
User is authenticated
```

### 6.2 Role Detection

```typescript
function detectUserRole(bridgeUser: BridgeUser): UserRole {
  // Check if user is VC admin
  if (bridgeUser.network_domains.some(nd =>
    nd.role === 'member' && bridgeUser.investor_network_domains.includes(nd.domain)
  )) {
    return 'vc_admin';
  }

  // Check if user is at a portfolio company
  if (bridgeUser.network_domains.some(nd => nd.has_portfolios)) {
    return 'portfolio_company';
  }

  // Default to talent/job seeker
  return 'talent';
}
```

---

## 7. Environment Variables

```env
# Bridge API (Required — only external dependency)
BRIDGE_API_URL=https://api.brdg.app
BRIDGE_API_KEY=your_bridge_api_token

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

**Note:** Additional env vars (Database URL, Supabase, SendGrid, etc.) will be added as those features are implemented in later phases. For Phase 1, only Bridge API credentials are required.

---

## 8. Deployment Architecture

```
┌─────────────────────────────────────┐
│           Vercel / Railway           │
│                                      │
│  ┌──────────────────────────────┐   │
│  │    Next.js Application        │   │
│  │    (SSR + API Routes)         │   │
│  └──────────────┬───────────────┘   │
│                 │                     │
│  ┌──────────────▼───────────────┐   │
│  │    Background Workers         │   │
│  │    - Bridge sync (cron)       │   │
│  │    - Sync service (cron)      │   │
│  │    - Match computation        │   │
│  └──────────────────────────────┘   │
└──────────────────┬──────────────────┘
                   │
     ┌─────────────┼─────────────┐
     ▼             ▼             ▼
┌─────────┐  ┌─────────┐  ┌─────────┐
│PostgreSQL│  │ Redis   │  │ S3      │
│(Supabase)│  │(Upstash)│  │(Files)  │
└─────────┘  └─────────┘  └─────────┘
```
