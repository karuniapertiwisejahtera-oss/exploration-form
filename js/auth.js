// ===== AUTH & USER MANAGEMENT =====
const SHEET_ID   = '1xfC-Yazg2D94cyqcEsXuXJz13YR6WDhRdIeIra9CNQk';
const SHEET_NAME = 'Users';
const SESSION_KEY = 'exploration_user_session';

function getSession()       { try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); } catch { return null; } }
function setSession(user)   { sessionStorage.setItem(SESSION_KEY, JSON.stringify(user)); }
function clearSession()     { sessionStorage.removeItem(SESSION_KEY); }
function isLoggedIn()       { return getSession() !== null; }

async function hashPassword(password) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

async function getSheetData() {
  const token = await getAccessToken();
  if (!token) return [];
  try {
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SHEET_NAME}!A:F`,
      { headers: { Authorization: 'Bearer ' + token } }
    );
    if (!res.ok) { console.error('Sheet read HTTP', res.status, await res.text()); return []; }
    const json = await res.json();
    return json.values || [];
  } catch(e) { console.error('Sheet read error:', e); return []; }
}

async function appendToSheet(rowData) {
  const token = await getAccessToken();
  if (!token) return false;
  try {
    // Format URL yang benar: /values/{range}:append
    const range = encodeURIComponent(`${SHEET_NAME}!A:F`);
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: [rowData] })
      }
    );
    if (!res.ok) { console.error('Sheet write HTTP', res.status, await res.text()); return false; }
    return true;
  } catch(e) { console.error('Sheet write error:', e); return false; }
}

async function registerUser(nama, email, password) {
  const rows = await getSheetData();
  const exists = rows.slice(1).some(r => r[2] && r[2].toLowerCase() === email.toLowerCase());
  if (exists) return { ok: false, msg: 'Email sudah terdaftar.' };

  const hash = await hashPassword(password);
  const id   = 'USR' + Date.now();
  const tgl  = new Date().toLocaleDateString('id-ID');

  // Buat header jika sheet kosong
  if (rows.length === 0) {
    const token = await getAccessToken();
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SHEET_NAME}!A1:F1?valueInputOption=RAW`,
      {
        method: 'PUT',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: [['ID','Nama','Email','Password Hash','Role','Tanggal Daftar']] })
      }
    );
  }

  const ok = await appendToSheet([id, nama, email, hash, 'user', tgl]);
  if (ok) return { ok: true, msg: 'Registrasi berhasil! Silakan login.' };
  return { ok: false, msg: 'Gagal menyimpan data. Coba lagi.' };
}

async function loginUser(email, password) {
  const rows = await getSheetData();
  const hash = await hashPassword(password);
  const user = rows.slice(1).find(r =>
    r[2] && r[2].toLowerCase() === email.toLowerCase() && r[3] === hash
  );
  if (!user) return { ok: false, msg: 'Email atau password salah.' };
  const userData = { id: user[0], nama: user[1], email: user[2], role: user[4] };
  setSession(userData);
  return { ok: true, user: userData };
}