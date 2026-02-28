# Technical Specification & Database Schema

## Domme Management Platform — Next.js Application

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | NextAuth.js (Auth.js v5) |
| Styling | Tailwind CSS + shadcn/ui |
| File Storage | S3-compatible (AWS S3 / Cloudflare R2) |
| Export | jsPDF (PDF), PapaParse (CSV) |
| Calendar Sync | Google Calendar API, Apple CalDAV |
| Notifications | In-app (DB-backed), future: web push |
| Deployment | Vercel / self-hosted |

---

## Feature Set 1: Authentication & User Management

### Overview

Foundation layer. Every resource in the system is scoped to an authenticated user (domme). The auth system must support future expansion to sub-created accounts with mutual linking.

### Requirements

- Email/password registration and login
- OAuth providers (Google, Apple) via NextAuth
- Session management (JWT or database sessions)
- Role field on user model (`DOMME` default, future `SUB` role)
- Profile settings page (display name, email, timezone, preferences)
- Password reset flow
- Account deletion with full data cascade

### API Routes

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/[...nextauth]` | NextAuth handler |
| GET | `/api/user/profile` | Get current user |
| PATCH | `/api/user/profile` | Update profile |
| DELETE | `/api/user/account` | Delete account + all data |

### Pages

| Route | Page |
|-------|------|
| `/login` | Login form |
| `/register` | Registration form |
| `/settings` | User settings & preferences |

---

## Feature Set 2: Sub Profile System

### Overview

Core data model. All other features reference sub profiles. Profiles are fully private to the domme — subs never see this data. The schema must support future optional sub-created public profiles that can link to a domme's system while keeping the domme's private layer separate.

### Data Model — Fields & Types

#### Main Visible Fields (always shown in list view)

| Field | DB Column | Type | Input Type |
|-------|-----------|------|------------|
| Full Name | `full_name` | `String` | Text input |
| Contact Info | `contact_info` | `String` | Text input (freeform: phone, email, platform handle) |
| Arrangement Type | `arrangement_type` | `String[]` | Multi-select (Online, IRL, Hybrid, Financial, Service, Custom) |
| Type of Submissive | `sub_type` | `String[]` | Multi-select (Finsub, Femsub, Service Sub, Pain Sub, Pet, Slave, Sissy, Brat, Switch, Custom) |
| Timezone | `timezone` | `String` | Dropdown (IANA timezone list) |
| Soft Limits | `soft_limits` | `String[]` | Tag input (freeform chips, user types and enters) |
| Hard Limits | `hard_limits` | `String[]` | Tag input (freeform chips) |
| Financial Contributions | `financial_total` | `Decimal` | Auto-calculated (read-only, derived from FinancialEntry sum) |

#### Advanced Section (collapsible)

| Field | DB Column | Type | Input Type |
|-------|-----------|------|------------|
| Age / Birthday | `birthday` | `DateTime?` | Date picker (age auto-calculated) |
| Country | `country` | `String?` | Dropdown (country list) |
| Occupation | `occupation` | `String?` | Text input |
| Work Schedule | `work_schedule` | `String?` | Text input |
| Financial Limits | `financial_limits` | `String?` | Text input |
| Expendable Income / Budget | `expendable_income` | `String?` | Text input |
| Preferences (kinks, experiences) | `preferences` | `String[]` | Tag input (freeform chips) |
| Best Domme Experiences | `best_experiences` | `String?` | Textarea |
| Worst Domme Experiences | `worst_experiences` | `String?` | Textarea |
| Personality Notes | `personality_notes` | `String?` | Textarea |
| Health / Lifestyle Notes | `health_notes` | `String?` | Textarea |
| Task & Obedience History | `obedience_history` | `String?` | Textarea |

#### System Fields

| Field | DB Column | Type | Notes |
|-------|-----------|------|-------|
| ID | `id` | `String (cuid)` | Primary key |
| Owner (Domme) | `user_id` | `String` | FK → User, required |
| Created At | `created_at` | `DateTime` | Auto |
| Updated At | `updated_at` | `DateTime` | Auto |
| Archived | `is_archived` | `Boolean` | Default false |
| Avatar URL | `avatar_url` | `String?` | S3 path |
| Tags | `tags` | `String[]` | Custom tags for filtering |
| Notes | `private_notes` | `String?` | General private notes field |

### Linked Sections (clickable from expanded profile)

Each section lives in its own table and links to the sub profile:

- **Badges** → `Badge` model (earned achievements, clickable to badge detail)
- **Media** → `MediaItem` model (sub-specific media entries, not a general library)
- **Rating** → `Rating` model (detailed ratings with breakdown)
- **Behavior Score** → `BehaviorScore` model (overall + category breakdown)
- **Contracts** → `Contract` model (clickable to full contract view)
- **Financial Entries** → `FinancialEntry` model (linked entries from financial tracking)

### Export

- Single sub export: PDF or CSV of all profile data + linked sections
- Bulk export: All subs as CSV or multi-page PDF
- Endpoint: `POST /api/subs/export` with body `{ subIds: string[], format: 'pdf' | 'csv' }`

### API Routes

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/subs` | List all subs (with search/filter params) |
| POST | `/api/subs` | Create new sub profile |
| GET | `/api/subs/[id]` | Get full sub profile with linked data |
| PATCH | `/api/subs/[id]` | Update sub profile |
| DELETE | `/api/subs/[id]` | Delete sub (cascade or archive) |
| POST | `/api/subs/export` | Export selected subs |
| GET | `/api/subs/[id]/badges` | Get sub's badges |
| GET | `/api/subs/[id]/media` | Get sub's media items |
| GET | `/api/subs/[id]/ratings` | Get sub's ratings |
| GET | `/api/subs/[id]/behavior` | Get sub's behavior scores |
| GET | `/api/subs/[id]/contracts` | Get sub's contracts |

