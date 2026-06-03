# Vaultocrypt Plan

## Summary

Vaultocrypt v1 is an internal-only web app for MetaBox Technology to manage project credentials and secure notes in one place. The product is project-first, cloud-hosted, built as a `Next.js` full-stack app, and optimized for a simple daily workflow: sign in, find a project, access a record, reveal or copy the secret safely, and update it when needed.

The goal of v1 is not public SaaS readiness. The goal is real weekly internal usage by the MetaBox team with strong security defaults, clean UX, and a practical operational foundation.

Current state note (as of 2026-06-03):
- Core data flows are wired to the real Neon/Postgres database (projects, records, categories, import)
- `src/lib/mock-data.ts` deleted — `RecordItem` and `RecordFormInput` defined in component layer
- Import is wired end-to-end: CSV → dialog → `importClients` server action → DB
- Category system is live: dynamic categories, rename/delete, drag-and-drop organisation
- Move is live: bulk move projects (button + drag), move records (two-step dialog)
- Audit event capture is live: all mutations write to AuditEvent; audit trail on project pages with click-to-reveal actor email and GMT+4 timestamps; Admins can reveal old record values per update event
- Search is live: shell header search filters project directory by name and records by title/service (3+ chars)
- All dialogs have inline error feedback
- Role system is live: two roles (Admin / User); first sign-in auto-promotes to Admin if no admin exists
- Category-scoped access: non-admins only see categories assigned to them via Manage Users modal on each category page
- Settings > Admins: add/remove admins by email; Clerk name lookup pre-fills name on add
- Migration-grade export and advanced import mapping are still outstanding

## Product Rules

- [x] Internal MetaBox use only in v1
- [x] No client login in v1
- [x] No multi-tenant SaaS architecture in v1
- [x] `Project` is the top-level business object
- [x] Projects are organised into dynamic categories (default: `Clients`, `Internal`; user can add more)
- [x] Records belong directly to a project
- [x] Supported record types in v1: `credential`, `secure_note`
- [x] Default visibility is mostly shared internally, with restricted exceptions
- [x] Secret values are hidden by default and only exposed by explicit reveal or copy actions
- [x] Use server-managed encryption for secret-bearing fields
- [x] Use `Clerk` with email/password to start
- [x] Manual testing only for now

## UI/UX Direction

- [x] Base the UI on `shadcn` Luma preset:
  `pnpm dlx shadcn@latest init --preset b6nWBwrEtW --template next`
- [x] Overall feel: modern secure, enterprise polished
- [x] Brand presence: subtle and professional
- [x] Density: comfortable
- [x] Navigation: left sidebar app shell with dynamic category sections
- [x] Main sections: dynamic categories (Clients, Internal, + user-created), `Activity`, `Settings`
- [x] Main landing screen after login: project directory
- [x] Project detail page: lean project header with basic details, then records immediately
- [x] Project detail header fields currently shown: name, primary contact, vertical, status, category
- [x] Record presentation: table/list hybrid
- [x] Primary record actions: `Reveal`, `Copy`, `Edit`, `Move`
- [x] Drag-and-drop project organisation via grip handle (directory) and full row (sidebar)
- [x] Create/edit flows: modal dialogs
- [x] Search: prominent secondary tool
- [x] Motion: more expressive than average SaaS, but still purposeful
- [x] Security cues: highly visible
- [x] Mobile support: strong responsive behavior from the start

## Phase 1: Foundation And Setup

### Tasks

- [x] Create the `Next.js` app with TypeScript, Tailwind, and App Router
- [x] Install and apply the `shadcn` Luma preset
- [x] Establish a clean base layout and route structure
- [x] Add project-level configuration for environment variables
- [x] Add placeholder auth boundary structure for future `Clerk` integration
- [x] Prepare a basic design-token friendly CSS foundation using the preset

### Deliverables

- [x] Bootstrapped app running locally
- [x] Shared layout shell in place
- [x] Preset-based styling foundation installed
- [x] Initial folder structure ready for feature work

## Phase 2: App Shell And Navigation

### Tasks

- [x] Build the authenticated app shell with a left sidebar
- [x] Create sidebar destinations for categories, `Activity`, and `Settings`
- [x] Build responsive behavior for desktop and mobile navigation
- [x] Add empty states for first-use flows
- [x] Add polished page framing and state transitions
- [x] Dynamic category sections in sidebar with expand/collapse and optimistic add

