# KEAMANAN-PRIVASI: Semai Redistribusi Banjir dan Penguji Efektivitas

`data/kajian-bnpb/semai-awan/KEAMANAN-PRIVASI.md` berlaku penuh. Dokumen ini menambah yang baru.

## 1. Data dan sifatnya

| Data | Sifat | Tempat |
| ---- | ----- | ------ |
| `semai_banjir.json`, kandidat, arsip `_banjir` | turunan data publik (ECMWF CC BY 4.0, prakiraan kita), koordinat zona adalah usulan operasi | R2 `operasi/semai/`, rute berkas di balik sesi |
| Sasaran manual (`op_semai_sasaran`) | keputusan operasi BNPB: kab dan tanggal | D1, di balik sesi |
| Target tujuan banjir (`op_semai_target`) | sama dengan induk | D1 |
| Rapor penguji (`rapor_banjir.json`, `riset/HASIL-A.md`) | agregat tanpa koordinat, tetapi bisa dibaca sebagai penilaian program pemerintah | R2 di balik sesi; HASIL-A di repo hanya sesudah pemilik membaca (Q4) |
| `omc_bmkg.json` | data publik BMKG apa adanya | `public/udara/data/` (sudah ada) |
| `SEMAI_TOKEN` | kredensial pipeline baru, baca saja | Worker secret dan GitHub secret, tidak pernah di berkas (DESAIN-TEKNIS §4.1) |

Tidak ada data pribadi baru. Akun yang menambah sasaran disimpan sebagai id akun, bukan nama.

## 2. Matriks hak (tambahan)

| Aksi | Publik | Pembaca `/operasi` | `pusdalops` | `tmc` | Moderator | Token pipeline |
| ---- | ------ | ------------------ | ----------- | ----- | --------- | -------------- |
| Baca `semai_banjir.json`, arsip, rapor | tidak | ya | ya | ya | ya | tidak |
| Baca sasaran manual | tidak | ya | ya | ya | ya | ya (hanya GET sasaran) |
| Tambah dan hapus sasaran manual | tidak | tidak | ya | ya | ya | tidak |
| Jadikan zona banjir target renlap | tidak | tidak | ya | ya | ya | tidak |

`SEMAI_TOKEN` hanya membuka `GET /api/operasi/semai/sasaran` dan `GET /api/operasi/semai/target`; tidak bisa menulis, tidak membuat sesi,
dibanding dengan waktu tetap, dan mati bila secret Worker kosong (DESAIN-TEKNIS §4.1). Ini jalur auth baru, bukan pola yang sudah ada.

## 3. Rute

- `POST /api/operasi/semai/sasaran`: `kab` harus kode BPS 4 angka yang ada di daftar kab repo (bukan teks bebas); tanggal hari ini
  atau besok WIB; catatan <= 300 huruf, dibersihkan dari kendali; asal permintaan diperiksa seperti rute tulis Operasi Udara lain;
  batas 30 isian per hari per akun, baris terhapus ikut dihitung.
- `POST /api/operasi/semai/target` untuk zona `-B`: koordinat, skor, jendela, dan sasaran diambil server dari arsip `_banjir`; badan klien
  tidak boleh membawa sasaran atau koordinat (sama dengan induk §4).
- `NAMA_SAH` tetap daftar tertutup; pola baru diuji lawan traversal (`arsip/../x`, `semai_banjir.json.bak`).
- Pemeriksa: `guard-api`, `security-reviewer`.

## 4. Layar

- Nama kab, asal sasaran, dan catatan disisipkan sebagai teks (`textContent`).
- Rapor tidak menampilkan angka efek tanpa selang dan MDE di sebelahnya, dan tidak pernah tanpa kalimat "kesesuaian, bukan
  sebab-akibat".

## 5. Kepekaan hasil penguji

Hasil "tak terbedakan" atau "berlawanan" tentang operasi resmi BMKG dan BNPB bisa dikutip lepas konteks. Karena itu (Q4 bawaan):
hasil hanya untuk staf, HASIL-A di-commit sesudah pemilik membaca, dan tiap hasil ditulis dengan aturan lapor `PRAREG-EFEK-OMC.md` §7:
"tidak terdeteksi" bukan "tidak ada efek", tanpa kata "berhasil" atau "gagal" untuk OMC.

## 6. Klaim

Kalimat terlarang di layar, ringkasan, renlap, dan rapor (KEPUTUSAN D10), diperiksa gerbang teks induk (`gerbang-semai-klaim`,
RENCANA-UJI §7): "mencegah banjir", "aman", "akan hujan", "pasti", "hujan berkurang x%", "menurunkan curah hujan x mm", "memindah banjir",
"berhasil", "gagal" (untuk OMC), ditambah daftar induk.
