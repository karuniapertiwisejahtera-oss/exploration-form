// ===== GOOGLE IDENTITY SERVICES (GIS) =====
const CLIENT_ID = '654026557452-f20ngscfrgdsvmm42p3visqp0hagoim7.apps.googleusercontent.com';
const API_KEY   = 'AIzaSyBm4tZzy1s7BQ3sXhl10-zWkJhl5TCHgrU';
const SCOPES    = 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets';

let _accessToken  = null;
let _tokenClient  = null;
let _tokenResolve = null;

// Reset token (paksa minta token baru)
function resetAccessToken() { _accessToken = null; }

function _initTokenClient() {
  if (typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2) {
    setTimeout(_initTokenClient, 300);
    return;
  }
  _tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: function(resp) {
      if (resp.error) {
        console.error('OAuth error:', resp.error);
        if (_tokenResolve) { _tokenResolve(null); _tokenResolve = null; }
        return;
      }
      _accessToken = resp.access_token;
      setTimeout(function() { _accessToken = null; }, (resp.expires_in - 60) * 1000);
      window.dispatchEvent(new Event('drive-ready'));
      if (_tokenResolve) { _tokenResolve(_accessToken); _tokenResolve = null; }
    }
  });
}
_initTokenClient();

function getAccessToken() {
  return new Promise(function(resolve) {
    if (_accessToken) { resolve(_accessToken); return; }
    var waited = 0;
    var interval = setInterval(function() {
      waited += 300;
      if (_tokenClient) {
        _tokenResolve = resolve;
        _tokenClient.requestAccessToken({ prompt: '' });
        _tokenClient.requestAccessToken({ prompt: 'consent' });
      } else if (waited >= 6000) {
        clearInterval(interval);
        alert('Google API belum siap. Refresh halaman dan coba lagi.');
        resolve(null);
      }
    }, 300);
  });
}

async function uploadFileToFolder(fileName, content, mimeType, folderId) {
  var token = await getAccessToken();
  if (!token) return null;
  var blob = (content instanceof Blob) ? content : new Blob([content], { type: mimeType });
  var form = new FormData();
  form.append('metadata', new Blob([JSON.stringify({ name: fileName, parents: [folderId] })], { type: 'application/json' }));
  form.append('file', blob);
  try {
    var res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      { method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: form });
    if (!res.ok) {
      var err = await res.json();
      if (err.error && err.error.code === 401) { _accessToken = null; return uploadFileToFolder(fileName, content, mimeType, folderId); }
      alert('Upload gagal: ' + (err.error ? err.error.message : res.status));
      return null;
    }
    return (await res.json()).id;
  } catch(e) { alert('Upload error: ' + e.message); return null; }
}

async function listFolders(parentId) {
  var token = await getAccessToken();
  if (!token) return [];
  try {
    var q = encodeURIComponent("'" + parentId + "' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false");
    var res = await fetch('https://www.googleapis.com/drive/v3/files?q=' + q + '&fields=files(id,name)&orderBy=name',
      { headers: { Authorization: 'Bearer ' + token } });
    return (await res.json()).files || [];
  } catch(e) { return []; }
}

function pickFolder(rootFolderId, title) {
  title = title || 'Pilih Folder Tujuan';
  return new Promise(async function(resolve) {
    var folders = await listFolders(rootFolderId);
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:9999;display:flex;align-items:center;justify-content:center;';
    var box = document.createElement('div');
    box.style.cssText = 'background:white;border-radius:16px;padding:20px;width:85%;max-width:320px;max-height:70vh;overflow-y:auto;';
    var items = folders.length === 0
      ? '<p style="color:#999;font-size:13px;">Tidak ada subfolder.</p>'
      : folders.map(function(f) { return '<div data-id="' + f.id + '" style="padding:12px;border:1.5px solid #e0e0e0;border-radius:10px;margin-bottom:8px;cursor:pointer;font-size:14px;">&#128193; ' + f.name + '</div>'; }).join('');
    box.innerHTML = '<div style="font-weight:700;font-size:15px;margin-bottom:12px;">&#128193; ' + title + '</div>' + items +
      '<button id="_fp_cancel" style="width:100%;margin-top:8px;padding:10px;border:none;border-radius:10px;background:#f5f5f5;color:#666;font-size:13px;cursor:pointer;">Batal</button>';
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    box.querySelectorAll('[data-id]').forEach(function(el) {
      el.addEventListener('click', function() { document.body.removeChild(overlay); resolve(el.dataset.id); });
    });
    box.querySelector('#_fp_cancel').addEventListener('click', function() { document.body.removeChild(overlay); resolve(null); });
  });
}

// ===== APPEND ROWS TO GOOGLE SHEET =====
async function appendToSheet(sheetId, sheetName, rows) {
  var token = await getAccessToken();
  if (!token) return false;
  var range = encodeURIComponent(sheetName + '!A1');
  try {
    var res = await fetch(
      'https://sheets.googleapis.com/v4/spreadsheets/' + sheetId +
      '/values/' + range + ':append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS',
      {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: rows })
      }
    );
    if (!res.ok) {
      var err = await res.json();
      if (err.error && err.error.code === 401) { _accessToken = null; return appendToSheet(sheetId, sheetName, rows); }
      alert('Sheets error: ' + (err.error ? err.error.message : res.status));
      return false;
    }
    return true;
  } catch(e) { alert('Sheets error: ' + e.message); return false; }
}

// ===== BUAT GOOGLE SHEET BARU DI FOLDER =====
async function createSheetInFolder(fileName, folderId) {
  var token = await getAccessToken();
  if (!token) return null;
  try {
    var res = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: fileName,
        mimeType: 'application/vnd.google-apps.spreadsheet',
        parents: [folderId]
      })
    });
    if (!res.ok) {
      var err = await res.json();
      if (err.error && err.error.code === 401) { _accessToken = null; return createSheetInFolder(fileName, folderId); }
      alert('Gagal buat sheet: ' + (err.error ? err.error.message : res.status));
      return null;
    }
    return (await res.json()).id;
  } catch(e) { alert('Error buat sheet: ' + e.message); return null; }
}
