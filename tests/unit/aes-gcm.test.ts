import assert from 'node:assert/strict';
import { encryptGcm, decryptGcm, deriveKey } from '../../lib/crypto/aes-gcm';

const key = deriveKey('secret', 'machine-123');

// round-trip
const blob = encryptGcm('hello-password', key);
assert.equal(decryptGcm(blob, key), 'hello-password', 'round-trips plaintext');

// ciphertext is not plaintext
assert.ok(!blob.includes('hello-password'), 'ciphertext hides plaintext');

// wrong key → null (not throw)
assert.equal(decryptGcm(blob, deriveKey('secret', 'other-machine')), null, 'wrong key returns null');

// tampered blob → null
const tampered = 'A' + blob.slice(1);
assert.equal(decryptGcm(tampered, key), null, 'tampered blob returns null');

// malformed input → null
assert.equal(decryptGcm('not-base64!!', key), null, 'garbage returns null');

// deriveKey is deterministic and 32 bytes
assert.equal(deriveKey('a', 'b').length, 32, 'key is 32 bytes');
assert.deepEqual(deriveKey('a', 'b'), deriveKey('a', 'b'), 'deriveKey deterministic');

console.log('aes-gcm: all assertions passed');
