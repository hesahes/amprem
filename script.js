// ============================================================
//  API KEYS (9 keys)
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
  { id: 8, key: 'diy-418186856ce56b8b', label: 'Backup 8' }
];
const API_URL = 'https://diyymotion.vercel.app/api/am-api';
const CACHE_KEY = 'am_keys_cache';
const CACHE_EXPIRE = 60 * 1000;
const POLL_INTERVAL = 30000;

// ============================================================
//  STATE
// ============================================================
let state = {
  total: 0, success: 0, failed: 0, today: 0, history: [],
  startedAt: null, mode: 'send',
  activeKeyIndex: 0,
  keysLimit: {},
  keysQuota: {}
};

// ============================================================
//  DOM REFS
// ============================================================
const emailEl = document.getElementById('email');
const linkEl = document.getElementById('link');
const tagEl = document.getElementById('tag');
const actionBtn = document.getElementById('actionBtn');
const copyBtn = document.getElementById('copyBtn');
const clearBtn = document.getElementById('clearBtn');
const exportBtn = document.getElementById('exportBtn');
const themeBtn = document.getElementById('themeBtn');
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
//  BUAT CONTAINER KEYS DI ATAS FORM
// ============================================================
const keysContainer = document.createElement('div');
keysContainer.id = 'keysContainer';
keysContainer.style.cssText = 'margin-bottom:16px; padding:10px 12px; background:rgba(255,255,255,.03); border-radius:16px; border:1px solid rgba(255,255,255,.06);';
const firstField = document.querySelector('.field');
if (firstField) {
  firstField.parentNode.insertBefore(keysContainer, firstField);
}

// ============================================================
//  UTILITY
// ============================================================
function getErrorMessage(data) {
  if (!data) return 'Unknown error';
  if (typeof data === 'string') return data;
  if (typeof data === 'object') {
    if (data.message) return data.message;
    if (data.error) {
      if (typeof data.error === 'object') return getErrorMessage(data.error);
      return data.error;
    }
    try { return JSON.stringify(data); } catch { return String(data); }
  }
  return String(data);
}

function getErrorCode(data) {
  if (data && typeof data === 'object' && data.error && data.error.code) {
    return data.error.code;
  }
  return null;
}

function playSound(type) {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    if (type === 'success') {
      osc.frequency.value = 880; osc.type = 'sine'; gain.gain.value = 0.3;
      osc.start();
      setTimeout(() => { osc.frequency.value = 1100; }, 100);
      setTimeout(() => { osc.stop(); audioCtx.close(); }, 300);
    } else if (type === 'error') {
      osc.frequency.value = 200; osc.type = 'sawtooth'; gain.gain.value = 0.2;
      osc.start();
      setTimeout(() => { osc.stop(); audioCtx.close(); }, 400);
    } else {
      osc.frequency.value = 660; osc.type = 'sine'; gain.gain.value = 0.2;
      osc.start();
      setTimeout(() => { osc.stop(); audioCtx.close(); }, 200);
    }
  } catch (e) { console.warn('Suara error', e); }
}

// ============================================================
//  LOCALSTORAGE
// ============================================================
function loadState() {
  try {
    const saved = localStorage.getItem('am_dashboard_state');
    if (saved) {
      const parsed = JSON.parse(saved);
      state = { ...state, ...parsed };
      if (!state.keysLimit) state.keysLimit = {};
      if (!state.keysQuota) state.keysQuota = {};
    }
  } catch (e) { console.warn('load state gagal', e); }
}
function saveState() {
  try { localStorage.setItem('am_dashboard_state', JSON.stringify(state)); } catch (e) { console.warn('save state gagal', e); }
}

// ============================================================
//  CACHE UNTUK STATUS KEY
// ============================================================
function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (Date.now() - data.timestamp > CACHE_EXPIRE) return null;
    return data;
  } catch { return null; }
}
function saveCache(keysLimit, keysQuota) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      timestamp: Date.now(),
      keysLimit,
      keysQuota
    }));
  } catch (e) { console.warn('save cache gagal', e); }
}

