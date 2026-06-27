# Task 1: Add license gate to login page

## Context
This is Task 1 of 2 for the Verdix POS license gate feature.
Working directory: `d:\VERDIX_POS\Verdix_POS`
Branch: main

## Files
- Modify: `app/login/page.tsx`

## Global Constraints
- Client components only (`'use client'`) — no server components
- Use `router.replace()` not `router.push()` for license redirects (no back-button loops)
- Fail open on network error (show login form, don't block)
- `Loader2` is already imported in `app/login/page.tsx` — no new imports needed

## What to implement

Add a license check to `LoginPage` in `app/login/page.tsx`:

### Step 1: Add `licenseChecked` state and license check `useEffect`

Add after the existing state declarations (after `const router = useRouter()`):

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

### Step 2: Gate the login form render behind `licenseChecked`

In the return statement of `LoginPage`, add an early return BEFORE the main return:

```tsx
if (!licenseChecked) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}
```

The existing main `return (...)` stays unchanged below it.

### Step 3: Commit

```bash
git add app/login/page.tsx
git commit -m "feat(license): gate login page — redirect to /activate when unlicensed"
```

## Report file
Write your full report to: `d:\VERDIX_POS\Verdix_POS\.superpowers\sdd\task-1-report.md`

Return only: status (DONE/BLOCKED/NEEDS_CONTEXT), commit hash, one-line test summary, any concerns.
