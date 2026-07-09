import assert from 'node:assert/strict';
import {
  validateSINumber,
  formatSINumber,
} from '../../lib/si-number';

// validate: plain + legacy prefixed
assert.equal(validateSINumber('WEB-000045'), true, 'legacy prefixed form valid');
assert.equal(validateSINumber('001234'), true, 'plain 6-digit valid');
assert.equal(validateSINumber('12'), true, 'plain short valid');
assert.equal(validateSINumber('web-000045'), false, 'lowercase prefix invalid');
assert.equal(validateSINumber('WEB_000045'), false, 'wrong separator invalid');
assert.equal(validateSINumber(null), false, 'null invalid');

// format: passthrough when prefixed, pad when plain
assert.equal(formatSINumber('WEB-000045'), 'WEB-000045', 'prefixed passthrough');
assert.equal(formatSINumber('1234'), '001234', 'plain padded');
assert.equal(formatSINumber(null), '000000', 'null → zeros');

console.log('si-number: all assertions passed');
