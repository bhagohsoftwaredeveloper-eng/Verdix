import assert from 'node:assert/strict';
import { evaluateSyncGate } from '../../lib/services/cloud-sync-gate';

assert.deepEqual(evaluateSyncGate({ configured: true,  licensed: true,  enabled: true  }), { open: true,  reason: 'ok' });
assert.deepEqual(evaluateSyncGate({ configured: false, licensed: true,  enabled: true  }), { open: false, reason: 'not_configured' });
assert.deepEqual(evaluateSyncGate({ configured: true,  licensed: false, enabled: true  }), { open: false, reason: 'not_licensed' });
assert.deepEqual(evaluateSyncGate({ configured: true,  licensed: true,  enabled: false }), { open: false, reason: 'disabled' });
// precedence: not_configured beats everything
assert.deepEqual(evaluateSyncGate({ configured: false, licensed: false, enabled: false }), { open: false, reason: 'not_configured' });
// not_licensed beats disabled
assert.deepEqual(evaluateSyncGate({ configured: true,  licensed: false, enabled: false }), { open: false, reason: 'not_licensed' });

console.log('cloud-sync-gate: all assertions passed');
