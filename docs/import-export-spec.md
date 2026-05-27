# Import / Export Spec

## Goal

Vaultocrypt needs a migration-safe import/export path for replacing Zoho Vault.

The target verification loop is:

1. Export data from Zoho Vault
2. Import that file into Vaultocrypt through a user-controlled mapping step
3. Export data back out of Vaultocrypt
4. Compare both files to judge whether migration was done correctly

## Product-Level Import Decisions

- Top-level category choices are only:
  - `Clients`
  - `Internal`
- Import mapping must be user-controlled in the UI
- Mapping rules must not be hardcoded to Zoho Vault only
- Raw source columns like `Description`, `Tags`, `Classification`, `Favorite`, and raw `Folder Name` are not first-class product fields by default
- Hidden provenance metadata may still be stored later for debugging and verification

## Current Canonical Product Shape

### Client

- `name`
- `category`
  - `Clients`
  - `Internal`
- `contact`
- `vertical`
- `status`
  - `Active`
  - `Inactive`

### Record

- `title`
- `type`
  - `credential`
  - `secure_note`
- `url`
- `username`
- `secret`
- `notes`

## Canonical Import Targets

The import tool should let the user map source columns to these canonical targets:

- `entry_category`
- `entry_name`
- `client_contact`
- `client_vertical`
- `client_status`
- `record_title`
- `record_type`
- `record_url`
- `record_username`
- `record_secret`
- `record_notes`

Not every target has to be mapped.

## Canonical Export Shape

Vaultocrypt needs a deterministic record-level export for migration verification.

Recommended export columns:

- `entry_category`
- `entry_name`
- `client_contact`
- `client_vertical`
- `client_status`
- `record_title`
- `record_type`
- `record_url`
- `record_username`
- `record_notes`

Optional later fields:

- `record_secret`
- `source_system`
- `source_file_name`
- `source_row_number`
- `import_batch_id`

## Zoho Vault Example Mapping

Example source columns from the reviewed Zoho export:

- `Password Name`
- `Password URL`
- `Notes`
- `Folder Name`
- `Description`
- `Tags`
- `Classification`
- `Favorite`
- `login`
- `Pass`

Typical Zoho mapping could be:

- `Folder Name` -> `entry_name`
- user-defined rule -> `entry_category`
- `Password Name` -> `record_title`
- `Password URL` -> `record_url`
- `login` -> `record_username`
- `Pass` -> `record_secret`
- `Notes` -> `record_notes`

But the UI must allow the user to choose and override this.

## Import Tool Requirements

### Stage 1: Upload

- Accept CSV upload
- Parse headers safely
- Parse rows safely

### Stage 2: Mapping

- Show source headers
- Let the user assign source headers to canonical import targets
- Let the user ignore unused columns
- Let the user define category behavior for `Clients` vs `Internal`

### Stage 3: Preview

- Show how many top-level entries will be created
- Show how many records will be created
- Show sample mapped rows
- Flag empty required fields
- Flag duplicate entry names and duplicate records

### Stage 4: Import

- Persist mapped data to the database
- Track import batch information later if we add provenance

## Export Requirements

### Operational Export

- Human-friendly
- Useful for routine backup / operational review

### Migration Verification Export

- Deterministic row order
- Record-level granularity
- Stable column names
- Designed for file-to-file comparison against source exports

## Implementation Order

1. Align Prisma schema with current UI assumptions
2. Align mock-data types with current UI assumptions
3. Build CSV upload and header parsing
4. Build mapping UI
5. Build preview UI
6. Build import execution
7. Rework export for migration verification
