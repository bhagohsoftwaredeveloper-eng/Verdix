import assert from 'node:assert/strict';
import { deriveTenantNames } from '../../license-server/provision-cloud';

const a = deriveTenantNames('lic-abc-123');
assert.match(a.dbName, /^verdix_c_[0-9a-f]{10}$/, 'dbName format');
assert.match(a.dbUser, /^u_[0-9a-f]{10}$/, 'dbUser format');
assert.deepEqual(deriveTenantNames('lic-abc-123'), a, 'deterministic for same id');
assert.notEqual(deriveTenantNames('lic-xyz-999').dbName, a.dbName, 'different id → different db');

console.log('tenant-names: all assertions passed');
