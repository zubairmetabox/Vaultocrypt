# Vaultocrypt Plan

## Summary

Vaultocrypt v1 is an internal-only web app for MetaBox Technology to manage client credentials and secure notes in one place. The product is client-first, cloud-hosted, built as a `Next.js` full-stack app, and optimized for a simple daily workflow: sign in, find a client, access a record, reveal or copy the secret safely, and update it when needed.

The goal of v1 is not public SaaS readiness. The goal is real weekly internal usage by the MetaBox team with strong security defaults, clean UX, and a practical operational foundation.

Current state note:
- UI is still largely mock-data driven
- Client editing, multi-select, delete, and CSV export currently work in local UI state only
- Import now has a local upload + CSV preview UI, but no mapping or persistence yet
- No migration-grade export exists yet

## Product Rules

- [x] Internal MetaBox use only in v1
- [x] No client login in v1
- [x] No multi-tenant SaaS architecture in v1
- [x] `Client` is the top-level business object
- [x] Top-level entities will support two categories only: `Clients` and `Internal`
- [x] Records belong directly to a client
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
- [x] Navigation: left sidebar app shell
- [x] Main sections: `Clients`, `Activity`, `Settings`
- [x] Main landing screen after login: client directory
- [x] Client detail page: lean client header with basic details, then records immediately
- [x] Client detail header fields currently shown: name, primary contact, vertical, status
- [x] Record presentation: table/list hybrid
- [x] Primary record actions: `Reveal`, `Copy`, `Edit`
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
- [x] Create sidebar destinations for `Clients`, `Activity`, and `Settings`
- [x] Build responsive behavior for desktop and mobile navigation
- [ ] Add empty states for first-use flows
- [x] Add polished page framing and state transitions

### Deliverables

- [x] Consistent application shell
- [x] Responsive navigation
- [x] Placeholder pages for all primary sections

## Phase 3: Authentication And Roles

### Tasks

- [x] Integrate `Clerk` with email/password authentication
- [x] Protect authenticated routes
- [x] Define v1 roles: `Admin`, `Project Manager`, `User`
- [ ] Add basic role-aware UI visibility rules
- [ ] Establish an internal authorization layer for role checks

### Deliverables

- [x] Working sign-in and protected app routes
- [x] Role model available in app logic
- [ ] Simple access-aware UI states

## Phase 4: Data Model And Security Core

### Tasks

- [x] Define the initial database schema
- [x] Create core entities:
  `User`, `UserRole`, `Client`, `Record`, `Tag`, `AuditEvent`
- [x] Define v1 record fields:
  `title`, `service_name`, `url`, `username`, `secret_value`, `notes`, `tags`, timestamps, actor metadata
- [x] Add encryption helpers for secret-bearing fields
- [x] Separate standard record reads from reveal/copy actions
- [x] Define audit event types for sensitive actions

### Deliverables

- [x] Initial schema ready for persistence work
- [x] Encryption utilities in place (AES-256-GCM, `src/lib/crypto.ts`)
- [x] Audit model ready for feature integration

## Phase 5: Client Directory And Client Pages

### Tasks

- [x] Build the client directory as the authenticated home screen
- [x] Show client name and core details in each row/card
- [x] Support create and edit client flows in mock UI
- [x] Build the lean client detail header
- [x] Build the client records section as the main page body
- [x] Support restricted-client markers for exceptional privacy cases
- [x] Add bulk multi-select in the client directory
- [x] Add local CSV export for selected clients
- [x] Add local delete flow for selected clients
- [x] Simplify client status UI to `Active` / `Inactive`
- [x] Remove notes from the client detail header and edit flow

### Deliverables

- [x] Usable client directory
- [x] Client detail page structure
- [x] Client creation and editing flows in mock UI
- [x] Client detail audit sidebar with aligned dashboard layout
- [x] Selectable client directory with local bulk actions

## Phase 6: Record Management

### Tasks

- [x] Build record listing inside each client
- [x] Support create, edit, and delete for `credential` and `secure_note` (local state — DB wiring next)
- [x] Keep secret values hidden by default everywhere
- [x] Add explicit `Reveal` action with visible security treatment
- [x] Add explicit `Copy` action with visible feedback
- [ ] Add lightweight tag support
- [ ] Add search and filtering for records

### Deliverables

