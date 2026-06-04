/* Verdix LMS dashboard logic (vanilla JS). */

let customersCache = [];
let signLicenseId = null;

// ── helpers ──────────────────────────────────────────────────────────────────
async function api(path, opts) {
  const res = await fetch(path, opts);
  if (res.status === 401) { location.href = '/login'; throw new Error('Not authenticated'); }
  return res.json();
}
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function fmtDate(s) { return s ? new Date(s).toLocaleDateString() : '—'; }
function show(id) { document.getElementById(id).classList.add('show'); }
function closeModal(id) { document.getElementById(id).classList.remove('show'); }

// ── tabs ─────────────────────────────────────────────────────────────────────
function showTab(tab) {
  ['overview', 'customers', 'licenses', 'activations'].forEach((t) => {
    document.getElementById('tab-' + t).classList.toggle('hidden', t !== tab);
    document.querySelector('[data-tab="' + t + '"]').classList.toggle('active', t === tab);
  });
  if (tab === 'overview') loadStats();
  if (tab === 'customers') loadCustomers();
  if (tab === 'licenses') loadLicenses();
  if (tab === 'activations') loadActivations();
}

// ── overview ─────────────────────────────────────────────────────────────────
async function loadStats() {
  const { data } = await api('/api/stats');
  const cards = [
    { n: data.customers, l: 'Customers' },
    { n: data.licenses, l: 'Licenses' },
    { n: data.activations, l: 'Active Machines' },
    { n: data.revoked, l: 'Revoked' },
  ];
  document.getElementById('stats').innerHTML = cards
    .map((c) => `<div class="stat"><div class="n">${c.n}</div><div class="l">${c.l}</div></div>`)
    .join('');
}

