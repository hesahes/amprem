// ============================================================
//  KONFIGURASI API
// ============================================================
const API_KEY = 'diy-b7620da759b5ad0f';
const API_URL = 'https://diyymotion.vercel.app/api/am-api';

// ============================================================
//  STATE
// ============================================================
let state = {
  total: 0,
  success: 0,
  failed: 0,
  today: 0,
  history: [],
  startedAt: null,
  mode: 'send'
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
//  NOTIFIKASI SUARA (Web Audio API)
// ============================================================
function playSound(type) {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'success') {
      osc.frequency.value = 880; // nada tinggi (A5)
      osc.type = 'sine';
      gain.gain.value = 0.3;
      osc.start();
      setTimeout(() => {
        osc.frequency.value = 1100; // naik dikit
      }, 100);
      setTimeout(() => {
        osc.stop();
        audioCtx.close();
      }, 300);
    } else if (type === 'error') {
      osc.frequency.value = 200; // nada rendah
      osc.type = 'sawtooth';
      gain.gain.value = 0.2;
      osc.start();
      setTimeout(() => {
        osc.stop();
        audioCtx.close();
      }, 400);
    } else {
      // default ding
      osc.frequency.value = 660;
      osc.type = 'sine';
      gain.gain.value = 0.2;
      osc.start();
      setTimeout(() => {
        osc.stop();
        audioCtx.close();
      }, 200);
    }
  } catch (e) {
    // Browser gak support atau user belum interaksi
    console.warn('Suara gak bisa diputar:', e);
  }
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
    }
  } catch (e) { console.warn('Gagal load state', e); }
}
function saveState() {
  try {
    localStorage.setItem('am_dashboard_state', JSON.stringify(state));
  } catch (e) { console.warn('Gagal save state', e); }
}

// ============================================================
//  HELPERS
// ============================================================
const escapeHtml = (text) => String(text)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

function now() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function toast(msg, type = 'good') {
  toastEl.className = 'toast ' + type;
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toastEl.classList.remove('show'), 2400);
  // Putar suara sesuai type
  if (type === 'good') playSound('success');
  else if (type === 'bad') playSound('error');
}

function addLog(message) {
  const item = document.createElement('div');
  item.className = 'log-item';
  item.innerHTML = `<small>${now()}</small> ${escapeHtml(message)}`;
  logEl.prepend(item);
}

function renderHistory() {
  historyEl.innerHTML = state.history.length
    ? state.history.map((item, i) => `
        <div class="history-item" style="animation-delay:${i * 0.05}s">
          <div>
            <strong>${escapeHtml(item.email)}</strong>
            <span>${escapeHtml(item.result)} ${item.tag ? '· ' + escapeHtml(item.tag) : ''}</span>
          </div>
          <div>${escapeHtml(item.time)}</div>
        </div>
      `).join('')
    : `<div class="history-item"><div><strong>Belum ada riwayat</strong><span>Hasil akan muncul di sini.</span></div><div>—</div></div>`;
}

function updateStats() {
  document.getElementById('totalCount').textContent = state.total;
  document.getElementById('successCount').textContent = state.success;
  document.getElementById('failedCount').textContent = state.failed;
  document.getElementById('todayCount').textContent = state.today;
  saveState();
}

function setProgress(stepIndex) {
  steps.forEach((el, i) => el.classList.toggle('active', i <= stepIndex));
  const pct = [0, 33, 66, 100][stepIndex] ?? 0;
  barFill.style.width = pct + '%';
}

function setStatus(title, text) {
  statusTitle.textContent = title;
  statusText.textContent = text;
}

