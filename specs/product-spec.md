# Bridge Talent & Job Portal — Product Specification

> **Version:** 2.0 (Updated with Competitive Insights + Bridge API Analysis)
> **Product:** Talent Portal + Job Portal for Bridge VC Network
> **Platform:** Bridge (existing VC Network platform with Perks Portal)
> **Date:** February 2026

---

## 1. Vision & Strategy

### 1.1 Product Vision

Build the **private talent marketplace** for Bridge's VC network — connecting portfolio companies with vetted, network-endorsed talent through AI-powered matching and warm introductions. Unlike public job boards (Wellfound) or basic job aggregators (Getro), Bridge's Talent Portal leverages its existing trust network, introduction system, and community features to deliver higher-quality hires with faster close rates.

### 1.2 Strategic Positioning

| Competitor | Model | Bridge Differentiator |
|-----------|-------|----------------------|
| **Getro** ($210-500/mo) | Auto-scraping job aggregator + warm intros | Bridge adds rich profiles, community, endorsements, AI matching |
| **Consider** (Enterprise) | Talent circles + recruiter tools | Bridge has no client churn risk, integrated platform ecosystem |
| **Wellfound** (Free-$499/mo) | Public marketplace, 10M+ candidates | Bridge offers private, vetted, network-endorsed talent |

### 1.3 Key Advantages from Existing Bridge Platform

- **Trust Network:** Existing introduction system with full lifecycle (create → confirm → publish → accept → rate)
- **Vector Embeddings:** Bridge already has `/search/embeddings` infrastructure — AI matching ready
- **Smart Search:** `smart_member_search` already searches by name, email, company, domain simultaneously
- **Super Connectors:** `is_super_connector` flag identifies top referrers
- **ICP Data:** Users already have roles, industries, and context via the Org model
- **Delta Sync:** Built-in `/since/:time` endpoints for real-time data freshness
- **Webhook Infrastructure:** Event-driven updates already supported

---

## 2. User Personas

### 2.1 Portfolio Company Hiring Manager

**Who:** CEO, CTO, VP People at Bridge portfolio companies
**Goal:** Fill roles fast with high-quality, network-vetted candidates
**Pain Points:** Public job boards yield low-quality applicants; agency fees are 20-25%; no warm signal on candidates
**Bridge Context:** Already a `network_domain_user` with `role: member` and `has_portfolios: true`

### 2.2 Job Seeker / Talent

**Who:** Professionals in the Bridge network — operators, engineers, designers, executives
**Goal:** Discover curated opportunities at vetted companies with warm introductions
**Pain Points:** Public boards are noisy; no insider access to VC portfolio companies; cold applications feel impersonal
**Bridge Context:** Existing `User` with `GlobalProfile` (company, position, bio, LinkedIn) + ICP (target roles/industries)

### 2.3 VC / Fund Manager

**Who:** Partners, principals, talent partners at VC firms on Bridge
**Goal:** Help portfolio companies hire; track talent flow; demonstrate LP value
**Pain Points:** Manual talent matching is time-consuming; no attribution for hires; limited visibility into portfolio hiring needs
**Bridge Context:** `network_domain_user` with `role: member` on VC domain + `investor_network_domains`

---

## 3. Job Portal Features

### 3.1 Job Board — Aggregated & Curated

**3.1.1 Job Posting (By Portfolio Companies)**

- Portfolio companies post directly via Bridge
- Structured form: title, description, requirements, salary range, work type (remote/hybrid/onsite)
- Rich text editor for descriptions
- Internal vs. external visibility toggle
- Hiring manager assignment

**3.1.3 Job Display**

