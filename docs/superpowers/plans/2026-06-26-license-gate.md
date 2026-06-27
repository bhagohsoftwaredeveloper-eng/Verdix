# License Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Block all access to the Vendix POS until a valid machine-bound license is activated, by checking license status on the login page and redirecting to a new `/activate` page when unlicensed/expired/invalid.

**Architecture:** The login page gains a `useEffect` that calls `GET /api/license/status` on mount and redirects to `/activate` for any non-active status. The new `/activate` page shows a status banner, the machine ID for the customer to send to their vendor, and two activation tabs (online via product key, offline via pasted signed key). After successful activation either path redirects back to `/login`.

**Tech Stack:** Next.js 16, React 18, TypeScript, shadcn/ui (`Card`, `Tabs`, `Input`, `Textarea`, `Button`, `Alert`, `Label`), Lucide React icons, existing API routes at `/api/license/*`.

## Global Constraints

- Client components only (`'use client'`) — no server components for these pages
- Use `router.replace()` not `router.push()` for all license redirects (no back-button loops)
- All shadcn/ui components already installed — import from `@/components/ui/*`
- Logo component at `@/components/logo` — `<Logo size={number} />`
- API base URL via `getApiUrl()` from `@/lib/api-config` for all fetch calls
- License file stored at `C:\ProgramData\Verdix\license.dat` by the server — never touched client-side
- `wrong-machine` and `invalid` statuses → block (same as `unlicensed`)
- Fail open on network error in login check (show login form, don't block)

---

### Task 1: Add license gate to login page

**Files:**
- Modify: `app/login/page.tsx`

**Interfaces:**
- Consumes: `GET /api/license/status` → `{ success: boolean, data: { status: string, machineId: string } }`
- Produces: redirect to `/activate` for any status !== `'active'`

- [ ] **Step 1: Add `licenseChecked` state and license check `useEffect` to `LoginPage`**

Open `app/login/page.tsx`. Add one new state variable and one `useEffect` after the existing state declarations (after `const router = useRouter()`):

```tsx
const [licenseChecked, setLicenseChecked] = useState(false);

useEffect(() => {
  fetch('/api/license/status')
    .then((r) => r.json())
    .then((res) => {
      if (res?.data?.status !== 'active') {
        router.replace('/activate');
      } else {
        setLicenseChecked(true);
      }
    })
    .catch(() => {
      // Fail open — if the API is unreachable, show login anyway
      setLicenseChecked(true);
    });
}, [router]);
```

- [ ] **Step 2: Gate the login form render behind `licenseChecked`**

In the return statement of `LoginPage`, wrap the entire returned JSX with a conditional. Replace the opening `return (` block:

```tsx
if (!licenseChecked) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

return (
  // ... existing JSX unchanged ...
);
```

`Loader2` is already imported in the file — no new import needed.

- [ ] **Step 3: Verify manually**

Start the dev server: `npm run dev`

1. Ensure no license file exists at `C:\ProgramData\Verdix\license.dat` (delete if present)
2. Navigate to `http://localhost:3000/login`
3. Expected: spinner appears briefly, then redirects to `/activate` (404 is fine — page not created yet)
4. Temporarily set `LICENSE_DEV_BYPASS=1` in `.env`, restart server
5. Navigate to `http://localhost:3000/login`
6. Expected: login form renders normally (no redirect)
7. Remove `LICENSE_DEV_BYPASS=1` from `.env`

- [ ] **Step 4: Commit**

```bash
git add app/login/page.tsx
git commit -m "feat(license): gate login page — redirect to /activate when unlicensed"
```

---

### Task 2: Create `/activate` page

**Files:**
- Create: `app/activate/page.tsx`

**Interfaces:**
- Consumes:
  - `GET /api/license/status` → `{ success: boolean, data: { status: 'unlicensed'|'expired'|'invalid'|'wrong-machine'|'active', machineId: string, expires?: string } }`
  - `POST /api/license/activate-online` body: `{ productKey: string }` → `{ success: boolean, data?: { customer: string, edition: string }, error?: string }`
  - `POST /api/license/activate` body: `{ key: string }` → `{ success: boolean, data?: { customer: string, edition: string }, error?: string }`
- Produces: on successful activation → `router.replace('/login')`

- [ ] **Step 1: Create the file with imports and types**

Create `app/activate/page.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, ShieldAlert, ShieldCheck, Copy, Check, AlertTriangle } from 'lucide-react';

type LicenseStatus = 'unlicensed' | 'expired' | 'invalid' | 'wrong-machine' | 'active' | 'loading';

interface StatusInfo {
  status: LicenseStatus;
  machineId: string;
  expires?: string | null;
}

interface ActivationResult {
  customer: string;
  edition: string;
}
```

- [ ] **Step 2: Add the component skeleton with state**

Append to `app/activate/page.tsx`:

```tsx
export default function ActivatePage() {
  const router = useRouter();

  const [statusInfo, setStatusInfo] = useState<StatusInfo>({ status: 'loading', machineId: '' });
  const [productKey, setProductKey] = useState('');
  const [signedKey, setSignedKey] = useState('');
  const [onlineError, setOnlineError] = useState('');
  const [offlineError, setOfflineError] = useState('');
  const [onlineLoading, setOnlineLoading] = useState(false);
  const [offlineLoading, setOfflineLoading] = useState(false);
  const [activation, setActivation] = useState<ActivationResult | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/license/status')
      .then((r) => r.json())
      .then((res) => {
        const data = res?.data;
        if (data?.status === 'active') {
          router.replace('/login');
          return;
        }
        setStatusInfo({
          status: data?.status ?? 'unlicensed',
          machineId: data?.machineId ?? '',
          expires: data?.expires,
        });
      })
      .catch(() => {
        setStatusInfo({ status: 'unlicensed', machineId: '' });
      });
  }, [router]);

  async function handleOnlineActivate() {
    if (!productKey.trim()) return;
    setOnlineLoading(true);
    setOnlineError('');
    try {
      const res = await fetch('/api/license/activate-online', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productKey: productKey.trim() }),
      });
      const json = await res.json();
      if (!json.success) { setOnlineError(json.error ?? 'Activation failed.'); return; }
      setActivation({ customer: json.data?.customer ?? '', edition: json.data?.edition ?? '' });
      setTimeout(() => router.replace('/login'), 2000);
    } catch {
      setOnlineError('Could not reach the server. Check your connection and try again.');
    } finally {
      setOnlineLoading(false);
    }
  }

  async function handleOfflineActivate() {
    if (!signedKey.trim()) return;
    setOfflineLoading(true);
    setOfflineError('');
    try {
      const res = await fetch('/api/license/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: signedKey.trim() }),
      });
      const json = await res.json();
      if (!json.success) { setOfflineError(json.error ?? 'Activation failed.'); return; }
      setActivation({ customer: json.data?.customer ?? '', edition: json.data?.edition ?? '' });
      setTimeout(() => router.replace('/login'), 2000);
    } catch {
      setOfflineError('Activation failed. Please check the key and try again.');
    } finally {
      setOfflineLoading(false);
    }
  }

  function copyMachineId() {
    navigator.clipboard.writeText(statusInfo.machineId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
```

- [ ] **Step 3: Add helper functions for the status banner**

Append inside the component, before the return statement:

```tsx
  function getStatusBanner() {
    const { status, expires } = statusInfo;
    if (status === 'expired') {
      const dateStr = expires ? new Date(expires).toLocaleDateString() : 'unknown date';
      return {
        variant: 'destructive' as const,
        icon: <AlertTriangle className="h-4 w-4" />,
        title: 'License Expired',
        message: `Your license expired on ${dateStr}. Contact your vendor to renew.`,
      };
    }
    if (status === 'wrong-machine') {
      return {
        variant: 'destructive' as const,
        icon: <ShieldAlert className="h-4 w-4" />,
        title: 'Wrong Machine',
        message: 'This license was issued for a different computer. Send your Machine ID to your vendor for a new key.',
      };
    }
    if (status === 'invalid') {
      return {
        variant: 'destructive' as const,
        icon: <ShieldAlert className="h-4 w-4" />,
        title: 'Invalid License',
        message: 'The installed license key is invalid or corrupted. Please re-activate.',
      };
    }
    // unlicensed (default)
    return {
      variant: 'destructive' as const,
      icon: <ShieldAlert className="h-4 w-4" />,
      title: 'Not Activated',
      message: 'This copy of Vendix is not activated. Enter your license key below to continue.',
    };
  }
```

- [ ] **Step 4: Add the return JSX — loading and success states**

Append to the component:

```tsx
  if (statusInfo.status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (activation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8 flex flex-col items-center gap-4">
            <ShieldCheck className="h-16 w-16 text-green-500" />
            <div>
              <h2 className="text-xl font-bold">Activated Successfully</h2>
              <p className="text-muted-foreground mt-1">
                {activation.customer} — {activation.edition}
              </p>
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Redirecting to login…
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
```

- [ ] **Step 5: Add the main activation UI JSX**

Append the main return to the component:

```tsx
  const banner = getStatusBanner();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-[440px] space-y-6 animate-fade-in">
        <div className="flex flex-col items-center gap-3">
          <Logo size={72} />
          <div className="text-center">
            <h1 className="text-2xl font-bold">Vendix POS</h1>
            <p className="text-sm text-muted-foreground">Software Activation</p>
          </div>
        </div>

        <Alert variant={banner.variant}>
          {banner.icon}
          <AlertTitle>{banner.title}</AlertTitle>
          <AlertDescription>{banner.message}</AlertDescription>
        </Alert>

        {statusInfo.machineId && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Your Machine ID</CardTitle>
              <CardDescription className="text-xs">
                Send this to your vendor to receive a license key for this computer.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-muted px-3 py-2 text-xs font-mono break-all leading-relaxed">
                  {statusInfo.machineId}
                </code>
                <Button variant="outline" size="icon" onClick={copyMachineId} title="Copy Machine ID">
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="pt-4">
            <Tabs defaultValue="online">
              <TabsList className="w-full mb-4">
                <TabsTrigger value="online" className="flex-1">Online Activation</TabsTrigger>
                <TabsTrigger value="offline" className="flex-1">Offline Activation</TabsTrigger>
              </TabsList>

              <TabsContent value="online" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="product-key">Product Key</Label>
                  <Input
                    id="product-key"
                    placeholder="VRDX-XXXX-XXXX-XXXX"
                    value={productKey}
                    onChange={(e) => setProductKey(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleOnlineActivate()}
                  />
                  <p className="text-xs text-muted-foreground">
                    Requires an internet connection to the license server.
                  </p>
                </div>
                {onlineError && (
                  <Alert variant="destructive">
                    <AlertDescription>{onlineError}</AlertDescription>
                  </Alert>
                )}
                <Button
                  className="w-full"
                  onClick={handleOnlineActivate}
                  disabled={onlineLoading || !productKey.trim()}
                >
                  {onlineLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Activating…</> : 'Activate Online'}
                </Button>
              </TabsContent>

              <TabsContent value="offline" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signed-key">Signed License Key</Label>
                  <Textarea
                    id="signed-key"
                    placeholder="VRDX1.eyJ…"
                    rows={5}
                    value={signedKey}
                    onChange={(e) => setSignedKey(e.target.value)}
                    className="font-mono text-xs resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Paste the full signed key provided by your vendor.
                  </p>
                </div>
                {offlineError && (
                  <Alert variant="destructive">
                    <AlertDescription>{offlineError}</AlertDescription>
                  </Alert>
                )}
                <Button
                  className="w-full"
                  onClick={handleOfflineActivate}
                  disabled={offlineLoading || !signedKey.trim()}
                >
                  {offlineLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Activating…</> : 'Activate'}
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Verify manually**

1. Ensure `C:\ProgramData\Verdix\license.dat` does not exist (delete if present)
2. `npm run dev`, navigate to `http://localhost:3000/login`
3. Expected: spinner → redirect to `/activate`
4. Expected on `/activate`: status banner "Not Activated", Machine ID box with copy button, Online/Offline tabs
5. Test copy button — machine ID should copy to clipboard
6. Test Online tab with a bad key → expected: inline error message
7. Test Offline tab with a bad key → expected: inline error message
8. Generate a valid key via `npm run license:server` dashboard, paste in Offline tab
9. Expected: success state (green shield, customer name), then redirect to `/login` after 2 seconds
10. After redirect, login form renders normally (license now active)

- [ ] **Step 7: Commit**

```bash
git add app/activate/page.tsx
git commit -m "feat(license): add /activate page with online and offline activation"
```
