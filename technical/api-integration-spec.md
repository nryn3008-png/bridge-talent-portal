# Bridge API → Talent Network Integration Spec

> **Project:** Bridge Talent & Job Portal
> **Source System:** Bridge Backend (Rails API — `intropath/intro-backend`)
> **Integration Method:** Bridge API Key (internal API access)
> **Last Updated:** February 2026

---

## 1. Executive Summary

The Talent Network needs to pull user profiles, company data, network relationships, and professional context from the existing Bridge platform. Bridge's backend is a Ruby on Rails application with a versioned REST API (`/api/current/`). Users authenticate via JWT tokens, and internal services can use API keys (`auth_tokens`) for server-to-server access.

This document maps every relevant Bridge API endpoint to its Talent Network use case, defines the data schema transformation, and outlines the sync strategy.

---

## 2. Bridge Data Model Overview

### 2.1 Core Entities

| Entity | Table | Primary Key | Description |
|--------|-------|-------------|-------------|
| **User** | `users` | `id` (UUID) | Registered Bridge user — email, name, username, bio |
| **GlobalProfile** | `global_profiles` | `id` (UUID) | Professional profile — company, position, LinkedIn, location, bio |
| **Contact** | `contacts` | `id` (UUID) | A user's contact/connection in their network |
| **NetworkDomainUser** | `network_domain_users` | — | Maps users to VC network domains (membership, roles) |
| **Tag** | `tags` | `id` (UUID) | Groups/lists — used for portfolio companies, deal flow, communities |
| **Introduction** | `introductions` | `id` (UUID) | Warm intros brokered between users |
| **Org (ICP)** | `orgs` | — | Ideal Customer Profile — roles, industries, description |
| **UserProps** | `user_props` | — | Key-value user properties (onboarding state, preferences) |
| **Ask** | `asks` | `id` (UUID) | Requests shared within network (hiring, intros, help) |

### 2.2 Key Relationships

```
User (1) ──── (1) GlobalProfile
User (1) ──── (N) Contacts
User (1) ──── (N) NetworkDomainUsers ──── Network Domains (VC firms)
User (1) ──── (N) Tags (groups/lists)
User (1) ──── (N) Introductions (as broker, N1, or N2)
User (1) ──── (1) Org (ICP — roles, industries)
User (1) ──── (N) UserProps (key-value settings)
User (1) ──── (N) Asks (network requests)
```

---

## 3. Authentication & Access

### 3.1 API Key Authentication

Bridge supports API tokens for programmatic access:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `POST /api/current/api_tokens` | POST | Create new API token |
| `GET /api/current/api_tokens/:id` | GET | Retrieve token details |
| `DELETE /api/current/api_tokens/:id` | DELETE | Revoke token |

The Talent Network backend will authenticate using a **service-level API token** created by a Bridge admin account. This token provides read access to user profiles and network data.

### 3.2 JWT Authentication (User-Level)

For user-initiated actions (profile edits, opt-in), Bridge uses JWT:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `POST /api/current/auth/sessions` | POST | Login → returns JWT |
| `POST /api/current/auth/registrations` | POST | Register new user |
| `POST /api/current/auth/confirmations/send` | POST | Send email verification |
| `GET /api/current/auth/confirmations/verify` | GET | Verify email token |
| `POST /api/current/auth/supabase_token` | POST | Get Supabase token (for realtime) |

**Talent Network SSO Strategy:** Users who are already Bridge members can authenticate to the Talent Network via Bridge JWT — no separate login required.

---

## 4. User Profile Endpoints

These are the primary endpoints for pulling talent profiles into the Talent Network.

### 4.1 Current User Profile

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `GET /api/current/users/me` | GET | JWT | Full profile of authenticated user |

**Response shape** (from `User#as_json`):

