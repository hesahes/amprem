// === STATE ===
const state = {
  total: 0,
  success: 0,
  failed: 0,
  today: 0,
  history: [],
  startedAt: null,
  mode: 'send'
};

// === DOM REFS ===
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

// === HELPERS ===
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
}

function addLog(message) {
  const item = document.createElement('div');
  item.className = 'log-item';
  item.innerHTML = `<small>${now()}</small> ${escapeHtml(message)}`;
  logEl.prepend(item);
}

function renderHistory() {
  historyEl.innerHTML = state.history.length
    ? state.history.map(item => `
        <div class="history-item">
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

function confettiBurst() {
  confettiEl.innerHTML = '';
  const colors = ['#60a5fa', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444'];
  for (let i = 0; i < 24; i++) {
    const piece = document.createElement('i');
    piece.style.left = Math.random() * 100 + 'vw';
    piece.style.background = colors[i % colors.length];
    piece.style.animationDuration = (0.9 + Math.random() * 0.6) + 's';
    piece.style.transform = `translateY(0) rotate(${Math.random() * 180}deg)`;
    piece.style.width = (8 + Math.random() * 7) + 'px';
    piece.style.height = (10 + Math.random() * 10) + 'px';
    confettiEl.appendChild(piece);
  }
  setTimeout(() => confettiEl.innerHTML = '', 1700);
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

// === UI MODE SWITCH ===
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
}

// === MAIN ACTION ===
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

    const res = await fetch('/api/am-api', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
          confettiBurst();
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

// === EVENT LISTENERS ===
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

// === THEME ===
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

// === INIT ===
setMode('send');
updateStats();
renderHistory();
setProgress(0);