### Pages

| Route | Page |
|-------|------|
| `/subs` | Sub list with search + filters |
| `/subs/[id]` | Expanded sub detail |
| `/subs/[id]/badges` | Badge detail page |
| `/subs/[id]/media` | Sub-specific media |
| `/subs/[id]/ratings` | Detailed ratings |
| `/subs/[id]/behavior` | Behavior score breakdown |
| `/subs/[id]/contracts` | Contract detail |

### Search & Filtering

Query params on `/api/subs`:
- `q` — full-text search on name, contact, notes
- `sub_type` — filter by submissive type (multi-value)
- `arrangement_type` — filter by arrangement (multi-value)
- `tags` — filter by custom tags
- `financial_min` / `financial_max` — financial contribution range
- `sort` — field to sort by
- `order` — `asc` or `desc`

---

## Feature Set 3: Financial Tracking

### Overview

Unified financial ledger. Each entry can optionally link to a sub. Sub-linked entries auto-aggregate into sub profiles and dashboard. Supports in-app vs. out-of-app toggle filtering.

### Data Model — Fields

| Field | DB Column | Type | Input Type |
|-------|-----------|------|------------|
| ID | `id` | `String (cuid)` | Auto |
| Amount | `amount` | `Decimal` | Number input |
| Currency | `currency` | `String` | Dropdown (USD, EUR, GBP, CAD, AUD, etc.) |
| Category | `category` | `String` | Dropdown + custom (Tribute, Gift, Session, Tip, Task Payment, Custom) |
| Payment Method | `payment_method` | `String?` | Dropdown (CashApp, Venmo, PayPal, Crypto, Bank Transfer, Custom) |
| Notes | `notes` | `String?` | Textarea |
| Date | `date` | `DateTime` | Auto-populated on creation, editable |
| Sub Link | `sub_id` | `String?` | Dropdown (select from sub list, optional) |
| Is In-App | `is_in_app` | `Boolean` | Toggle (derived: true if sub_id is set, or manually toggled) |
| Owner | `user_id` | `String` | FK → User |
| Created At | `created_at` | `DateTime` | Auto |
| Updated At | `updated_at` | `DateTime` | Auto |

### Aggregation

- **Per-sub total**: `SUM(amount) WHERE sub_id = X` — displayed on sub profile
- **Global total**: `SUM(amount) WHERE user_id = X` — displayed on dashboard
- **Filtered totals**: By day/week/month/year, by sub, by category, by payment method

### Filters

| Filter | Type | Options |
|--------|------|---------|
| Time range | Preset + custom | Day, Week, Month, Year, Custom range |
| Sub | Dropdown | All subs + "Unlinked" |
| Category | Multi-select | All categories |
| Payment Method | Multi-select | All methods |
| In-app / Out-of-app | Toggle | Both, In-app only, Out-of-app only |

### Summary Stats (displayed at top of page + dashboard)

- Total earnings (filtered)
- Total per sub (top earners list)
- Average per entry
- Count of entries
- Breakdown by category (pie/bar chart)
- Trend over time (line chart)

