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