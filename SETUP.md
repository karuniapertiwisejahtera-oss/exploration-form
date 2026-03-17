# Setup Google Drive API

Agar fitur upload ke Google Drive berfungsi, ikuti langkah berikut:

## 1. Buat Project di Google Cloud Console
1. Buka https://console.cloud.google.com
2. Buat project baru
3. Aktifkan **Google Drive API**

## 2. Buat OAuth2 Credentials
1. Buka **APIs & Services > Credentials**
2. Klik **Create Credentials > OAuth 2.0 Client ID**
3. Pilih **Web Application**
4. Tambahkan Authorized JavaScript Origins:
   - `http://localhost` (untuk testing lokal)
   - URL hosting Anda (jika deploy ke server)
5. Salin **Client ID**

## 3. Buat API Key
1. Klik **Create Credentials > API Key**
2. Salin **API Key**

## 4. Update js/drive.js
Ganti nilai berikut di file `js/drive.js`:
```js
const CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
const API_KEY = 'YOUR_GOOGLE_API_KEY';
```

## 5. Buat Google Sheet untuk Database User

1. Buka [sheets.google.com](https://sheets.google.com) → buat spreadsheet baru
2. Beri nama sheet tab pertama: `Users`
3. Salin **Spreadsheet ID** dari URL:
   ```
   https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit
   ```
4. Buka `js/auth.js` → ganti nilai `SHEET_ID`:
   ```js
   const SHEET_ID = 'SPREADSHEET_ID_KAMU_DI_SINI';
   ```
5. Di Google Cloud Console → **APIs & Services → Library** → aktifkan **Google Sheets API**
6. Share spreadsheet ke akun yang akan digunakan (atau set "Anyone with link can edit")


Pastikan folder Google Drive dengan ID `1e5xBWUtcF4tAuF93e5p8fcJXWSVtDBcT` 
dapat diakses oleh akun yang akan digunakan untuk upload.

## 6. Deploy / Akses via Internet
Untuk akses via internet, upload semua file ke:
- **GitHub Pages** (gratis): Push ke repo GitHub, aktifkan Pages
- **Netlify** (gratis): Drag & drop folder ke netlify.com
- **Vercel** (gratis): Deploy via vercel.com

## Cara Pakai di HP
1. Buka URL aplikasi di browser HP (Chrome/Firefox)
2. Klik menu browser > "Add to Home Screen"
3. Aplikasi akan tersimpan seperti app native
4. Data tersimpan otomatis di HP (localStorage)
5. Klik "Login Google Drive" untuk sinkronisasi ke cloud