// ============================================================
//  UI HELPERS
// ============================================================
function escapeHtml(t) { if (!t) return ''; const d=document.createElement('div'); d.textContent=t; return d.innerHTML; }
function now() { return new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'}); }
function toast(msg,type='good') {
  toastEl.className='toast '+type; toastEl.textContent=msg; toastEl.classList.add('show');
  clearTimeout(toast._t); toast._t=setTimeout(()=>toastEl.classList.remove('show'),2400);
  if(type==='good') playSound('success'); else if(type==='bad') playSound('error');
}
function addLog(msg){ const item=document.createElement('div'); item.className='log-item'; item.innerHTML=`<small>${now()}</small> ${escapeHtml(msg)}`; logEl.prepend(item); }
function renderHistory() {
  historyEl.innerHTML = state.history.length ? state.history.map((item,i)=>`
    <div class="history-item" style="animation-delay:${i*0.05}s">
      <div><strong>${escapeHtml(item.email)}</strong><span>${escapeHtml(item.result)} ${item.tag?'· '+escapeHtml(item.tag):''}</span></div>
      <div>${escapeHtml(item.time)}</div>
    </div>`).join('') : `<div class="history-item"><div><strong>Belum ada riwayat</strong><span>Hasil akan muncul di sini.</span></div><div>—</div></div>`;
}
function updateStats(){ document.getElementById('totalCount').textContent=state.total; document.getElementById('successCount').textContent=state.success; document.getElementById('failedCount').textContent=state.failed; document.getElementById('todayCount').textContent=state.today; saveState(); }
function setProgress(stepIndex){ steps.forEach((el,i)=>el.classList.toggle('active',i<=stepIndex)); const pct=[0,33,66,100][stepIndex]??0; barFill.style.width=pct+'%'; }
function setStatus(title,text){ statusTitle.textContent=title; statusText.textContent=text; }
function confettiBurst(){ confettiEl.innerHTML=''; const colors=['#60a5fa','#8b5cf6','#22c55e','#f59e0b','#ef4444','#ec4899','#14b8a6','#f97316']; const shapes=['circle','square','triangle']; for(let i=0;i<45;i++){ const piece=document.createElement('i'); const size=6+Math.random()*12; const shape=shapes[Math.floor(Math.random()*shapes.length)]; piece.style.left=Math.random()*100+'vw'; piece.style.background=colors[Math.floor(Math.random()*colors.length)]; piece.style.animationDuration=(0.8+Math.random()*1.0)+'s'; piece.style.width=size+'px'; piece.style.height=size+'px'; piece.style.borderRadius=shape==='circle'?'50%':shape==='square'?'2px':'0'; piece.style.transform='rotate('+(Math.random()*360)+'deg)'; if(shape==='triangle'){ piece.style.clipPath='polygon(50% 0%, 0% 100%, 100% 100%)'; piece.style.borderRadius='0'; } confettiEl.appendChild(piece); } setTimeout(()=>confettiEl.innerHTML='',2000); }
function validateEmail(email){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
function pushResult(ok,email,detail){ state.total+=1; state.today+=1; if(ok) state.success+=1; else state.failed+=1; state.history.unshift({email,result:ok?'Success':'Failed',detail,tag:tagEl.value.trim(),time:now()}); if(state.history.length>8) state.history.pop(); renderHistory(); updateStats(); }
function setMode(mode){
  state.mode=mode;
  if(mode==='send'){ actionBtn.textContent='Send'; actionBtn.className='btn-primary'; copyBtn.style.display='none'; linkField.style.display='none'; setProgress(0); setStatus('Ready','Isi email lalu kirim.'); }
  else { actionBtn.textContent='Verify'; actionBtn.className='btn-primary'; copyBtn.style.display='inline-block'; linkField.style.display='block'; setProgress(2); setStatus('Ready','Tempelkan link verifikasi lalu klik Verify.'); linkEl.focus(); }
  saveState();
}

// ============================================================
//  CEK LIMIT & KUOTA (PARALLEL)
// ============================================================
async function fetchKeyStatus(apiKey) {
  try {
    const url = `${API_URL}?action=info&key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 429) {
        return { daily_remaining: 0, hourly_remaining: 0, error: 'LIMIT' };
      }
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
  } catch (e) {
    return null;
  }
}

async function fetchAllKeysInBackground() {
  const promises = API_KEYS.map(item => fetchKeyStatus(item.key));
  const results = await Promise.all(promises);
  const newLimit = {};
  const newQuota = {};
  for (let i = 0; i < API_KEYS.length; i++) {
    const key = API_KEYS[i].key;
    const status = results[i];
    if (status && status.error === 'LIMIT') {
      newLimit[key] = true;
      newQuota[key] = { daily_remaining: 0, hourly_remaining: 0 };
    } else if (status && status.daily_remaining !== undefined) {
      const limit = (status.daily_remaining <= 0 || status.hourly_remaining <= 0);
      newLimit[key] = limit;
      newQuota[key] = { daily_remaining: status.daily_remaining, hourly_remaining: status.hourly_remaining };
    } else {
      newLimit[key] = state.keysLimit[key] || false;
      newQuota[key] = state.keysQuota[key] || null;
    }
  }
  state.keysLimit = newLimit;
  state.keysQuota = newQuota;
  saveState();
  saveCache(newLimit, newQuota);
  renderKeys();
  const active = getActiveKey();
  if (!active) {
    toast('⚠️ Semua API key limit!', 'bad');
  }
}

function isKeyAvailable(apiKey) {
  if (state.keysLimit[apiKey] === undefined) return true;
  return !state.keysLimit[apiKey];
}

function getActiveKey() {
  const startIdx = state.activeKeyIndex || 0;
  for (let i = 0; i < API_KEYS.length; i++) {
    const idx = (startIdx + i) % API_KEYS.length;
    const item = API_KEYS[idx];
    if (isKeyAvailable(item.key)) {
      if (idx !== state.activeKeyIndex) {
        state.activeKeyIndex = idx;
        saveState();
        toast(`🔄 Beralih ke ${item.label}`, 'good');
        addLog(`Switch key ke ${item.label}`);
      }
      return item;
    }
  }
  return null;
}

// ============================================================
//  RENDER KEYS — LABEL JELAS DAILY / HOURLY
// ============================================================
function renderKeys() {
  if (!keysContainer) return;
  let html = `<div style="display:flex; flex-wrap:wrap; gap:6px; align-items:center;">`;
  html += `<span style="font-size:11px; color:#94a3b8; margin-right:4px;">🔑 Pilih Key:</span>`;
  for (const item of API_KEYS) {
    const available = isKeyAvailable(item.key);
    const isActive = (state.activeKeyIndex === item.id);
    const quota = state.keysQuota[item.key];
    const daily = quota ? quota.daily_remaining : '?';
    const hourly = quota ? quota.hourly_remaining : '?';

    let bg = 'rgba(255,255,255,.06)';
    let color = '#94a3b8';
    let border = 'rgba(255,255,255,.06)';
    if (isActive) {
      bg = 'rgba(34,197,94,.20)';
      color = '#22c55e';
      border = 'rgba(34,197,94,.4)';
    } else if (available) {
      bg = 'rgba(34,197,94,.10)';
      color = '#22c55e';
      border = 'rgba(34,197,94,.2)';
    } else {
      bg = 'rgba(239,68,68,.15)';
      color = '#ef4444';
      border = 'rgba(239,68,68,.3)';
    }

    html += `
      <div style="display:inline-flex; align-items:center; gap:4px; background:${bg}; border:1px solid ${border}; border-radius:20px; padding:3px 8px; color:${color}; font-size:11px;">
        <span style="font-weight:600;">${item.label}</span>
        <span style="opacity:0.8; font-size:10px;">D:${daily} H:${hourly}</span>
        <button data-keyid="${item.id}" style="background:transparent; border:none; color:${color}; cursor:${available?'pointer':'not-allowed'}; font-size:10px; padding:2px 6px; border-radius:8px; ${!available?'opacity:0.5;':''}" ${!available?'disabled':''}>${isActive?'✓':'pilih'}</button>
      </div>
    `;
  }
  html += `</div>`;
  keysContainer.innerHTML = html;

  keysContainer.querySelectorAll('button[data-keyid]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = parseInt(btn.dataset.keyid);
      const item = API_KEYS.find(k => k.id === id);
      if (!item) return;
      if (!isKeyAvailable(item.key)) { toast(`❌ ${item.label} sedang limit!`,'bad'); return; }
      if (state.activeKeyIndex === id) { toast(`✅ ${item.label} sudah aktif.`,'good'); return; }
      state.activeKeyIndex = id;
      saveState();
      renderKeys();
      toast(`🔑 Beralih ke ${item.label}`,'good');
      addLog(`Manual switch ke ${item.label}`);
      fetchAllKeysInBackground();
    });
  });
}

// ============================================================
//  MAIN ACTION
// ============================================================
async function runAction() {
  const email = emailEl.value.trim();
  const tag = tagEl.value.trim();

  if (!validateEmail(email)) { setStatus('Error','Email tidak valid.'); toast('Email tidak valid.','bad'); addLog('Email tidak valid.'); return; }
  if (state.mode === 'verify') {
    const link = linkEl.value.trim();
    if (!link) { setStatus('Error','Link verifikasi wajib diisi.'); toast('Masukkan link verifikasi.','bad'); addLog('Link verifikasi kosong.'); return; }
  }

  const activeKeyItem = getActiveKey();
  if (!activeKeyItem) {
    setStatus('Error','Semua API key limit!');
    toast('❌ Semua API key habis kuota!','bad');
    addLog('Semua key limit');
    return;
  }
  const API_KEY = activeKeyItem.key;
  const keyLabel = activeKeyItem.label;

  actionBtn.disabled = true;
  const action = state.mode;

  if (action === 'send') {
    setProgress(0);
    setStatus('Sending...', `Mengirim email verifikasi (${keyLabel})...`);
    addLog(`Send started for ${email} [${keyLabel}]${tag ? ' [' + tag + ']' : ''}`);
  } else {
    setProgress(2);
    setStatus('Verifying...', `Memproses verifikasi (${keyLabel})...`);
    addLog(`Verify started for ${email} [${keyLabel}]${tag ? ' [' + tag + ']' : ''}`);
  }

  try {
    const payload = { action, email };
    if (action === 'verify') payload.link = linkEl.value.trim();

    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    addLog(`📦 Response: ${JSON.stringify(data).substring(0, 200)}...`);

    if (!res.ok) {
      const errMsg = getErrorMessage(data);
      const errCode = getErrorCode(data);
      if (errCode === 'DAILY_LIMIT_REACHED' || errCode === 'HOURLY_LIMIT_REACHED' || errCode === 'INVALID_API_KEY') {
        state.keysLimit[API_KEY] = true;
        state.keysQuota[API_KEY] = { daily_remaining: 0, hourly_remaining: 0 };
        saveState();
        saveCache(state.keysLimit, state.keysQuota);
        renderKeys();
        toast(`❌ ${keyLabel} ${errCode}`, 'bad');
        addLog(`❌ ${keyLabel} ${errCode}`);
        const nextKey = getActiveKey();
        if (nextKey) toast(`🔄 Beralih ke ${nextKey.label}`, 'good');
        throw new Error(`${keyLabel}: ${errMsg}`);
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
        toast(`Email terkirim! (${keyLabel})`,'good');
        setProgress(1);
        pushResult(true, email, data.message);
        linkEl.value = '';
        setMode('verify');
        linkEl.focus();
        setStatus('Waiting for link','Cek email kamu, salin link verifikasi, tempelkan di kolom Link.');
      } else {
        if (data.data && data.data.status === 'activated') {
          toast(`🎉 Aktivasi berhasil! (${keyLabel})`,'good');
          confettiBurst();
          setProgress(3);
          pushResult(true, email, data.message);
          emailEl.value = ''; linkEl.value = ''; emailEl.focus();
          setMode('send');
          setStatus('Done','Akun premium aktif!');
        } else {
          toast(`Verifikasi berhasil. (${keyLabel})`,'good');
          setProgress(2);
          pushResult(true, email, data.message);
        }
      }
      fetchAllKeysInBackground();
    } else {
      const errMsg = getErrorMessage(data);
      const errCode = getErrorCode(data);
      if (errCode === 'DAILY_LIMIT_REACHED' || errCode === 'HOURLY_LIMIT_REACHED' || errCode === 'INVALID_API_KEY') {
        state.keysLimit[API_KEY] = true;
        state.keysQuota[API_KEY] = { daily_remaining: 0, hourly_remaining: 0 };
        saveState();
        saveCache(state.keysLimit, state.keysQuota);
        renderKeys();
        toast(`❌ ${keyLabel} ${errCode}`, 'bad');
        addLog(`❌ ${keyLabel} ${errCode}`);
        const nextKey = getActiveKey();
        if (nextKey) toast(`🔄 Beralih ke ${nextKey.label}`, 'good');
        throw new Error(`${keyLabel}: ${errMsg}`);
      }
      throw new Error(errMsg);
    }
  } catch (err) {
    const errMsg = err.message || 'Unknown error';
    setStatus('Failed', errMsg);
    addLog(`❌ ${errMsg} (${keyLabel})`);
    toast(errMsg, 'bad');
    pushResult(false, email, errMsg);
    if (action === 'send') setProgress(0);
    else setProgress(2);
    fetchAllKeysInBackground();
  } finally {
    actionBtn.disabled = false;
  }
}

// ============================================================
//  EVENT LISTENERS
// ============================================================
actionBtn.addEventListener('click', runAction);
copyBtn.addEventListener('click', async () => {
  const link = linkEl.value.trim();
  if (!link) { toast('Tidak ada link untuk disalin.', 'warn'); return; }
  try { await navigator.clipboard.writeText(link); toast('Link disalin.','good'); } catch { toast('Gagal menyalin link.','bad'); }
});
clearBtn.addEventListener('click', () => {
  emailEl.value = ''; linkEl.value = ''; tagEl.value = '';
  setMode('send');
  toast('Form dibersihkan.','good');
  emailEl.focus();
});
exportBtn.addEventListener('click', () => {
  const data = { stats: state, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'dashboard-history.json'; a.click();
  URL.revokeObjectURL(url);
  toast('JSON diexport.','good');
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); runAction(); }
  if (e.ctrlKey && e.key.toLowerCase() === 'k') { e.preventDefault(); clearBtn.click(); }
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
//  POLLING REAL-TIME (30 DETIK)
// ============================================================
let pollTimer = null;

function startPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(() => {
    fetchAllKeysInBackground();
  }, POLL_INTERVAL);
}

// ============================================================
//  INIT
// ============================================================
(async function init() {
  loadState();
  renderHistory();
  updateStats();
  setMode(state.mode || 'send');
  setProgress(0);

  const cached = loadCache();
  if (cached) {
    state.keysLimit = cached.keysLimit;
    state.keysQuota = cached.keysQuota;
    saveState();
  }

  renderKeys();

  const active = getActiveKey();
  if (active) {
    toast(`🔑 Aktif: ${active.label}`, 'good');
  } else {
    toast('⚠️ Semua API key limit!', 'bad');
  }

  await fetchAllKeysInBackground();
  startPolling();
})();
