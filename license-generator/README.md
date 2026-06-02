# Verdix License Generator

A standalone tool to issue **machine-locked, cryptographically signed** license
keys for Verdix POS. It holds the **private key**; the POS ships only the
**public key**, so licenses cannot be forged even if the POS is decompiled.

## How it works

```
┌────────────────────┐        Machine ID         ┌────────────────────┐
│   Customer's POS    │  ──────────────────────▶  │  License Generator │
│ (shows Machine ID)  │                           │  (this tool)       │
│                     │   ◀──────────────────────  │  signs w/ PRIVATE  │
│ verifies w/ PUBLIC  │        License Key         │  key               │
└────────────────────┘                           └────────────────────┘
```

1. The customer opens the POS → the activation screen shows their **Machine ID**.
2. They send you that Machine ID.
3. You generate a license key bound to that Machine ID (perpetual or subscription).
4. They paste the key into the POS → activated. The key only works on that PC.

## First-time setup (run once)

From the **repo root**:

```bash
npm run license:keygen
```

This creates `license-generator/keys/private-key.pem` (secret, gitignored) and
embeds the matching public key into `lib/licensing/public-key.ts`.

> ⚠️ Re-running keygen rotates the keys and **invalidates every license already
> issued**. Only do it intentionally (`npm run license:keygen -- --force`).
>
> 🔐 Back up `keys/private-key.pem` somewhere safe and private. If you lose it,
> you can no longer issue keys for the current POS build.

## Issuing licenses

### Option A — Web UI (easiest)

```bash
npm run license:ui
```

Open <http://localhost:4100>, fill the form, click **Generate**, copy the key.

### Option B — Command line

```bash
# Perpetual license
npm run license:new -- --customer "Juan's Store" --machine "ABCD-1234-..."

# 1-year subscription
npm run license:new -- --customer "Juan's Store" --machine "ABCD-..." --days 365

# Expires on a date, enterprise edition, with feature flags
npm run license:new -- --customer "Acme" --machine "ABCD-..." \
  --expires 2027-12-31 --edition enterprise --features reports,multi-terminal
```

| Flag         | Meaning                                                        |
|--------------|----------------------------------------------------------------|
| `--customer` | Business name shown in the POS (required)                      |
| `--machine`  | Machine ID from the customer's activation screen (required)    |
| `--edition`  | `standard` (default) / `enterprise` / `trial`                  |
| `--days N`   | Subscription length in days                                    |
| `--expires`  | Specific expiry `YYYY-MM-DD` (overrides `--days`)              |
| `--features` | Comma-separated feature flags (optional)                       |
| _(none)_     | No `--days`/`--expires` ⇒ perpetual license                    |

## Security notes

- **Asymmetric (Ed25519) signatures** — the POS can verify but never create
  licenses. There is no shared secret in the shipped app to extract.
- **Machine binding** — each key embeds a SHA-256 hardware fingerprint
  (Windows MachineGuid + motherboard/BIOS serial). Copying the key to another
  PC fails verification.
- **Tamper-proof** — changing any field (customer, expiry, machine) breaks the
  signature.
- Keep `keys/private-key.pem` offline/backed-up. It is the master secret.