```json
{
  "id": "uuid",
  "created_at": "datetime",
  "updated_at": "datetime",
  "confirmed": true,
  "terms_accepted_at": "datetime",
  "email": "user@company.com",
  "bio": "Text bio",
  "first_name": "John",
  "last_name": "Doe",
  "profile_pic_url": "https://...",
  "deleting": false,
  "username": "johndoe",
  "default_email_signature": "...",
  "enrichment_enabled": false,
  "tokens": [...],
  "intro_bcc_contact": {...},
  "invited_by_contact_id": "uuid",
  "features": { "feature_flags": "..." },
  "promo_flags": { "..." },
  "user_props": { "key": "value" },
  "global_profile": {
    "id": "uuid",
    "user_id": "uuid",
    "bio": "Professional bio text",
    "linkedin_profile_url": "https://linkedin.com/in/johndoe",
    "company": "Acme Corp",
    "company_website": "https://acme.com",
    "position": "Head of Engineering",
    "location": "San Francisco, CA",
    "twitter_handle_url": "https://twitter.com/johndoe",
    "is_active": true,
    "no_organization": false,
    "source": 1,
    "is_super_connector": false,
    "email_references": [
      { "ref": "john@acme.com", "ref_type": "email" }
    ]
  },
  "roles": ["user", "admin"],
  "registration_source": { "name": "...", "ref_id": "..." },
  "network_domains": [
    { "domain": "sequoia.com", "role": "member", "has_portfolios": true }
  ],
  "investor_network_domains": ["sequoia.com"],
  "has_api_token": false,
  "pipeline_code": "abc123",
  "icp": {
    "roles": ["CTO", "VP Engineering"],
    "industries": ["SaaS", "AI/ML"],
    "context": "Looking for Series A B2B SaaS companies",
    "updated_at": "datetime",
    "public": true,
    "is_owner": true,
    "expanded": false
  },
  "paywall_settings": { "..." }
}
```

### 4.2 User by ID / Email

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `GET /api/current/users/:id` | GET | JWT/API Key | User by UUID |
| `GET /api/current/users/show_by_email` | GET | JWT/API Key | User by email |
| `GET /api/current/users/:id/profile_pic_url` | GET | JWT/API Key | Profile picture URL |
| `GET /api/current/users/member_profile/:id` | GET | JWT/API Key | User by GlobalProfile ID |

### 4.3 User Properties & Personalization

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `PUT /api/current/users/update_user_props` | PUT | JWT | Update key-value properties |
| `PUT /api/current/users/update_personalization_answers` | PUT | JWT | Update personalization data |
| `GET /api/current/users/personalized_members` | GET | JWT | AI-matched members |
| `GET /api/current/users/signup_prefill_info` | GET | JWT | Pre-fill data for registration |
| `POST /api/current/user_icps` | POST | JWT | Create/update ICP (roles, industries) |

### 4.4 User Subscriptions

| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /api/current/users/:id/user_subscriptions` | GET | Notification preferences |
| `PUT /api/current/users/:id/user_subscriptions` | PUT | Update preferences |
| `POST /api/current/user_subscriptions` | POST | Create subscription |

---

## 5. Network & Search Endpoints

These endpoints power the talent directory and discovery features.

### 5.1 Bridge Member Search

| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /api/current/search/bridge_members` | GET | **Search all Bridge members** — primary talent directory endpoint |
| `GET /api/current/contacts/bridge_members_ids` | GET | Get all Bridge member IDs |
| `GET /api/current/contacts/bridge_members_details/since/:time` | GET | Members updated since timestamp (for delta sync) |

### 5.2 Network Search

| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /api/current/search/network_portfolios` | GET | Search portfolio companies |
| `GET /api/current/search/network_investors` | GET | Search investors |
| `GET /api/current/search/network_co_investors` | GET | Search co-investors |
| `GET /api/current/search/network_domains` | GET | Search network domains |
| `GET /api/current/search/vcs_email_domains` | GET | VC email domains |
| `GET /api/current/search/vcs_email_domains/industries` | GET | Industries for VC domains |

### 5.3 Semantic / Embedding Search

| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /api/current/search/embeddings` | GET | **Semantic search using embeddings** |
| `GET /api/current/search/embeddings/by_profile` | GET | Find similar profiles by embedding |

