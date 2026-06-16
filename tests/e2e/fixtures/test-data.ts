/**
 * Centralized test fixtures — gigamit sa prepare-test-db.ts (pag-seed) ug sa mga
 * spec (pag-assert). Usa ra ka source of truth para sa known test data.
 */

export const BUSINESS_NAME = 'Verdix Test Store';

export const TEST_PASSWORD = 'Test@1234';

export type TestUser = {
  uid: string;
  username: string;
  password: string;
  displayName: string;
  userType: 'Admin' | 'Cashier';
};

export const TEST_USERS: Record<'admin' | 'cashier', TestUser> = {
  admin: {
    uid: 'test-admin-uid',
    username: 'test.admin',
    password: TEST_PASSWORD,
    displayName: 'Test Admin',
    userType: 'Admin',
  },
  cashier: {
    uid: 'test-cashier-uid',
    username: 'test.cashier',
    password: TEST_PASSWORD,
    displayName: 'Test Cashier',
    userType: 'Cashier',
  },
};

export type TestProduct = {
  id: string;
  name: string;
  price: number;
  stock: number;
  sku: string;
  barcode: string;
};

export const TEST_PRODUCTS: TestProduct[] = [
  { id: 'test-prod-1', name: 'Test Coffee 3-in-1', price: 12.5, stock: 100, sku: 'TST-COF-001', barcode: '4800000000017' },
  { id: 'test-prod-2', name: 'Test Bottled Water 500ml', price: 20, stock: 250, sku: 'TST-WTR-002', barcode: '4800000000024' },
  { id: 'test-prod-3', name: 'Test Instant Noodles', price: 15.75, stock: 80, sku: 'TST-NDL-003', barcode: '4800000000031' },
];

/** POS terminal — ip 127.0.0.1 aron auto-match sa local test client; fallback usab
 * isip terminalsData[0] kay kini ra ang terminal.
 *
 * location MUST be '' (walay inventory location). Ang POS mo-filter sa products
 * pinaagi sa terminal.location → products.warehouse_id; ang atong test products
 * naa'y NULL warehouse_id, mao nga ang bisan unsang location mo-exclude nila. */
export const TEST_TERMINAL = {
  id: 'test-terminal-1',
  name: 'Test Counter 1',
  location: '',
  ipAddress: '127.0.0.1',
};

/** Cash payment method para sa tender flow. */
export const TEST_PAYMENT_METHOD = {
  id: 'pm-cash',
  name: 'Cash',
};
