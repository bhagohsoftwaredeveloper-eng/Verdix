# License Gate — Design Spec
**Date:** 2026-06-26
**Status:** Approved

---

## Goal

Block all access to the Vendix POS until a valid, machine-bound license is activated. The gate appears before the login screen. Expired and invalid licenses are treated the same as unlicensed — no access.

---

## Scope

Two files changed/created:
1. `app/activate/page.tsx` — new activation page (client component)
2. `app/login/page.tsx` — add license check on mount (minimal edit)

No middleware, no layout changes, no new API routes (all backend endpoints already exist).

---

## License States & Behavior

| Status | Meaning | Gate behavior |
|---|---|---|
| `active` | Valid, machine matches, not expired | Pass through to login |
| `unlicensed` | No license file on disk | Block → show activation page |
| `expired` | Valid signature, correct machine, past expiry date | Block → show activation page with expiry notice |
| `invalid` | Bad signature or malformed key | Block → show activation page with error |
| `wrong-machine` | Valid signature but issued for different hardware | Block → show activation page with mismatch notice |

---

## Flow

```
App opens → /login
  useEffect: GET /api/license/status
    → loading: show spinner (no flash of login form)
    → status === 'active': render login form normally
    → any other status: router.replace('/activate')

/activate page
  → GET /api/license/status (to get machineId + current status for banner)
  → render status banner + machine ID box + tabs

  [Online tab]
    User enters Product Key (VRDX-XXXX-XXXX-XXXX)
    → POST /api/license/activate-online { productKey }
    → success: show success state (customer, edition) → redirect /login after 2s
    → error: show inline error message

  [Offline tab]
    User pastes full signed key (VRDX1.xxx.xxx)
    → POST /api/license/activate { key }
    → success: show success state → redirect /login after 2s
    → error: show inline error message
```

---

## `/activate` Page — Guard

On mount, the activate page also calls `GET /api/license/status`. If the status is already `active`, it immediately redirects to `/login` (prevents manually navigating to `/activate` when already licensed).

## `/activate` Page — UI Sections

### Status Banner
Color-coded alert at the top of the card:
- `unlicensed` → red — "This copy of Vendix is not activated"
- `expired` → orange — "Your license expired on [date]"
- `invalid` → red — "Invalid license detected — please re-activate"
- `wrong-machine` → red — "This license belongs to a different computer"

### Machine ID Box
Prominently displayed below the banner. Monospace font, full-width, with a **Copy** button. Label: *"Your Machine ID — send this to your vendor to receive a license key."*

### Tabs — Online / Offline

**Online tab:**
- Label: "Product Key"
- Input placeholder: `VRDX-XXXX-XXXX-XXXX`
- Button: "Activate Online"
- Error states: unreachable server, invalid key, seat limit reached

**Offline tab:**
- Label: "Signed License Key"
- Textarea placeholder: `VRDX1.…`
- Button: "Activate"
- Error states: wrong machine, invalid signature, expired key

### Success State
After either activation path succeeds:
- Green checkmark
- Customer name + edition from the license payload
- "Redirecting to login…" message
- Auto-redirect to `/login` after 2 seconds

---

## Login Page Change

Add to `LoginPage` component:

```ts
// On mount: check license, redirect if not active
useEffect(() => {
  fetch('/api/license/status')
    .then(r => r.json())
    .then(res => {
      if (res?.data?.status !== 'active') router.replace('/activate');
      else setLicenseChecked(true);
    })
    .catch(() => setLicenseChecked(true)); // fail open — don't block login on network error
}, []);
```

- `licenseChecked` state (boolean, default `false`) gates the login form render
- While `false`: show centered spinner
- On catch (e.g. API down): fail open — show login form anyway so admin can still access the app

---

## API Endpoints Used (all existing)

| Endpoint | Used by |
|---|---|
| `GET /api/license/status` | Login page (gate check) + activate page (machineId + banner) |
| `POST /api/license/activate-online` | Online tab |
| `POST /api/license/activate` | Offline tab |

---

## Styling

Follow existing login page patterns:
- Dark background (`bg-background`)
- Centered card (max-w `420px`)
- Vendix logo at top
- Shadcn/ui components: `Card`, `Tabs`, `Input`, `Textarea`, `Button`, `Alert`
- Same animation classes as login page (`animate-fade-in`)

---

## Out of Scope

- Heartbeat / periodic re-validation during app use (separate feature)
- License deactivation UI (use license server dashboard)
- Admin bypass or grace period for expired licenses
- Any changes to `/pos` route directly (the gate at `/login` is sufficient since all users pass through login)