- Filterable by: company, role type, department, location, salary range, remote/hybrid/onsite, experience level
- Company cards with: logo, description, funding stage, team size, investor badge
- Salary transparency (display when available — #1 candidate draw per Wellfound insight)
- "Posted by [Name] from your network" — warm signal
- Similar jobs recommendation
- Save/bookmark jobs

### 3.2 AI-Powered Job Matching

**Leveraging Bridge's existing embedding infrastructure:**

- **Semantic matching:** Use `/search/embeddings/by_profile` to match candidate profiles to job descriptions
- **ICP alignment:** Match user's `icp.roles` and `icp.industries` to job requirements
- **Network proximity:** Score by shared connections, same VC network, mutual introductions
- **Behavioral signals:** Application history, saved jobs, profile views
- **Match score display:** Show "95% match" with breakdown (skills, experience, network fit)

**Matching algorithm pipeline:**
```
1. NLP parse job description → extract skills, level, domain
2. Generate job embedding vector
3. Compare against candidate profile embeddings
4. Layer ICP alignment score
5. Layer network proximity score (shared intros, same network domain)
6. Layer behavioral signals (engagement, recency)
7. Return ranked candidates with match breakdown
```

### 3.3 Application Flow

- **One-click apply:** Pre-filled from Bridge profile (like Wellfound's profile-based apply)
- **Custom questions:** Hiring managers can add screening questions
- **Warm intro option:** "Know someone at this company? Request an introduction" — leverages Bridge's intro system
- **Application tracking:** Applicant sees status (applied → reviewed → interviewing → offered/rejected)
- **Anonymous browsing:** Talent can explore jobs without notifying companies (passive mode)

### 3.4 Warm Introduction for Hiring (Core Differentiator)

- When viewing a job, show mutual connections who can introduce you
- Uses Bridge's existing `connector_suggestions` endpoint
- Double-opt-in intro flow (existing Bridge system)
- "Referred by [VC Partner Name]" badge on applications
- Track conversion: intro → application → interview → hire
- Connector gets attribution for successful hires

---

## 4. Talent Network Features

### 4.1 Talent Profiles

**Synced from Bridge (via API Integration):**

| Field | Source | Bridge Endpoint |
|-------|--------|----------------|
| Name, email, avatar | `users` table | `GET /users/me` |
| Bio, headline/position | `global_profiles` | `GET /users/:id` |
| Company, website | `global_profiles` | `GET /users/:id` |
| LinkedIn, Twitter | `global_profiles` | `GET /users/:id` |
| Location | `global_profiles` | `GET /users/:id` |
| Network memberships | `network_domain_users` | `GET /user_networks` |
| ICP (target roles, industries) | `orgs` | `GET /users/:id` → `icp` |
| Super connector status | `global_profiles` | `is_super_connector` flag |
| Introduction history | `introductions` | `GET /introductions` |
| Email domains | `global_profile_references` | `email_references` |

**New fields (Talent Network only):**

| Field | Type | Description |
|-------|------|-------------|
| `talent_status` | enum | `actively_looking`, `passively_open`, `not_looking` |
| `open_to_roles` | string[] | Specific roles open to |
| `skills` | string[] | Technical + professional skills |
| `experience_years` | integer | Years of experience |
| `salary_expectation` | object | `{ min, max, currency }` — private, only visible to user |
| `work_preference` | enum | `remote`, `hybrid`, `onsite` |
| `willing_to_relocate` | boolean | Open to relocation |
| `preferred_locations` | string[] | Target work locations |
| `education` | object[] | `[{ school, degree, field, year }]` |
| `endorsements` | object[] | VC/founder endorsements |
| `visibility` | enum | `network_only`, `portfolio_only`, `public` |

### 4.2 Talent Directory

- Searchable directory of all opted-in talent in the network
- Leverages Bridge's `smart_member_search` (name, email, company, domain)
- Filter by: skills, role type, location, experience level, availability, network
- AI-powered semantic search via Bridge's embeddings
- "Passive interest" expression — talent can signal interest in types of roles without actively applying (inspired by Consider)
- Visibility controls: talent chooses who sees their profile

### 4.3 Endorsement & Trust System (Bridge Exclusive)

- **VC Badge:** "Endorsed by [VC Firm]" — VC partners can endorse talent they've worked with
- **Founder Badge:** "Recommended by [Founder]" — portfolio founders can endorse former colleagues
- **Peer Endorsements:** Network members endorse specific skills
- **Super Connector Badge:** Auto-applied from Bridge's `is_super_connector` flag
- **Referral Score:** Computed from introduction history — how active and successful are their referrals
- **Trust Signals displayed on profile:** badges, endorsement count, intro success rate

### 4.4 Referral System

- **Slack-style auto-referrals** (inspired by Consider): when a new job is posted, auto-notify connectors whose contacts match
- **Referral tracking:** who referred → who applied → who hired
- **Referral rewards:** configurable per company (bonus, recognition, Bridge credits)
- **Bulk referral:** share multiple candidates for a role at once
- **Referral leaderboard:** top referrers in the network

### 4.5 Talent Segmentation (VC Admin Feature)

- Create talent pools: "Series A CTOs", "Growth Marketers", "AI Engineers"
- Auto-populate pools using AI matching rules
- Manual curation by VC talent partners
- Share pools with specific portfolio companies
- Track pool engagement: who viewed, who applied, who hired

---

## 5. Community Hub

### 5.1 Events

- Virtual and in-person events for the network
- Event types: hiring fairs, fireside chats, office hours, networking
- RSVP and attendance tracking
- Post-event connection suggestions
- Integration with calendar

### 5.2 Mentorship

- Mentor-mentee matching based on skills, goals, and experience
- Structured programs or ad-hoc connections
- Session scheduling and tracking
- Feedback and progress tracking

### 5.3 Messaging

- Direct messaging between network members
- Intro request messages (through Bridge's intro system)
- Company-to-candidate messaging for active applications
- Message templates for common outreach

### 5.4 Content & Resources

- Career resources library
- Company spotlight articles
- Salary benchmarking data (aggregated, anonymized)
- Industry reports and hiring trends
- Community discussions and Q&A

---

## 6. VC Admin Dashboard

### 6.1 Network Analytics

- Total talent in network, growth rate
- Active vs. passive talent ratio
- Popular skills and role types
- Engagement metrics (profile views, applications, intros)
- Leverages Bridge's `network_dashboards/:domain/stats` and `network_portfolios_metrics`

### 6.2 Portfolio Company Management

- View all portfolio companies' open roles
- Track hiring velocity per company
- Identify companies struggling to hire (intervention needed)
- Portfolio-level talent pipeline view

### 6.3 Hire Attribution & ROI

- Track: network intro → application → interview → offer → hire
- "This hire came through Bridge" attribution
- ROI dashboard: hires made, time-to-hire, cost savings vs. agencies
- LP reporting: talent value delivered to portfolio

### 6.4 Talent Curation

- Highlight top talent for specific roles
- Create curated shortlists for portfolio companies
- "VC Pick" badge for hand-selected candidates
- Bulk intro capabilities (VC introduces talent to multiple companies)

---

## 7. Information Architecture

### 7.1 Role-Based Access

| Feature | Job Seeker | Portfolio Company | VC Admin |
|---------|-----------|-------------------|----------|
| Browse jobs | ✅ | ✅ | ✅ |
| Apply to jobs | ✅ | ❌ | ❌ |
| Post jobs | ❌ | ✅ | ✅ |
| View talent directory | ❌ | ✅ (own network) | ✅ (all) |
| Request warm intro | ✅ | ✅ | ✅ |
| Endorse talent | ❌ | ✅ | ✅ |
| Create talent pools | ❌ | ❌ | ✅ |
| View analytics | Own stats | Company stats | Network stats |
| Manage applications | Own apps | Received apps | Overview |

### 7.2 Navigation Structure

```
├── Dashboard (personalized home)
├── Jobs
│   ├── Browse All Jobs
│   ├── Recommended for You (AI-matched)
│   ├── Saved Jobs
│   └── My Applications (talent) / Posted Jobs (company)
├── Talent (company/VC only)
│   ├── Talent Directory
│   ├── Talent Pools
│   ├── Saved Candidates
│   └── Referrals
├── Introductions
│   ├── Request Intro
│   ├── Pending Intros
│   └── Intro History
├── Community
│   ├── Events
│   ├── Mentorship
│   ├── Messages
│   └── Resources
├── Analytics (VC admin)
│   ├── Network Overview
│   ├── Hiring Pipeline
│   ├── Attribution
│   └── Portfolio Reports
└── Profile & Settings
```

---

## 8. Technical Architecture

### 8.1 System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        Bridge Platform                            │
│                                                                    │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────┐              │
│  │  Perks    │  │  Talent &    │  │  Bridge Core  │              │
│  │  Portal   │  │  Job Portal  │  │  (Intros,     │              │
│  │          │  │  (NEW)       │  │   Contacts,   │              │
│  │          │  │              │  │   Network)    │              │
│  └──────────┘  └──────┬───────┘  └───────┬───────┘              │
│                       │                   │                       │
│                       ▼                   ▼                       │
│              ┌────────────────────────────────────┐              │
│              │    Bridge API (Rails REST API)      │              │
│              │    /api/current/                    │              │
│              │    JWT + API Key Auth               │              │
│              └────────────────┬───────────────────┘              │
│                               │                                   │
│              ┌────────────────┴───────────────────┐              │
│              │        PostgreSQL Database          │              │
│              │  users, global_profiles, contacts,  │              │
│              │  introductions, orgs, tags, asks    │              │
│              └────────────────┬───────────────────┘              │
│                               │                                   │
│              ┌────────────────┴───────────────────┐              │
│              │     Embedding / Vector Search       │              │
│              │     (Existing Infrastructure)       │              │
│              └────────────────────────────────────┘              │
└──────────────────────────────────────────────────────────────────┘
```

### 8.2 Talent Network Specific Components

```
┌─────────────────────────────────────────────────────┐
│              Talent & Job Portal                      │
│                                                       │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │ Job Scraping │  │ AI Matching  │  │ Endorsement│  │
│  │ Pipeline     │  │ Engine       │  │ System     │  │
│  │             │  │              │  │            │  │
│  │ - ATS APIs  │  │ - Embeddings │  │ - Badges   │  │
│  │ - Scraper   │  │ - ICP Match  │  │ - Scores   │  │
│  │ - Parser    │  │ - Network    │  │ - Trust    │  │
│  │ - Dedup     │  │   Proximity  │  │            │  │
│  └─────────────┘  └──────────────┘  └────────────┘  │
│                                                       │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │ Notification │  │ Analytics    │  │ Referral   │  │
│  │ Service      │  │ Engine       │  │ Tracker    │  │
│  │             │  │              │  │            │  │
│  │ - Email     │  │ - Hire attrib│  │ - Tracking │  │
│  │ - In-app    │  │ - ROI calc   │  │ - Rewards  │  │
│  │ - Slack     │  │ - Reports    │  │ - Leaders  │  │
│  └─────────────┘  └──────────────┘  └────────────┘  │
└─────────────────────────────────────────────────────┘
```

### 8.3 Tech Stack (Recommended)

| Layer | Technology | Reason |
|-------|-----------|--------|
| **Frontend** | Next.js 14+ (App Router) | SSR, RSC, existing Bridge frontend patterns |
| **UI Library** | Tailwind CSS + shadcn/ui | Rapid development, consistent design |
| **Backend API** | Bridge Rails API (existing) + Next.js API routes | Extend existing API, add Talent-specific endpoints |
| **Database** | PostgreSQL (existing) | Extend Bridge schema with Talent Network tables |
| **Vector Search** | Existing Bridge embeddings | AI matching already built |
| **Background Jobs** | Sidekiq (existing) + Next.js cron | Bridge already uses Sidekiq |
| **Auth** | Bridge JWT (SSO) | Single sign-on across Bridge products |
| **File Storage** | S3 / Cloudflare R2 | Resumes, company logos |
| **Real-time** | Supabase (Bridge has `/auth/supabase_token`) | Notifications, live updates |
| **Email** | SendGrid (Bridge already uses) | Transactional + engagement emails |
| **Analytics** | Mixpanel (Bridge already uses) | User tracking, funnel analysis |

### 8.4 Data Sync Architecture

```
Bridge DB ──── API Key Auth ────► Talent Sync Service
                                       │
                    ┌──────────────────┼──────────────────┐
                    ▼                  ▼                  ▼
             Bulk Import        Delta Sync         Webhooks
             (Initial)         (Every 15min)      (Real-time)
                    │                  │                  │
                    └──────────────────┼──────────────────┘
                                       ▼
                              Talent Network DB
                              (Extended schema)
```

---

## 9. Success Metrics

### 9.1 North Star Metric
**Hires attributed to Bridge Talent Network per quarter**

### 9.2 Leading Indicators

| Metric | Target (6mo) | Target (12mo) |
|--------|-------------|---------------|
| Talent profiles created | 500 | 2,000 |
| Active job listings | 100 | 500 |
| Applications submitted | 1,000 | 10,000 |
| Warm intros for hiring | 200 | 1,000 |
| Hires attributed | 10 | 50 |
| Portfolio companies posting | 20 | 75 |
| Time to first qualified applicant | <48hrs | <24hrs |
| Application-to-interview rate | 15% | 25% |
| NPS (talent) | 40+ | 50+ |
| NPS (hiring managers) | 35+ | 45+ |

### 9.3 Competitive Benchmarks

| Metric | Getro Avg | Wellfound Avg | Bridge Target |
|--------|----------|---------------|---------------|
| Time to hire | Unknown | Unknown | 30% faster than public boards |
| Cost per hire | $210-500/mo platform | Free-$499/mo + 20% fee | $0 (included in Bridge) |
| Candidate quality | Network-only | Public (10M+) | Network-vetted + endorsed |
| Application conversion | ~5% | ~3% | 15%+ (warm intro effect) |

---

## 10. Phased Rollout

### Phase 1: Foundation (Weeks 1-6)

**Goal:** Basic talent directory + job board with Bridge integration

- [ ] Bridge API integration — bulk import user profiles
- [ ] Talent profile creation with Bridge data + new fields
- [ ] Job board with manual posting by portfolio companies
- [ ] Basic search (name, company, role, location, skills)
- [ ] One-click apply from Bridge profile
- [ ] Salary transparency display (when available)
- [ ] Role-based access control (talent vs. company vs. VC)
- [ ] SSO via Bridge JWT

### Phase 2: Intelligence (Weeks 7-12)

**Goal:** AI matching + warm intros + real-time sync

- [ ] AI-powered job matching using Bridge embeddings
- [ ] "Recommended for you" job feed
- [ ] Warm intro flow for job applications (leveraging Bridge intro system)
- [ ] Connector suggestions ("Who can introduce you")
- [ ] Delta sync via `/since/:time` endpoints (15-min refresh)
- [ ] Webhook integration for real-time profile updates
- [ ] Passive interest expression ("Open to CTO roles in AI")
- [ ] Auto-notifications when matching jobs posted
- [ ] Application tracking pipeline (applied → reviewed → interviewing → offered)

### Phase 3: Community & Trust (Weeks 13-18)

**Goal:** Endorsements, referrals, community features

- [ ] Endorsement system (VC badges, founder badges, peer endorsements)
- [ ] Referral tracking and attribution
- [ ] Referral leaderboard and rewards
- [ ] Auto-referral notifications (Consider-inspired)
- [ ] Talent pools for VC admins
- [ ] Events module (hiring fairs, office hours)
- [ ] Mentorship matching
- [ ] Direct messaging for hiring conversations
- [ ] Company spotlight pages

### Phase 4: Analytics & Scale (Weeks 19-24)

**Goal:** Full analytics, attribution, and growth features

- [ ] Hire attribution dashboard ("This hire came through Bridge")
- [ ] VC ROI reporting (value delivered to portfolio)
- [ ] Portfolio hiring health dashboard
- [ ] Salary benchmarking (anonymized, aggregated)
- [ ] Advanced ATS integrations (2-way sync)
- [ ] Chrome extension for talent sourcing
- [ ] Slack integration for referral notifications
- [ ] SAML SSO for enterprise portfolio companies
- [ ] Public API for portfolio companies to embed their Bridge jobs
- [ ] Mobile-optimized experience

---

## 11. Competitive Positioning

### 11.1 vs. Getro

**Getro wins on:** Zero-maintenance job scraping (850+ networks), simple setup, hire attribution
**Bridge wins on:** Rich talent profiles, community features, endorsements, AI matching, warm intros, platform ecosystem (Perks + Talent in one place)
**GTM message:** "Getro gives you a job board. Bridge gives you a talent community."

### 11.2 vs. Consider

**Consider wins on:** Recruiter intelligence tools, Chrome extension, Gen AI email sequences
**Bridge wins on:** No client churn (Consider lost Insight Partners and AirTree to Getro), integrated platform, community features, simpler pricing
**GTM message:** "Consider is a recruiter tool. Bridge is a network tool."

### 11.3 vs. Wellfound

**Wellfound wins on:** Scale (10M+ candidates), public brand recognition, free tier
**Bridge wins on:** Private vetted network, warm introductions, endorsements, VC-curated talent, no noise
**GTM message:** "Wellfound is a public marketplace. Bridge is your private talent network."

### 11.4 Feature Comparison Matrix

| Feature | Bridge | Getro | Consider | Wellfound |
|---------|--------|-------|----------|-----------|
| Auto job scraping | ✅ Phase 1 | ✅ Core | ✅ Core | ❌ Manual |
| Rich talent profiles | ✅ Core | ❌ | ⚠️ Basic | ✅ Core |
| AI job matching | ✅ Core | ❌ | ✅ Basic | ✅ Core |
| Warm introductions | ✅ Core | ✅ Basic | ❌ | ❌ |
| Endorsement system | ✅ Core | ❌ | ❌ | ❌ |
| Community (events, mentorship) | ✅ Core | ❌ | ❌ | ❌ |
| Salary transparency | ✅ Phase 1 | ❌ | ❌ | ✅ Core |
| One-click apply | ✅ Phase 1 | ❌ | ❌ | ✅ Core |
| Passive interest | ✅ Phase 2 | ❌ | ✅ Core | ❌ |
| Referral tracking | ✅ Phase 3 | ✅ Basic | ✅ Slack | ❌ |
| VC dashboard | ✅ Phase 4 | ✅ Basic | ✅ Core | ❌ |
| Hire attribution | ✅ Phase 4 | ✅ Core | ✅ Core | ❌ |
| Platform ecosystem | ✅ (Perks + Talent) | ❌ | ❌ | ❌ |
| Private network | ✅ | ✅ | ✅ | ❌ Public |
| Pricing | Included | $210-500/mo | Enterprise | Free-$499/mo |

---

## 12. Data Strategy

### 12.1 Data Sources

| Source | Data Type | Method |
|--------|-----------|--------|
| Bridge API | User profiles, network data, intros, ICP | API Key sync |
| Perks Portal | Existing user profiles | Cross-module access via Bridge API |
| Organic signups | New talent profiles | Registration flow |
| User input | Skills, preferences, salary, availability | Profile creation |
| Portfolio companies | Job listings | Manual posting via Talent Portal UI |

### 12.2 Privacy & Data Handling

- All talent data is opt-in — users must consent to be in the Talent Network
- Salary data is NEVER shared — only visible to the user themselves
- Visibility controls: `network_only`, `portfolio_only`, or `public`
- Respect Bridge's `icp.public` flag — don't expose private ICP data
- Exclude deleted users (`deleting: true`) and unconfirmed users (`confirmed_at: nil`)
- GDPR/CCPA compliant data handling with deletion support