**This is critical for AI-powered job matching in the Talent Network.** Bridge already has vector embeddings infrastructure that we can leverage.

### 5.4 Contact Search

| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /api/current/search/shared_contacts` | GET | Contacts shared with user |
| `GET /api/current/search/global_contacts` | GET | All contacts across network |
| `GET /api/current/search/tag_connector_contacts` | GET | Contacts via tag connectors |
| `GET /api/current/search/domain_contacts/count` | GET | Contact count by domain |
| `GET /api/current/search/collaborating_with_contacts` | GET | Collaboration contacts |

---

## 6. Network Domain Endpoints (VC Network Membership)

These endpoints manage which VC networks a user belongs to — essential for role-based access in the Talent Network.

### 6.1 Domain Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /api/current/tags/:domain/details` | GET | Network domain details |
| `GET /api/current/tags/:domain/counts` | GET | Member counts for network |
| `GET /api/current/tags/:domain/guests` | GET | Network guests |
| `POST /api/current/tags/:domain/guests` | POST | Add guest to network |
| `GET /api/current/tags/:domain/guests/count` | GET | Guest count |
| `POST /api/current/tags/:domain/team_invites` | POST | Invite team member |
| `GET /api/current/tags/:domain/invited_contact_ids` | GET | Invited contact IDs |

### 6.2 Network Domain Invites

| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /api/current/network_domain_invites/show_by_token` | GET | View invite by token |
| `POST /api/current/network_domain_invites/send_invite` | POST | Send network invite |
| `POST /api/current/network_domain_invites/join` | POST | Join network via invite |

### 6.3 User Networks

| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /api/current/user_networks` | GET | User's network memberships |
| `GET /api/current/user_networks/counts` | GET | Network membership counts |

---

## 7. Introduction & Referral Endpoints

The warm intro system is a core differentiator for the Talent Network.

### 7.1 Introduction CRUD

| Endpoint | Method | Description |
|----------|--------|-------------|
| `POST /api/current/introductions` | POST | Create introduction |
| `GET /api/current/introductions` | GET | List introductions |
| `GET /api/current/introduction_latest` | GET | Latest introductions |
| `POST /api/current/introductions/:id/confirmations` | POST | Confirm intro |
| `POST /api/current/introductions/:id/publishings` | POST | Publish intro |
| `POST /api/current/introductions/:id/acceptions` | POST | Accept intro |
| `POST /api/current/introductions/:id/rejections` | POST | Reject intro |
| `POST /api/current/introductions/:id/ratings` | POST | Rate intro |
| `POST /api/current/introductions/:id/reassign_connector` | POST | Reassign connector |
| `POST /api/current/introductions/bulk_forward` | POST | Bulk forward |
| `POST /api/current/introductions/bulk_decline` | POST | Bulk decline |
| `GET /api/current/introductions/export` | GET | Export intros |

### 7.2 Introduction Stats

| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /api/current/introductions/promo_stats` | GET | Promo statistics |
| `GET /api/current/introductions/since/:time` | GET | Intros since timestamp |
| `GET /api/current/introductions/by_bridge/:username` | GET | Intros by Bridge user |
| `GET /api/current/introductions/uniq_domains/count` | GET | Unique domains count |

### 7.3 Connector Suggestions

| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /api/current/contacts/:id/connector_suggestions` | GET | Who can introduce you |
| `GET /api/current/common_contacts` | GET | Mutual connections |
| `GET /api/current/contacts/:id/common_contacts` | GET | Common contacts with person |

---

## 8. Asks (Network Requests — Job Postings Potential)

Asks are network-wide requests that can be repurposed as job postings in the Talent Network.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `POST /api/current/asks` | POST | Create ask/request |
| `GET /api/current/network_asks` | GET | Network-wide asks |
| `GET /api/current/network_asks/count` | GET | Ask count |
| `GET /api/current/network_asks/since/:time` | GET | New asks since timestamp |
| `POST /api/current/ask_shares` | POST | Share ask with contacts |
| `POST /api/current/ask_shares/:id/forwardable_intro` | POST | Create intro from ask |

