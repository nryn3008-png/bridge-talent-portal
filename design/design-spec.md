# Design Specification — Bridge Talent & Job Portal

> **For:** Claude Code Development Reference
> **Framework:** Next.js + Tailwind CSS + shadcn/ui
> **Date:** February 2026

---

## 1. Design Principles

1. **Network-first:** Every screen should reinforce that this is a private, trusted network — not a public job board
2. **Trust signals everywhere:** Endorsements, VC badges, mutual connections visible at all interaction points
3. **Progressive disclosure:** Show essential info first, detail on demand
4. **Warm over cold:** Always surface warm connections before cold actions (intro before apply)
5. **Minimal friction:** One-click apply, auto-filled forms, SSO login

---

## 2. Design Tokens

### 2.1 Colors

```css
/* Primary - Bridge brand (adjust to match existing Bridge palette) */
--primary-50: #EEF2FF;
--primary-100: #E0E7FF;
--primary-200: #C7D2FE;
--primary-500: #6366F1;    /* Primary action buttons */
--primary-600: #4F46E5;    /* Primary hover */
--primary-700: #4338CA;    /* Primary pressed */
--primary-900: #312E81;

/* Secondary */
--secondary-50: #F0FDF4;
--secondary-500: #22C55E;  /* Success, hired, active */
--secondary-600: #16A34A;

/* Neutral */
--gray-50: #F9FAFB;        /* Page background */
--gray-100: #F3F4F6;       /* Card background, input bg */
--gray-200: #E5E7EB;       /* Borders */
--gray-400: #9CA3AF;       /* Placeholder text */
--gray-500: #6B7280;       /* Secondary text */
--gray-700: #374151;       /* Body text */
--gray-900: #111827;       /* Headings */

/* Semantic */
--warning: #F59E0B;         /* Passive, pending */
--error: #EF4444;           /* Rejected, error */
--info: #3B82F6;            /* Info, links */

/* Match Score Gradient */
--match-high: #22C55E;      /* 80-100% */
--match-medium: #F59E0B;    /* 50-79% */
--match-low: #9CA3AF;       /* 0-49% */

/* Badge Colors */
--badge-vc: #8B5CF6;        /* VC endorsement purple */
--badge-founder: #F97316;   /* Founder endorsement orange */
--badge-super: #EAB308;     /* Super connector gold */
--badge-peer: #06B6D4;      /* Peer endorsement cyan */
```

### 2.2 Typography

```css
/* Font Family */
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
--font-mono: 'JetBrains Mono', monospace;

/* Font Sizes */
--text-xs: 0.75rem;     /* 12px — labels, badges */
--text-sm: 0.875rem;    /* 14px — secondary text, metadata */
--text-base: 1rem;      /* 16px — body text */
--text-lg: 1.125rem;    /* 18px — card titles */
--text-xl: 1.25rem;     /* 20px — section headers */
--text-2xl: 1.5rem;     /* 24px — page titles */
--text-3xl: 1.875rem;   /* 30px — hero text */

/* Font Weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;

/* Line Heights */
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.625;
```

### 2.3 Spacing

```css
/* Base unit: 4px */
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
```

### 2.4 Border Radius

```css
--radius-sm: 0.375rem;   /* 6px — buttons, inputs */
--radius-md: 0.5rem;     /* 8px — cards */
--radius-lg: 0.75rem;    /* 12px — modals, large cards */
--radius-xl: 1rem;       /* 16px — panels */
--radius-full: 9999px;   /* Circular — avatars, badges */
```

### 2.5 Shadows

```css
--shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
--shadow-md: 0 4px 6px -1px rgba(0,0,0,0.1);
--shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.1);
--shadow-card: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06);
```

---

## 3. Layout System

### 3.1 Page Layout

```
┌─────────────────────────────────────────────────────────┐
│  Top Nav Bar (64px)                                      │
│  Logo | Search | Notifications | Avatar                  │
├──────────┬──────────────────────────────────────────────┤
│          │                                               │
│ Sidebar  │  Main Content Area                            │
│ (240px)  │  Max width: 1280px                           │
│          │  Padding: 24px                                │
│ - Jobs   │                                               │
│ - Talent │  ┌─────────────────────────────────────┐     │
│ - Intros │  │  Page Header                         │     │
│ - Comm.  │  │  Title + Actions                     │     │
│ - Stats  │  ├─────────────────────────────────────┤     │
│          │  │  Filters / Tabs                      │     │
│          │  ├─────────────────────────────────────┤     │
│          │  │  Content Grid / List                 │     │
│          │  │                                      │     │
│          │  │                                      │     │
│          │  └─────────────────────────────────────┘     │
│          │                                               │
└──────────┴──────────────────────────────────────────────┘
```

