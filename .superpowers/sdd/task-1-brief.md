### Task 1: Width-aware text formatting helpers

**Files:**
- Create: `lib/ejournal/text-format.ts`
- Test: `tests/unit/ejournal-text-format.test.ts`
- Modify: `tests/unit/run.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `colsFor(paperSize?: string): number` — 48 for `'80mm'`, else 32.
  - `money(n: number): string` — `1234.5` → `"1,234.50"`.
  - `center(text: string, width: number): string`
  - `row(left: string, right: string, width: number): string` — left+right justified, truncated to width if it overflows.
  - `divider(width: number, ch?: string): string` — `ch` repeated `width` times (default `'-'`).
  - `wrap(text: string, width: number): string[]` — word-wrap, never returns empty array (returns `['']` for empty input).

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/ejournal-text-format.test.ts
import assert from 'node:assert/strict';
import { colsFor, money, center, row, divider, wrap } from '../../lib/ejournal/text-format';

assert.equal(colsFor('80mm'), 48, '80mm is 48 cols');
assert.equal(colsFor('58mm'), 32, '58mm is 32 cols');
assert.equal(colsFor(undefined), 32, 'default is 32 cols');

assert.equal(money(1234.5), '1,234.50', 'money formats with commas and 2 decimals');
assert.equal(money(0), '0.00', 'money zero');

assert.equal(center('AB', 6), '  AB  ', 'center pads both sides');
assert.equal(center('ABCDEFG', 4), 'ABCDEFG', 'center leaves overflow untouched');

assert.equal(row('L', 'R', 6), 'L    R', 'row justifies to width');
assert.equal(row('LEFT', 'RIGHT', 6).length <= 6, true, 'row truncates overflow to width');

assert.equal(divider(4), '----', 'divider default dash');
assert.equal(divider(3, '='), '===', 'divider custom char');

assert.deepEqual(wrap('hello world foo', 5), ['hello', 'world', 'foo'], 'wrap splits on width');
assert.deepEqual(wrap('', 5), [''], 'wrap empty returns single empty line');
```

- [ ] **Step 2: Register the test and run to verify it fails**

Add `import './ejournal-text-format.test';` to `tests/unit/run.ts` (after the last import).
Run: `npm run test:unit`
Expected: FAIL — cannot find module `../../lib/ejournal/text-format`.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/ejournal/text-format.ts
export function colsFor(paperSize?: string): number {
  return paperSize === '80mm' ? 48 : 32;
}

export function money(n: number): string {
  return (Number(n) || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function center(text: string, width: number): string {
  if (text.length >= width) return text;
  const total = width - text.length;
  const left = Math.floor(total / 2);
  return ' '.repeat(left) + text + ' '.repeat(total - left);
}

export function row(left: string, right: string, width: number): string {
  const spaces = width - left.length - right.length;
  if (spaces <= 0) return `${left} ${right}`.substring(0, width);
  return `${left}${' '.repeat(spaces)}${right}`;
}

export function divider(width: number, ch: string = '-'): string {
  return ch.repeat(width);
}

export function wrap(text: string, width: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (word.length > width) {
      if (current) { lines.push(current); current = ''; }
      let rest = word;
      while (rest.length > width) {
        lines.push(rest.substring(0, width));
        rest = rest.substring(width);
      }
      current = rest;
      continue;
    }
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > width) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit`
Expected: PASS (all existing tests plus the new file).

- [ ] **Step 5: Commit**

```bash
git add lib/ejournal/text-format.ts tests/unit/ejournal-text-format.test.ts tests/unit/run.ts
git commit -m "feat(ejournal): width-aware text formatting helpers"
```

---

