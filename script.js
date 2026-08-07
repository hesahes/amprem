// ============================================================
//  KONFIGURASI LOGIN
// ============================================================
const OWNER_KEY = 'MAHES-2928';
const STORAGE_KEY = 'am_soul_key';
const KEYS_STORAGE = 'am_registered_keys';

let currentUser = null;
let registeredKeys = []; // [{ key, cooldown, lastAction }]
let keysContainer = null;
let cooldownTimer = null;

// ============================================================
//  DOM REFS
// ============================================================
const loginScreen = document.getElementById('loginScreen');
const dashboard = document.getElementById('dashboard');
const loginKeyInput = document.getElementById('loginKey');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');
const adminPanel = document.getElementById('adminPanel');
const keyList = document.getElementById('keyList');
const newKeyInput = document.getElementById('newKeyInput');
const genKeyBtn = document.getElementById('genKeyBtn');
const cooldownInput = document.getElementById('cooldownInput');
const cooldownBtn = document.getElementById('cooldownBtn');

// ============================================================
//  LOAD / SAVE KEYS
// ============================================================
function loadRegisteredKeys() {
  try {
    const d = localStorage.getItem(KEYS_STORAGE);
    registeredKeys = d ? JSON.parse(d) : [];
    registeredKeys = registeredKeys.map(k => {
      if (typeof k === 'string') return { key: k, cooldown: 0, lastAction: 0 };
      return k;
    });
  } catch { registeredKeys = []; }
}
function saveRegisteredKeys() {
  localStorage.setItem(KEYS_STORAGE, JSON.stringify(registeredKeys));
}

function getKeyData(key) {
  return registeredKeys.find(k => k.key === key);
}

function setKeyLastAction(key) {
  const data = getKeyData(key);
  if (data) {
    data.lastAction = Date.now();
    saveRegisteredKeys();
  }
}

function isKeyCooldownActive(key) {
  const data = getKeyData(key);
  if (!data || data.cooldown === 0) return false;
  const elapsed = (Date.now() - data.lastAction) / 60000;
  return elapsed < data.cooldown;
}

function getKeyCooldownRemaining(key) {
  const data = getKeyData(key);
  if (!data || data.cooldown === 0) return 0;
  const elapsed = (Date.now() - data.lastAction) / 60000;
  return Math.max(0, data.cooldown - elapsed);
}

function formatCooldown(minutes) {
  if (minutes <= 0) return '0';
  if (minutes < 1) return Math.round(minutes * 60) + 's';
  return Math.ceil(minutes) + 'm';
}

// ============================================================
//  AUTH
// ============================================================
function checkAuth() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return false;
  if (saved === OWNER_KEY) { currentUser = 'admin'; showDashboard(); return true; }
  loadRegisteredKeys();
  if (registeredKeys.some(k => k.key === saved)) { currentUser = 'user'; showDashboard(); return true; }
  localStorage.removeItem(STORAGE_KEY);
  return false;
}

function doLogin() {
  const key = loginKeyInput.value.trim();
  loginError.textContent = '';
  if (!key) { loginError.textContent = '❌ Enter a soul key.'; return; }
  if (key === OWNER_KEY) { currentUser = 'admin'; localStorage.setItem(STORAGE_KEY, key); showDashboard(); return; }
  loadRegisteredKeys();
  if (registeredKeys.some(k => k.key === key)) { currentUser = 'user'; localStorage.setItem(STORAGE_KEY, key); showDashboard(); return; }
  loginError.textContent = '❌ Invalid soul key.';
  loginKeyInput.value = '';
  loginKeyInput.focus();
}

function doLogout() {
  localStorage.removeItem(STORAGE_KEY);
  currentUser = null;
  loginScreen.style.display = 'flex';
  dashboard.style.display = 'none';
  loginKeyInput.value = '';
  loginError.textContent = '';
  loginKeyInput.focus();
  if (keysContainer) keysContainer.style.display = 'none';
  if (cooldownTimer) { clearInterval(cooldownTimer); cooldownTimer = null; }
}

function showDashboard() {
  loginScreen.style.display = 'none';
  dashboard.style.display = 'block';
  if (currentUser === 'admin') { adminPanel.style.display = 'block'; renderKeyList(); } else { adminPanel.style.display = 'none'; }
  state.userMode = 'v1';
  modeSelect.value = 'v1';
  initDashboard();
}

// ============================================================
//  ADMIN — GENERATE / DELETE KEYS
// ============================================================
function generateKey() {
  let key = newKeyInput.value.trim();
  if (!key) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let r = '';
    for (let i = 0; i < 12; i++) r += chars.charAt(Math.floor(Math.random() * chars.length));
    key = r;
  }
  if (registeredKeys.some(k => k.key === key)) { toast('⚠️ Key already exists.', 'warn'); return; }

  const cd = parseInt(cooldownInput.value) || 0;
  registeredKeys.push({ key, cooldown: cd, lastAction: 0 });
  saveRegisteredKeys();
  renderKeyList();
  renderKeys();
  newKeyInput.value = '';
  toast('✅ Key generated: ' + key + (cd > 0 ? ` (cooldown ${cd} min)` : ''), 'good');
}

