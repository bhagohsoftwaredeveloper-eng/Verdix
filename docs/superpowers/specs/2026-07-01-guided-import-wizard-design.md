# Guided Import Wizard — Design

**Date:** 2026-07-01
**Area:** Settings → Data Management → Import & Export
**Goal:** Make importing Products, Customers, and Suppliers low-friction for non-technical retail staff.

## Problem

The current import (`app/(app)/settings/data-management/`) is a bare file-picker + Import button per entity. Friction points:

1. **No template** — users must guess exact CSV headers (`sku`, `cost_price`, `selling_price`). Wrong headers silently fail.
2. **No column mapping** — a file with `Product Name` instead of `name` fails.
3. **No preview / no row-level errors** — API returns only `"Added: 5, Updated: 2, Errors: 3"`; users can't see which rows failed or why.
4. **CSV only** — no `.xlsx`, which is what most staff actually have.
5. **Customer import requires `id` (a UUID)** — no staff member has UUIDs; this alone makes customer import unusable in practice.

## Decisions (from brainstorming)

- Fix **all four** friction points: template, smart mapping, preview + row errors, xlsx.
- UX: **Modal wizard** (Upload → Map → Preview → Confirm), reused across all 3 entities.
- Error policy: **Import valid rows, skip bad rows**, then let the user download the skipped rows (with reasons) to fix and re-upload.

## Architecture

One generic `ImportWizard` modal driven by a per-entity config, shared by Products / Customers / Suppliers.

```
components/import-wizard/
  ImportWizard.tsx      // modal shell + step state machine
  StepUpload.tsx        // drag/drop, .csv + .xlsx, template + export-current buttons
  StepMapColumns.tsx    // file header -> our field dropdowns, alias auto-map
  StepPreview.tsx       // valid / update / error classification table
  StepResult.tsx        // summary counts + download skipped rows
  entity-schemas.ts     // products / customers / suppliers field configs
  parse-file.ts         // csv (papaparse) + xlsx (SheetJS) -> { headers[], rows[] }
```

Each entity config contributes:
- **field schema**: `{ key, label, required, type: 'text'|'number'|'boolean', aliases: string[], default? }`
- **match key**: products → `sku`; suppliers → `name`; customers → `name` + `contact_number`

### Entity field schemas (source of truth from existing routes)

- **Products** (required: `name`, `sku`): barcode, description, category, brand, subcategory, unit, cost_price, selling_price, stock_quantity, reorder_point, parent_id, image_url, conversion_factor.
- **Customers** (required: `name`; **`id` no longer required — auto-generated**): contact_number, active, sales_person, sales_area, sales_group, loyalty_points, payment_terms, address, billing_address, discount, credit_limit, price_level_id. Match on name+contact_number.
- **Suppliers** (required: `name`): contact_number, address, payment_terms, markup_percentage. Match on name.

## Flow

**Step 1 — Upload.** Drag/drop or browse; accepts `.csv` and `.xlsx` (SheetJS reads first sheet). Helper buttons: **Download template** (headers + 1 sample row) and **Export current data** (reuses existing export routes). File parsed client-side into `{ headers[], rows[] }`.

**Step 2 — Map columns.** One dropdown per our-field, listing the file's headers. Pre-selected via alias table (e.g. `Product Name`/`product`/`item name` → `name`; `Price`/`SRP` → `selling_price`). Auto-mapped fields show an "auto" badge. Required fields with no match are flagged and block Next. Unmapped optional fields use defaults.

**Step 3 — Preview & validate.** Apply mapping, classify every row locally:
- 🟢 **New** — insert
- 🔵 **Update** — match-key exists (fetched once via `GET .../import/<entity>/keys`)
- 🔴 **Error** — missing required, uncoercible number, or duplicate match-key within the file

Table with top-line counts (`18 new · 4 update · 2 skipped`), error rows filterable with reasons. Valid rows import, bad rows skip.

**Step 4 — Confirm & result.** POST validated, pre-mapped rows as JSON to the import route, **batched at 500 rows** with a progress bar. Result screen shows final `{ added, updated, skipped }` and a **Download skipped rows** button (original data + `_error` column).

## API changes

Import routes move from "parse raw CSV + guess columns" to "accept clean pre-mapped JSON rows":

- New JSON request shape: `{ rows: MappedRow[] }` (already validated/coerced client-side; server re-validates required fields defensively).
- Structured response: `{ added, updated, skipped, errors: [{ row, reason }] }` instead of a message string.
- **Customers**: auto-generate UUID when `id` absent; match on name+contact_number.
- New lightweight `GET .../import/<entity>/keys` returning existing match-keys for client-side new/update classification.
- Legacy CSV endpoints remain for back-compat; the UI uses the new JSON path.

## Error handling & edge cases

- Bad file / wrong type → caught at parse, clear message, stay on Step 1.
- Empty sheet / no headers → block with "No rows found."
- Large files → client-side validate/preview; import sent in **batches of 500** to avoid timeouts; progress bar.
- Numbers with `₱`, commas, blanks → coerced (`"₱1,200"`→`1200`, blank→default); uncoercible → row error, never a silent `0`.
- Duplicate match-keys within a file → first wins, rest flagged errors.
- Partial DB failure mid-batch → per-row try/catch; failures returned in `errors[]`, valid rows still commit.
- Cloud sync unchanged — import writes locally; existing `cloudQuery()` mirroring applies per row.

## Testing

- **Unit (priority — pure functions):** `parse-file.ts` (csv + xlsx → same shape); alias auto-mapper; coercion/validation classifier (new/update/error).
- **E2E (Playwright, port 3100):** happy-path per entity (upload fixture → auto-map → correct preview counts → confirm → row in `verdix_test`); one mixed good/bad file asserting valid rows import and bad rows land in the skipped download.

## Out of scope (YAGNI)

- Scheduled/automated imports.
- Multi-sheet xlsx selection (first sheet only).
- Field-level transformation rules beyond number/boolean coercion.
- Undo/rollback of a completed import (backup/reset tab already covers recovery).