---

## 9. Analytics & Dashboard Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /api/current/counts/overview` | GET | Overall counts |
| `GET /api/current/counts/intros` | GET | Introduction counts |
| `GET /api/current/counts/contacts` | GET | Contact counts |
| `GET /api/current/counts/stats` | GET | General stats |
| `GET /api/current/counts/collaboration` | GET | Collaboration stats |
| `GET /api/current/personal_dashboards/stats` | GET | Personal dashboard |
| `GET /api/current/network_dashboards/:domain/stats` | GET | Network dashboard |
| `GET /api/current/network_portfolios_metrics` | GET | Portfolio metrics |
| `GET /api/current/network_insights` | GET | Network insights |
| `GET /api/current/usage` | GET | Usage data |
| `GET /api/current/activity` | GET | Activity feed |

---

## 10. Data Schema Mapping

### 10.1 Bridge User + GlobalProfile → Talent Network Profile

| Talent Network Field | Source | Bridge Field | Type |
|---------------------|--------|--------------|------|
| `talent_id` | Generated | — | UUID (new) |
| `bridge_user_id` | `users.id` | `id` | UUID |
| `email` | `users.email` | `email` | string |
| `first_name` | `users.first_name` | `first_name` | string |
| `last_name` | `users.last_name` | `last_name` | string |
| `username` | `users.username` | `username` | string |
| `avatar_url` | `users.profile_pic_url` | `profile_pic_url` | string |
| `bio` | `global_profiles.bio` | `global_profile.bio` | text |
| `headline` | `global_profiles.position` | `global_profile.position` | string |
| `company` | `global_profiles.company` | `global_profile.company` | string |
| `company_website` | `global_profiles.company_website` | `global_profile.company_website` | string |
| `location` | `global_profiles.location` | `global_profile.location` | string |
| `linkedin_url` | `global_profiles.linkedin_profile_url` | `global_profile.linkedin_profile_url` | string |
| `twitter_url` | `global_profiles.twitter_handle_url` | `global_profile.twitter_handle_url` | string |
| `is_super_connector` | `global_profiles.is_super_connector` | `global_profile.is_super_connector` | boolean |
| `target_roles` | `orgs.roles` | `icp.roles` | string[] |
| `target_industries` | `orgs.industries` | `icp.industries` | string[] |
| `target_context` | `orgs.description` | `icp.context` | text |
| `icp_public` | `user_props` | `icp.public` | boolean |
| `network_domains` | `network_domain_users` | `network_domains[].domain` | string[] |
| `network_roles` | `network_domain_users` | `network_domains[].role` | string[] |
| `is_investor` | Computed | `investor_network_domains.length > 0` | boolean |
| `investor_networks` | `network_domain_users` | `investor_network_domains[]` | string[] |
| `has_portfolios` | `network_domain_users` | `network_domains[].has_portfolios` | boolean |
| `email_domains` | `global_profile_references` | `global_profile.email_references[].ref` | string[] |
| `user_roles` | `users_roles` | `roles[]` | string[] |
| `registration_source` | `registration_sources` | `registration_source.name` | string |
| `intro_count` | Computed | Introduction count | integer |
| `created_at` | `users.created_at` | `created_at` | datetime |
| `last_active_at` | `users.updated_at` | `updated_at` | datetime |
| `is_confirmed` | `users.confirmed_at` | `confirmed` | boolean |
| `talent_status` | Generated | — | enum: `active`, `passive`, `not_looking` |
| `open_to_roles` | New field | — | string[] (Talent Network only) |
| `salary_range` | New field | — | object (Talent Network only) |
| `work_preference` | New field | — | enum: `remote`, `hybrid`, `onsite` |

### 10.2 Bridge Network Domain → Talent Network Company