### Export

- Export with all active filters applied
- Formats: CSV, PDF
- Includes: date, amount, currency, category, payment method, sub name, notes

### API Routes

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/financials` | List entries with filters |
| POST | `/api/financials` | Create entry |
| PATCH | `/api/financials/[id]` | Update entry |
| DELETE | `/api/financials/[id]` | Delete entry |
| GET | `/api/financials/summary` | Aggregated summary stats |
| POST | `/api/financials/export` | Export filtered data |

### Pages

| Route | Page |
|-------|------|
| `/financials` | Main financial tracking page (list + summary + filters) |

---

## Feature Set 4: Creation Hub

### Overview

Text-based project/notes organizer with categories. Serves as an idea library that integrates with the task system via "convert to task" functionality.

### Data Model

#### Category

| Field | DB Column | Type | Notes |
|-------|-----------|------|-------|
| ID | `id` | `String (cuid)` | PK |
| Name | `name` | `String` | Required |
| Owner | `user_id` | `String` | FK → User |
| Order | `sort_order` | `Int` | For manual sorting |
| Created At | `created_at` | `DateTime` | Auto |

Default categories seeded on account creation: "Content Creation Ideas", "Contract Ideas", "Session Ideas", "General"

#### Project

| Field | DB Column | Type | Notes |
|-------|-----------|------|-------|
| ID | `id` | `String (cuid)` | PK |
| Name | `name` | `String` | Required |
| Description | `description` | `String?` | Optional |
| Category | `category_id` | `String` | FK → Category |
| Owner | `user_id` | `String` | FK → User |
| Created At | `created_at` | `DateTime` | Auto |
| Updated At | `updated_at` | `DateTime` | Auto |

#### Note (within a project)

| Field | DB Column | Type | Notes |
|-------|-----------|------|-------|
| ID | `id` | `String (cuid)` | PK |
| Title | `title` | `String?` | Optional |
| Content | `content` | `String` | Text content (rich text stored as HTML or Markdown) |
| Project | `project_id` | `String` | FK → Project |
| Owner | `user_id` | `String` | FK → User |
| Order | `sort_order` | `Int` | For manual sorting within project |
| Reminder Date | `reminder_at` | `DateTime?` | Optional reminder |
| Created At | `created_at` | `DateTime` | Auto |
| Updated At | `updated_at` | `DateTime` | Auto |

### API Routes

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/hub/categories` | List categories |
| POST | `/api/hub/categories` | Create category |
| PATCH | `/api/hub/categories/[id]` | Rename category |
| DELETE | `/api/hub/categories/[id]` | Delete category (reassign projects first) |
| GET | `/api/hub/projects` | List projects (filterable by category) |
| POST | `/api/hub/projects` | Create project |
| PATCH | `/api/hub/projects/[id]` | Update project |
| DELETE | `/api/hub/projects/[id]` | Delete project (cascade notes) |
| GET | `/api/hub/projects/[id]/notes` | Get notes in project |
| POST | `/api/hub/projects/[id]/notes` | Create note |
| PATCH | `/api/hub/notes/[id]` | Update note |
| DELETE | `/api/hub/notes/[id]` | Delete note |
| POST | `/api/hub/notes/[id]/convert-to-task` | Convert note → task |

### Pages

| Route | Page |
|-------|------|
| `/hub` | Main hub — category sidebar + project list |
| `/hub/projects/[id]` | Project detail with notes |
| `/hub/categories` | Category management screen |

---

## Feature Set 5: Task Management System

### Overview

Full task system with subtasks, dependencies, recurring tasks, and multiple views. Integrates with Creation Hub (project linking) and Calendar.

### Data Model

#### Task

| Field | DB Column | Type | Input Type |
|-------|-----------|------|------------|
| ID | `id` | `String (cuid)` | Auto |
| Title | `title` | `String` | Text input |
| Description | `description` | `String?` | Textarea (rich text) |
| Project Link | `project_id` | `String?` | Dropdown (from Creation Hub projects) |
| Tags | `tags` | `String[]` | Tag input |
| Deadline | `deadline` | `DateTime?` | Date + time picker |
| Priority | `priority` | `Enum` | Select: LOW, MEDIUM, HIGH |
| Status | `status` | `Enum` | Select: NOT_STARTED, IN_PROGRESS, WAITING, COMPLETED, ARCHIVED |
| Recurrence Rule | `recurrence_rule` | `String?` | Select: DAILY, WEEKLY, MONTHLY, CUSTOM (stored as RRULE string) |
| Recurrence End | `recurrence_end` | `DateTime?` | Date picker |
| Reminder Offset | `reminder_minutes` | `Int?` | Select: 5, 15, 30, 60, 1440 minutes before deadline |
| Owner | `user_id` | `String` | FK → User |
| Parent Task (dependency) | `depends_on_id` | `String?` | FK → Task (self-referential) |
| Source Note | `source_note_id` | `String?` | FK → Note (if converted from hub) |
| Completed At | `completed_at` | `DateTime?` | Auto when status → COMPLETED |
| Created At | `created_at` | `DateTime` | Auto |
| Updated At | `updated_at` | `DateTime` | Auto |