- [ ] Full v1 record CRUD (UI done; persistence wiring in progress)
- [x] Secure reveal/copy workflow
- [ ] Practical record organization and lookup

## Phase 7: Activity And Settings

### Tasks

- [x] Build the activity view for audit history
- [ ] Capture required events:
  login, failed login, create, update, delete, reveal, copy, role change, restriction change
- [x] Build settings surface for theme and future role controls
- [ ] Add restriction management for sensitive clients or records
- [x] Show record freshness details such as last updated by and when
- [x] Refine dashboard shell height, scrolling, and balanced settings cards

### Deliverables

- [x] Visible audit trail
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
- [x] Folder semantics should resolve into only two categories: `Clients` and `Internal`
- [x] We do not need to preserve `Description`, `Tags`, `Classification`, `Favorite`, or raw `Folder Name` as first-class product fields

### Current Reality

- [x] There is a local import UI entry point in the client directory
- [x] There is a local CSV parser foundation
- [x] There is a local CSV preview dialog
- [x] There is no saved mapping preset system yet
- [x] Current export is only the local bulk client CSV from the client directory
- [x] Current export is not sufficient for migration verification

### Required Import Tool Capabilities

- [x] Upload CSV file
- [x] Parse headers and rows safely
- [x] Let the user map source columns to Vaultocrypt fields
- [ ] Let the user define how source rows become `Clients` vs `Internal`
- [x] Provide a preview before import
- [ ] Surface duplicate / conflict conditions before import
- [ ] Persist imported data into the real database (server action ready; UI not wired yet)
- [ ] Store enough import provenance metadata to support validation and troubleshooting

### Required Export Capabilities

- [ ] Rework export around full record-level data, not only selected clients
- [ ] Add a migration-verification export mode
- [ ] Export deterministic row structure suitable for file-to-file comparison
- [ ] Include enough fields to validate imported records correctly
- [ ] Decide whether secret export should be allowed, masked, or optional

### Proposed Verification Export Scope

- [ ] Category (`Clients` / `Internal`)
- [ ] Client or container name
- [ ] Record title
- [ ] URL
- [ ] Username
- [ ] Notes
- [ ] Record type
- [ ] Status
- [ ] Optional source/import metadata for debugging

### Deliverables

- [ ] User-controlled import mapping tool
- [ ] Preview-first import workflow with mapping and execution
- [ ] Migration-grade export
- [ ] Round-trip verification process against Zoho export

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
- [ ] Change role
- [ ] Change restriction
- [ ] Delete client
- [ ] Delete record

## Manual Verification Focus

- [ ] User can sign in and reach the client directory
- [ ] Client directory is readable on desktop and mobile
- [ ] User can open a client and reach records quickly
- [ ] Secret values are hidden by default
- [ ] Reveal and copy actions feel deliberate and safe
- [ ] Role restrictions affect what actions are available
- [ ] Audit activity is visible for sensitive events
- [x] Dashboard shell uses internal scrolling without browser-page overflow
- [ ] Import preview reflects user-defined mappings accurately
- [x] CSV upload preview shows headers and sample rows safely, including multiline notes
- [ ] Vaultocrypt export can be compared reliably against Zoho source export

## Current Build Order

1. [x] Replace planning draft with this implementation plan
2. [x] Scaffold the app foundation
3. [x] Build the app shell
4. [x] Integrate authentication
5. [x] Add data model and encryption core
6. [x] Build client management
7. [ ] Build record management
8. [x] Build activity and settings surfaces
9. [ ] Build import / export and migration tooling
10. [ ] Prepare deployment and internal rollout

## Handoff Notes

- Encryption: AES-256-GCM in `src/lib/crypto.ts`. Key from `VAULT_ENCRYPTION_KEY` env var (64-char hex).
- Neon database is live. Schema pushed. Prisma client generated.
- Server actions ready in `src/lib/actions/`: `clients.ts`, `records.ts`, `import.ts`.
- `revealSecret` is the only place decryption happens — server-only, never exposed to the client bundle.
- UI is still wired to mock data (`src/lib/mock-data.ts`) — **next step is swapping all local state to server action calls**.
- Client directory, client detail editing, record CRUD, and import dialog all need to be re-wired.
- CSV parsing helpers live in `src/lib/imports/csv.ts` and canonical import field types live in `src/lib/imports/types.ts`.
- Existing CSV export is only a small client-directory bulk export, not a record-level migration export.