// ============================================================
//  CONFETTI UPGRADE (Lebih Meriah)
// ============================================================
function confettiBurst() {
  confettiEl.innerHTML = '';
  const colors = ['#60a5fa', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316'];
  const shapes = ['circle', 'square', 'triangle'];
  const count = 45; // lebih banyak

  for (let i = 0; i < count; i++) {
    const piece = document.createElement('i');
    const size = 6 + Math.random() * 12;
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    piece.style.left = Math.random() * 100 + 'vw';
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDuration = (0.8 + Math.random() * 1.0) + 's';
    piece.style.width = size + 'px';
    piece.style.height = size + 'px';
    piece.style.borderRadius = shape === 'circle' ? '50%' : shape === 'square' ? '2px' : '0';
    piece.style.transform = `rotate(${Math.random() * 360}deg)`;
    // triangle pake clip-path
    if (shape === 'triangle') {
      piece.style.clipPath = 'polygon(50% 0%, 0% 100%, 100% 100%)';
      piece.style.borderRadius = '0';
    }
    confettiEl.appendChild(piece);
  }
  // Bersihkan setelah 2 detik
  setTimeout(() => confettiEl.innerHTML = '', 2000);
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function pushResult(ok, email, detail) {
  state.total += 1;
  state.today += 1;
  if (ok) state.success += 1;
  else state.failed += 1;
  state.history.unshift({
    email,
    result: ok ? 'Success' : 'Failed',
    detail,
    tag: tagEl.value.trim(),
    time: now()
  });
  if (state.history.length > 8) state.history.pop();
  renderHistory();
  updateStats();
}

// ============================================================
//  UI MODE SWITCH
// ============================================================
function setMode(mode) {
  state.mode = mode;
  if (mode === 'send') {
    actionBtn.textContent = 'Send';
    actionBtn.className = 'btn-primary';
    copyBtn.style.display = 'none';
    linkField.style.display = 'none';
    setProgress(0);
    setStatus('Ready', 'Isi email lalu kirim.');
  } else {
    actionBtn.textContent = 'Verify';
    actionBtn.className = 'btn-primary';
    copyBtn.style.display = 'inline-block';
    linkField.style.display = 'block';
    setProgress(2);
    setStatus('Ready', 'Tempelkan link verifikasi lalu klik Verify.');
    linkEl.focus();
  }
  saveState();
}

// ============================================================
//  MAIN ACTION
// ============================================================
async function runAction() {
  const email = emailEl.value.trim();
  const tag = tagEl.value.trim();

  if (!validateEmail(email)) {
    setStatus('Error', 'Email tidak valid.');
    toast('Email tidak valid.', 'bad');
    addLog('Email tidak valid.');
    return;
  }

  if (state.mode === 'verify') {
    const link = linkEl.value.trim();
    if (!link) {
      setStatus('Error', 'Link verifikasi wajib diisi.');
      toast('Masukkan link verifikasi.', 'bad');
      addLog('Link verifikasi kosong.');
      return;
    }
  }

  actionBtn.disabled = true;
  const action = state.mode;

  if (action === 'send') {
    setProgress(0);
    setStatus('Sending...', 'Mengirim email verifikasi...');
    addLog(`Send started for ${email}${tag ? ' [' + tag + ']' : ''}`);
  } else {
    setProgress(2);
    setStatus('Verifying...', 'Memproses verifikasi...');
    addLog(`Verify started for ${email}${tag ? ' [' + tag + ']' : ''}`);
  }

  try {
    const payload = { action, email };
    if (action === 'verify') payload.link = linkEl.value.trim();

    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || data.message || 'Server error');
    }

    if (data.success) {
      setStatus('Success', data.message || 'Done');
      addLog(`✅ ${data.message}`);

      if (action === 'send') {
        toast('Email terkirim! Cek inbox/spam lalu verifikasi.', 'good');
        setProgress(1);
        pushResult(true, email, data.message);
        linkEl.value = '';
        setMode('verify');
        linkEl.focus();
        setStatus('Waiting for link', 'Cek email kamu, salin link verifikasi, tempelkan di kolom Link.');
      } else {
        if (data.data && data.data.status === 'activated') {
          toast('🎉 Aktivasi berhasil!', 'good');
          confettiBurst(); // 🎊 meriah!
          setProgress(3);
          pushResult(true, email, data.message);
          emailEl.value = '';
          linkEl.value = '';
          emailEl.focus();
          setMode('send');
          setStatus('Done', 'Akun premium aktif!');
        } else {
          toast('Verifikasi berhasil.', 'good');
          setProgress(2);
          pushResult(true, email, data.message);
        }
      }
    } else {
      throw new Error(data.message || 'API gagal');
    }
  } catch (err) {
    setStatus('Failed', err.message);
    addLog(`❌ ${err.message}`);
    toast(err.message, 'bad');
    pushResult(false, email, err.message);
    if (action === 'send') setProgress(0);
    else setProgress(2);
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
  if (!link) {
    toast('Tidak ada link untuk disalin.', 'warn');
    return;
  }
  try {
    await navigator.clipboard.writeText(link);
    toast('Link disalin.', 'good');
  } catch {
    toast('Gagal menyalin link.', 'bad');
  }
});

clearBtn.addEventListener('click', () => {
  emailEl.value = '';
  linkEl.value = '';
  tagEl.value = '';
  setMode('send');
  toast('Form dibersihkan.', 'good');
  emailEl.focus();
});

exportBtn.addEventListener('click', () => {
  const data = {
    stats: state,
    exportedAt: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'dashboard-history.json';
  a.click();
  URL.revokeObjectURL(url);
  toast('JSON diexport.', 'good');
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    runAction();
  }
  if (e.ctrlKey && e.key.toLowerCase() === 'k') {
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
  toast(`Theme ${next}.`, 'good');
});

// ============================================================
//  INIT
// ============================================================
loadState();
renderHistory();
updateStats();
setMode(state.mode || 'send');
setProgress(0);