### 3.2 Responsive Breakpoints

```css
/* Tailwind defaults */
sm: 640px      /* Mobile landscape */
md: 768px      /* Tablet */
lg: 1024px     /* Laptop — sidebar collapses below this */
xl: 1280px     /* Desktop */
2xl: 1536px    /* Large desktop */
```

### 3.3 Grid System

```css
/* Job/Talent cards: responsive grid */
.card-grid {
  @apply grid gap-4;
  @apply grid-cols-1;                /* Mobile: 1 column */
  @apply md:grid-cols-2;             /* Tablet: 2 columns */
  @apply xl:grid-cols-3;             /* Desktop: 3 columns */
}

/* Dashboard stats */
.stats-grid {
  @apply grid gap-4;
  @apply grid-cols-2;                /* Mobile: 2 columns */
  @apply lg:grid-cols-4;             /* Desktop: 4 columns */
}
```

---

## 4. Component Specifications

### 4.1 Job Card

```
┌────────────────────────────────────────────┐
│  [Company Logo]  Company Name              │
│                  📍 San Francisco (Remote)  │
│                                             │
│  Senior Frontend Engineer                   │
│  $150K - $200K · Full-time                 │
│                                             │
│  ┌──────┐ ┌────────┐ ┌──────┐             │
│  │ React│ │TypeScript│ │Next.js│            │
│  └──────┘ └────────┘ └──────┘             │
│                                             │
│  🟢 95% Match    👥 3 connections          │
│                                             │
│  [💜 Request Intro]    [⭐ Save]           │
└────────────────────────────────────────────┘

States: default, hover (shadow-md), saved (star filled), applied (green border)
```

**Specifications:**
- Card padding: `p-5` (20px)
- Border: `border border-gray-200`
- Border radius: `rounded-lg` (12px)
- Company logo: 40x40px, `rounded-md`
- Job title: `text-lg font-semibold text-gray-900`
- Salary: `text-sm font-medium text-green-600`
- Skill tags: `px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full`
- Match score: color-coded badge (green/amber/gray)
- Hover: `hover:shadow-md transition-shadow`

### 4.2 Talent Card

```
┌────────────────────────────────────────────┐
│  [Avatar]  Jane Smith                      │
│   (48px)   Head of Engineering             │
│            Acme Corp · San Francisco       │
│                                             │
│  🟢 Actively Looking                       │
│                                             │
│  ┌──────┐ ┌────────┐ ┌──────┐             │
│  │Python│ │ ML/AI  │ │ AWS  │  +3 more    │
│  └──────┘ └────────┘ └──────┘             │
│                                             │
│  💜 VC Endorsed (Sequoia)                  │
│  👥 5 mutual connections                   │
│                                             │
│  [Request Intro]    [View Profile]         │
└────────────────────────────────────────────┘
```

**Specifications:**
- Avatar: 48x48px, `rounded-full`, border if endorsed
- Name: `text-lg font-semibold text-gray-900`
- Position: `text-sm text-gray-600`
- Status badge: colored pill (`bg-green-50 text-green-700` for active)
- Endorsement badge: `bg-purple-50 text-purple-700` with icon
- Mutual connections: `text-sm text-gray-500` with people icon

### 4.3 Match Score Badge

```
┌──────────────┐
│ 🟢 95% Match │   High (80-100%): green bg, green text
└──────────────┘

┌──────────────┐
│ 🟡 62% Match │   Medium (50-79%): amber bg, amber text
└──────────────┘

┌──────────────┐
│ ⚪ 34% Match │   Low (0-49%): gray bg, gray text
└──────────────┘
```

### 4.4 Endorsement Badges

```
💜 VC Badge:      bg-purple-50 text-purple-700 border-purple-200
🟠 Founder Badge: bg-orange-50 text-orange-700 border-orange-200
🏆 Super Connector: bg-yellow-50 text-yellow-700 border-yellow-200
🔵 Peer Badge:    bg-cyan-50 text-cyan-700 border-cyan-200
```

### 4.5 Application Status Pipeline

```
Applied → Reviewed → Interviewing → Offered → Hired
  ⚪        🔵         🟡           🟢       ✅

Rejected at any stage: 🔴
Withdrawn: ⚫
```

### 4.6 Search & Filter Bar

```
┌────────────────────────────────────────────────────────┐
│ 🔍 Search jobs, companies, people...                    │
├────────────────────────────────────────────────────────┤
│ [Role Type ▼] [Location ▼] [Remote ▼] [Salary ▼]     │
│ [Experience ▼] [Skills ▼] [Company ▼] [Clear all]     │
└────────────────────────────────────────────────────────┘
```