#### Subtask

| Field | DB Column | Type | Notes |
|-------|-----------|------|-------|
| ID | `id` | `String (cuid)` | PK |
| Title | `title` | `String` | Required |
| Is Complete | `is_complete` | `Boolean` | Default false |
| Order | `sort_order` | `Int` | Manual sort |
| Task | `task_id` | `String` | FK → Task |

#### TaskDependency (many-to-many)

| Field | DB Column | Type | Notes |
|-------|-----------|------|-------|
| Task ID | `task_id` | `String` | FK → Task |
| Depends On | `depends_on_id` | `String` | FK → Task |

### Views

1. **Dashboard / List View**: Filterable table of all tasks with sort by project, priority, status, date range
2. **Timeline View**: Horizontal timeline with tasks plotted by deadline, color-coded by priority
3. **Calendar View**: Month/week/day calendar grid showing tasks by due date (shared with Calendar feature)

### Bulk Actions

- Select multiple tasks → Mark complete
- Select multiple tasks → Archive
- Select multiple tasks → Delete (permanent, with confirmation)

### Recurring Task Logic

When a recurring task is completed, the system auto-creates the next occurrence based on the RRULE. The completed instance is kept in history. Implemented via a server action or cron job.

### API Routes

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/tasks` | List tasks with filters |
| POST | `/api/tasks` | Create task |
| GET | `/api/tasks/[id]` | Get task detail + subtasks |
| PATCH | `/api/tasks/[id]` | Update task |
| DELETE | `/api/tasks/[id]` | Delete task |
| POST | `/api/tasks/[id]/subtasks` | Add subtask |
| PATCH | `/api/tasks/subtasks/[id]` | Toggle/update subtask |
| DELETE | `/api/tasks/subtasks/[id]` | Delete subtask |
| POST | `/api/tasks/bulk` | Bulk action (complete, archive, delete) |

### Pages

| Route | Page |
|-------|------|
| `/tasks` | Main task dashboard (list view, filters) |
| `/tasks/timeline` | Timeline view |
| `/tasks/calendar` | Calendar view |
| `/tasks/[id]` | Task detail page |

---

## Feature Set 6: Calendar Integration

### Overview

Dedicated in-app calendar that aggregates tasks, reminders, and standalone events. One-way sync to external calendars (Google, Apple). External events do not sync back.

### Data Model

#### CalendarEvent

| Field | DB Column | Type | Notes |
|-------|-----------|------|-------|
| ID | `id` | `String (cuid)` | PK |
| Title | `title` | `String` | Required |
| Description | `description` | `String?` | Optional |
| Start Time | `start_at` | `DateTime` | Required |
| End Time | `end_at` | `DateTime?` | Optional (all-day if null) |
| Is All Day | `is_all_day` | `Boolean` | Default false |
| Color | `color` | `String?` | Hex color for visual coding |
| Category | `category` | `String?` | User-defined category label |
| Recurrence Rule | `recurrence_rule` | `String?` | RRULE string |
| Source Type | `source_type` | `Enum` | STANDALONE, TASK, REMINDER |
| Source ID | `source_id` | `String?` | FK → Task or Note (polymorphic) |
| External Sync ID | `external_sync_id` | `String?` | Google/Apple event ID for sync tracking |
| Timezone | `timezone` | `String` | IANA timezone |
| Owner | `user_id` | `String` | FK → User |
| Created At | `created_at` | `DateTime` | Auto |
| Updated At | `updated_at` | `DateTime` | Auto |

### Sync Logic

- When a task with a deadline is created/updated → upsert CalendarEvent with `source_type = TASK`
- When a note reminder is created/updated → upsert CalendarEvent with `source_type = REMINDER`
- Standalone events created directly on calendar → `source_type = STANDALONE`
- One-way push to Google Calendar API / Apple CalDAV on create/update/delete
- Store `external_sync_id` to track synced events for updates and deletions

### External Calendar Setup

- Google: OAuth consent flow → store refresh token → use Google Calendar API v3
- Apple: CalDAV protocol with app-specific password or OAuth

### API Routes

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/calendar/events` | List events (date range filter) |
| POST | `/api/calendar/events` | Create standalone event |
| PATCH | `/api/calendar/events/[id]` | Update event |
| DELETE | `/api/calendar/events/[id]` | Delete event |
| POST | `/api/calendar/sync/google` | Initiate Google Calendar sync |
| POST | `/api/calendar/sync/apple` | Initiate Apple Calendar sync |
| GET | `/api/calendar/sync/status` | Check sync status |