### Deliverables

- [x] Consistent application shell
- [x] Responsive navigation
- [x] Placeholder pages for all primary sections
- [x] Sidebar auto-opens the active category section

## Phase 3: Authentication And Roles

### Tasks

- [x] Integrate `Clerk` with email/password authentication
- [x] Protect authenticated routes
- [x] Define v1 roles: `Admin`, `Project Manager`, `User`
- [x] Add basic role-aware UI visibility rules (Admin vs User; destructive/structural actions hidden for Users)
- [x] Establish an internal authorization layer for role checks (getCurrentRole + RoleContext)

### Deliverables

- [x] Working sign-in and protected app routes
- [x] Role model available in app logic
- [x] Simple access-aware UI states (category-scoped access for non-admins)

## Phase 4: Data Model And Security Core

### Tasks

- [x] Define the initial database schema
- [x] Create core entities:
  `User`, `Category`, `Project`, `Record`, `Tag`, `AuditEvent`
- [x] Define v1 record fields:
  `title`, `service_name`, `url`, `username`, `secret_value`, `notes`, `tags`, timestamps, actor metadata
- [x] Add encryption helpers for secret-bearing fields
- [x] Separate standard record reads from reveal/copy actions
- [x] Define audit event types for sensitive actions

### Deliverables

- [x] Schema pushed to Neon/Postgres and live
- [x] Encryption utilities in place (AES-256-GCM, `src/lib/crypto.ts`)
- [x] Audit model ready for feature integration
- [x] `Category` model live; default categories auto-seeded (`Clients`, `Internal`)

## Phase 5: Project Directory And Project Pages

### Tasks

- [x] Build the project directory as the authenticated home screen
- [x] Show project name and core details in each row/card
- [x] Support create and edit project flows wired to real DB
- [x] Build the lean project detail header
- [x] Build the project records section as the main page body
- [x] Support restricted-project markers for exceptional privacy cases
- [x] Add bulk multi-select in the project directory
- [x] Add local CSV export for selected projects
- [x] Add bulk delete flow for selected projects (server action, with confirmation)
- [x] Add bulk Move flow — move selected projects to a different category (server action)
- [x] Simplify project status UI to `Active` / `Inactive`
- [x] Category picker on project create and project edit
- [x] Category pages at `/categories/[categoryId]` rendering filtered project directory
- [x] Sidebar shows all categories dynamically; clicking category name navigates to its page
- [x] Category rename and delete from the category page header (Rename always available; Delete hidden for default categories)
- [x] Drag-and-drop to move projects between categories — grip handle on directory cards, full row drag on sidebar project links; sidebar category rows are drop zones
- [x] Sidebar category icons show spinner during a drag-move; cleared only once refreshed data arrives

### Deliverables

- [x] Usable project directory backed by real DB
- [x] Project detail page structure
- [x] Project creation and editing flows (real DB)
- [x] Project detail audit sidebar with aligned dashboard layout
- [x] Selectable project directory with bulk export, move, and delete actions
- [x] Drag-and-drop project organisation (grip handle on cards; sidebar rows as drop zones)
- [x] Category rename and delete on category pages

## Phase 6: Record Management

### Tasks

- [x] Build record listing inside each project (real DB)
- [x] Support create, edit, and delete for `credential` and `secure_note` (real DB)
- [x] Keep secret values hidden by default everywhere
- [x] Add explicit `Reveal` action with visible security treatment
- [x] Add explicit `Copy` action with visible feedback
- [x] Add `Move` action — two-step dialog: pick category → pick project → `moveRecord` server action
- [ ] Add lightweight tag support
- [x] Add search and filtering for records (and project directory) via shell header search bar

### Deliverables

- [x] Full v1 record CRUD wired to real DB
- [x] Secure reveal/copy workflow
- [x] Move record between projects (two-step dialog, server action)
- [x] Practical record organization and lookup (search by title/service)

## Phase 7: Activity And Settings

### Tasks

