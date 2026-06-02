/**
 * server — local web GUI for issuing Verdix POS licenses.
 * ----------------------------------------------------------------------------
 * A tiny zero-dependency HTTP server (Node built-ins only) that serves a form
 * for issuing license keys, so you don't have to remember CLI flags.
 *
 * Run from the repo root:  npm run license:ui
 * Then open the printed URL (default http://localhost:4100).
 *
 * The private signing key never leaves this machine — the browser only sends
 * the license details and receives the finished key back.
 */
import http from 'http';
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

const PORT = parseInt(process.env.LICENSE_UI_PORT || '4100', 10);
const privatePath = path.join(__dirname, 'keys', 'private-key.pem');
const indexPath = path.join(__dirname, 'public', 'index.html');

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function issueLicense(input: any): { key: string; payload: LicensePayload } {
  const customer = String(input.customer || '').trim();
  const machineRaw = String(input.machineId || '').trim();
  const edition = String(input.edition || 'standard').trim();
  const features = Array.isArray(input.features)
    ? input.features
    : String(input.features || '')
        .split(',')
        .map((f: string) => f.trim())
        .filter(Boolean);

  if (!customer) throw new Error('Customer name is required.');
  if (!machineRaw) throw new Error('Machine ID is required.');

  let expires: string | null = null;
  if (input.type === 'subscription') {
    if (input.expiresDate) {
      const d = new Date(String(input.expiresDate) + 'T23:59:59');
      if (isNaN(d.getTime())) throw new Error('Invalid expiry date.');
      expires = d.toISOString();
    } else if (input.days) {
      const days = parseInt(String(input.days), 10);
      if (isNaN(days) || days <= 0) throw new Error('Invalid number of days.');
      expires = new Date(Date.now() + days * 86400000).toISOString();
    } else {
      throw new Error('Subscription requires a number of days or an expiry date.');
    }
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
  return { key: signLicense(payload, privateKey), payload };
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
      const html = fs.readFileSync(indexPath, 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }

    if (req.method === 'POST' && req.url === '/api/generate') {
      if (!fs.existsSync(privatePath)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'No private key found. Run `npm run license:keygen` first.' }));
        return;
      }
      const body = await readBody(req);
      let input: any = {};
      try {
        input = JSON.parse(body || '{}');
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON.' }));
        return;
      }
      try {
        const { key, payload } = issueLicense(input);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ key, payload }));
      } catch (e: any) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e?.message || 'Failed to generate license.' }));
      }
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  } catch (e: any) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Server error: ' + (e?.message || 'unknown'));
  }
});

server.listen(PORT, () => {
  const hasKey = fs.existsSync(privatePath);
  console.log('\n🔑 Verdix License Generator');
  console.log('   ▶ http://localhost:' + PORT + '\n');
  if (!hasKey) {
    console.log('   ⚠️  No signing key yet. Run `npm run license:keygen` first.\n');
  }
});