function deleteKey(key) {
  if (!confirm('Delete key: ' + key + '?')) return;
  registeredKeys = registeredKeys.filter(k => k.key !== key);
  saveRegisteredKeys();
  renderKeyList();
  renderKeys();
  toast('🗑️ Key deleted.', 'warn');
}

function setKeyCooldown(key, newCooldown) {
  const data = getKeyData(key);
  if (data) {
    data.cooldown = Math.max(0, parseInt(newCooldown) || 0);
    data.lastAction = 0;
    saveRegisteredKeys();
    renderKeyList();
    renderKeys();
    toast('✅ Cooldown updated for ' + key, 'good');
  }
}

function renderKeyList() {
  if (!keyList) return;
  if (registeredKeys.length === 0) {
    keyList.innerHTML = '<span class="key-tag" style="color:var(--muted);">No keys generated yet.</span>';
    return;
  }
  let html = '';
  registeredKeys.forEach(k => {
    const cd = k.cooldown || 0;
    const remaining = getKeyCooldownRemaining(k.key);
    const isActive = remaining > 0;
    const status = isActive ? '⏳' : '✅';
    const color = isActive ? 'var(--bad)' : 'var(--good)';
    html += `<span class="key-tag">🔑 ${k.key} 
      <span style="color:${color};">${status} ${formatCooldown(remaining)}/${cd}m</span>
      <input type="number" id="cd_${k.key.replace(/-/g,'_')}" value="${cd}" min="0" style="width:40px;padding:2px;font-size:7px;background:rgba(255,255,255,.05);border:1px solid var(--line);color:var(--text);">
      <button onclick="setKeyCooldown('${k.key}', document.getElementById('cd_${k.key.replace(/-/g,'_')}').value)" style="background:transparent;border:1px solid var(--accent);color:var(--accent);padding:0 6px;font-size:7px;cursor:pointer;">SET</button>
      <span class="del" data-key="${k.key}">✕</span>
    </span>`;
  });
  keyList.innerHTML = html;
  keyList.querySelectorAll('.del').forEach(el => {
    el.addEventListener('click', () => deleteKey(el.dataset.key));
  });
}

// ============================================================
//  COOLDOWN DISPLAY PER KEY (di dashboard)
// ============================================================
function updateCooldownDisplay() {
  if (!keysContainer) return;
  const keyTags = keysContainer.querySelectorAll('.key-cooldown');
  keyTags.forEach(el => {
    const key = el.dataset.key;
    const remaining = getKeyCooldownRemaining(key);
    const data = getKeyData(key);
    const cd = data ? data.cooldown : 0;
    if (cd === 0) {
      el.textContent = 'OFF';
      el.style.color = 'var(--muted)';
    } else if (remaining > 0) {
      el.textContent = '⏳ ' + formatCooldown(remaining) + '/' + cd + 'm';
      el.style.color = 'var(--bad)';
    } else {
      el.textContent = '✅ READY';
      el.style.color = 'var(--good)';
    }
  });
}

function startCooldownTimer() {
  if (cooldownTimer) clearInterval(cooldownTimer);
  cooldownTimer = setInterval(updateCooldownDisplay, 1000);
}

// ============================================================
//  API CONFIG
// ============================================================
const API_KEYS = [
  { id: 0, key: 'diy-b7620da759b5ad0f', label: 'Utama' },
  { id: 1, key: 'diy-f7734dbc50a219df', label: 'Backup 1' },
  { id: 2, key: 'diy-6fc85638bd1dd335', label: 'Backup 2' },
  { id: 3, key: 'diy-e14db7dad56de197', label: 'Backup 3' },
  { id: 4, key: 'diy-8b9fe47a701bf25f', label: 'Backup 4' },
  { id: 5, key: 'diy-e1fdaeed1f67c0a3', label: 'Backup 5' },
  { id: 6, key: 'diy-12b138ffa913437c', label: 'Backup 6' },
  { id: 7, key: 'diy-6b5152cc66af369d', label: 'Backup 7' },
  { id: 8, key: 'diy-418186856ce56b8b', label: 'Backup 8' },
  { id: 9, key: 'diy-163791d6c57443d1', label: 'Backup 9' },
  { id: 10, key: 'diy-1dd1c108bbf80b8f', label: 'Backup 10' }
];
const API_URL = 'https://diyymotion.vercel.app/api/am-api';
const V2_API = 'https://alightmotion.qsr.web.id';
const V3_API = 'https://generator-amprem.zone.id';

let state = {
  total: 0, success: 0, failed: 0, today: 0, history: [],
  startedAt: null, mode: 'send',
  activeKeyIndex: 0,
  keysLimit: {},
  keysQuota: {},
  userMode: 'v1'
};

// ============================================================
//  DOM REFS DASHBOARD
// ============================================================
const emailEl = document.getElementById('email');
const linkEl = document.getElementById('link');
const tagEl = document.getElementById('tag');
const actionBtn = document.getElementById('actionBtn');
const copyBtn = document.getElementById('copyBtn');
const clearBtn = document.getElementById('clearBtn');
const exportBtn = document.getElementById('exportBtn');
const themeBtn = document.getElementById('themeBtn');
const modeSelect = document.getElementById('modeSelect');
const logEl = document.getElementById('log');
const historyEl = document.getElementById('history');
const toastEl = document.getElementById('toast');
const confettiEl = document.getElementById('confetti');
const statusTitle = document.getElementById('statusTitle');
const statusText = document.getElementById('statusText');
const barFill = document.getElementById('barFill');
const steps = [...document.querySelectorAll('.step')];
const linkField = document.getElementById('linkField');