| Talent Network Field | Source | Bridge Field |
|---------------------|--------|--------------|
| `company_id` | Generated | — |
| `domain` | `network_domains` | `domain` |
| `name` | `network_domains` | From domain details |
| `member_count` | Computed | `counts` endpoint |
| `portfolio_of` | `portfolios` | Investor domain |
| `is_vc` | `vcs_email_domains` | Domain in VCS list |
| `industries` | `vcs_email_domains` | Industries endpoint |

### 10.3 Bridge Ask → Talent Network Job Posting

| Talent Network Field | Source | Bridge Field |
|---------------------|--------|--------------|
| `job_id` | Generated | — |
| `bridge_ask_id` | `asks.id` | `id` |
| `posted_by` | `asks.user_id` | `user_id` |
| `company_domain` | Derived | From user's network domain |
| `title` | `asks` | Ask title |
| `description` | `asks` | Ask body |
| `shared_with` | `ask_shares` | Share recipients |

---

## 11. Sync Strategy

### 11.1 Initial Bulk Import

```
1. GET /api/current/search/bridge_members → All member profiles
2. For each member:
   a. GET /api/current/users/:id → Full profile + global_profile + ICP
   b. Map to Talent Network schema
   c. Insert into Talent Network DB
3. GET /api/current/search/network_portfolios → All portfolio companies
4. GET /api/current/search/network_investors → All investors
5. GET /api/current/search/vcs_email_domains → All VC domains
```

### 11.2 Incremental Sync (Delta Updates)

Bridge provides `since/:time` endpoints for efficient polling:

| Data Type | Endpoint | Frequency |
|-----------|----------|-----------|
| Member profiles | `GET /contacts/bridge_members_details/since/:time` | Every 15 min |
| Introductions | `GET /introductions/since/:time` | Every 5 min |
| Network asks | `GET /network_asks/since/:time` | Every 5 min |
| Tags | `GET /tags/owned/since/:time` | Every 30 min |
| Notifications | `GET /notifications/since/:time` | Every 1 min |

### 11.3 Real-Time Webhooks

Bridge supports user-configured webhooks:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /api/current/webhooks/available_webhooks` | GET | List available events |
| `POST /api/current/webhooks` | POST | Register webhook |

Register webhooks for real-time Talent Network updates on profile changes, new introductions, and new asks.

### 11.4 Sync Architecture

```
┌─────────────────┐     API Key Auth      ┌──────────────────┐
│                  │ ───────────────────── │                  │
│  Bridge Backend  │   REST API Calls      │  Talent Network  │
│  (Rails API)     │ ◄──────────────────── │  Sync Service    │
│                  │                       │                  │
│  PostgreSQL DB   │     Webhooks          │  PostgreSQL DB   │
│                  │ ────────────────────► │                  │
└─────────────────┘                       └──────────────────┘
        │                                          │
        │              ┌──────────┐                │
        └─────────────►│ Embedding│◄───────────────┘
                       │ Search   │
                       │ Service  │
                       └──────────┘
```

---

## 12. New Fields (Talent Network Only)

These fields don't exist in Bridge and need to be collected via the Talent Network UI:

| Field | Type | Description | Collection Method |
|-------|------|-------------|-------------------|
| `talent_status` | enum | `active`, `passive`, `not_looking` | Onboarding flow |
| `open_to_roles` | string[] | Roles the person is open to | Profile edit |
| `salary_range` | object | `{ min, max, currency }` | Profile edit (private) |
| `work_preference` | enum | `remote`, `hybrid`, `onsite` | Profile edit |
| `willing_to_relocate` | boolean | Open to relocation | Profile edit |
| `preferred_locations` | string[] | Where they'd work | Profile edit |
| `skills` | string[] | Technical/professional skills | Profile edit + AI extraction |
| `experience_years` | integer | Years of experience | AI extraction from LinkedIn |
| `education` | object[] | Schools, degrees | AI extraction from LinkedIn |
| `endorsements` | object[] | VC/founder endorsements | Endorsement flow |
| `referral_score` | float | Network trust score | Computed from intros |
| `profile_completeness` | float | 0-100% completion | Computed |
| `last_job_search_at` | datetime | When they last searched | Tracked |
| `visibility` | enum | `network_only`, `portfolio_only`, `public` | Privacy settings |

---

## 13. API Rate Limits & Considerations

### 13.1 Existing Rate Limiting

Bridge has intro rate limiting built in:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /api/current/intro_rate_limits` | GET | Current rate limits |
| `POST /api/current/intro_rate_limits` | POST | Create rate limit |

