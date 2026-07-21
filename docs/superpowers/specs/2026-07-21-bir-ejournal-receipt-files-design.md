# BIR E-Journal — Receipt-Style Text Files, Auto-Saved on Z-Reading

**Date:** 2026-07-21
**Status:** Approved design, pending implementation

## Problem

The current e-journal is a single manual "Download .txt" that captures **only sales
transactions** in a table layout. BIR RMO 24-2023 requires the e-journal to reflect a
**copy of all documents dispensed** — sales invoices, voids/cancellations, returns
(merchandise credits), X-Readings, and Z-Readings — saved daily, and formatted to
resemble the originally issued documents.

## Goals

1. Produce **5 separate `.txt` files per document type**, each a **text copy of the
   receipts/slips** (receipt-style layout, not a report table).
2. **Auto-save** the files whenever any of these events occur: **Void**, **Merchandise
   Credit/Return**, **X-Reading**, or **Z-Reading**. Every trigger regenerates **all 5
   files** for that date/terminal from current DB state (one shared code path, always
   consistent). Plain sales checkouts do **not** trigger a save on their own — the files
   are refreshed at the next void/return/X/Z event and always reflect current data.
3. Keep the **manual download** working, using the **same** generator/format.
4. Files retained on disk, organized per date and per terminal (BIR 10-year retention).

## Non-Goals

- No scheduled/cron auto-save (the save is event-driven: void / return / X / Z).
- No per-sale save trigger (would write on every checkout; refresh happens at the next
  void/return/X/Z event instead).
- No changes to the existing ESC/POS printing path (thermal receipts unchanged).
- No new Electron preload bridge — the Next.js server process writes files directly.

## File Organization

Per-date folder, per-terminal subfolder:

```
<EJournalRoot>/
  2026-07-21/
    Terminal-1/
      sales-invoices_2026-07-21.txt        # text copy of every SI receipt
      voided_2026-07-21.txt                # text copy of every void slip
      merchandise-credits_2026-07-21.txt   # text copy of every credit slip
      x-readings_2026-07-21.txt            # text copy of every X-reading
      z-reading_2026-07-21.txt             # text copy of the Z-reading(s)
```

Each file concatenates the rendered text copies for that type, one per transaction,
separated by a divider line. Files are **overwritten** on re-generation for the same
date/terminal (idempotent), never appended, so a re-run reflects current data without
duplication.

### `<EJournalRoot>` resolution

The Next.js server runs as a spawned child process without Electron's `app` API, so the
path is provided via env var:

- `main.js` passes `VERDIX_EJOURNAL_DIR = path.join(app.getPath('userData'), 'EJournals')`
  into the server spawn env.
- The writer resolves the root as:
  `process.env.VERDIX_EJOURNAL_DIR || path.join(process.cwd(), 'EJournals')`
  (the fallback covers dev/web runs).

## Architecture

Three new units under `lib/ejournal/`, plus two triggers. Data, formatting, and file IO
are separated so the formatters stay pure and unit-testable.

### 1. `lib/ejournal/ejournal-data.ts`

`fetchEJournalData(date, terminalId): Promise<EJournalData>`

Runs one query per section and returns a typed object:

```ts
interface EJournalData {
  settings: ReceiptSettings;          // business name, TIN, MIN, S/N, paper size
  salesInvoices: SaleReceipt[];       // status Paid, non-void, non-return + items
  voided: VoidedReceipt[];            // status Voided + void_reason + items
  merchandiseCredits: CreditReceipt[];// pos_transactions transaction_type='return' + orig SI
  xReadings: XReadingRow[];           // x_readings for the date/terminal
  zReadings: ZReadingRow[];           // z_readings for the date/terminal
}
```

Data sources (all confirmed present):
- Sales invoices → `sales_transactions` (status `Paid`) + `sale_items`, real `si_number`.
- Voided → `sales_transactions` status `Voided` + `void_reason` + items.
- Merchandise credits → `pos_transactions` `transaction_type='return'`, joined to the
  original sale for the orig SI number + returned items.
- X-Readings → `x_readings` table rows.
- Z-Readings → `z_readings` table rows.

Training-mode rows (`is_training = 1`) are excluded, matching the current e-journal.

