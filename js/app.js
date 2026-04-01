// ===== LOCAL STORAGE HELPERS =====
const DB = {
  save(key, data) {
    const all = this.getAll(key);
    const record = { id: Date.now(), timestamp: new Date().toISOString(), ...data };
    all.push(record);
    localStorage.setItem(key, JSON.stringify(all));
    return record;
  },
  getAll(key) {
    return JSON.parse(localStorage.getItem(key) || '[]');
  },
  delete(key, id) {
    const all = this.getAll(key).filter(r => r.id !== id);
    localStorage.setItem(key, JSON.stringify(all));
  },
  clear(key) {
    localStorage.removeItem(key);
  }
};

// ===== TOAST NOTIFICATION =====
function showToast(msg, type = 'success') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ===== FORM HELPERS =====
function getFormData(formId) {
  const form = document.getElementById(formId);
  if (!form) return {};
  const data = {};
  form.querySelectorAll('input, select, textarea').forEach(el => {
    if (el.name) data[el.name] = el.value;
  });
  return data;
}

function clearForm(formId) {
  const form = document.getElementById(formId);
  if (!form) return;
  form.querySelectorAll('input, select, textarea').forEach(el => {
    el.value = '';
  });
}

function fillForm(formId, data) {
  const form = document.getElementById(formId);
  if (!form) return;
  Object.entries(data).forEach(([key, val]) => {
    const el = form.querySelector(`[name="${key}"]`);
    if (el) el.value = val;
  });
}

// ===== EXPORT TO JSON =====
function exportToJSON(key, filename) {
  const data = DB.getAll(key);
  if (!data.length) { showToast('Tidak ada data untuk diekspor', 'error'); return; }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Data berhasil diekspor');
}

// ===== GOOGLE DRIVE UPLOAD =====
const DRIVE_FOLDER_ID = '1e5xBWUtcF4tAuF93e5p8fcJXWSVtDBcT';

