// ===== GOOGLE APPS SCRIPT =====
// Deploy sebagai Web App:
// - Execute as: Me
// - Who has access: Anyone
// Setelah deploy, copy Web App URL ke preparation.html

const FOLDER_ID = '17gfoPQ7OQNcpZHpmHjdl-MP4FkvbRATQ';

function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    const fileName = params.fileName;  // e.g. "Prep_GS001.csv"
    const csvData  = params.csvData;   // isi CSV string

    if (!fileName || !csvData) {
      return jsonResponse({ ok: false, msg: 'fileName atau csvData kosong' });
    }

    const folder = DriveApp.getFolderById(FOLDER_ID);

    // Hapus file lama dengan nama sama jika ada (opsional — hindari duplikat)
    const existing = folder.getFilesByName(fileName);
    while (existing.hasNext()) existing.next().setTrashed(true);

    // Buat file CSV baru
    const blob = Utilities.newBlob(csvData, 'text/csv', fileName);
    const file  = folder.createFile(blob);

    return jsonResponse({ ok: true, msg: 'Upload berhasil', fileId: file.getId() });

  } catch (err) {
    return jsonResponse({ ok: false, msg: err.toString() });
  }
}

function doGet(e) {
  return jsonResponse({ ok: true, msg: 'GAS endpoint aktif' });
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
