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

// ===== UNDO / REDO MANAGER =====
// Berbasis full-snapshot: setiap operasi penting menyimpan state lengkap
const UndoManager = {
  _stack: [],
  _future: [],
  _maxSize: 20,
  _paused: false,

  // Ambil full snapshot dari autoSaveDraft jika ada, fallback ke input snapshot
  _snapshot() {
    // Untuk preparation: gunakan data dari prep-tbody + header
    const prepTbody = document.getElementById('prep-tbody');
    if (prepTbody && typeof autoSaveDraft === 'function') {
      // Buat snapshot yang sama dengan autoSaveDraft
      const data = {};
      ['hole_id','sampler','sheet_no','date_start','date_finish','deposit','total_depth'].forEach(k => {
        const el = document.querySelector('[name="' + k + '"]');
        if (el) data[k] = el.value;
      });
      const FIELDS = [
        'from','to','len','rec','grain','core_wt','from_cum','to_cum',
        'samp_no','send_cum','sample_id','dry_wt','m06_orig_sid',
        'a10_tot','a10_rec','a10_sid','a2_tot','a2_rec','a2_sid',
        'a06_tot','a06_rec','a06_sid','m06_tot','m06_rec','m06_sid',
        'p03_tot','p03_rec','p03_sid','qaqc_sid','qaqc_wt','jenis','remarks'
      ];
      const domRows = Array.from(document.querySelectorAll('#prep-tbody tr[data-row]'));
      data.row_count = domRows.length;
      domRows.forEach((tr, idx) => {
        const pos = idx + 1;
        const origN = tr.dataset.row;
        if (tr.dataset.mergeGroup) data['merge_group_' + pos] = tr.dataset.mergeGroup;
        FIELDS.forEach(field => {
          const el = document.querySelector('[name="' + field + '_' + origN + '"]');
          data[field + '_' + pos] = el ? el.value : '';
        });
        const grainEl = document.querySelector('[name="grain_' + origN + '"]');
        data['grain_changed_' + pos] = grainEl && grainEl.classList.contains('grain-changed') ? '1' : '';
      });
      return JSON.stringify(data);
    }
    // Fallback: input snapshot sederhana
    const state = {};
    document.querySelectorAll('input:not([type=file]), select, textarea').forEach(el => {
      const key = el.id || el.name;
      if (key) state[key] = el.value;
    });
    return JSON.stringify(state);
  },

  // Restore snapshot — hanya untuk preparation (rebuild rows)
  _restore(snap) {
    if (this._paused) return;
    this._paused = true;
    try {
      const data = JSON.parse(snap);
      // Jika ini preparation form
      if (document.getElementById('prep-tbody') && typeof addRow === 'function') {
        // Restore header
        ['hole_id','sampler','sheet_no','date_start','date_finish','deposit','total_depth'].forEach(k => {
          const el = document.querySelector('[name="' + k + '"]');
          if (el && data[k] !== undefined) el.value = data[k];
        });
        // Rebuild rows
        document.getElementById('prep-tbody').innerHTML = '';
        if (typeof rowCount !== 'undefined') window.rowCount = 0;
        const rc = parseInt(data.row_count) || 0;
        const FIELDS = [
          'from','to','len','rec','grain','core_wt','from_cum','to_cum',
          'samp_no','send_cum','sample_id','dry_wt','m06_orig_sid',
          'a10_tot','a10_rec','a10_sid','a2_tot','a2_rec','a2_sid',
          'a06_tot','a06_rec','a06_sid','m06_tot','m06_rec','m06_sid',
          'p03_tot','p03_rec','p03_sid','qaqc_sid','qaqc_wt','jenis','remarks'
        ];
        for (let i = 1; i <= rc; i++) {
          const rowData = { merge_group: data['merge_group_' + i], grain_changed: data['grain_changed_' + i] === '1' };
          FIELDS.forEach(f => { rowData[f === 'from' ? 'from' : f === 'to' ? 'to' : f === 'len' ? 'length' : f === 'rec' ? 'recovery' : f === 'grain' ? 'grain_size' : f] = data[f + '_' + i]; });
          // Map field names correctly
          addRow({
            from: data['from_'+i], to: data['to_'+i], length: data['len_'+i],
            recovery: data['rec_'+i], grain_size: data['grain_'+i], core_wt: data['core_wt_'+i],
            from_cum: data['from_cum_'+i], to_cum: data['to_cum_'+i],
            samp_no: data['samp_no_'+i], send_cum: data['send_cum_'+i],
            sample_id: data['sample_id_'+i], dry_wt: data['dry_wt_'+i],
            m06_orig_sid: data['m06_orig_sid_'+i],
            a10_tot: data['a10_tot_'+i], a10_rec: data['a10_rec_'+i], a10_sid: data['a10_sid_'+i],
            a2_tot: data['a2_tot_'+i], a2_rec: data['a2_rec_'+i], a2_sid: data['a2_sid_'+i],
            a06_tot: data['a06_tot_'+i], a06_rec: data['a06_rec_'+i], a06_sid: data['a06_sid_'+i],
            m06_tot: data['m06_tot_'+i], m06_rec: data['m06_rec_'+i], m06_sid: data['m06_sid_'+i],
            p03_tot: data['p03_tot_'+i], p03_rec: data['p03_rec_'+i], p03_sid: data['p03_sid_'+i],
            qaqc_sid: data['qaqc_sid_'+i], qaqc_wt: data['qaqc_wt_'+i],
            jenis: data['jenis_'+i], remarks: data['remarks_'+i],
            merge_group: data['merge_group_'+i], grain_changed: data['grain_changed_'+i] === '1'
          });
        }
        if (typeof restoreMergeVisibility === 'function') restoreMergeVisibility();
        if (typeof recalcSamplingNo === 'function') recalcSamplingNo();
        if (typeof highlightDuplicates === 'function') highlightDuplicates();
        if (typeof restoreQAQCClass === 'function') restoreQAQCClass();
        if (typeof updateFracLock === 'function') updateFracLock();
        if (typeof updateTotalSample === 'function') updateTotalSample();
      }
    } catch(e) { console.warn('UndoManager restore error:', e); }
    this._paused = false;
    this._updateButtons();
  },

  push() {
    if (this._paused) return;
    const snap = this._snapshot();
    if (this._stack.length && this._stack[this._stack.length - 1] === snap) return;
    this._stack.push(snap);
    if (this._stack.length > this._maxSize) this._stack.shift();
    this._future = [];
    this._updateButtons();
  },

  undo() {
    if (this._stack.length < 2) { showToast('Tidak ada yang bisa di-undo', 'error'); return; }
    const current = this._stack.pop();
    this._future.push(current);
    // Allow UI to update (toast) before heavy restore to improve perceived responsiveness
    showToast('Undo — memulihkan...');
    setTimeout(() => { this._restore(this._stack[this._stack.length - 1]); showToast('Undo'); }, 40);
  },

  redo() {
    if (!this._future.length) { showToast('Tidak ada yang bisa di-redo', 'error'); return; }
    const next = this._future.pop();
    this._stack.push(next);
    showToast('Redo — memulihkan...');
    setTimeout(() => { this._restore(next); showToast('Redo'); }, 40);
  },

  _updateButtons() {
    const undoBtn = document.getElementById('btn-undo');
    const redoBtn = document.getElementById('btn-redo');
    if (undoBtn) undoBtn.disabled = this._stack.length < 2;
    if (redoBtn) redoBtn.disabled = this._future.length === 0;
  },

  init() {
    setTimeout(() => { this.push(); }, 800);
    // Pasang listener dengan debounce — hanya push saat ada perubahan real
    let timer = null;
    const handler = (e) => {
      if (this._paused) return;
      // Skip file inputs dan tombol
      if (e.target && (e.target.type === 'file' || e.target.tagName === 'BUTTON')) return;
      clearTimeout(timer);
      timer = setTimeout(() => this.push(), 800);
    };
    document.addEventListener('input',  handler);
    document.addEventListener('change', handler);
    // Keyboard shortcut Ctrl+Z / Ctrl+Y
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault(); this.undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault(); this.redo();
      }
    });
    // Inject tombol undo/redo ke toolbar preparation
    document.addEventListener('DOMContentLoaded', () => {
      const toolbar = document.querySelector('.prep-toolbar');
      if (toolbar) return; // tombol sudah ada di HTML
      const bar = document.querySelector('.action-bar');
      if (!bar) return;
      const undoBtn = document.createElement('button');
      undoBtn.id = 'btn-undo'; undoBtn.className = 'btn'; undoBtn.title = 'Undo (Ctrl+Z)'; undoBtn.disabled = true;
      undoBtn.style.cssText = 'background:#f5f5f5;color:#555;flex:0 0 auto;padding:6px 10px;font-size:16px;min-width:40px;';
      undoBtn.innerHTML = '↩'; undoBtn.addEventListener('click', () => this.undo());
      const redoBtn = document.createElement('button');
      redoBtn.id = 'btn-redo'; redoBtn.className = 'btn'; redoBtn.title = 'Redo (Ctrl+Y)'; redoBtn.disabled = true;
      redoBtn.style.cssText = 'background:#f5f5f5;color:#555;flex:0 0 auto;padding:6px 10px;font-size:16px;min-width:40px;';
      redoBtn.innerHTML = '↪'; redoBtn.addEventListener('click', () => this.redo());
      bar.insertBefore(redoBtn, bar.firstChild); bar.insertBefore(undoBtn, bar.firstChild);
    });
  }
};

window.UndoManager = UndoManager;

document.addEventListener('DOMContentLoaded', () => {
  if (document.querySelector('.action-bar, .form-container')) UndoManager.init();
});

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
  { label: 'Home',      url: 'silica-form.html', key: null          },
  { label: 'Actual Run',   url: 'actual-run.html',  key: 'actual_run'  },
  { label: 'Preparation',  url: 'preparation.html', key: 'preparation' },
  { label: 'Daily Sheet',  url: 'daily-sheet.html', key: 'daily_sheet' },
  { label: 'Core Loss',    url: 'core-loss.html',   key: 'core_loss'   },
  { label: 'Logging',      url: 'logging.html',     key: 'logging'     },
  { label: 'Inspection',   url: 'inspection.html',  key: 'inspection'  },
  { label: 'Submission',   url: 'submission.html',  key: 'submission'  },
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
  // Tab bar hanya muncul di halaman form, bukan di menu utama (silica-form.html)
  const isForm = FORM_TABS.some(t => t.url === cur && t.url !== 'silica-form.html');
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
        // Home: langsung navigasi tanpa peringatan
        if (tab.url === 'silica-form.html') {
          window.location.href = tab.url;
          return;
        }
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