// ── customers ────────────────────────────────────────────────────────────────
async function loadCustomers() {
  const { data } = await api('/api/customers');
  customersCache = data;
  const el = document.getElementById('customers-table');
  if (!data.length) { el.innerHTML = '<div class="empty">No customers yet. Click “New Customer”.</div>'; return; }
  el.innerHTML = `<table><thead><tr><th>Business</th><th>Contact</th><th>Email</th><th>Phone</th><th>Licenses</th><th>Added</th></tr></thead><tbody>${
    data.map((c) => `<tr>
      <td><strong>${esc(c.business_name)}</strong></td>
      <td>${esc(c.contact_name) || '—'}</td>
      <td>${esc(c.email) || '—'}</td>
      <td>${esc(c.phone) || '—'}</td>
      <td>${c.license_count}</td>
      <td>${fmtDate(c.created_at)}</td>
    </tr>`).join('')
  }</tbody></table>`;
}
function openCustomerModal() {
  ['c-business','c-contact','c-phone','c-email','c-address','c-notes'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('c-err').classList.remove('show');
  show('customer-modal');
}
async function saveCustomer() {
  const body = {
    business_name: c_business.value, contact_name: c_contact.value, phone: c_phone.value,
    email: c_email.value, address: c_address.value, notes: c_notes.value,
  };
  const err = document.getElementById('c-err');
  if (!body.business_name.trim()) { err.textContent = 'Business name is required.'; err.classList.add('show'); return; }
  const res = await api('/api/customers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.success) { err.textContent = res.error; err.classList.add('show'); return; }
  closeModal('customer-modal'); loadCustomers();
}

// ── licenses ─────────────────────────────────────────────────────────────────
async function loadLicenses() {
  const { data } = await api('/api/licenses');
  const el = document.getElementById('licenses-table');
  if (!data.length) { el.innerHTML = '<div class="empty">No licenses yet. Click “Issue License”.</div>'; return; }
  el.innerHTML = `<table><thead><tr><th>Product Key</th><th>Customer</th><th>Edition</th><th>Type</th><th>Expires</th><th>Seats</th><th>Status</th><th></th></tr></thead><tbody>${
    data.map((l) => `<tr>
      <td><code class="key">${esc(l.product_key)}</code></td>
      <td>${esc(l.business_name)}</td>
      <td>${esc(l.edition)}</td>
      <td><span class="pill ${l.type}">${l.type}</span></td>
      <td>${l.type === 'subscription' ? fmtDate(l.expires_at) : '—'}</td>
      <td>${l.active_count}/${l.max_activations}</td>
      <td><span class="pill ${l.status}">${l.status}</span></td>
      <td style="white-space:nowrap">
        <button class="btn sm" onclick="openSignModal('${l.id}','${esc(l.product_key)}','${esc(l.business_name)}')">Generate Key</button>
        ${l.status === 'active'
          ? `<button class="btn sm danger" onclick="setStatus('${l.id}','revoked')">Revoke</button>`
          : `<button class="btn sm ghost" onclick="setStatus('${l.id}','active')">Reactivate</button>`}
      </td>
    </tr>`).join('')
  }</tbody></table>`;
}
function toggleExpiry() {
  document.getElementById('l-expiry-wrap').classList.toggle('hidden', l_type.value !== 'subscription');
}
function openLicenseModal() {
  if (!customersCache.length) { alert('Create a customer first.'); return; }
  l_customer.innerHTML = customersCache.map((c) => `<option value="${c.id}">${esc(c.business_name)}</option>`).join('');
  l_edition.value = 'standard'; l_type.value = 'perpetual'; l_days.value = ''; l_expires.value = '';
  l_seats.value = '1'; l_features.value = ''; l_notes.value = '';
  document.getElementById('l-err').classList.remove('show');
  toggleExpiry();
  show('license-modal');
}
async function saveLicense() {
  const type = l_type.value;
  const body = {
    customer_id: l_customer.value, edition: l_edition.value, type,
    max_activations: parseInt(l_seats.value || '1', 10),
    features: l_features.value.split(',').map((f) => f.trim()).filter(Boolean),
    notes: l_notes.value,
  };
  if (type === 'subscription') {
    if (l_expires.value) body.expires_at = l_expires.value;
    else if (l_days.value) body.expires_at = new Date(Date.now() + parseInt(l_days.value, 10) * 86400000).toISOString();
  }
  const err = document.getElementById('l-err');
  if (type === 'subscription' && !body.expires_at) { err.textContent = 'Set a duration or expiry date.'; err.classList.add('show'); return; }
  const res = await api('/api/licenses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.success) { err.textContent = res.error; err.classList.add('show'); return; }
  closeModal('license-modal');
  loadLicenses();
  alert('License issued!\n\nProduct Key: ' + res.data.product_key + '\n\nGive this to the customer for online activation, or click “Generate Key” to make an offline machine-bound key.');
}
async function setStatus(id, status) {
  if (status === 'revoked' && !confirm('Revoke this license? Online machines will be blocked on next check.')) return;
  const res = await api('/api/licenses/' + id + '/status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
  if (!res.success) { alert(res.error); return; }
  loadLicenses();
}

// ── sign (offline key generation) ────────────────────────────────────────────
function openSignModal(licenseId, productKey, business) {
  signLicenseId = licenseId;
  document.getElementById('sign-context').textContent = business + ' • ' + productKey;
  s_machine.value = ''; s_label.value = '';
  document.getElementById('s-err').classList.remove('show');
  document.getElementById('s-keyout').classList.add('hidden');
  document.getElementById('s-gen-btn').classList.remove('hidden');
  document.getElementById('s-copy-btn').classList.add('hidden');
  show('sign-modal');
}
async function generateKey() {
  const err = document.getElementById('s-err');
  err.classList.remove('show');
  if (!s_machine.value.trim()) { err.textContent = 'Machine ID is required.'; err.classList.add('show'); return; }
  const res = await api('/api/licenses/' + signLicenseId + '/sign', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ machineId: s_machine.value, machineLabel: s_label.value }),
  });
  if (!res.success) { err.textContent = res.error; err.classList.add('show'); return; }
  document.getElementById('s-key').textContent = res.data.signedLicense;
  document.getElementById('s-keyout').classList.remove('hidden');
  document.getElementById('s-gen-btn').classList.add('hidden');
  document.getElementById('s-copy-btn').classList.remove('hidden');
}
async function copyKey() {
  try { await navigator.clipboard.writeText(document.getElementById('s-key').textContent);
    const b = document.getElementById('s-copy-btn'); b.textContent = '✓ Copied'; setTimeout(() => b.textContent = 'Copy Key', 1500);
  } catch {}
}

// ── activations ──────────────────────────────────────────────────────────────
async function loadActivations() {
  const { data } = await api('/api/activations');
  const el = document.getElementById('activations-table');
  if (!data.length) { el.innerHTML = '<div class="empty">No activations yet.</div>'; return; }
  el.innerHTML = `<table><thead><tr><th>Customer</th><th>Product Key</th><th>Machine</th><th>Label</th><th>Status</th><th>Activated</th><th></th></tr></thead><tbody>${
    data.map((a) => `<tr>
      <td>${esc(a.business_name)}</td>
      <td><code class="key">${esc(a.product_key)}</code></td>
      <td><code class="key">${esc(a.machine_id).slice(0,20)}…</code></td>
      <td>${esc(a.machine_label) || '—'}</td>
      <td><span class="pill ${a.status === 'active' ? 'active' : 'suspended'}">${a.status}</span></td>
      <td>${fmtDate(a.activated_at)}</td>
      <td>${a.status === 'active' ? `<button class="btn sm danger" onclick="release('${a.id}')">Release</button>` : ''}</td>
    </tr>`).join('')
  }</tbody></table>`;
}
async function release(id) {
  if (!confirm('Release this seat? The machine will need to re-activate.')) return;
  const res = await api('/api/activations/' + id + '/release', { method: 'POST' });
  if (!res.success) { alert(res.error); return; }
  loadActivations();
}

// ── boot ─────────────────────────────────────────────────────────────────────
async function logout() { await api('/api/logout', { method: 'POST' }); location.href = '/login'; }
(async function init() {
  try {
    const me = await api('/api/me');
    if (me.success) document.getElementById('who').textContent = me.data.username;
  } catch {}
  loadStats();
})();