- [x] Build the activity view for audit history
- [x] Capture required events: create, update, delete (projects + records), reveal secret, copy secret
- [ ] Capture remaining events: login, failed login, role change, restriction change
- [x] Build settings surface for theme and future role controls
- [ ] Add restriction management for sensitive projects or records
- [x] Show record freshness details such as last updated by and when
- [x] Refine dashboard shell height, scrolling, and balanced settings cards

### Deliverables

- [x] Visible audit trail with real events, actor names, click-to-reveal email, GMT+4 timestamps
- [x] Basic settings controls
- [ ] Restriction support for exceptions
- [x] Polished dashboard scrolling and balanced settings layout

## Phase 8: Import / Export And Migration Readiness

### Agreed Migration Direction

- [x] Zoho Vault CSV has been reviewed manually
- [x] Import should not hardcode field mapping
- [x] User wants an import tool with a mapping step they control
- [x] Final verification workflow will be:
  export from Zoho -> import into Vaultocrypt -> export from Vaultocrypt -> compare both files
- [x] Folder semantics should resolve into categories (`Clients`, `Internal`, or user-created)
- [x] We do not need to preserve `Description`, `Tags`, `Classification`, `Favorite`, or raw `Folder Name` as first-class product fields

### Current Reality

- [x] There is an import UI entry point in the project directory
- [x] There is a CSV parser foundation
- [x] There is a CSV preview dialog
- [x] Import is wired end-to-end: dialog → `importClients` server action → DB write
- [x] There is no saved mapping preset system yet
- [x] Current export is only the local bulk project CSV from the project directory
- [x] Current export is not sufficient for migration verification

### Required Import Tool Capabilities

- [x] Upload CSV file
- [x] Parse headers and rows safely
- [x] Let the user map source columns to Vaultocrypt fields
- [ ] Let the user define how source rows become which category (`Clients`, `Internal`, etc.)
- [x] Provide a preview before import
- [ ] Surface duplicate / conflict conditions before import
- [x] Persist imported data into the real database
- [ ] Store enough import provenance metadata to support validation and troubleshooting

### Required Export Capabilities

- [ ] Rework export around full record-level data, not only selected projects
- [ ] Add a migration-verification export mode
- [ ] Export deterministic row structure suitable for file-to-file comparison
- [ ] Include enough fields to validate imported records correctly
- [ ] Decide whether secret export should be allowed, masked, or optional

### Proposed Verification Export Scope

- [ ] Category name
- [ ] Project name
- [ ] Record title
- [ ] URL
- [ ] Username
- [ ] Notes
- [ ] Record type
- [ ] Status
- [ ] Optional source/import metadata for debugging

### Deliverables

- [ ] User-controlled import mapping tool with category routing
- [x] Preview-first import workflow with mapping and execution
- [ ] Migration-grade export
- [ ] Round-trip verification process against Zoho export

## UX Standards

These are non-negotiable rules applied to every interactive surface in the app.
Any new feature must satisfy all of them before it is considered done.

### Loading States

- [x] **Page navigation** — top loader bar (`nextjs-toploader`) fires on every route change. No spinner, 2px height, brand cyan.
- [x] **Record create** — optimistic: record appears at top of list immediately, dialog closes, server action runs in background.
- [x] **Record edit** — optimistic: record reflects new values immediately, dialog closes, server action runs in background.
- [x] **Record delete** — optimistic: record removed from list immediately, dialog closes, server action runs in background.
- [x] **Project details save** — `useTransition` spinner on the Save button, form disabled while pending.
- [x] **Project create** — `useTransition` spinner on Create button.
- [x] **Project delete (bulk)** — `useTransition` spinner on Confirm button, Cancel disabled.
- [x] **Project move (bulk)** — loading state inside move dialog while `moveProjects` is in flight.
- [x] **Record move** — loading dialog replaces move dialog while `moveRecord` is in flight.
- [ ] **Import** — progress indicator during CSV parse and DB write.
- [ ] **Export** — loading state while building the download blob.
- [x] **Reveal secret** — per-record spinner present; audit write is async and adds no visible delay.

### Dialog Behaviour