- Search input: full-width, `h-12`, `text-base`, search icon left
- Filter pills: `h-9`, `px-3`, `border border-gray-200`, `rounded-full`
- Active filter: `bg-primary-50 border-primary-200 text-primary-700`
- Dropdown: `shadow-lg rounded-lg border`, max-height 320px, scrollable

### 4.7 Navigation Sidebar

```
┌──────────────────┐
│  🌉 Bridge       │
│  Talent Network   │
├──────────────────┤
│                  │
│  📊 Dashboard    │  ← Active: bg-primary-50, text-primary-700, left border
│                  │
│  💼 Jobs         │
│     Browse       │  ← Sub-item: indented, text-sm
│     Recommended  │
│     Saved        │
│     Applications │
│                  │
│  👥 Talent       │  ← Company/VC only
│     Directory    │
│     Pools        │
│     Referrals    │
│                  │
│  🤝 Intros      │
│                  │
│  🏠 Community   │
│     Events       │
│     Mentorship   │
│     Messages     │
│                  │
│  📈 Analytics    │  ← VC only
│                  │
├──────────────────┤
│  [Avatar] Jane   │
│  Settings        │
└──────────────────┘
```

- Width: 240px (fixed), collapses to icon-only (64px) on < lg
- Item height: 40px
- Active indicator: 3px left border, `bg-primary-50`
- Section dividers: `border-t border-gray-100` with 16px spacing

---

## 5. Page Specifications

### 5.1 Dashboard (Home)

**For Talent:**
- "Recommended Jobs" carousel (AI-matched)
- Recent applications with status
- Upcoming events
- Profile completeness card (if < 80%)
- "People in your network are hiring" section

**For Portfolio Company:**
- Active job postings with application counts
- New applicants requiring review
- Top matched talent for open roles
- Referral activity

**For VC Admin:**
- Network overview stats (4-column grid)
- Portfolio companies hiring activity
- Top talent in network
- Recent hires attributed to Bridge

### 5.2 Job Board Page

- Search bar (top, full-width)
- Filter bar (below search)
- Results count + sort dropdown ("Most relevant", "Newest", "Salary: High to Low")
- Job card grid (responsive 1-3 columns)
- Pagination or infinite scroll
- Empty state: "No jobs match your filters. Try broadening your search."

### 5.3 Job Detail Page

```
┌─────────────────────────────────────────────────────────┐
│  ← Back to Jobs                                          │
│                                                           │
│  [Company Logo]  Company Name · Series B · 50 employees  │
│                  📍 San Francisco (Remote OK)             │
│                                                           │
│  Senior Frontend Engineer                                 │
│  $150K - $200K · Full-time · 3+ years                    │
│                                                           │
│  🟢 95% Match  💜 VC Portfolio  👥 3 connections         │
│                                                           │
│  ┌──────────────────┐  ┌──────────────────┐              │
│  │ 💜 Request Intro │  │   ⚡ Quick Apply  │              │
│  └──────────────────┘  └──────────────────┘              │
│                                                           │
│  ─── About the Role ───────────────────────────────────  │
│  [Job description text...]                                │
│                                                           │
│  ─── Requirements ─────────────────────────────────────  │
│  [Requirements list...]                                   │
│                                                           │
│  ─── Skills ───────────────────────────────────────────  │
│  [React] [TypeScript] [Next.js] [GraphQL]                │
│                                                           │
│  ─── Your Connections at Company Name ─────────────────  │
│  [Avatar] John Doe - CTO (can introduce you)             │
│  [Avatar] Sarah Kim - Eng Lead (mutual connection)       │
│                                                           │
│  ─── About Company Name ──────────────────────────────  │
│  [Company description, funding, team size, perks]         │
│                                                           │
│  ─── Similar Jobs ─────────────────────────────────────  │
│  [3 similar job cards in a row]                           │
└─────────────────────────────────────────────────────────┘
```

### 5.4 Talent Profile Page

```
┌─────────────────────────────────────────────────────────┐
│  ← Back to Directory                                      │
│                                                           │
│  ┌──────┐  Jane Smith                                    │
│  │Avatar│  Head of Engineering at Acme Corp              │
│  │ 72px │  📍 San Francisco, CA                          │
│  └──────┘  🟢 Actively Looking                           │
│                                                           │
│  💜 Endorsed by Sequoia Capital                          │
│  🟠 Recommended by 2 founders                           │
│  🏆 Super Connector (top 5% network activity)            │
│                                                           │
│  [Request Intro]  [Save Candidate]  [Message]            │
│                                                           │
│  ─── About ────────────────────────────────────────────  │
│  [Bio text...]                                            │
│                                                           │
│  ─── Skills ───────────────────────────────────────────  │
│  [Python] [ML/AI] [AWS] [Leadership] [System Design]    │
│                                                           │
│  ─── Looking For ──────────────────────────────────────  │
│  Roles: CTO, VP Engineering                              │
│  Industries: AI/ML, SaaS                                 │
│  Work: Remote · Willing to relocate                      │
│                                                           │
│  ─── Experience ───────────────────────────────────────  │
│  Acme Corp · Head of Engineering · 2022-Present          │
│  TechCo · Senior Engineer · 2019-2022                    │
│                                                           │
│  ─── Endorsements (5) ─────────────────────────────────  │
│  💜 [Avatar] "Jane is an exceptional..." - Partner, Seq  │
│  🟠 [Avatar] "Worked with Jane on..." - CEO, TechCo     │
│                                                           │
│  ─── Mutual Connections (3) ───────────────────────────  │
│  [Avatar] [Avatar] [Avatar] and 0 more                   │
└─────────────────────────────────────────────────────────┘
```

