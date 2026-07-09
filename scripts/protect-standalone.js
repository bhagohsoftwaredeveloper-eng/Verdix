/**
 * scripts/protect-standalone.js
 *
 * Compiles the Next.js standalone server code to V8 bytecode (.dll files) so
 * the installed app ships no readable JavaScript source. Run AFTER
 * `npm run build` and BEFORE packaging the installer (wired into
 * `npm run build:installer`).
 *
 * How it works:
 *  - Every .js under .next/standalone/.next/server/ plus the server.js entry
 *    is compiled with bytenode into a sibling .dll (V8 bytecode, NOT a native
 *    Windows DLL — the extension is cosmetic).
 *  - The original .js is replaced by a tiny loader stub, so all of Next's
 *    internal require() paths keep working unchanged.
 *  - dll-register.js (plain JS) teaches Node to load .dll bytecode via
 *    bytenode; bytenode itself is copied into the standalone node_modules.
 *
 * IMPORTANT: bytecode only runs on the exact V8 version that compiled it.
 * This script must run under the SAME node.exe that setup.iss bundles
 * (C:\Program Files\nodejs\node.exe) — which is the node running this script.
 *
 * Idempotent: already-converted stubs (marked VDX-DLL-STUB) are skipped.
 */
const fs = require('fs');
const path = require('path');
const bytenode = require('bytenode');

const ROOT = path.resolve(__dirname, '..');
const STANDALONE = path.join(ROOT, '.next', 'standalone');
const SERVER_DIR = path.join(STANDALONE, '.next', 'server');
const STUB_MARK = '/*VDX-DLL-STUB*/';
const REGISTER = 'dll-register.js';

if (!fs.existsSync(SERVER_DIR)) {
  console.error('No .next/standalone build found — run `npm run build` first.');
  process.exit(1);
}

function* walkJs(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue; // public packages — leave as-is
      yield* walkJs(full);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      // Manifest files are loaded with vm.runInNewContext (no require available),
      // not require() — they must stay plain JS. They hold no business logic.
      if (/-manifest\.js$/.test(entry.name)) continue;
      yield full;
    }
  }
}

function relRequire(fromFile, toFile) {
  let rel = path.relative(path.dirname(fromFile), toFile).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel;
}

async function protectFile(jsFile) {
  const src = fs.readFileSync(jsFile, 'utf8');
  if (src.startsWith(STUB_MARK)) return false; // already converted

  const dllFile = jsFile.slice(0, -3) + '.dll';
  await bytenode.compileFile({
    filename: jsFile,
    output: dllFile,
    compileAsModule: true,
  });

  const stub =
    `${STUB_MARK}'use strict';\n` +
    `require(${JSON.stringify(relRequire(jsFile, path.join(STANDALONE, REGISTER)))});\n` +
    `module.exports = require(${JSON.stringify('./' + path.basename(dllFile))});\n`;
  fs.writeFileSync(jsFile, stub);
  return true;
}

(async () => {
  // 1. The loader that teaches Node the .dll bytecode extension (stays plain JS).
  fs.writeFileSync(path.join(STANDALONE, REGISTER),
    `'use strict';\n` +
    `const Module = require('module');\n` +
    `require('bytenode');\n` +
    `Module._extensions['.dll'] = Module._extensions['.jsc'];\n`
  );

  // 2. Ship bytenode inside the standalone node_modules (stubs require it).
  const byteSrc = path.dirname(require.resolve('bytenode/package.json'));
  const byteDest = path.join(STANDALONE, 'node_modules', 'bytenode');
  fs.cpSync(byteSrc, byteDest, { recursive: true });

  // 3. Compile everything under .next/server + the server.js entry.
  const targets = [...walkJs(SERVER_DIR)];
  const entry = path.join(STANDALONE, 'server.js');
  if (fs.existsSync(entry)) targets.push(entry);

  let compiled = 0;
  for (const f of targets) {
    if (await protectFile(f)) compiled++;
  }
  console.log(`Protected ${compiled}/${targets.length} file(s) → V8 bytecode (.dll) under .next/standalone`);
})().catch((e) => { console.error('protect-standalone failed:', e); process.exit(1); });