### Pages

| Route | Page |
|-------|------|
| `/calendar` | Full calendar view (month/week/day toggle) |
| `/settings/calendar` | External calendar connection management |

---

## Feature Set 7: Dashboard

### Overview

Read-only aggregation layer. Pulls summary data from all other features. Built last because it depends on everything else, but can be built iteratively as features ship.

### Widgets

| Widget | Data Source | Description |
|--------|------------|-------------|
| Financial Summary | FinancialEntry | Total earnings, this week/month, top subs |
| Sub Overview | SubProfile | Total subs, recently added, active arrangements |
| Task Summary | Task | Overdue count, in-progress, completed this week |
| Upcoming Events | CalendarEvent | Next 7 days of events/deadlines |
| Recent Activity | Multiple | Latest financial entries, task completions, notes |
| Quick Actions | N/A | Buttons: Add Sub, New Entry, Create Task |

### API Routes

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/dashboard` | Aggregated dashboard data |

### Pages

| Route | Page |
|-------|------|
| `/dashboard` | Main dashboard (home page after login) |

---

## Notification System (Cross-cutting)

### Data Model

#### Notification

| Field | DB Column | Type | Notes |
|-------|-----------|------|-------|
| ID | `id` | `String (cuid)` | PK |
| Title | `title` | `String` | Notification headline |
| Body | `body` | `String?` | Detail text |
| Type | `type` | `Enum` | TASK_DUE, REMINDER, RECURRING_TASK, SYSTEM |
| Is Read | `is_read` | `Boolean` | Default false |
| Link | `link_url` | `String?` | Deep link to relevant page |
| Source Type | `source_type` | `String?` | task, note, event |
| Source ID | `source_id` | `String?` | ID of source record |
| Owner | `user_id` | `String` | FK → User |
| Created At | `created_at` | `DateTime` | Auto |

### Delivery

- V1: In-app notification bell with unread count, polling every 30s or via SSE
- Future: Web push notifications, email digests

---

## Complete Database Schema (Prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================================
// AUTH & USER
// ============================================================

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String?
  name          String?
  role          UserRole  @default(DOMME)
  timezone      String    @default("UTC")
  avatarUrl     String?
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  // Auth relations
  accounts      Account[]
  sessions      Session[]

  // Owned data
  subProfiles       SubProfile[]
  financialEntries  FinancialEntry[]
  categories        Category[]
  projects          Project[]
  notes             Note[]
  tasks             Task[]
  subtasks          Subtask[]
  calendarEvents    CalendarEvent[]
  notifications     Notification[]
  badges            Badge[]
  mediaItems        MediaItem[]
  ratings           Rating[]
  behaviorScores    BehaviorScore[]
  contracts         Contract[]
  externalCalendars ExternalCalendar[]

  @@map("users")
}

enum UserRole {
  DOMME
  SUB
}

model Account {
  id                String  @id @default(cuid())
  userId            String  @map("user_id")
  type              String
  provider          String
  providerAccountId String  @map("provider_account_id")
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique @map("session_token")
  userId       String   @map("user_id")
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
  @@map("verification_tokens")
}

// ============================================================
// SUB PROFILES
// ============================================================

model SubProfile {
  id        String @id @default(cuid())
  userId    String @map("user_id")

  // Main visible fields
  fullName        String   @map("full_name")
  contactInfo     String?  @map("contact_info")
  arrangementType String[] @map("arrangement_type")  // Multi-select values
  subType         String[] @map("sub_type")           // Multi-select values
  timezone        String?
  softLimits      String[] @map("soft_limits")        // Tag array
  hardLimits      String[] @map("hard_limits")        // Tag array

  // Advanced fields
  birthday         DateTime?
  country          String?
  occupation       String?
  workSchedule     String?  @map("work_schedule")
  financialLimits  String?  @map("financial_limits")
  expendableIncome String?  @map("expendable_income")
  preferences      String[]                           // Tag array (kinks, experiences)
  bestExperiences  String?  @map("best_experiences")
  worstExperiences String?  @map("worst_experiences")
  personalityNotes String?  @map("personality_notes")
  healthNotes      String?  @map("health_notes")
  obedienceHistory String?  @map("obedience_history")

  // System fields
  avatarUrl    String?  @map("avatar_url")
  tags         String[]
  privateNotes String?  @map("private_notes")
  isArchived   Boolean  @default(false) @map("is_archived")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  // Relations
  user             User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  financialEntries FinancialEntry[]
  badges           Badge[]
  mediaItems       MediaItem[]
  ratings          Rating[]
  behaviorScores   BehaviorScore[]
  contracts        Contract[]

  @@index([userId])
  @@index([userId, fullName])
  @@map("sub_profiles")
}

// ============================================================
// SUB PROFILE LINKED SECTIONS
// ============================================================

model Badge {
  id          String   @id @default(cuid())
  userId      String   @map("user_id")
  subId       String   @map("sub_id")
  name        String
  description String?
  icon        String?                        // Icon identifier or emoji
  color       String?                        // Hex color
  earnedAt    DateTime @default(now()) @map("earned_at")
  createdAt   DateTime @default(now()) @map("created_at")

  user User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  sub  SubProfile @relation(fields: [subId], references: [id], onDelete: Cascade)

  @@index([subId])
  @@map("badges")
}

model MediaItem {
  id          String    @id @default(cuid())
  userId      String    @map("user_id")
  subId       String    @map("sub_id")
  title       String?
  description String?
  fileUrl     String    @map("file_url")     // S3 path
  fileType    String    @map("file_type")     // image, video, audio, document
  mimeType    String?   @map("mime_type")
  fileSize    Int?      @map("file_size")     // bytes
  tags        String[]
  createdAt   DateTime  @default(now()) @map("created_at")

  user User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  sub  SubProfile @relation(fields: [subId], references: [id], onDelete: Cascade)

  @@index([subId])
  @@map("media_items")
}

model Rating {
  id          String   @id @default(cuid())
  userId      String   @map("user_id")
  subId       String   @map("sub_id")
  overall     Int                              // 1-10 or 1-5
  categories  Json?                            // { obedience: 8, communication: 7, ... }
  notes       String?
  ratedAt     DateTime @default(now()) @map("rated_at")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  user User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  sub  SubProfile @relation(fields: [subId], references: [id], onDelete: Cascade)

  @@index([subId])
  @@map("ratings")
}

model BehaviorScore {
  id          String   @id @default(cuid())
  userId      String   @map("user_id")
  subId       String   @map("sub_id")
  overall     Int                              // Composite score
  breakdown   Json?                            // { obedience: 9, punctuality: 7, attitude: 8, ... }
  notes       String?
  scoredAt    DateTime @default(now()) @map("scored_at")
  createdAt   DateTime @default(now()) @map("created_at")

  user User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  sub  SubProfile @relation(fields: [subId], references: [id], onDelete: Cascade)

  @@index([subId])
  @@map("behavior_scores")
}

model Contract {
  id          String         @id @default(cuid())
  userId      String         @map("user_id")
  subId       String         @map("sub_id")
  title       String
  content     String                            // Rich text / HTML
  status      ContractStatus @default(DRAFT)
  startDate   DateTime?      @map("start_date")
  endDate     DateTime?      @map("end_date")
  fileUrl     String?        @map("file_url")   // Optional PDF upload
  createdAt   DateTime       @default(now()) @map("created_at")
  updatedAt   DateTime       @updatedAt @map("updated_at")

  user User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  sub  SubProfile @relation(fields: [subId], references: [id], onDelete: Cascade)

  @@index([subId])
  @@map("contracts")
}

enum ContractStatus {
  DRAFT
  ACTIVE
  EXPIRED
  TERMINATED
}

// ============================================================
// FINANCIAL TRACKING
// ============================================================

model FinancialEntry {
  id            String   @id @default(cuid())
  userId        String   @map("user_id")
  subId         String?  @map("sub_id")       // Optional link to sub
  amount        Decimal  @db.Decimal(12, 2)
  currency      String   @default("USD")
  category      String                         // Tribute, Gift, Session, Tip, etc.
  paymentMethod String?  @map("payment_method")
  notes         String?
  date          DateTime @default(now())
  isInApp       Boolean  @default(true) @map("is_in_app")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  user User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  sub  SubProfile? @relation(fields: [subId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([userId, date])
  @@index([userId, subId])
  @@index([userId, category])
  @@map("financial_entries")
}

// ============================================================
// CREATION HUB
// ============================================================

model Category {
  id        String   @id @default(cuid())
  userId    String   @map("user_id")
  name      String
  sortOrder Int      @default(0) @map("sort_order")
  createdAt DateTime @default(now()) @map("created_at")

  user     User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  projects Project[]

  @@index([userId])
  @@map("categories")
}

model Project {
  id          String   @id @default(cuid())
  userId      String   @map("user_id")
  categoryId  String   @map("category_id")
  name        String
  description String?
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  category Category @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  notes    Note[]
  tasks    Task[]

  @@index([userId])
  @@index([categoryId])
  @@map("projects")
}

model Note {
  id         String    @id @default(cuid())
  userId     String    @map("user_id")
  projectId  String    @map("project_id")
  title      String?
  content    String
  sortOrder  Int       @default(0) @map("sort_order")
  reminderAt DateTime? @map("reminder_at")
  createdAt  DateTime  @default(now()) @map("created_at")
  updatedAt  DateTime  @updatedAt @map("updated_at")

  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  tasks   Task[]  @relation("SourceNote")

  @@index([projectId])
  @@map("notes")
}

// ============================================================
// TASK MANAGEMENT
// ============================================================

model Task {
  id              String       @id @default(cuid())
  userId          String       @map("user_id")
  title           String
  description     String?
  projectId       String?      @map("project_id")
  tags            String[]
  deadline        DateTime?
  priority        TaskPriority @default(MEDIUM)
  status          TaskStatus   @default(NOT_STARTED)
  recurrenceRule  String?      @map("recurrence_rule")   // RRULE string
  recurrenceEnd   DateTime?    @map("recurrence_end")
  reminderMinutes Int?         @map("reminder_minutes")
  sourceNoteId    String?      @map("source_note_id")
  completedAt     DateTime?    @map("completed_at")
  createdAt       DateTime     @default(now()) @map("created_at")
  updatedAt       DateTime     @updatedAt @map("updated_at")

  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  project    Project? @relation(fields: [projectId], references: [id], onDelete: SetNull)
  sourceNote Note?    @relation("SourceNote", fields: [sourceNoteId], references: [id], onDelete: SetNull)

  subtasks      Subtask[]
  dependsOn     TaskDependency[] @relation("TaskDependsOn")
  dependedOnBy  TaskDependency[] @relation("TaskDependedOnBy")
  calendarEvent CalendarEvent?   @relation("TaskEvent")

  @@index([userId])
  @@index([userId, status])
  @@index([userId, deadline])
  @@index([projectId])
  @@map("tasks")
}

enum TaskPriority {
  LOW
  MEDIUM
  HIGH
}

enum TaskStatus {
  NOT_STARTED
  IN_PROGRESS
  WAITING
  COMPLETED
  ARCHIVED
}

model Subtask {
  id         String  @id @default(cuid())
  userId     String  @map("user_id")
  taskId     String  @map("task_id")
  title      String
  isComplete Boolean @default(false) @map("is_complete")
  sortOrder  Int     @default(0) @map("sort_order")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  task Task @relation(fields: [taskId], references: [id], onDelete: Cascade)

  @@index([taskId])
  @@map("subtasks")
}

model TaskDependency {
  id          String @id @default(cuid())
  taskId      String @map("task_id")
  dependsOnId String @map("depends_on_id")

  task      Task @relation("TaskDependsOn", fields: [taskId], references: [id], onDelete: Cascade)
  dependsOn Task @relation("TaskDependedOnBy", fields: [dependsOnId], references: [id], onDelete: Cascade)

  @@unique([taskId, dependsOnId])
  @@map("task_dependencies")
}

// ============================================================
// CALENDAR
// ============================================================

model CalendarEvent {
  id             String          @id @default(cuid())
  userId         String          @map("user_id")
  title          String
  description    String?
  startAt        DateTime        @map("start_at")
  endAt          DateTime?       @map("end_at")
  isAllDay       Boolean         @default(false) @map("is_all_day")
  color          String?
  category       String?
  recurrenceRule String?         @map("recurrence_rule")
  sourceType     EventSourceType @default(STANDALONE) @map("source_type")
  sourceTaskId   String?         @unique @map("source_task_id")
  externalSyncId String?         @map("external_sync_id")
  timezone       String          @default("UTC")
  createdAt      DateTime        @default(now()) @map("created_at")
  updatedAt      DateTime        @updatedAt @map("updated_at")

  user       User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  sourceTask Task? @relation("TaskEvent", fields: [sourceTaskId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([userId, startAt])
  @@map("calendar_events")
}

enum EventSourceType {
  STANDALONE
  TASK
  REMINDER
}

model ExternalCalendar {
  id           String   @id @default(cuid())
  userId       String   @map("user_id")
  provider     String                          // google, apple
  accessToken  String?  @map("access_token")
  refreshToken String?  @map("refresh_token")
  calendarId   String?  @map("calendar_id")    // Target calendar on provider
  isActive     Boolean  @default(true) @map("is_active")
  lastSyncAt   DateTime? @map("last_sync_at")
  createdAt    DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, provider])
  @@map("external_calendars")
}

// ============================================================
// NOTIFICATIONS
// ============================================================

model Notification {
  id         String           @id @default(cuid())
  userId     String           @map("user_id")
  title      String
  body       String?
  type       NotificationType
  isRead     Boolean          @default(false) @map("is_read")
  linkUrl    String?          @map("link_url")
  sourceType String?          @map("source_type")
  sourceId   String?          @map("source_id")
  createdAt  DateTime         @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isRead])
  @@index([userId, createdAt])
  @@map("notifications")
}

enum NotificationType {
  TASK_DUE
  REMINDER
  RECURRING_TASK
  SYSTEM
}
```