### 5.5 Post a Job Page

- Step-by-step form (wizard-style or single page)
- Fields: title, department, description (rich text), requirements, skills (tag input), location, work type, salary range, experience level, visibility, apply URL (optional)
- Preview panel (side-by-side on desktop)
- "Post Job" button → confirmation modal

---

## 6. Interaction Patterns

### 6.1 Warm Intro Flow

```
User views job → Sees "3 connections at Company"
       │
       ▼
Clicks "Request Intro" → Modal opens
       │
       ├── Select connector (who can introduce you)
       ├── Write intro message (pre-filled template)
       └── Send request
              │
              ▼
       Connector receives notification
              │
              ├── Accept → Makes intro (Bridge intro system)
              └── Decline → User notified
```

### 6.2 One-Click Apply

```
User views job → Clicks "Quick Apply"
       │
       ▼
Modal: Pre-filled from Bridge profile
       │
       ├── Name, email, headline (auto-filled, editable)
       ├── Resume upload (optional)
       ├── Cover note (optional, textarea)
       ├── Screening questions (if any)
       └── Submit
              │
              ▼
       Confirmation + redirect to "My Applications"
```

### 6.3 Endorsement Flow

```
VC/Founder views talent profile → Clicks "Endorse"
       │
       ▼
Modal:
       │
       ├── Select endorsement type (VC/Founder/Peer)
       ├── Select skills to endorse (multi-select)
       ├── Describe relationship (dropdown)
       ├── Write endorsement text (optional)
       └── Submit
              │
              ▼
       Talent receives notification
       Endorsement appears on profile
```

---

## 7. Empty States

| Screen | Empty State Message | CTA |
|--------|-------------------|-----|
| Job Board | "No jobs match your filters" | "Clear filters" or "Browse all jobs" |
| My Applications | "You haven't applied to any jobs yet" | "Browse recommended jobs" |
| Talent Directory | "No talent matches your search" | "Adjust filters" |
| Saved Jobs | "You haven't saved any jobs yet" | "Browse jobs" |
| Endorsements | "No endorsements yet" | "Share your profile to get endorsed" |
| Referrals | "No referrals yet" | "Refer someone from your network" |
| Events | "No upcoming events" | "Create an event" (if admin) |

---

## 8. Loading States

- **Skeleton screens** for cards (gray pulsing rectangles matching card layout)
- **Spinner** for actions (button spinner inline, 16px)
- **Progress bar** for multi-step flows (top of page)
- **Optimistic updates** for save/unsave, RSVP, status changes
- **Infinite scroll loader** at bottom of lists

---

## 9. Notifications

### In-App Notifications

```
┌────────────────────────────────────────┐
│ 🔔 Notifications                   ✓   │
├────────────────────────────────────────┤
│ 💼 New job match: Senior FE at Acme   │
│    95% match · 2 min ago              │
├────────────────────────────────────────┤
│ ✅ Application reviewed at TechCo     │
│    Moving to interview · 1 hour ago   │
├────────────────────────────────────────┤
│ 🤝 John accepted your intro request   │
│    Intro sent to Jane · 3 hours ago   │
├────────────────────────────────────────┤
│ 💜 New endorsement from Sequoia       │
│    Partner endorsed your leadership   │
└────────────────────────────────────────┘
```

### Email Notifications

| Event | Email | Frequency |
|-------|-------|-----------|
| New matching job | Digest | Daily/Weekly (user choice) |
| Application status change | Instant | Real-time |
| Intro request received | Instant | Real-time |
| New endorsement | Instant | Real-time |
| Event reminder | Instant | 24h + 1h before |

---

## 10. Accessibility

- All interactive elements keyboard-navigable
- ARIA labels on icons and badges
- Color contrast ratio ≥ 4.5:1 for all text
- Focus indicators visible (ring-2 ring-primary-500)
- Screen reader support for match scores and status badges
- Reduced motion support for animations
- Alt text for all images and avatars
