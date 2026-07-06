import assert from 'node:assert/strict';
import { isMachineMatch, readLicenseKey } from '../../lib/licensing/verify';

// (a) exact hardware match (and normalization: dashes/case ignored)
assert.equal(isMachineMatch('ABCD-1234', 'ABCD-1234'), true, 'exact match');
assert.equal(isMachineMatch('abcd1234', 'ABCD-1234'), true, 'normalized match');

// (b) sentinel skips the hardware check entirely
assert.equal(isMachineMatch('HOSTED', 'ANY-OTHER-MACHINE'), true, 'sentinel bypasses hardware');
assert.equal(isMachineMatch('hosted', 'whatever'), true, 'sentinel normalized');

// (c) genuine mismatch (not sentinel) is rejected
assert.equal(isMachineMatch('MACHINE-A', 'MACHINE-B'), false, 'mismatch rejected');

// readLicenseKey: env var takes precedence over the file
process.env.LICENSE_KEY = 'VRDX1.env-token';
assert.equal(readLicenseKey(), 'VRDX1.env-token', 'env LICENSE_KEY wins over file');
delete process.env.LICENSE_KEY;

console.log('license-machine-match: all assertions passed');
