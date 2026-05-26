# Vaultocrypt Plan

## Summary

Vaultocrypt v1 is an internal-only web app for MetaBox Technology to manage client credentials and secure notes in one place. The product is client-first, cloud-hosted, built as a `Next.js` full-stack app, and optimized for a simple daily workflow: sign in, find a client, access a record, reveal or copy the secret safely, and update it when needed.

The goal of v1 is not public SaaS readiness. The goal is real weekly internal usage by the MetaBox team with strong security defaults, clean UX, and a practical operational foundation.

## Product Rules

- [x] Internal MetaBox use only in v1
- [x] No client login in v1
- [x] No multi-tenant SaaS architecture in v1
- [x] `Client` is the top-level business object
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
- [ ] Protect authenticated routes
- [ ] Define v1 roles: `admin`, `editor`, `viewer`
- [ ] Add basic role-aware UI visibility rules
- [ ] Establish an internal authorization layer for role checks

### Deliverables

- [ ] Working sign-in and protected app routes
- [ ] Role model available in app logic
- [ ] Simple access-aware UI states

## Phase 4: Data Model And Security Core

### Tasks

- [ ] Define the initial database schema
- [ ] Create core entities:
  `User`, `UserRole`, `Client`, `Record`, `Tag`, `AuditEvent`
- [ ] Define v1 record fields:
  `title`, `service_name`, `url`, `username`, `secret_value`, `notes`, `tags`, timestamps, actor metadata
- [ ] Add encryption helpers for secret-bearing fields
- [ ] Separate standard record reads from reveal/copy actions
- [ ] Define audit event types for sensitive actions

### Deliverables

- [ ] Initial schema ready for persistence work
- [ ] Encryption utilities in place
- [ ] Audit model ready for feature integration

## Phase 5: Client Directory And Client Pages

### Tasks

- [x] Build the client directory as the authenticated home screen
- [x] Show client name and core details in each row/card
- [x] Support create and edit client flows
- [x] Build the lean client detail header
- [x] Build the client records section as the main page body
- [x] Support restricted-client markers for exceptional privacy cases

### Deliverables

- [x] Usable client directory
- [x] Client detail page structure
- [x] Client creation and editing flows

## Phase 6: Record Management

### Tasks

- [x] Build record listing inside each client
- [ ] Support create, edit, and delete for `credential` and `secure_note`
- [x] Keep secret values hidden by default everywhere
- [x] Add explicit `Reveal` action with visible security treatment
- [x] Add explicit `Copy` action with visible feedback
- [ ] Add lightweight tag support
- [ ] Add search and filtering for records

### Deliverables

- [ ] Full v1 record CRUD
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

### Deliverables

- [x] Visible audit trail
- [x] Basic settings controls
- [ ] Restriction support for exceptions

## Phase 8: Ops Readiness

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

## Phase 9: Manual Rollout

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

- [ ] `admin`
- [ ] `editor`
- [ ] `viewer`

### Record Types

- [x] `credential`
- [x] `secure_note`

### Sensitive Actions

These actions must be treated as privileged and audited:

- [x] Reveal secret
- [x] Copy secret
- [ ] Change role
- [ ] Change restriction
- [ ] Delete record

## Manual Verification Focus

- [ ] User can sign in and reach the client directory
- [ ] Client directory is readable on desktop and mobile
- [ ] User can open a client and reach records quickly
- [ ] Secret values are hidden by default
- [ ] Reveal and copy actions feel deliberate and safe
- [ ] Role restrictions affect what actions are available
- [ ] Audit activity is visible for sensitive events

## Current Build Order

1. [x] Replace planning draft with this implementation plan
2. [x] Scaffold the app foundation
3. [x] Build the app shell
4. [ ] Integrate authentication
5. [ ] Add data model and encryption core
6. [x] Build client management
7. [ ] Build record management
8. [x] Build activity and settings surfaces
9. [ ] Prepare deployment and internal rollout