---

## Entity Relationship Summary

```
User (1) ──── (N) SubProfile
                    ├── (N) Badge
                    ├── (N) MediaItem
                    ├── (N) Rating
                    ├── (N) BehaviorScore
                    ├── (N) Contract
                    └── (N) FinancialEntry (optional link)

User (1) ──── (N) FinancialEntry ──── (0..1) SubProfile

User (1) ──── (N) Category ──── (N) Project ──── (N) Note

User (1) ──── (N) Task ──── (N) Subtask
                    ├── (0..1) Project
                    ├── (0..1) Note (source)
                    ├── (N) TaskDependency
                    └── (0..1) CalendarEvent

User (1) ──── (N) CalendarEvent ──── (0..1) Task
User (1) ──── (N) Notification
User (1) ──── (N) ExternalCalendar
```

---

## Key Architecture Decisions

### 1. All Data Scoped to User
Every query includes a `WHERE userId = currentUser.id` clause. This is enforced at the Prisma middleware level or via a base query helper. This is critical for privacy — a domme never sees another domme's data.

### 2. Future Sub Account Expansion
The `UserRole` enum and the `SubProfile` model are designed so that in the future, a sub can create their own `User` account with role `SUB`. A new `DynamicLink` junction table can connect `User (SUB)` ↔ `SubProfile` when both parties confirm the relationship. The domme's private fields (notes, scores, financials) remain invisible to the sub.

