import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

const tmp = path.join(os.tmpdir(), `verdix-cloud-${Date.now()}.dat`);
process.env.CLOUD_CONFIG_FILE = tmp;

import { saveCloudConfig, readCloudConfig, removeCloudConfig } from '../../lib/licensing/cloud-config';

const cfg = { host: 'reseau.proxy.rlwy.net', port: 25746, name: 'verdix_c_abc', user: 'u_abc', password: 'pw-123' };

// round-trip with an explicit machine id
saveCloudConfig(cfg, 'machine-A');
assert.deepEqual(readCloudConfig('machine-A'), cfg, 'round-trips config for same machine');

// file is encrypted (password not in plaintext on disk)
const onDisk = fs.readFileSync(tmp, 'utf8');
assert.ok(!onDisk.includes('pw-123'), 'password is not stored in plaintext');

// a different machine cannot decrypt → null
assert.equal(readCloudConfig('machine-B'), null, 'foreign machine cannot read config');

// remove clears it
removeCloudConfig();
assert.equal(readCloudConfig('machine-A'), null, 'removeCloudConfig clears the file');

console.log('cloud-config-store: all assertions passed');
