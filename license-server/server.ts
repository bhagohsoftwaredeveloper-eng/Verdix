/**
 * License Management System — HTTP server.
 * ----------------------------------------------------------------------------
 * Serves the admin dashboard + JSON APIs for managing customers, licenses and
 * activations, and issuing machine-bound signed license keys.
 *
 * Run from the repo root:  npm run license:server
 * Default: http://localhost:4100   (override with LICENSE_UI_PORT)
 *
 * NOTE: Online POS activation endpoints (Phase 2) will be added to this same
 * server later. This build covers the management dashboard (Phases 1 & 3).
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { migrate } from './schema';
import {
  getAdminByUsername,
  verifyPassword,
  createSession,
  verifySession,
  touchLogin,
  anyAdminExists,
  SessionPayload,
} from './auth';
import * as svc from './service';
import { hasPrivateKey } from './keys';

dotenv.config();

const PORT = parseInt(process.env.LICENSE_UI_PORT || '4100', 10);
const PUBLIC_DIR = path.join(__dirname, 'public');
const IS_PROD = process.env.NODE_ENV === 'production';

// ── Small HTTP helpers ───────────────────────────────────────────────────────
type Req = http.IncomingMessage;
type Res = http.ServerResponse;

function sendJson(res: Res, status: number, data: any) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}

function sendFile(res: Res, file: string, type: string) {
  try {
    const content = fs.readFileSync(path.join(PUBLIC_DIR, file));
    res.writeHead(200, { 'Content-Type': type });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}

function readBody(req: Req): Promise<any> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

function parseCookies(req: Req): Record<string, string> {
  const header = req.headers.cookie || '';
  const out: Record<string, string> = {};
  header.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx > -1) out[pair.slice(0, idx).trim()] = decodeURIComponent(pair.slice(idx + 1).trim());
  });
  return out;
}

function setSessionCookie(res: Res, token: string) {
  const parts = [
    `lms_session=${token}`,
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    `Max-Age=${12 * 60 * 60}`,
  ];
  if (IS_PROD) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearSessionCookie(res: Res) {
  res.setHeader('Set-Cookie', 'lms_session=; HttpOnly; Path=/; Max-Age=0');
}

function getSession(req: Req): SessionPayload | null {
  return verifySession(parseCookies(req).lms_session);
}

function clientIp(req: Req): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    ''
  );
}

// ── Router ───────────────────────────────────────────────────────────────────
async function handle(req: Req, res: Res) {
  const url = new URL(req.url || '/', `http://localhost:${PORT}`);
  const p = url.pathname;
  const method = req.method || 'GET';

  // --- Static / pages ---
  if (method === 'GET' && (p === '/login' || p === '/login.html')) {
    return sendFile(res, 'login.html', 'text/html; charset=utf-8');
  }
  if (method === 'GET' && (p === '/' || p === '/index.html' || p === '/dashboard')) {
    if (!getSession(req)) {
      res.writeHead(302, { Location: '/login' });
      return res.end();
    }
    return sendFile(res, 'dashboard.html', 'text/html; charset=utf-8');
  }
  if (method === 'GET' && p === '/app.js') {
    return sendFile(res, 'app.js', 'text/javascript; charset=utf-8');
  }

  // --- Auth APIs ---
  if (method === 'POST' && p === '/api/login') {
    const { username, password } = await readBody(req);
    const user = await getAdminByUsername(String(username || ''));
    if (!user || !(await verifyPassword(String(password || ''), user.password_hash))) {
      return sendJson(res, 401, { success: false, error: 'Invalid username or password.' });
    }
    await touchLogin(user.id);
    setSessionCookie(res, createSession(user));
    return sendJson(res, 200, { success: true, user: { username: user.username, role: user.role } });
  }
  if (method === 'POST' && p === '/api/logout') {
    clearSessionCookie(res);
    return sendJson(res, 200, { success: true });
  }

  // --- Everything below requires a valid session ---
  const session = getSession(req);
  if (p.startsWith('/api/')) {
    if (!session) return sendJson(res, 401, { success: false, error: 'Not authenticated.' });

    try {
      // GET /api/me
      if (method === 'GET' && p === '/api/me') {
        return sendJson(res, 200, { success: true, data: { username: session.username, role: session.role } });
      }

      // GET /api/stats
      if (method === 'GET' && p === '/api/stats') {
        return sendJson(res, 200, { success: true, data: await svc.dashboardStats() });
      }

      // Customers
      if (method === 'GET' && p === '/api/customers') {
        return sendJson(res, 200, { success: true, data: await svc.listCustomers() });
      }
      if (method === 'POST' && p === '/api/customers') {
        const body = await readBody(req);
        if (!body.business_name?.trim())
          return sendJson(res, 400, { success: false, error: 'Business name is required.' });
        return sendJson(res, 200, { success: true, data: await svc.createCustomer(body) });
      }

      // Licenses
      if (method === 'GET' && p === '/api/licenses') {
        return sendJson(res, 200, { success: true, data: await svc.listLicenses() });
      }
      if (method === 'POST' && p === '/api/licenses') {
        const body = await readBody(req);
        if (!body.customer_id) return sendJson(res, 400, { success: false, error: 'customer_id required.' });
        const lic = await svc.createLicense({ ...body, created_by: session.username });
        return sendJson(res, 200, { success: true, data: lic });
      }

      // /api/licenses/:id/(status|sign)
      const licMatch = p.match(/^\/api\/licenses\/([^/]+)\/(status|sign)$/);
      if (method === 'POST' && licMatch) {
        const [, id, action] = licMatch;
        const license = await svc.getLicense(id);
        if (!license) return sendJson(res, 404, { success: false, error: 'License not found.' });
        const body = await readBody(req);

        if (action === 'status') {
          const status = body.status;
          if (!['active', 'suspended', 'revoked'].includes(status))
            return sendJson(res, 400, { success: false, error: 'Invalid status.' });
          await svc.setLicenseStatus(id, status);
          return sendJson(res, 200, { success: true });
        }

        if (action === 'sign') {
          if (license.status !== 'active')
            return sendJson(res, 400, { success: false, error: `License is ${license.status}.` });
          if (!body.machineId?.trim())
            return sendJson(res, 400, { success: false, error: 'Machine ID is required.' });

          // Enforce seat limit for NEW machines.
          const already = await svc.machineAlreadyActivated(id, body.machineId);
          if (!already) {
            const used = await svc.countActiveActivations(id);
            if (used >= license.max_activations)
              return sendJson(res, 400, {
                success: false,
                error: `Activation limit reached (${used}/${license.max_activations}). Release a seat first.`,
              });
          }

          const { signedLicense, payload } = await svc.issueSignedLicense(license, body.machineId, {
            machineLabel: body.machineLabel,
            ip: clientIp(req),
          });
          return sendJson(res, 200, { success: true, data: { signedLicense, payload } });
        }
      }

      // Activations
      if (method === 'GET' && p === '/api/activations') {
        const licenseId = url.searchParams.get('licenseId') || undefined;
        return sendJson(res, 200, { success: true, data: await svc.listActivations(licenseId) });
      }
      const relMatch = p.match(/^\/api\/activations\/([^/]+)\/release$/);
      if (method === 'POST' && relMatch) {
        await svc.releaseActivation(relMatch[1]);
        return sendJson(res, 200, { success: true });
      }

      return sendJson(res, 404, { success: false, error: 'Unknown endpoint.' });
    } catch (e: any) {
      console.error('API error:', e);
      return sendJson(res, 500, { success: false, error: e?.message || 'Server error.' });
    }
  }

  res.writeHead(404);
  res.end('Not found');
}

// ── Boot ─────────────────────────────────────────────────────────────────────
async function boot() {
  console.log('\n🔧 Preparing License Server…');
  try {
    await migrate();
  } catch (e: any) {
    console.error('❌ Database not ready:', e.message);
    console.error('   Check your LICENSE_DB_* / CLOUD_DB_* settings in .env\n');
    process.exit(1);
  }

  if (!hasPrivateKey()) {
    console.warn('⚠️  No signing key found. Run `npm run license:keygen` (signing will fail).');
  }
  if (!(await anyAdminExists())) {
    console.warn('⚠️  No admin user yet. Run `npm run license:seed-admin` to create one.');
  }

  http.createServer((req, res) => {
    handle(req, res).catch((e) => {
      console.error('Unhandled:', e);
      try {
        res.writeHead(500);
        res.end('Server error');
      } catch {
        /* noop */
      }
    });
  }).listen(PORT, () => {
    console.log('\n🔑 Verdix License Management System');
    console.log('   ▶ http://localhost:' + PORT + '\n');
  });
}

boot();
