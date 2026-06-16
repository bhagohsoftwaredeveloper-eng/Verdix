# E2E Tests (Playwright)

Browser-based end-to-end tests para sa Verdix POS Next.js web app.

## Pagdagan

```bash
npm run test:e2e          # tanan tests (headless)
npm run test:e2e:ui       # interactive UI mode (debugging)
npm run test:e2e:report   # tan-awon ang HTML report
npm run test:e2e:db       # i-recreate + i-seed ra ang test DB (manwal)
```

## Giunsa molihok

- **Isolated test server:** ang tests modagan batok sa usa ka dedicated `next dev`
  sa **port 3100** nga naka-point sa **`verdix_test`** database — DILI sa imong dev
  `verdix` (port 3000). Luwas modagan bisan naa'y dev server nga gigamit.
- **Test database:** ang [global-setup](setup/global-setup.ts) mo-recreate sa
  `verdix_test` kada run pinaagi sa pag-**clone sa schema** gikan sa dev `verdix`
  (structure ra, walay data) dayon mo-seed ug deterministic fixtures.
  - Schema-clone ang gigamit (dili migration-replay) kay ang migrations dili clean
    modagan gikan sa zero. Ang dev DB mao ang source of truth sa schema.
  - Kinahanglan ang `mysqldump`/`mysql` CLI sa PATH (MySQL Server bin).
- **Fixtures:** tan-awon ang [fixtures/test-data.ts](fixtures/test-data.ts) — usa ra
  ka source of truth sa known test users, products, ug business name.

## Test users (seeded)

| Username | Password | Type |
|----------|----------|------|
| `test.admin` | `Test@1234` | Admin |
| `test.cashier` | `Test@1234` | Cashier |

## Mga spec

- [`login.spec.ts`](login.spec.ts) — login page UI + validation (walay DB)
- [`auth.spec.ts`](auth.spec.ts) — auth flow nga gi-**mock** ang `/api/auth/login` (walay DB)
- [`db-backed.spec.ts`](db-backed.spec.ts) — tinuod nga login + seeded data batok sa `verdix_test`
- [`pos-sale.spec.ts`](pos-sale.spec.ts) — kompleto nga POS flow: cashier login → start shift →
  add product → tender → cash sale (na-save sa DB) → cart clear

## POS test gotchas (importante kung magdugang)

- **Warehouse filter:** ang POS mo-filter sa products pinaagi sa terminal `location` →
  `products.warehouse_id`. Ang test terminal `location` MUST be `''` kay ang test products
  naa'y `NULL` warehouse_id (kung dili, mawala tanan products sa POS).
- **transaction_references:** ang checkout nagkinahanglan ug row nga `id=1` para sa OR/
  receipt numbering — gi-seed na sa `prepare-test-db.ts`.
- **Shift isolation:** ang POS mo-resume ug active shift, mao nga ang [`helpers/db.ts`](helpers/db.ts)
  `resetPosState()` gi-tawag sa `beforeEach` aron limpyo ang shift/sale state.

## Pag-add ug bag-ong test

1. Para sa pure UI/logic → i-mock ang network (tan-awon `helpers/auth.ts`).
2. Para sa tinuod nga business logic → gamita ang seeded fixtures ug `realLogin()`.
3. Kung magdugang ug bag-ong fixture data, i-add sa `fixtures/test-data.ts` UG
   i-seed sa `setup/prepare-test-db.ts`.

> ⚠️ Ang test DB drop/seed naa'y hard guard batok sa `verdix` — dili gyud ni
> makahilabot sa imong dev/prod data.
