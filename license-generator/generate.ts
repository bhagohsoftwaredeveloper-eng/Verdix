/**
 * generate — issue a signed Verdix POS license key from the command line.
 * ----------------------------------------------------------------------------
 * Run from the repo root, e.g.:
 *
 *   # Perpetual license locked to a machine
 *   npm run license:new -- --customer "Juan's Store" --machine ABCD-1234-...
 *
 *   # 1-year subscription
 *   npm run license:new -- --customer "Juan's Store" --machine ABCD-... --days 365
 *
 *   # Expires on a specific date, enterprise edition
 *   npm run license:new -- --customer "Acme" --machine ABCD-... \
 *       --expires 2027-12-31 --edition enterprise --features reports,multi-terminal
 *
 * The Machine ID comes from the customer's POS activation screen.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  signLicense,
  normalizeMachineId,
  LicensePayload,
  PRODUCT_ID,
  LICENSE_FORMAT_VERSION,
} from '../lib/licensing/core';

const privatePath = path.join(__dirname, 'keys', 'private-key.pem');

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      if (eq !== -1) {
        out[a.slice(2, eq)] = a.slice(eq + 1);
      } else {
        const next = argv[i + 1];
        if (next && !next.startsWith('--')) {
          out[a.slice(2)] = next;
          i++;
        } else {
          out[a.slice(2)] = 'true';
        }
      }
    }
  }
  return out;
}

function fail(msg: string): never {
  console.error('\n❌ ' + msg + '\n');
  process.exit(1);
}

function main() {
  if (!fs.existsSync(privatePath)) {
    fail('No private key found. Run `npm run license:keygen` first.');
  }

  const args = parseArgs(process.argv.slice(2));

  const customer = args.customer?.trim();
  const machineRaw = args.machine?.trim();
  const edition = (args.edition || 'standard').trim();
  const features = (args.features || '')
    .split(',')
    .map((f) => f.trim())
    .filter(Boolean);

  if (!customer) fail('Missing --customer "Business Name".');
  if (!machineRaw) fail('Missing --machine "MACHINE-ID" (from the POS activation screen).');

  // Resolve expiry: --expires YYYY-MM-DD  OR  --days N  OR  perpetual.
  let expires: string | null = null;
  if (args.expires && args.expires !== 'true') {
    const d = new Date(args.expires + 'T23:59:59');
    if (isNaN(d.getTime())) fail('Invalid --expires date. Use YYYY-MM-DD.');
    expires = d.toISOString();
  } else if (args.days && args.days !== 'true') {
    const days = parseInt(args.days, 10);
    if (isNaN(days) || days <= 0) fail('Invalid --days value.');
    expires = new Date(Date.now() + days * 86400000).toISOString();
  }

  const payload: LicensePayload = {
    v: LICENSE_FORMAT_VERSION,
    lid: crypto.randomUUID(),
    product: PRODUCT_ID,
    customer,
    edition,
    machineId: normalizeMachineId(machineRaw),
    issued: new Date().toISOString(),
    expires,
    features,
  };

  const privateKey = fs.readFileSync(privatePath, 'utf8');
  const key = signLicense(payload, privateKey);

  console.log('\n──────────────────────────────────────────────────────────────');
  console.log(' VERDIX POS LICENSE ISSUED');
  console.log('──────────────────────────────────────────────────────────────');
  console.log(' Customer   : ' + customer);
  console.log(' Edition    : ' + edition);
  console.log(' Machine ID : ' + payload.machineId);
  console.log(' Type       : ' + (expires ? 'Subscription (expires ' + expires.slice(0, 10) + ')' : 'Perpetual (no expiry)'));
  if (features.length) console.log(' Features   : ' + features.join(', '));
  console.log(' License ID : ' + payload.lid);
  console.log('──────────────────────────────────────────────────────────────');
  console.log('\nLICENSE KEY (give this to the customer):\n');
  console.log(key);
  console.log('');
}

main();