// ============================================================
//  BUILD KEYS CONTAINER
// ============================================================
function buildKeysContainer() {
  if (keysContainer) return keysContainer;
  keysContainer = document.createElement('div');
  keysContainer.id = 'keysContainer';
  keysContainer.style.cssText = 'margin-bottom:16px; padding:10px 12px; background:rgba(255,255,255,.03); border:1px solid var(--line);';
  const firstField = document.querySelector('.field');
  if (firstField) firstField.parentNode.insertBefore(keysContainer, firstField);
  return keysContainer;
}

// ============================================================
//  UTILITY
// ============================================================
function getErrorMessage(d) {
  if (!d) return 'Unknown error';
  if (typeof d === 'string') return d;
  if (typeof d === 'object') {
    if (d.message) return d.message;
    if (d.error) {
      if (typeof d.error === 'object') return getErrorMessage(d.error);
      return d.error;
    }
    try { return JSON.stringify(d); } catch { return String(d); }
  }
  return String(d);
}
function getErrorCode(d) { return d && typeof d === 'object' && d.error && d.error.code ? d.error.code : null; }

function playSound(t) {
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.connect(g); g.connect(ac.destination);
    if (t === 'success') { o.frequency.value = 880; o.type = 'sine'; g.gain.value = 0.3; o.start(); setTimeout(() => { o.frequency.value = 1100; }, 100); setTimeout(() => { o.stop(); ac.close(); }, 300); }
    else if (t === 'error') { o.frequency.value = 200; o.type = 'sawtooth'; g.gain.value = 0.2; o.start(); setTimeout(() => { o.stop(); ac.close(); }, 400); }
    else { o.frequency.value = 660; o.type = 'sine'; g.gain.value = 0.2; o.start(); setTimeout(() => { o.stop(); ac.close(); }, 200); }
  } catch (e) { console.warn('Sound error', e); }
}

function loadState() {
  try { const s = localStorage.getItem('am_dashboard_state'); if (s) { const p = JSON.parse(s); state = { ...state, ...p }; if (!state.keysLimit) state.keysLimit = {}; if (!state.keysQuota) state.keysQuota = {}; } } catch (e) { console.warn('load state fail', e); } }
function saveState() { try { localStorage.setItem('am_dashboard_state', JSON.stringify(state)); } catch (e) { console.warn('save state fail', e); } }

const CACHE_KEY = 'am_keys_cache';
const CACHE_EXPIRE = 60 * 1000;
function loadCache() {
  try { const r = localStorage.getItem(CACHE_KEY); if (!r) return null; const d = JSON.parse(r); if (Date.now() - d.timestamp > CACHE_EXPIRE) return null; return d; } catch { return null; }
}
function saveCache(limit, quota) { try { localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), keysLimit: limit, keysQuota: quota })); } catch (e) { console.warn('save cache fail', e); } }

function escapeHtml(t) { if (!t) return ''; const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
function now() { return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }

function toast(msg, type = 'good') {
  toastEl.className = 'toast ' + type;
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toastEl.classList.remove('show'), 2400);
  if (type === 'good') playSound('success');
  else if (type === 'bad') playSound('error');
}