- [x] **Form resets on every open** — dialogs never carry values from a previous session. Reset is driven by `useEffect` on `open` prop, not `onOpenChange`, because Radix only calls `onOpenChange` for internal close triggers.
- [x] **Dialog blocked during save** — `isPending` prevents close (Escape, overlay click) and disables all inputs and action buttons while a save is in flight.
- [x] **Cancel disabled during save** — prevents partial close and data loss.
- [x] **Move dialog blocked during move** — `isMoving` prevents `onOpenChange` from closing; dialog transitions to a spinner-only state.
- [x] **Error feedback inside dialog** — all dialogs catch server action failures and show an inline `AlertCircle` + message above the footer. Optimistic updates are reverted on failure. Record create/edit now hold the dialog open until the server confirms.

### Optimistic Updates

- **Rule**: any mutation that only affects local data (the current project's records) must update the UI before awaiting the server response, then let `router.refresh()` sync the authoritative state silently.
- **Do not** wait for the server before closing a dialog or removing a list item.
- **Temporary IDs** — use `crypto.randomUUID()` or `optimistic-${Date.now()}` for items created before the DB responds. `router.refresh()` will replace them with real IDs.
- **Edit patch** — spread the draft onto the existing record in local state; the server response via `router.refresh()` is the source of truth for any server-computed fields (timestamps, etc.).

### Empty States

- [x] Project directory — empty state with CTA to add first project.
- [x] Record list — empty state with CTA to add first record.
- [x] Category sidebar section — "No projects yet" when a category has no projects.
- [x] Activity page — empty state when no audit events exist yet.
- [x] Search results — empty state when no matches found (both directory and record list).

### Feedback Patterns

- [x] **Copy confirmation** — "Copied" label + icon swap for 2 seconds after clipboard write.
- [x] **Reveal toggle** — button switches between Reveal / Hide with matching icon.
- [ ] **Toast notifications** — success/error toasts for operations where optimistic UI is not enough (e.g. import completion, export download, bulk delete of projects).
- [x] **Destructive confirmation** — all delete operations require an explicit confirmation dialog. Never delete on first click.
- [x] **Delete requires confirmation** — both record delete and project bulk-delete use confirmation dialogs.

### Accessibility

- [ ] All dialogs have `DialogTitle` and `DialogDescription` (or `sr-only` equivalents).
- [ ] All icon-only buttons have `aria-label`.
- [ ] Focus is trapped inside open dialogs.
- [ ] Keyboard navigation works for all primary actions.

### Performance

- [ ] Sidebar project list is server-fetched at layout level — no client-side data fetch for navigation.
- [x] Secrets are never included in page renders — only fetched on explicit Reveal/Copy action via server action RPC.
- [ ] Large record lists should paginate or virtualise beyond 100 items.

---

## Phase 9: Ops Readiness

### Tasks

- [ ] Document required environment variables
- [ ] Prepare backup expectations from day one
- [ ] Define restore steps
- [ ] Add basic monitoring/error capture integration points
- [ ] Document secure handling rules for production secrets
- [ ] Prepare a cloud deployment checklist for MetaBox

### Deliverables

- [ ] Operational setup notes
- [ ] Production-readiness checklist
- [ ] Safer deployment baseline

## Phase 10: Manual Rollout

### Tasks

- [ ] Populate the app with real internal MetaBox data gradually
- [ ] Manually validate critical flows during development
- [ ] Collect internal feedback on navigation, clarity, and speed
- [ ] Fix usability friction before wider internal adoption

### Deliverables

- [ ] First internal pilot usage
- [ ] Refined v1 usability

## Core Interfaces

### Roles

- [x] `Admin`
- [x] `Project Manager`
- [x] `User`

### Record Types

- [x] `credential`
- [x] `secure_note`

### Sensitive Actions

These actions must be treated as privileged and audited:

- [x] Reveal secret
- [x] Copy secret
- [x] Delete project (logged before delete)
- [x] Delete record (logged before delete)
- [x] Change role (ROLE_CHANGED audit event written on addAdmin/removeAdmin)
- [ ] Change restriction

## Manual Verification Focus

- [ ] User can sign in and reach the project directory
- [ ] Project directory is readable on desktop and mobile
- [ ] User can open a project and reach records quickly
- [ ] Secret values are hidden by default
- [ ] Reveal and copy actions feel deliberate and safe
- [ ] Role restrictions affect what actions are available
- [x] Audit activity is visible for sensitive events
- [x] Dashboard shell uses internal scrolling without browser-page overflow
- [ ] Import preview reflects user-defined mappings accurately
- [x] CSV upload preview shows headers and sample rows safely, including multiline notes
- [ ] Vaultocrypt export can be compared reliably against Zoho source export
- [x] Move project correctly reassigns category and updates sidebar
- [x] Drag-and-drop move feels correct — spinner on affected categories, clears only on UI update
- [ ] Move record correctly transfers to target project and disappears from source

## Current Build Order

1. [x] Replace planning draft with this implementation plan
2. [x] Scaffold the app foundation
3. [x] Build the app shell
4. [x] Integrate authentication
5. [x] Add data model and encryption core
6. [x] Build project management (directory, detail, category system, move)
7. [x] Build record management (CRUD, reveal/copy, move)
8. [x] Build activity and settings surfaces
9. [ ] Build import mapping UI and migration-grade export
10. [ ] Prepare deployment and internal rollout

## Handoff Notes

- Encryption: AES-256-GCM in `src/lib/crypto.ts`. Key from `VAULT_ENCRYPTION_KEY` env var (64-char hex).
- Neon database is live. Schema pushed. Prisma client generated.
- **Entity naming**: the Prisma model is `Project` (DB table stays `Client` via `@@map("Client")`). The `Record` model maps `projectId` to the `clientId` column. `AuditEvent.projectId` maps to `clientId` column. All application code uses `project` / `projectId`.
- **Categories**: `Category` model with default `Clients` (slug: `clients`) and `Internal` (slug: `internal`). `ensureDefaults()` and `migrateOrphans()` run automatically on every `getCategories()` call. Users can create additional categories from the sidebar.
- Server actions:
  - `src/lib/actions/projects.ts` — `getProjects`, `getProjectName`, `getProjectWithRecords`, `getInternalProjects`, `createProject`, `updateProject`, `deleteProjects`, `moveProjects`
  - `src/lib/actions/categories.ts` — `getCategories`, `getProjectsByCategory`, `createCategory`, `updateCategory`, `deleteCategory`
  - `src/lib/actions/records.ts` — `getRecords`, `revealSecret`, `copySecret`, `createRecord`, `updateRecord`, `deleteRecord`, `moveRecord`
  - `src/lib/actions/import.ts` — `importClients`
- `revealSecret` and `copySecret` are the only decryption points — server-only, never in the client bundle.
- `mock-data.ts` deleted. `RecordFormInput`, `RecordDraft` in `record-form-dialog.tsx`. `RecordItem` in `record-list.tsx`. No field renaming at the page boundary.
- CSV parsing helpers: `src/lib/imports/csv.ts`, types: `src/lib/imports/types.ts`.
- Existing CSV export: project metadata only — not migration-grade.
- Routes: `/` (project directory), `/categories/[categoryId]`, `/projects/[projectId]`, `/activity`, `/settings`, `/sign-in`, `/sign-up`.
- **Drag-and-drop**: `@dnd-kit/core` in `WorkspaceShell`. Category rows droppable, directory cards + sidebar project links draggable (grip handle on cards). Move spinners clear on `categories` prop change, not server action return.
- **Category actions**: `category-actions.tsx` rendered in shell header for active category. Includes Rename, Delete (non-default only), and Manage Users (Admin only).
- **Audit**: `src/lib/audit.ts` — Clerk `currentUser()` upsert with email-based stub merge. All mutations instrumented. `updateRecord` snapshots prev values incl. encrypted `secretCipher` into metadata; `revealAuditValues()` decrypts for Admins. `audit-actor-info.tsx` (click-to-reveal email), `audit-old-values.tsx` (Old values button on RECORD_UPDATED).
- **Roles**: `src/lib/auth/get-role.ts` + `src/contexts/role.tsx`. Admin = all access. User = create/edit records + reveal/copy; no delete/move/restructure. First user auto-promoted to Admin. `CategoryAccess` join table gates category visibility for non-admins.
- **Settings**: Admin list with add/remove. `lookupClerkUserByEmail()` pre-fills name from Clerk on add. Category pages have Manage Users modal (add/remove non-admins by email).
- **Server actions**: `projects.ts`, `categories.ts`, `records.ts` (+ `revealAuditValues`), `import.ts`, `users.ts`, `category-access.ts`.
