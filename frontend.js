const INDEX_HTML = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Temp Number — Free SMS Receiver</title>
<script src="https://cdn.tailwindcss.com"></script>
<script>tailwind.config = { darkMode: 'class' };</script>
<style>
  html, body { height: 100%; }
  .scroll-y { overflow-y: auto; }
  .scroll-y::-webkit-scrollbar { width: 8px; }
  .scroll-y::-webkit-scrollbar-thumb { background: #4b5563; border-radius: 4px; }
  .otp { background: linear-gradient(90deg, #f59e0b22, #ef444422); border: 1px dashed #f59e0b; }
  .pulse-dot { animation: pulse 1.5s infinite; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
</style>
</head>
<body class="dark bg-slate-950 text-slate-100">
<div class="flex flex-col h-screen">
  <header class="border-b border-slate-800 bg-slate-900/60 backdrop-blur px-4 py-3 flex items-center gap-3">
    <div class="text-2xl">📨</div>
    <div class="flex-1">
      <h1 class="text-lg font-semibold">Temp Number</h1>
      <p class="text-xs text-slate-400">Free public SMS receiver — multi-source aggregator ⚡</p>
    </div>
    <button id="refreshBtn" class="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-sm font-medium">↻ Refresh</button>
  </header>
  <div class="flex flex-1 overflow-hidden">
    <aside class="w-full sm:w-96 border-r border-slate-800 flex flex-col">
      <div class="p-3 border-b border-slate-800 space-y-2">
        <input id="search" type="text" placeholder="Cari nomor / negara…"
          class="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 text-sm focus:outline-none focus:border-emerald-500" />
        <div class="flex gap-2">
          <select id="providerFilter" class="flex-1 px-2 py-1.5 rounded bg-slate-800 border border-slate-700 text-sm">
            <option value="">Semua sumber</option>
          </select>
          <select id="countryFilter" class="flex-1 px-2 py-1.5 rounded bg-slate-800 border border-slate-700 text-sm">
            <option value="">Semua negara</option>
          </select>
        </div>
        <p id="status" class="text-xs text-slate-400">Memuat…</p>
      </div>
      <div id="numbersList" class="scroll-y flex-1 p-2 space-y-1.5"></div>
    </aside>
    <main class="flex-1 flex flex-col bg-slate-900/30">
      <div id="inboxHeader" class="border-b border-slate-800 p-4 flex items-center gap-3">
        <div class="text-3xl">👈</div>
        <div>
          <div class="font-semibold text-slate-300">Pilih nomor di sebelah kiri</div>
          <div class="text-xs text-slate-500">Inbox akan auto-refresh tiap 10 detik</div>
        </div>
      </div>
      <div id="inbox" class="scroll-y flex-1 p-4 space-y-3"></div>
      <footer class="border-t border-slate-800 p-2 text-center text-[11px] text-slate-500">
        ⚠️ Nomor di sini publik. <b>Jangan</b> dipakai untuk akun penting (bank, email utama, e-wallet).
      </footer>
    </main>
  </div>
</div>
<script>`;

// APP_JS will be injected inline — no separate /app.js request needed
const APP_JS = `
const $ = (s) => document.querySelector(s);
const numbersListEl = $('#numbersList');
const statusEl = $('#status');
const providerFilterEl = $('#providerFilter');
const countryFilterEl = $('#countryFilter');
const searchEl = $('#search');
const inboxEl = $('#inbox');
const inboxHeaderEl = $('#inboxHeader');
const refreshBtn = $('#refreshBtn');

let state = { numbers: [], current: null, refreshTimer: null };

async function loadProviders() {
  const r = await fetch('_sms/providers').then(r => r.json());
  r.forEach(p => {
    const o = document.createElement('option');
    o.value = p.id; o.textContent = p.name;
    providerFilterEl.appendChild(o);
  });
}

async function loadNumbers() {
  statusEl.textContent = 'Memuat daftar nomor…';
  numbersListEl.innerHTML = '';
  try {
    const provider = providerFilterEl.value;
    const url = '_sms/numbers' + (provider ? '?provider=' + provider : '');
    const data = await fetch(url).then(r => r.json());
    state.numbers = data.numbers || [];
    populateCountryFilter();
    renderNumbers();

    if (data.errors && data.errors.length) {
      const errItems = data.errors.map(e =>
        '<div class="text-[11px] text-red-400 truncate" title="' + escapeHTML(e.error) + '">⚠ <b>' + e.provider + '</b>: ' + escapeHTML(e.error) + '</div>'
      ).join('');
      const countText = data.count > 0
        ? '<span class="text-emerald-400">' + data.count + ' nomor ditemukan</span>'
        : '<span class="text-red-400">0 nomor — semua source gagal</span>';
      statusEl.innerHTML = countText + errItems;
    } else {
      statusEl.textContent = data.count + ' nomor ditemukan';
    }

    // Jika tidak ada nomor sama sekali, tampilkan diagnostics
    if (state.numbers.length === 0) {
      showDiagnostics();
    }
  } catch (e) {
    statusEl.textContent = 'Gagal memuat: ' + e.message;
    showDiagnostics();
  }
}

async function showDiagnostics() {
  numbersListEl.innerHTML =
    '<div class="p-3 rounded border border-yellow-700 bg-yellow-900/20 text-xs space-y-1">' +
    '<div class="font-semibold text-yellow-300">🔍 Mendiagnosis koneksi ke source…</div>' +
    '</div>';
  try {
    const dbg = await fetch('_sms/debug').then(r => r.json());
    const rows = Object.entries(dbg).map(([url, v]) => {
      const short = url.replace('https://', '').split('/')[0];
      if (v.error) {
        return '<tr><td class="pr-2 text-slate-300 truncate max-w-[120px]" title="' + url + '">' + short + '</td>' +
               '<td class="text-red-400">✗ ERROR</td>' +
               '<td class="text-red-300 text-[10px] max-w-[160px] truncate" title="' + escapeHTML(v.error) + '">' + escapeHTML(v.error) + '</td></tr>';
      }
      const ok = v.status === 200;
      return '<tr><td class="pr-2 text-slate-300 truncate max-w-[120px]" title="' + url + '">' + short + '</td>' +
             '<td class="' + (ok ? 'text-emerald-400' : 'text-red-400') + '">' + (ok ? '✓ ' : '✗ ') + v.status + '</td>' +
             '<td class="text-slate-400 text-[10px]">' + v.bytes + 'B · ' + v.ms + 'ms</td></tr>';
    }).join('');
    numbersListEl.innerHTML =
      '<div class="p-3 rounded border border-yellow-700 bg-yellow-900/20 text-xs space-y-2">' +
        '<div class="font-semibold text-yellow-300">⚠ Tidak ada nomor tersedia — Hasil diagnosa:</div>' +
        '<table class="w-full border-collapse">' + rows + '</table>' +
        '<div class="text-slate-400 pt-1">Jika status <b class="text-red-400">403</b>: IP server diblokir Cloudflare.<br>' +
        'Jika <b class="text-red-400">ERROR / ETIMEDOUT</b>: masalah network/DNS.<br>' +
        'Coba set <code class="bg-slate-800 px-1 rounded">HTTPS_PROXY</code> di docker-compose.</div>' +
      '</div>';
  } catch (e) {
    numbersListEl.innerHTML =
      '<div class="p-3 rounded border border-red-800 bg-red-900/20 text-xs text-red-300">' +
      '⚠ Gagal diagnosa: ' + escapeHTML(e.message) + '</div>';
  }
}

function populateCountryFilter() {
  const cur = countryFilterEl.value;
  const set = new Map();
  state.numbers.forEach(n => {
    if (n.country) set.set(n.country, (n.flag || '') + ' ' + (n.countryName || n.country));
  });
  countryFilterEl.innerHTML = '<option value="">Semua negara</option>';
  [...set.entries()].sort((a,b) => a[1].localeCompare(b[1])).forEach(([code, label]) => {
    const o = document.createElement('option');
    o.value = code; o.textContent = label;
    countryFilterEl.appendChild(o);
  });
  countryFilterEl.value = cur;
}

function renderNumbers() {
  const q = searchEl.value.toLowerCase().trim();
  const cf = countryFilterEl.value;
  const filtered = state.numbers.filter(n => {
    if (cf && n.country !== cf) return false;
    if (q && !(n.number.toLowerCase().includes(q) || (n.countryName||'').toLowerCase().includes(q))) return false;
    return true;
  });
  numbersListEl.innerHTML = '';
  filtered.forEach(n => {
    const d = document.createElement('div');
    d.className = 'p-2.5 rounded border border-slate-800 hover:border-emerald-600 hover:bg-slate-800/60 cursor-pointer transition flex items-center gap-2';
    d.innerHTML =
      '<div class="text-2xl">' + (n.flag || '🌐') + '</div>' +
      '<div class="flex-1 min-w-0">' +
        '<div class="font-mono text-sm truncate">' + n.number + '</div>' +
        '<div class="text-[11px] text-slate-400 truncate">' + (n.countryName || '?') + ' · ' + n.provider + '</div>' +
      '</div>' +
      '<button class="copy-btn text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600">Copy</button>';
    d.querySelector('.copy-btn').onclick = (ev) => {
      ev.stopPropagation();
      navigator.clipboard.writeText(n.number);
      ev.target.textContent = '✓';
      setTimeout(() => ev.target.textContent = 'Copy', 1200);
    };
    d.onclick = () => selectNumber(n);
    numbersListEl.appendChild(d);
  });
  if (filtered.length === 0) {
    numbersListEl.innerHTML = '<div class="text-center text-slate-500 text-sm p-6">Tidak ada nomor cocok.</div>';
  }
}

function selectNumber(n) {
  state.current = n;
  inboxHeaderEl.innerHTML =
    '<div class="text-3xl">' + (n.flag || '🌐') + '</div>' +
    '<div class="flex-1">' +
      '<div class="font-mono font-semibold text-lg">' + n.number + '</div>' +
      '<div class="text-xs text-slate-400">' + (n.countryName || '?') + ' · sumber: ' + n.provider +
        ' · <span class="pulse-dot text-emerald-400">●</span> auto-refresh 10s</div>' +
    '</div>' +
    '<button id="copyNum" class="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-sm">Copy nomor</button>';
  document.getElementById('copyNum').onclick = () => {
    navigator.clipboard.writeText(n.number);
  };
  loadInbox();
  if (state.refreshTimer) clearInterval(state.refreshTimer);
  state.refreshTimer = setInterval(loadInbox, 10000);
}

async function loadInbox() {
  if (!state.current) return;
  const n = state.current;
  try {
    const url = '_sms/messages?provider=' + encodeURIComponent(n.provider) +
                '&number=' + encodeURIComponent(n.number) +
                (n.url ? '&url=' + encodeURIComponent(n.url) : '');
    const data = await fetch(url).then(r => r.json());
    if (data.error) { inboxEl.innerHTML = '<div class="text-red-400">' + data.error + '</div>'; return; }
    if (!data.messages.length) {
      inboxEl.innerHTML = '<div class="text-slate-500 text-center p-6">Belum ada SMS. Menunggu…</div>';
      return;
    }
    inboxEl.innerHTML = '';
    data.messages.forEach(m => {
      const otp = (m.message.match(/\\b(\\d{4,8})\\b/) || [])[1];
      const card = document.createElement('div');
      card.className = 'rounded border border-slate-800 bg-slate-900 p-3';
      card.innerHTML =
        '<div class="flex justify-between items-start gap-2 mb-1.5">' +
          '<div class="text-xs font-semibold text-emerald-400">' + (m.from || 'unknown') + '</div>' +
          '<div class="text-[11px] text-slate-500">' + (m.time || '') + '</div>' +
        '</div>' +
        '<div class="text-sm whitespace-pre-wrap break-words">' + escapeHTML(m.message) + '</div>' +
        (otp ? '<div class="otp mt-2 px-3 py-2 rounded flex items-center gap-2"><span class="text-xs text-amber-300">OTP terdeteksi:</span>' +
              '<span class="font-mono font-bold text-lg">' + otp + '</span>' +
              '<button class="ml-auto text-xs px-2 py-1 rounded bg-amber-600 hover:bg-amber-500" onclick="navigator.clipboard.writeText(\\''+otp+'\\')">Copy OTP</button></div>' : '');
      inboxEl.appendChild(card);
    });
  } catch (e) {
    inboxEl.innerHTML = '<div class="text-red-400">Gagal memuat inbox: ' + e.message + '</div>';
  }
}

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

searchEl.addEventListener('input', renderNumbers);
countryFilterEl.addEventListener('change', renderNumbers);
providerFilterEl.addEventListener('change', loadNumbers);
refreshBtn.addEventListener('click', () => { loadNumbers(); if (state.current) loadInbox(); });

(async () => {
  await loadProviders();
  await loadNumbers();
})();
`;

// Build final HTML with APP_JS inlined — avoids separate /app.js request that nginx may block
const INDEX_HTML_FINAL = INDEX_HTML + APP_JS + `
</script>
</body>
</html>`;

module.exports = { INDEX_HTML: INDEX_HTML_FINAL, APP_JS };