### 13.2 Recommended Sync Limits

| Operation | Recommended Limit | Reason |
|-----------|-------------------|--------|
| Bulk import | 50 requests/sec | Avoid DB load |
| Delta sync | 10 requests/sec | Background process |
| User-triggered | 5 requests/sec/user | Standard API limit |
| Webhook delivery | Unlimited (push) | Event-driven |

### 13.3 Data Privacy

- **Email visibility:** Only show to network members, not public
- **Salary data:** Never synced to Bridge — Talent Network only, visible only to user
- **ICP data:** Respect `icp.public` flag from Bridge
- **Deleted users:** Check `deleting` flag, exclude from Talent Network
- **Unconfirmed users:** Check `confirmed` flag, only sync confirmed users

---

## 14. Implementation Phases

### Phase 1: Read-Only Sync (Weeks 1-3)
- Set up API key authentication
- Bulk import all Bridge members via `/search/bridge_members`
- Map User + GlobalProfile → Talent Network Profile
- Implement delta sync via `/since/:time` endpoints
- Build talent directory with search

### Phase 2: Bidirectional Sync (Weeks 4-6)
- Talent Network profile edits sync back to Bridge GlobalProfile
- New Talent Network fields stored locally (skills, salary, preferences)
- Webhook registration for real-time updates
- SSO via Bridge JWT tokens

### Phase 3: Deep Integration (Weeks 7-10)
- Leverage `/search/embeddings` for AI-powered job matching
- Integrate introduction system for warm referrals
- Connect Asks system for job posting distribution
- Build connector suggestions into talent discovery
- Network domain-based access control (portfolio companies see their talent)

### Phase 4: Analytics & Intelligence (Weeks 11-14)
- Pull dashboard stats for VC admin views
- Build hire attribution using introduction outcomes
- Network insights integration
- Portfolio metrics in Talent Network context

---

## 15. Key Discoveries from Codebase Analysis

1. **Embeddings already exist** — Bridge has `/search/embeddings` and `/search/embeddings/by_profile` endpoints, meaning vector search infrastructure is already built. The Talent Network can leverage this for AI job matching without building from scratch.

2. **Super Connector flag** — `global_profiles.is_super_connector` identifies high-value networkers. Use this for referral prioritization in the Talent Network.

3. **ICP (Ideal Customer Profile)** — The `Org` model stores roles, industries, and context. This maps directly to "what kind of opportunities are you looking for" in the Talent Network.

4. **Delta sync is built-in** — Multiple `/since/:time` endpoints exist for contacts, introductions, asks, tags, and notifications. This makes incremental sync straightforward.

5. **Webhook support exists** — Bridge has a webhook system (`/webhooks/available_webhooks`) that can push real-time events to the Talent Network.

6. **Network domain roles** — Users have roles (`member`, `guest`, `api_admin`) per network domain. This maps directly to Talent Network access control (VC admins vs. portfolio companies vs. talent).

7. **Ask system = Job posting foundation** — The Asks feature (network-wide requests with sharing) can be extended or mirrored for job postings in the Talent Network.

8. **Introduction system is mature** — Full lifecycle (create → confirm → publish → accept/reject → rate) with bulk operations. This powers warm referrals in the Talent Network.

9. **Smart member search** — Bridge already has `smart_member_search` that searches by name, email domain, company name, and company website simultaneously. We can build on this for talent search.

10. **User feature flags** — `UserFeatureFlags` system exists for gradual rollout. Use this to gate Talent Network features per user/network.