function addLog(msg) { const item = document.createElement('div'); item.className = 'log-item'; item.innerHTML = `<small>${now()}</small> ${escapeHtml(msg)}`; logEl.prepend(item); }
function renderHistory() {
  historyEl.innerHTML = state.history.length ? state.history.map((item, i) => `
    <div class="history-item" style="animation-delay:${i * 0.05}s">
      <div><strong>${escapeHtml(item.email)}</strong><span class="${item.result === 'Success' ? 'result-success' : 'result-failed'}">${escapeHtml(item.result)} ${item.tag ? '· ' + escapeHtml(item.tag) : ''}</span></div>
      <div>${escapeHtml(item.time)}</div>
    </div>`).join('') : `<div class="history-item"><div><strong>Belum ada riwayat</strong><span>Hasil akan muncul di sini.</span></div><div>—</div></div>`;
}
function updateStats() {
  document.getElementById('totalCount').textContent = state.total;
  document.getElementById('successCount').textContent = state.success;
  document.getElementById('failedCount').textContent = state.failed;
  document.getElementById('todayCount').textContent = state.today;
  saveState();
}
function setProgress(idx) {
  steps.forEach((el, i) => { el.classList.toggle('active', i <= idx); if (i === idx && idx === 3) el.classList.add('done'); });
  const pct = [0, 33, 66, 100][idx] ?? 0;
  barFill.style.width = pct + '%';
}
function setStatus(title, text) { statusTitle.textContent = title; statusText.textContent = text; }
function confettiBurst() {
  confettiEl.innerHTML = '';
  const colors = ['#60a5fa', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316'];
  const shapes = ['circle', 'square', 'triangle'];
  for (let i = 0; i < 45; i++) {
    const piece = document.createElement('i');
    const size = 6 + Math.random() * 12;
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    piece.style.left = Math.random() * 100 + 'vw';
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDuration = (0.8 + Math.random() * 1.0) + 's';
    piece.style.width = size + 'px';
    piece.style.height = size + 'px';
    piece.style.borderRadius = shape === 'circle' ? '50%' : shape === 'square' ? '2px' : '0';
    piece.style.transform = 'rotate(' + (Math.random() * 360) + 'deg)';
    if (shape === 'triangle') { piece.style.clipPath = 'polygon(50% 0%, 0% 100%, 100% 100%)'; piece.style.borderRadius = '0'; }
    confettiEl.appendChild(piece);
  }
  setTimeout(() => confettiEl.innerHTML = '', 2000);
}
function validateEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
function pushResult(ok, email, detail) {
  state.total += 1; state.today += 1;
  if (ok) state.success += 1; else state.failed += 1;
  state.history.unshift({ email, result: ok ? 'Success' : 'Failed', detail, tag: tagEl.value.trim(), time: now() });
  if (state.history.length > 8) state.history.pop();
  renderHistory();
  updateStats();
}
function setMode(mode) {
  state.mode = mode;
  if (mode === 'send') {
    actionBtn.textContent = '⚔️ SEND';
    actionBtn.className = 'btn-primary';
    copyBtn.style.display = 'none';
    linkField.style.display = 'none';
    setProgress(0);
    setStatus('❤ READY', 'Enter your email and press SEND.');
  } else {
    actionBtn.textContent = '🔍 VERIFY';
    actionBtn.className = 'btn-action';
    copyBtn.style.display = 'inline-block';
    linkField.style.display = 'block';
    setProgress(2);
    setStatus('🔍 VERIFY', 'Paste the link and press VERIFY.');
    linkEl.focus();
  }
  saveState();
}

// ============================================================
//  MODE SWITCH
// ============================================================
function setUserMode(mode) {
  state.userMode = mode;
  modeSelect.value = mode;
  if (mode === 'v1') {
    buildKeysContainer();
    if (keysContainer) keysContainer.style.display = 'block';
    document.getElementById('email').placeholder = 'your@email.com';
    document.getElementById('email').readOnly = false;
    setStatus('V1 Aktif', 'Gunakan API key diyy');
    toast('🔁 Mode V1 (API Key) aktif', 'good');
    renderKeys();
  } else {
    if (keysContainer) keysContainer.style.display = 'none';
    document.getElementById('email').placeholder = mode === 'v2' ? 'Email untuk V2' : 'Email untuk V3';
    document.getElementById('email').readOnly = false;
    setStatus(mode === 'v2' ? 'V2 Aktif' : 'V3 Aktif', mode === 'v2' ? 'Kirim email via QSR Web API' : 'Kirim email via Scrape API');
    toast(`🔁 Mode ${mode.toUpperCase()} (${mode === 'v2' ? 'QSG Web' : 'Scrape API'}) aktif`, 'good');
  }
  saveState();
}
modeSelect.addEventListener('change', (e) => setUserMode(e.target.value));

// ============================================================
//  ANTI-BOT HEADERS FOR V1
// ============================================================
function getAntiBotHeaders(apiKey) {
  const ua = navigator.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  return {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'User-Agent': ua,
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Referer': 'https://diyymotion.vercel.app/',
    'Origin': 'https://diyymotion.vercel.app',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Sec-Ch-Ua': '"Google Chrome";v="120", "Not?A_Brand";v="8", "Chromium";v="120"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'cross-site'
  };
}

// ============================================================
//  V1: KEYS
// ============================================================
async function fetchKeyStatus(apiKey) {
  try {
    const url = `${API_URL}?action=info&key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 429) return { daily_remaining: 0, hourly_remaining: 0, error: 'LIMIT' };
      return null;
    }
    const data = await res.json();
    if (data.success && data.data && data.data.quotas) {
      const q = data.data.quotas;
      return { daily_remaining: q.daily_remaining ?? 0, hourly_remaining: q.hourly_remaining ?? 0 };
    }
    if (!data.success && data.error && data.error.code) {
      const code = data.error.code;
      if (code === 'DAILY_LIMIT_REACHED' || code === 'HOURLY_LIMIT_REACHED' || code === 'INVALID_API_KEY') {
        return { daily_remaining: 0, hourly_remaining: 0, error: 'LIMIT' };
      }
    }
    return null;
  } catch { return null; }
}

async function fetchAllKeysInBackground() {
  const promises = API_KEYS.map(item => fetchKeyStatus(item.key));
  const results = await Promise.all(promises);
  const newLimit = {}, newQuota = {};
  for (let i = 0; i < API_KEYS.length; i++) {
    const key = API_KEYS[i].key;
    const status = results[i];
    if (status && status.error === 'LIMIT') { newLimit[key] = true; newQuota[key] = { daily_remaining: 0, hourly_remaining: 0 }; }
    else if (status && status.daily_remaining !== undefined) {
      const limit = (status.daily_remaining <= 0 || status.hourly_remaining <= 0);
      newLimit[key] = limit;
      newQuota[key] = { daily_remaining: status.daily_remaining, hourly_remaining: status.hourly_remaining };
    } else { newLimit[key] = state.keysLimit[key] || false; newQuota[key] = state.keysQuota[key] || null; }
  }
  state.keysLimit = newLimit;
  state.keysQuota = newQuota;
  saveState();
  saveCache(newLimit, newQuota);
  renderKeys();
}

function isKeyAvailable(apiKey) { return state.keysLimit[apiKey] === undefined ? true : !state.keysLimit[apiKey]; }

function getActiveKey() {
  const startIdx = state.activeKeyIndex || 0;
  for (let i = 0; i < API_KEYS.length; i++) {
    const idx = (startIdx + i) % API_KEYS.length;
    const item = API_KEYS[idx];
    if (isKeyAvailable(item.key)) {
      if (idx !== state.activeKeyIndex) { state.activeKeyIndex = idx; saveState(); toast(`🔄 Beralih ke ${item.label}`, 'good'); addLog(`Switch key ke ${item.label}`); }
      return item;
    }
  }
  return null;
}

function renderKeys() {
  buildKeysContainer();
  if (!keysContainer) return;
  let html = `<div style="display:flex; flex-wrap:wrap; gap:6px; align-items:center;"><span style="font-size:8px;color:var(--muted);margin-right:4px;">🔑 Pilih Key:</span>`;
  for (const item of API_KEYS) {
    const available = isKeyAvailable(item.key);
    const isActive = (state.activeKeyIndex === item.id);
    const quota = state.keysQuota[item.key];
    const daily = quota ? quota.daily_remaining : '?';
    const hourly = quota ? quota.hourly_remaining : '?';

    // Cooldown status untuk key ini
    const cdData = getKeyData(item.key);
    const cd = cdData ? cdData.cooldown : 0;
    const remaining = getKeyCooldownRemaining(item.key);
    const isCooldown = remaining > 0;
    const cdStatus = cd === 0 ? 'OFF' : (isCooldown ? '⏳' + formatCooldown(remaining) + '/' + cd + 'm' : '✅ READY');
    const cdColor = cd === 0 ? 'var(--muted)' : (isCooldown ? 'var(--bad)' : 'var(--good)');

    let bg = 'rgba(255,255,255,.06)', color = '#8a8a8a', border = 'rgba(255,255,255,.06)';
    if (isActive) { bg = 'rgba(34,197,94,.20)'; color = '#22c55e'; border = 'rgba(34,197,94,.4)'; }
    else if (available) { bg = 'rgba(34,197,94,.10)'; color = '#22c55e'; border = 'rgba(34,197,94,.2)'; }
    else { bg = 'rgba(239,68,68,.15)'; color = '#ef4444'; border = 'rgba(239,68,68,.3)'; }

    html += `<div style="display:inline-flex;align-items:center;gap:4px;background:${bg};border:1px solid ${border};padding:3px 8px;color:${color};font-size:7px;font-family:'Press Start 2P',monospace;">
      <span style="font-weight:bold;">${item.label}</span>
      <span style="opacity:0.8;">${daily}/${hourly}</span>
      <span class="key-cooldown" data-key="${item.key}" style="color:${cdColor};">${cdStatus}</span>
      <button data-keyid="${item.id}" style="background:transparent;border:none;color:${color};cursor:${available?'pointer':'not-allowed'};font-size:7px;padding:2px 6px;${!available?'opacity:0.5;':''}" ${!available?'disabled':''}>${isActive?'✓':'pilih'}</button>
    </div>`;
  }
  html += `</div>`;
  keysContainer.innerHTML = html;
  keysContainer.querySelectorAll('button[data-keyid]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = parseInt(btn.dataset.keyid);
      const item = API_KEYS.find(k => k.id === id);
      if (!item) return;
      if (!isKeyAvailable(item.key)) { toast(`❌ ${item.label} sedang limit!`, 'bad'); return; }
      if (state.activeKeyIndex === id) { toast(`✅ ${item.label} sudah aktif.`, 'good'); return; }
      state.activeKeyIndex = id;
      saveState();
      renderKeys();
      toast(`🔑 Beralih ke ${item.label}`, 'good');
      addLog(`Manual switch ke ${item.label}`);
      fetchAllKeysInBackground();
    });
  });
  // Start timer untuk update cooldown
  startCooldownTimer();
}

// ============================================================
//  V1 FETCH WITH ANTI-BOT HEADERS & AUTO-RETRY
// ============================================================
async function v1FetchWithRetry(action, email, link, key, keyLabel, retryCount = 0) {
  const payload = { action, email };
  if (action === 'verify') payload.link = link;

  const headers = getAntiBotHeaders(key);

  const res = await fetch(API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  addLog(`📦 Response (${keyLabel}): ${JSON.stringify(data).substring(0, 200)}...`);

  // Jika kena BOT_DETECTED, tandai key limit dan coba key lain
  if (data.error && data.error.code === 'BOT_DETECTED') {
    state.keysLimit[key] = true;
    state.keysQuota[key] = { daily_remaining: 0, hourly_remaining: 0 };
    saveState();
    saveCache(state.keysLimit, state.keysQuota);
    renderKeys();
    toast(`⚠️ ${keyLabel} kena BOT_DETECTED, switch ke key lain...`, 'warn');
    addLog(`❌ ${keyLabel} BOT_DETECTED`);
    // Coba cari key lain
    const nextKey = getActiveKey();
    if (nextKey) {
      toast(`🔄 Beralih ke ${nextKey.label}`, 'good');
      return await v1FetchWithRetry(action, email, link, nextKey.key, nextKey.label, retryCount + 1);
    } else {
      // Jika semua key limit, fallback ke V2
      toast('⚠️ Semua key limit, switch ke V2...', 'warn');
      state.userMode = 'v2';
      modeSelect.value = 'v2';
      setUserMode('v2');
      throw new Error('All keys blocked, switching to V2');
    }
  }

  return { res, data };
}

// ============================================================
//  MAIN ACTION (V1, V2, V3)
// ============================================================
async function runAction() {
  // Cooldown per key dicek di dalam V1
  const mode = state.userMode || 'v1';
  const email = emailEl.value.trim();
  const tag = tagEl.value.trim();

  if (!email || !validateEmail(email)) {
    setStatus('Error', 'Email tidak valid.');
    toast('Masukkan email yang valid.', 'bad');
    addLog('Email tidak valid.');
    return;
  }

  // ============================================================
  //  V1: PAKE API KEY DENGAN ANTI-BOT HEADERS
  // ============================================================
  if (mode === 'v1') {
    if (state.mode === 'verify') {
      const link = linkEl.value.trim();
      if (!link) { setStatus('Error', 'Link verifikasi wajib diisi.'); toast('Masukkan link verifikasi.', 'bad'); addLog('Link verifikasi kosong.'); return; }
    }

    const activeKeyItem = getActiveKey();
    if (!activeKeyItem) {
      setStatus('Error', 'Semua API key limit!');
      toast('❌ Semua API key habis kuota!', 'bad');
      addLog('Semua key limit');
      state.userMode = 'v2';
      modeSelect.value = 'v2';
      setUserMode('v2');
      toast('🔄 Semua key limit, switch ke V2...', 'warn');
      return;
    }

    const API_KEY = activeKeyItem.key;
    const keyLabel = activeKeyItem.label;

    // CEK COOLDOWN PER KEY
    if (isKeyCooldownActive(API_KEY)) {
      const remaining = Math.ceil(getKeyCooldownRemaining(API_KEY));
      toast(`⏱️ ${keyLabel} cooldown ${remaining}m remaining.`, 'warn');
      setStatus('⏱️ COOLDOWN', `${keyLabel} cooldown ${remaining}m remaining.`);
      return;
    }

    actionBtn.disabled = true;
    const action = state.mode;

    if (action === 'send') {
      setProgress(0);
      setStatus('Sending...', `Mengirim email verifikasi (${keyLabel})...`);
      addLog(`Send started for ${email} [${keyLabel}]`);
    } else {
      setProgress(2);
      setStatus('Verifying...', `Memproses verifikasi (${keyLabel})...`);
      addLog(`Verify started for ${email} [${keyLabel}]`);
    }

    try {
      const link = action === 'verify' ? linkEl.value.trim() : '';
      const { res, data } = await v1FetchWithRetry(action, email, link, API_KEY, keyLabel);

      if (!res.ok) {
        const errMsg = getErrorMessage(data);
        const errCode = getErrorCode(data);
        if (errCode === 'DAILY_LIMIT_REACHED' || errCode === 'HOURLY_LIMIT_REACHED' || errCode === 'INVALID_API_KEY') {
          state.keysLimit[API_KEY] = true;
          state.keysQuota[API_KEY] = { daily_remaining: 0, hourly_remaining: 0 };
          saveState(); saveCache(state.keysLimit, state.keysQuota); renderKeys();
          toast(`❌ ${keyLabel} ${errCode}`, 'bad');
          addLog(`❌ ${keyLabel} ${errCode}`);
          const nextKey = getActiveKey();
          if (nextKey) {
            toast(`🔄 Beralih ke ${nextKey.label}`, 'good');
            const newResult = await v1FetchWithRetry(action, email, link, nextKey.key, nextKey.label);
            // Kita lanjutkan dengan newResult, tapi karena ini rekursif, kita handle di sini
            // Saya sederhanakan: lempar error dan tangani di catch
            throw new Error(`${keyLabel} limit, switch to next`);
          } else {
            state.userMode = 'v2';
            modeSelect.value = 'v2';
            setUserMode('v2');
            toast('🔄 Semua key limit, switch ke V2...', 'warn');
            throw new Error('All keys limited, switched to V2');
          }
        }
        throw new Error(errMsg);
      }

      if (data.success) {
        if (action === 'send') {
          const hasOrderId = data.data && (data.data.order_id || data.data.next_step);
          if (!hasOrderId) {
            const warnMsg = '⚠️ API sukses tapi tidak ada order_id — kemungkinan email tidak terkirim.';
            setStatus('Warning', warnMsg);
            toast(warnMsg, 'warn');
            addLog(`⚠️ ${warnMsg}`);
            throw new Error(warnMsg);
          }
        }

        setStatus('Success', data.message || 'Done');
        addLog(`✅ ${data.message} (${keyLabel})`);

        if (action === 'send') {
          toast(`Email terkirim! (${keyLabel})`, 'good');
          setProgress(1);
          pushResult(true, email, data.message);
          linkEl.value = '';
          setMode('verify');
          linkEl.focus();
          setStatus('Waiting for link', 'Cek email kamu, salin link verifikasi, tempelkan di kolom Link.');
          // Update lastAction untuk cooldown key ini
          setKeyLastAction(API_KEY);
        } else {
          if (data.data && data.data.status === 'activated') {
            toast(`🎉 Aktivasi berhasil! (${keyLabel})`, 'good');
            confettiBurst();
            setProgress(3);
            pushResult(true, email, data.message);
            emailEl.value = ''; linkEl.value = ''; emailEl.focus();
            setMode('send');
            setStatus('Done', 'Akun premium aktif!');
            setKeyLastAction(API_KEY);
          } else {
            toast(`Verifikasi berhasil. (${keyLabel})`, 'good');
            setProgress(2);
            pushResult(true, email, data.message);
            setKeyLastAction(API_KEY);
          }
        }
        fetchAllKeysInBackground();
        renderKeys(); // update cooldown display
      } else {
        throw new Error(getErrorMessage(data));
      }
    } catch (err) {
      const errMsg = err.message || 'Unknown error';
      setStatus('Failed', errMsg);
      addLog(`❌ ${errMsg} (${keyLabel})`);
      toast(errMsg, 'bad');
      pushResult(false, email, errMsg);
      if (state.mode === 'send') setProgress(0);
      else setProgress(2);
      fetchAllKeysInBackground();
    } finally {
      actionBtn.disabled = false;
    }
    return;
  }

  // ============================================================
  //  V2: PAKE QSR WEB API
  // ============================================================
  if (mode === 'v2') {
    const action = state.mode;
    if (action === 'send') {
      actionBtn.disabled = true;
      setProgress(0);
      setStatus('Sending...', `Mengirim email via QSR API untuk ${email}`);
      addLog(`V2 Send: ${email}`);
      try {
        const url = `${V2_API}/api/email-prem?email=${encodeURIComponent(email)}`;
        const res = await fetch(url);
        const data = await res.json();
        addLog(`📦 V2 Send Response: ${JSON.stringify(data)}`);
        if (data.status === true && data.code === 200) {
          toast('✅ Email verifikasi terkirim!', 'good');
          setProgress(1);
          pushResult(true, email, data.message || 'Email terkirim');
          setMode('verify');
          linkEl.focus();
          setStatus('Waiting for link', 'Cek email, salin link verifikasi, tempelkan di kolom Link.');
        } else {
          throw new Error(data.message || 'Gagal kirim email via QSR');
        }
      } catch (err) {
        const errMsg = err.message || 'Unknown error';
        setStatus('Failed', errMsg);
        addLog(`❌ V2 Send Error: ${errMsg}`);
        toast(errMsg, 'bad');
        pushResult(false, email, errMsg);
        setProgress(0);
      } finally {
        actionBtn.disabled = false;
      }
      return;
    }

    if (action === 'verify') {
      const link = linkEl.value.trim();
      if (!link || !link.startsWith('http')) {
        setStatus('Error', 'Link verifikasi tidak valid.');
        toast('Masukkan link verifikasi yang valid (http...).', 'bad');
        addLog('Link V2 tidak valid');
        return;
      }

      actionBtn.disabled = true;
      setProgress(2);
      setStatus('Verifying...', `Verifikasi ${email} via QSR API`);
      addLog(`V2 Verify: ${email}`);
      try {
        const url = `${V2_API}/api/vertif-prem?email=${encodeURIComponent(email)}&link=${encodeURIComponent(link)}`;
        const res = await fetch(url);
        const data = await res.json();
        addLog(`📦 V2 Verify Response: ${JSON.stringify(data)}`);
        if (data.status === true && data.code === 200 && data.success === true) {
          toast('🎉 Aktivasi premium berhasil!', 'good');
          confettiBurst();
          setProgress(3);
          pushResult(true, email, data.message || 'Premium aktif');
          setMode('send');
          setStatus('Done', 'Akun premium aktif!');
          emailEl.value = ''; linkEl.value = ''; emailEl.focus();
        } else {
          throw new Error(data.message || 'Verifikasi gagal');
        }
      } catch (err) {
        const errMsg = err.message || 'Unknown error';
        setStatus('Failed', errMsg);
        addLog(`❌ V2 Verify Error: ${errMsg}`);
        toast(errMsg, 'bad');
        pushResult(false, email, errMsg);
        setProgress(2);
      } finally {
        actionBtn.disabled = false;
      }
      return;
    }
  }

  // ============================================================
  //  V3: PAKE SCRAPE API
  // ============================================================
  if (mode === 'v3') {
    const action = state.mode;
    if (action === 'send') {
      actionBtn.disabled = true;
      setProgress(0);
      setStatus('Sending...', `Mengirim email via V3 untuk ${email}`);
      addLog(`V3 Send: ${email}`);
      try {
        const url = `${V3_API}/api/amsend?email=${encodeURIComponent(email)}`;
        const res = await fetch(url);
        const data = await res.json();
        addLog(`📦 V3 Send Response: ${JSON.stringify(data)}`);
        if (data.status === true || data.success === true) {
          toast('✅ Email verifikasi terkirim!', 'good');
          setProgress(1);
          pushResult(true, email, data.message || 'Email terkirim');
          setMode('verify');
          linkEl.focus();
          setStatus('Waiting for link', 'Cek email, salin link verifikasi, tempelkan di kolom Link.');
        } else {
          throw new Error(data.message || data.error || 'Gagal kirim email via V3');
        }
      } catch (err) {
        const errMsg = err.message || 'Unknown error';
        setStatus('Failed', errMsg);
        addLog(`❌ V3 Send Error: ${errMsg}`);
        toast(errMsg, 'bad');
        pushResult(false, email, errMsg);
        setProgress(0);
      } finally {
        actionBtn.disabled = false;
      }
      return;
    }

    if (action === 'verify') {
      const link = linkEl.value.trim();
      if (!link || !link.startsWith('http')) {
        setStatus('Error', 'Link verifikasi tidak valid.');
        toast('Masukkan link verifikasi yang valid (http...).', 'bad');
        addLog('Link V3 tidak valid');
        return;
      }

      actionBtn.disabled = true;
      setProgress(2);
      setStatus('Verifying...', `Verifikasi ${email} via V3`);
      addLog(`V3 Verify: ${email}`);
      try {
        const url = `${V3_API}/api/amverif?email=${encodeURIComponent(email)}&link=${encodeURIComponent(link)}`;
        const res = await fetch(url);
        const data = await res.json();
        addLog(`📦 V3 Verify Response: ${JSON.stringify(data)}`);
        if (data.status === true || data.success === true) {
          toast('🎉 Aktivasi premium berhasil!', 'good');
          confettiBurst();
          setProgress(3);
          pushResult(true, email, data.message || 'Premium aktif');
          setMode('send');
          setStatus('Done', 'Akun premium aktif!');
          emailEl.value = ''; linkEl.value = ''; emailEl.focus();
        } else {
          throw new Error(data.message || data.error || 'Verifikasi gagal');
        }
      } catch (err) {
        const errMsg = err.message || 'Unknown error';
        setStatus('Failed', errMsg);
        addLog(`❌ V3 Verify Error: ${errMsg}`);
        toast(errMsg, 'bad');
        pushResult(false, email, errMsg);
        setProgress(2);
      } finally {
        actionBtn.disabled = false;
      }
      return;
    }
  }
}

// ============================================================
//  EVENT LISTENERS
// ============================================================
actionBtn.addEventListener('click', runAction);
copyBtn.addEventListener('click', async () => {
  const link = linkEl.value.trim();
  if (!link) { toast('Tidak ada link untuk disalin.', 'warn'); return; }
  try { await navigator.clipboard.writeText(link); toast('Link disalin.', 'good'); } catch { toast('Gagal menyalin link.', 'bad'); }
});
clearBtn.addEventListener('click', () => {
  emailEl.value = ''; linkEl.value = ''; tagEl.value = '';
  setMode('send');
  toast('Form dibersihkan.', 'good');
  emailEl.focus();
});
exportBtn.addEventListener('click', () => {
  const data = { stats: state, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'dashboard-history.json'; a.click();
  URL.revokeObjectURL(url);
  toast('JSON diexport.', 'good');
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && dashboard.style.display !== 'none') {
    e.preventDefault();
    runAction();
  }
  if (e.ctrlKey && e.key.toLowerCase() === 'k' && dashboard.style.display !== 'none') {
    e.preventDefault();
    clearBtn.click();
  }
});

// ============================================================
//  THEME
// ============================================================
const root = document.documentElement;
const savedTheme = localStorage.getItem('theme') || 'dark';
root.setAttribute('data-theme', savedTheme);
themeBtn.addEventListener('click', () => {
  const current = root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  toast('Theme ' + next + '.', 'good');
});

// ============================================================
//  POLLING
// ============================================================
let pollTimer = null;
function startPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(fetchAllKeysInBackground, 30000);
}

// ============================================================
//  INIT DASHBOARD
// ============================================================
function initDashboard() {
  loadState();
  renderHistory();
  updateStats();
  setMode(state.mode || 'send');
  setProgress(0);
  buildKeysContainer();
  setUserMode('v1');
  const cached = loadCache();
  if (cached) {
    state.keysLimit = cached.keysLimit;
    state.keysQuota = cached.keysQuota;
    saveState();
  }
  renderKeys();
  fetchAllKeysInBackground();
  startPolling();
  loadRegisteredKeys(); // muat data key untuk cooldown
}

// ============================================================
//  LOGIN EVENTS
// ============================================================
loginBtn.addEventListener('click', doLogin);
loginKeyInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });
logoutBtn.addEventListener('click', doLogout);
genKeyBtn.addEventListener('click', generateKey);
newKeyInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') generateKey(); });

// ============================================================
//  CHECK AUTH ON LOAD
// ============================================================
if (!checkAuth()) {
  loginScreen.style.display = 'flex';
  dashboard.style.display = 'none';
  loginKeyInput.focus();
}
