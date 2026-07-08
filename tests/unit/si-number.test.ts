import assert from 'node:assert/strict';
import {
  isValidSeriesPrefix,
  composeSINumber,
  validateSINumber,
  formatSINumber,
} from '../../lib/si-number';

// prefix validation
assert.equal(isValidSeriesPrefix('WEB'), true, 'WEB is valid');
assert.equal(isValidSeriesPrefix('BR2'), true, 'alphanumeric valid');
assert.equal(isValidSeriesPrefix('MAIN0001'), true, '8 chars valid');
assert.equal(isValidSeriesPrefix(''), false, 'empty invalid');
assert.equal(isValidSeriesPrefix('web'), false, 'lowercase invalid');
assert.equal(isValidSeriesPrefix('TOO-LONGX'), false, 'hyphen/>8 invalid');

// compose: pads to 6, prefixes, never truncates
assert.equal(composeSINumber('WEB', 45), 'WEB-000045', 'pads numeric counter');
assert.equal(composeSINumber('MAIN', '001234'), 'MAIN-001234', 'already-padded string');
assert.equal(composeSINumber('WEB', 1234567), 'WEB-1234567', 'no truncation beyond 6 digits');

// validate: new + legacy
assert.equal(validateSINumber('WEB-000045'), true, 'new form valid');
assert.equal(validateSINumber('001234'), true, 'legacy 6-digit valid');
assert.equal(validateSINumber('12'), true, 'legacy short valid');
assert.equal(validateSINumber('web-000045'), false, 'lowercase prefix invalid');
assert.equal(validateSINumber('WEB_000045'), false, 'wrong separator invalid');
assert.equal(validateSINumber(null), false, 'null invalid');

// format: passthrough when prefixed, pad when plain
assert.equal(formatSINumber('WEB-000045'), 'WEB-000045', 'prefixed passthrough');
assert.equal(formatSINumber('1234'), '001234', 'plain padded');
assert.equal(formatSINumber(null), '000000', 'null → zeros');

console.log('si-number: all assertions passed');
