import assert from 'node:assert/strict';
process.env.CLOUD_CONFIG_SECRET = 'unit-test-secret';
import { encryptDbPassword, decryptDbPassword } from '../../license-server/cloud-config-crypto';

const blob = encryptDbPassword('s3cr3t-db-pw');
assert.notEqual(blob, 's3cr3t-db-pw', 'password is encrypted');
assert.equal(decryptDbPassword(blob), 's3cr3t-db-pw', 'password round-trips');
assert.equal(decryptDbPassword('garbage'), null, 'garbage returns null');

console.log('cloud-config-crypto: all assertions passed');
