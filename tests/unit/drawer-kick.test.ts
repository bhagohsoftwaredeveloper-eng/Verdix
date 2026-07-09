import assert from 'node:assert/strict';
import { ReceiptGenerator, DRAWER_KICK, saleOpensDrawer } from '../../lib/receipt-generator';

// ─── saleOpensDrawer: cash detection ────────────────────────────────────
assert.equal(saleOpensDrawer({ paymentMethod: 'CASH' }), true, 'plain cash opens');
assert.equal(saleOpensDrawer({ paymentMethod: 'cash' }), true, 'lowercase cash opens');
assert.equal(saleOpensDrawer({ paymentMethod: 'CARD' }), false, 'card does not open');
assert.equal(saleOpensDrawer({ paymentMethod: 'GCASH' }), false, 'gcash is not cash');
assert.equal(saleOpensDrawer({ paymentMethod: 'CHARGE' }), false, 'charge does not open');
assert.equal(saleOpensDrawer({ paymentMethod: 'POINTS' }), false, 'points does not open');

// split tender: any cash leg opens the drawer
assert.equal(
  saleOpensDrawer({
    paymentMethod: 'MULTIPLE',
    payments: [{ method: 'CARD' }, { method: 'CASH' }],
  }),
  true,
  'split tender with a cash leg opens',
);
assert.equal(
  saleOpensDrawer({
    paymentMethod: 'MULTIPLE',
    payments: [{ method: 'CARD' }, { method: 'GCASH' }],
  }),
  false,
  'split tender with no cash leg does not open',
);
assert.equal(
  saleOpensDrawer({ paymentMethod: 'MULTIPLE', payments: [] }),
  false,
  'MULTIPLE with empty payments does not open',
);
assert.equal(saleOpensDrawer({ paymentMethod: '' }), false, 'empty method does not open');
assert.equal(saleOpensDrawer({}), false, 'missing method does not open');

// reprints and duplicate copies never re-kick
assert.equal(
  saleOpensDrawer({ paymentMethod: 'CASH', isReprint: true }),
  false,
  'reprint of a cash sale does not open',
);
assert.equal(
  saleOpensDrawer({
    paymentMethod: 'MULTIPLE',
    payments: [{ method: 'CASH' }],
    isReprint: true,
  }),
  false,
  'reprint of a split cash tender does not open',
);

// ─── generateReceipt: kick bytes embedded at the start ──────────────────
const indexOfSeq = (hay: Uint8Array, needle: number[]): number => {
  outer: for (let i = 0; i <= hay.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) if (hay[i + j] !== needle[j]) continue outer;
    return i;
  }
  return -1;
};

const baseSale = {
  items: [{ name: 'Rice 1kg', price: 60, quantity: 2, discount: 0, taxType: 'VAT' } as any],
  customer: null,
  totalDue: 120,
  change: 0,
  amountTendered: 120,
};

const gen = new ReceiptGenerator();

const cashBytes = gen.generateReceipt({ ...baseSale, paymentMethod: 'CASH' }, null);
const kickAt = indexOfSeq(cashBytes, DRAWER_KICK);
assert.notEqual(kickAt, -1, 'cash receipt contains the drawer kick pulse');

// The pulse must land before any of the body so the drawer opens while paper feeds.
// ESC @ (initialize) is 2 bytes, so the kick should sit within the first handful.
assert.ok(kickAt <= 8, `kick is at the head of the stream (found at byte ${kickAt})`);

const cardBytes = gen.generateReceipt({ ...baseSale, paymentMethod: 'CARD' }, null);
assert.equal(indexOfSeq(cardBytes, DRAWER_KICK), -1, 'card receipt has no drawer kick');

const splitBytes = gen.generateReceipt(
  {
    ...baseSale,
    paymentMethod: 'MULTIPLE',
    payments: [{ method: 'CARD', amount: 70 }, { method: 'CASH', amount: 50 }],
  },
  null,
);
assert.notEqual(indexOfSeq(splitBytes, DRAWER_KICK), -1, 'split tender with cash kicks the drawer');

// The kick must never appear on a reprint of a non-cash sale.
const chargeBytes = gen.generateReceipt({ ...baseSale, paymentMethod: 'CHARGE' }, null);
assert.equal(indexOfSeq(chargeBytes, DRAWER_KICK), -1, 'charge slip has no drawer kick');

const reprintBytes = gen.generateReceipt({ ...baseSale, paymentMethod: 'CASH', isReprint: true }, null);
assert.equal(indexOfSeq(reprintBytes, DRAWER_KICK), -1, 'reprinted cash receipt has no drawer kick');

// ─── generateDrawerKick: standalone pulse for a declined receipt ────────
const kickOnly = gen.generateDrawerKick();
assert.deepEqual(Array.from(kickOnly), DRAWER_KICK, 'standalone kick is exactly the pulse');

console.log('drawer-kick.test.ts passed');
