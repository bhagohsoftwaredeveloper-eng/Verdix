# Design: Web/Hosted License Mode

**Date:** 2026-07-06
**Status:** Approved (design), pending implementation plan

## Problem

The deployed web app (Railway "Verdix" service) is blocked by the app-wide
`LicenseGate` (components/license-gate.tsx), which enforces **machine-bound**
licensing: `/api/license/status` → `getLicenseInfo()` reads `license.dat` and
compares the license's `machineId` against the machine's hardware fingerprint
(lib/licensing/machine.ts). A web container has no `license.dat` (ephemeral
disk), and its Linux fingerprint is a constant `hash(linux|x64)` — so the app
shows the activation wall and cannot be accessed. Machine-binding does not fit a
web/cloud deployment.

## Decisions (locked)

- **Separate license** for the web deployment, distinct from the desktop POS.
- The web deployment holds its license via a **`LICENSE_KEY` env var**
  (pre-signed token) — persistent across redeploys, no disk needed.
- The web license is identified by a **sentinel `machineId = 'HOSTED'`** inside
  the Ed25519-signed license. When present, the hardware check is skipped.
  Because the license is signed, only the vendor (private key holder) can mint
  one — it cannot be forged to bypass desktop binding.
- Detection is carried by the **signed license itself**, not a separate env
  flag (an env flag could be set on a desktop to weaken anti-piracy).

## Components (licensing only)

### ① `lib/licensing/core.ts`
Add the sentinel constant (single source of truth, imported by both verifier and
issuer):
```ts
export const HOSTED_MACHINE_ID = 'HOSTED';
```

### ② `lib/licensing/verify.ts`
- `readLicenseKey()`: prefer `process.env.LICENSE_KEY` (trimmed, non-empty) over
  the `license.dat` file. This is how the web container supplies its license.
- Extract the machine-match decision into a pure, testable helper:
  ```ts
  export function isMachineMatch(payloadMachineId: string, actualMachineId: string): boolean
  ```
  Returns `true` when `normalizeMachineId(payloadMachineId) === normalizeMachineId(actualMachineId)`
  OR when `normalizeMachineId(payloadMachineId) === normalizeMachineId(HOSTED_MACHINE_ID)`.
  `evaluateLicenseKey()` uses it in place of the current inline comparison.
  Signature, product-id, and expiry checks are unchanged and still enforced.

### ③ `app/api/license/heartbeat/route.ts`
Send `payload.machineId` (the installed license's bound id) as the heartbeat
`machineId` instead of recomputing `getMachineId()`. For a hosted license this is
`'HOSTED'`, which matches the recorded hosted activation, so revocation/renewal
still work. For a desktop license `payload.machineId` already equals the
machine's fingerprint (it was activated on this machine), so behavior is
unchanged.

### ④ `license-server/offline-cli.ts`
Add a `--web` flag that sets the machine id to `HOSTED_MACHINE_ID` (ergonomic;
avoids typing the raw sentinel). Reuses the existing DB-backed issuance path,
which records an activation row with `machine_id = 'HOSTED'` (so heartbeat and
revocation function). Example:
```
npm run license:new -- --product-key VRDX-WEB-XXXX-XXXX --web --edition web
```
Prints the signed token to paste into Railway `LICENSE_KEY`.

## Data Flow

```
[Issue — vendor, once per web deployment]
  Create a license in the LMS (product key) → npm run license:new -- --product-key … --web
    → signed token (machineId='HOSTED', activation row recorded)
  Paste into Railway "Verdix" service → Variables → LICENSE_KEY

[Runtime — web app]
  LicenseGate → /api/license/status → readLicenseKey() reads LICENSE_KEY env
    → verify signature (product/expiry enforced) → isMachineMatch: 'HOSTED' → skip hardware check
    → licensed (no activation wall)
  Heartbeat → sends payload.machineId ('HOSTED') → license server → active/revoked enforced
```

## Security

- The hosted token is Ed25519-signed — only the vendor (private key) can mint
  it. A customer cannot forge one to bypass desktop hardware binding.
- The `LICENSE_KEY` env var is the only hosted path; desktop installs remain
  hardware-bound. The hardware-check skip comes solely from the signed sentinel,
  never from an env flag, so setting env on a desktop cannot weaken binding.

## Error Handling

- No `LICENSE_KEY` and no `license.dat` → `unlicensed` (activation wall) —
  existing behavior, unchanged.
- Revoked / expired hosted license → enforced by the status check and heartbeat,
  same as desktop.

## Testing

- **Unit:** `isMachineMatch` — (a) hardware matches → true; (b) hardware differs
  but payload is the sentinel → true; (c) hardware differs and payload is not the
  sentinel → false. Plus `readLicenseKey` env-precedence (env set → returns env
  value over the file).
- **Manual:** set `LICENSE_KEY` on the Railway service → activation wall gone;
  revoke the hosted license → next heartbeat locks it.

## Out of Scope (YAGNI)

- Automated/self web activation; multi-web-instance seat management; a dashboard
  UI button (CLI first); any change to cloud-sync or DB wiring (this is licensing
  only).
