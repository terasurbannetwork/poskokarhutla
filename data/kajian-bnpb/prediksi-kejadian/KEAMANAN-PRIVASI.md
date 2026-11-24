# KEAMANAN-PRIVASI

| Data | Siapa melihat | Di mana disimpan | Larangan |
| --- | --- | --- | --- |
| Prakiraan (`prediksi.json`, `lalu.json`) | publik | `public/prediksi/data` | tidak ada |
| Kejadian Dalops | sesi staf Dalops | R2 `dalops/` | tidak pernah di `public/`; nama petugas tidak ikut |
| Titik laporan Lapor Bencana | sesi staf Dalops (Q3) | D1 `lapor_*`, dibaca lewat rute baru | tanpa nama, nomor WA, isi pesan, foto di rute ini; koordinat hanya di layar staf |
| Label logbook untuk rapor | pipeline (Bearer `PIPA_TOKEN`) | `public/prediksi/data/amatan/konfirmasi.json` | hanya `[kab, tanggal, kode, sumber, terjadi]`, tanpa catatan, tanpa nomor kejadian |

- Rute baru memeriksa sesi staf, metode GET saja, `sejak` dibatasi, `jenis` dari daftar tetap (pemeriksa `guard-api`, `security-reviewer`).
- Teks dari laporan tidak pernah disisipkan sebagai HTML (pop-up memakai `textContent`).
- Laporan berstatus `tidak_valid` tidak dikirim rute.
