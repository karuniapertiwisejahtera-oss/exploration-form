import re

with open('preparation.html', 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Perbaiki simbol btn-merge di HTML template addRow
# Ganti semua kemunculan btn-merge dengan teks bersih
c = re.sub(
    r'<button class="btn-merge" onclick="startMerge\(\$\{n\}, this\)"[^>]*>[^<]*</button>',
    '<button class="btn-merge" onclick="startMerge(${n}, this)" title="Gabungkan">+</button>',
    c
)

# 2. Perbaiki textContent btn-merge yang diset via JS
for bad, good in [
    ("'🔓'", "'Lepas'"), ("'🔗'", "'+'" ),
    ("'Γ£ô'", "'Lepas'"), ("'Γ£ò'", "'+'" ),
    ("'&#128275;'", "'Lepas'"), ("'&#128279;'", "'+'" ),
]:
    c = c.replace(f"btnEl.textContent = {bad}", f"btnEl.textContent = {good}")

# 3. Perkecil CSS btn-merge
old_css = """.btn-merge {
      background: #ff9800; color: white; border: none;
      border-radius: 4px; padding: 6px 8px; font-size: 13px;
      cursor: pointer; white-space: nowrap; min-width: 32px; min-height: 32px;
    }"""
new_css = """.btn-merge {
      background: #ff9800; color: white; border: none;
      border-radius: 3px; padding: 1px 5px; font-size: 10px;
      cursor: pointer; white-space: nowrap;
    }"""
if old_css in c:
    c = c.replace(old_css, new_css, 1)
    print('OK - btn-merge CSS')
else:
    print('btn-merge CSS NOT FOUND - trying partial')
    c = re.sub(r'\.btn-merge \{[^}]+\}', new_css, c, count=1)

# 4. Tombol Hapus - hilangkan background simbol (sudah teks X kecil)
# Pastikan font-size kecil
c = re.sub(
    r'(<button class="btn-del-row"[^>]*style=")[^"]*(")',
    r'\1background:#ef5350;color:white;border:none;border-radius:3px;padding:1px 5px;font-size:10px;cursor:pointer;\2',
    c
)

# 5. Action bar - hilangkan semua simbol rusak
replacements = [
    ('&#9878; Input Weight', 'Input Weight'),
    ('⚖ Input Weight', 'Input Weight'),
    ('💾 Save', 'Save'), ('≡ƒÆ╛ Save', 'Save'), ('Γ£ò Save', 'Save'),
    ('✕ Clear', 'Clear'), ('Γ£ò Clear', 'Clear'), ('✗ Clear', 'Clear'),
    ('✓ Submit', 'Submit'), ('Γ£ô Submit', 'Submit'), ('✔ Submit', 'Submit'),
    ('+ QAQC', 'QAQC'),
]
for old, new in replacements:
    c = c.replace(old, new)

# 6. Perkecil tombol action-bar via CSS
old_btn = """.btn-add { background: #4db6ac; color: white; }"""
# Tambahkan CSS perkecil tombol action-bar
if '.action-bar .btn {' not in c:
    # Cari penutup </style> pertama
    c = c.replace('  </style>', """  .action-bar .btn {
      padding: 8px 12px !important;
      font-size: 12px !important;
    }
  </style>""", 1)
    print('OK - action-bar btn size')

with open('preparation.html', 'w', encoding='utf-8') as f:
    f.write(c)
print('SAVED')