async function uploadToDrive(filename, content, mimeType = 'application/json') {
  // Cek apakah Google API sudah siap
  if (typeof gapi === 'undefined' || !gapi.client) {
    showToast('Google Drive belum terhubung. Silakan login dulu.', 'error');
    return false;
  }
  try {
    showToast('Mengupload ke Google Drive...');
    const metadata = {
      name: filename,
      parents: [DRIVE_FOLDER_ID],
      mimeType: mimeType
    };
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([content], { type: mimeType }));

    const token = gapi.auth.getToken();
    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token.access_token}` },
      body: form
    });
    if (res.ok) {
      showToast('Berhasil diupload ke Google Drive!', 'success');
      return true;
    } else {
      showToast('Gagal upload ke Drive', 'error');
      return false;
    }
  } catch (e) {
    showToast('Error: ' + e.message, 'error');
    return false;
  }
}

async function saveAndUpload(key, formId, filename) {
  const data = getFormData(formId);
  const hasData = Object.values(data).some(v => v.trim() !== '');
  if (!hasData) { showToast('Form masih kosong!', 'error'); return; }
  const record = DB.save(key, data);
  showToast('Data tersimpan di perangkat');
  // Upload ke Drive
  const json = JSON.stringify(DB.getAll(key), null, 2);
  await uploadToDrive(`${filename}_${new Date().toISOString().slice(0,10)}.json`, json);
}

// ===== NAVIGATION =====
function goTo(page) {
  window.location.href = page;
}

function goBack() {
  window.history.back();
}

// ===== OFFLINE / ONLINE DETECTION =====
function updateOnlineStatus() {
  const online = navigator.onLine;
  let bar = document.getElementById('offline-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'offline-bar';
    bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;padding:6px;text-align:center;font-size:12px;font-weight:600;transition:all 0.3s;';
    document.body.appendChild(bar);
  }
  if (online) {
    bar.style.background = '#e8f5e9';
    bar.style.color = '#2e7d32';
    bar.textContent = '✓ Online — data akan tersinkron';
    setTimeout(() => { if (bar) bar.style.display = 'none'; }, 3000);
  } else {
    bar.style.display = 'block';
    bar.style.background = '#fff3e0';
    bar.style.color = '#e65100';
    bar.textContent = '⚠ Offline — data tersimpan lokal';
  }
}

window.addEventListener('online',  updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

// ===== TAB BAR (Sheet Navigator) =====
const FORM_TABS = [
  { label: 'Actual Run',   url: 'actual-run.html',  key: 'actual_run'  },
  { label: 'Preparation',  url: 'preparation.html', key: 'preparation' },
  { label: 'Daily Sheet',  url: 'daily-sheet.html', key: 'daily_sheet' },
  { label: 'Core Loss',    url: 'core-loss.html',   key: 'core_loss'   },
  { label: 'Logging',      url: 'logging.html',     key: 'logging'     },
  { label: 'Inspection',   url: 'inspection.html',  key: 'inspection'  },
  { label: 'P5M',          url: 'p5m.html',         key: 'p5m'         },
];

// Popup NEW / CONTINUE
function showTabPopup(tab) {
  // Hapus popup lama jika ada
  const old = document.getElementById('tab-popup');
  if (old) old.remove();

  const hasSaved = DB.getAll(tab.key).length > 0;

  const overlay = document.createElement('div');
  overlay.id = 'tab-popup';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;';

  const box = document.createElement('div');
  box.style.cssText = 'background:white;border-radius:14px;padding:20px;width:88%;max-width:320px;';
  box.innerHTML = `
    <div style="font-weight:700;font-size:15px;color:#1a6b4a;margin-bottom:6px;">${tab.label}</div>
    <div style="font-size:13px;color:#555;margin-bottom:16px;">Pilih mode pengisian:</div>
    <button id="tab-new-btn" style="width:100%;padding:12px;margin-bottom:8px;background:#1a6b4a;color:white;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;">
      ➕ NEW — Data Baru
    </button>
    ${hasSaved ? `<button id="tab-cont-btn" style="width:100%;padding:12px;margin-bottom:8px;background:#2e9e6e;color:white;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;">
      ▶ CONTINUE — Lanjutkan Data Terakhir
    </button>` : ''}
    <button id="tab-cancel-btn" style="width:100%;padding:10px;background:#f5f5f5;color:#666;border:1px solid #ddd;border-radius:8px;font-size:13px;cursor:pointer;">
      Batal
    </button>
  `;
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  box.querySelector('#tab-new-btn').addEventListener('click', () => {
    overlay.remove();
    sessionStorage.setItem('form_mode', 'new');
    window.location.href = tab.url;
  });
  if (hasSaved) {
    box.querySelector('#tab-cont-btn').addEventListener('click', () => {
      overlay.remove();
      sessionStorage.setItem('form_mode', 'continue');
      window.location.href = tab.url;
    });
  }
  box.querySelector('#tab-cancel-btn').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

function initTabBar() {
  const cur = window.location.pathname.split('/').pop();
  const isForm = FORM_TABS.some(t => t.url === cur);
  if (!isForm) return;

  const bar = document.createElement('div');
  bar.id = 'tab-bar';
  bar.style.cssText = [
    'position:fixed', 'top:0', 'left:0', 'right:0', 'z-index:1000',
    'display:flex', 'overflow-x:auto', 'background:#1a2e22',
    'border-bottom:2px solid #2e9e6e', '-webkit-overflow-scrolling:touch',
    'scrollbar-width:none', 'height:32px', 'align-items:stretch'
  ].join(';');

  const style = document.createElement('style');
  style.textContent = '#tab-bar::-webkit-scrollbar{display:none} .page-header{margin-top:32px}';
  document.head.appendChild(style);

  FORM_TABS.forEach(tab => {
    const isActive = tab.url === cur;
    const btn = document.createElement('button');
    btn.textContent = tab.label;
    btn.style.cssText = [
      'flex-shrink:0', 'padding:0 14px', 'border:none', 'cursor:pointer',
      'font-size:11px', 'font-weight:' + (isActive ? '700' : '500'),
      'white-space:nowrap', 'border-right:1px solid #2e4a38',
      'background:' + (isActive ? '#2e9e6e' : 'transparent'),
      'color:' + (isActive ? '#fff' : '#a8d5b5'),
      'border-bottom:' + (isActive ? '2px solid #7fffd4' : '2px solid transparent'),
      'transition:background 0.15s', 'height:100%'
    ].join(';');

    if (!isActive) {
      btn.addEventListener('click', () => {
        // Peringatan save sebelum pindah
        const confirmed = confirm('⚠ Pastikan data sudah di-Save sebelum berpindah form.\n\nLanjutkan ke ' + tab.label + '?');
        if (!confirmed) return;
        showTabPopup(tab);
      });
      btn.addEventListener('mouseover', () => { btn.style.background = '#243d2e'; btn.style.color = '#fff'; });
      btn.addEventListener('mouseout',  () => { btn.style.background = 'transparent'; btn.style.color = '#a8d5b5'; });
    }
    bar.appendChild(btn);
  });

  document.addEventListener('DOMContentLoaded', () => {
    document.body.insertBefore(bar, document.body.firstChild);
    const activeBtn = bar.querySelector('[style*="2e9e6e"]');
    if (activeBtn) activeBtn.scrollIntoView({ inline: 'center', block: 'nearest' });
  });
}

initTabBar();