### 3. Soft Delete / Archive Pattern
Sub profiles and tasks support `isArchived` / `ARCHIVED` status. Actual deletion is a separate destructive action requiring confirmation. Financial entries are hard-deleted since they have export capability.

### 4. Financial Aggregation
Financial totals on sub profiles are computed on-read via `SUM()` queries, not stored as denormalized fields. This ensures consistency. If performance becomes an issue, a materialized view or cached aggregation can be added later.

### 5. Calendar Event Sync
CalendarEvents are the single source of truth. Tasks and reminders create/update CalendarEvents via server-side hooks. A background job handles pushing changes to external calendars.

### 6. RRULE for Recurrence
Both tasks and calendar events use the iCalendar RRULE standard for recurrence. This makes external calendar sync straightforward and leverages existing libraries (`rrule.js`).

---

## Migration Order

Run `npx prisma migrate dev` after each feature set is built:

| Migration | Tables Created |
|-----------|---------------|
| `001_auth` | users, accounts, sessions, verification_tokens |
| `002_sub_profiles` | sub_profiles, badges, media_items, ratings, behavior_scores, contracts |
| `003_financials` | financial_entries |
| `004_creation_hub` | categories, projects, notes |
| `005_tasks` | tasks, subtasks, task_dependencies |
| `006_calendar` | calendar_events, external_calendars |
| `007_notifications` | notifications |