### 2. `lib/ejournal/text-receipt.ts`

Pure plain-text renderers that reproduce the existing paper layouts (fixed width:
58mm → 32 cols, 80mm → 48 cols). These parallel — not modify — the ESC/POS generators,
so the printing path is untouched.

```ts
renderSalesReceiptText(sale, settings): string   // mirrors ReceiptGenerator
renderVoidSlipText(sale, settings): string       // mirrors VoidSlipGenerator
renderCreditSlipText(data, settings): string     // mirrors CreditSlipGenerator
renderXReadingText(x, settings): string          // mirrors X-reading preview
renderZReadingText(z, settings): string          // mirrors Z-reading preview
```

Shared low-level helpers (all width-aware):
- `center(text, width)`
- `row(left, right, width)` — left/right justified line
- `divider(width, ch='-')`
- `wrap(text, width)`
- `formatSINumber` reused from `lib/si-number.ts`

Each renderer emits the header (business/TIN/MIN/S/N/date), the document body
(items/totals), and the footer, matching what the customer's printed copy shows.

### 3. `lib/ejournal/ejournal-writer.ts` (server-side)

`saveEJournalFiles(date, terminalId): Promise<{ dir: string; files: string[] }>`

1. `fetchEJournalData(date, terminalId)`.
2. For each of the 5 types, map its rows through the matching renderer and join with a
   divider to form the file body.
3. Resolve `<EJournalRoot>/<date>/Terminal-<id>/`, `fs.mkdir` recursive.
4. `fs.writeFile` each of the 5 files (overwrite).
5. Return the directory and written file names.

Uses Node `fs/promises` and `path`. Server-only module (never imported by client code).

## Triggers

### Auto-save on business events

Every trigger regenerates all 5 files for the affected date/terminal from current DB
state. Each call is wrapped in try/catch: a file-write failure is **logged but never
fails the underlying operation** (the void/return/reading must still succeed; the file
save is best-effort and re-runnable via any later trigger or the manual save).

Hook points, all calling the same `saveEJournalFiles(date, terminalId)`:

- **Void** — `app/api/pos/void-transaction/route.ts`, after the sale is marked Voided.
- **Merchandise Credit / Return** — `app/api/sales/returns/route.ts`, after the return
  is recorded.
- **X-Reading** — `app/api/sales/x-reading/route.ts`, after the X is generated.
- **Z-Reading** — `app/api/sales/z-reading/route.ts`, after the Z is finalized.

`date`/`terminalId` come from the triggering record (e.g. the sale's date + terminal, or
the reading's report_date + terminal). Because every run rebuilds all 5 files from the
DB, triggers are idempotent and order-independent — the files always match current state.

### Manual save/download

A new `POST /api/sales/ejournal/save` accepts `{ date, terminalId }`, calls
`saveEJournalFiles`, and returns the written paths. The existing BIR Compliance card's
"Download .txt" area invokes this (and can surface the saved location).

The legacy single-file GET route (`GET /api/sales/ejournal`) is **left in place**
(other callers/bookmarks may exist) but is no longer the primary path; the BIR Compliance
card switches to the new `POST /api/sales/ejournal/save`. Both the manual save and the
auto-save use the one shared `saveEJournalFiles` code path, so their output is identical.

## Error Handling

- Missing/empty data for a type → still write that file with a header and a
  "No <type> for this date." line (so the daily record is explicit, not absent).
- File-write failure during Z-reading → caught, logged, Z-reading still succeeds.
- Missing `x_readings`/`z_readings` tables (older DB) → query guarded; render an empty
  file rather than throwing.

## Testing

- Unit tests for each renderer in `text-receipt.ts` against a sample sale / void /
  credit / X / Z, asserting exact layout (header, items, totals, footer, width).
- Unit test for `fetchEJournalData` shaping (can use a small seeded fixture or mock rows).
- `ejournal-writer` verified by an integration test that writes to a temp dir and asserts
  the 5 files exist with expected headers.

## Rollout / Compatibility

- Printing path (ESC/POS) untouched.
- Migration: none required (reads existing tables).
- `main.js` change: add `VERDIX_EJOURNAL_DIR` to the server spawn env.
