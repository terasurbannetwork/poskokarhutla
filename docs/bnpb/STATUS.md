# Status Ruang Koordinasi BNPB

Ditulis 19 Okt 2026 di akhir kerja 12 jam. Rencana: `RENCANA-12-JAM.md`. Kontrak teknis: `ARSITEKTUR.md`.

## Yang sudah jadi

| Masalah | Sistem | Halaman publik | Halaman admin | Uji |
|---|---|---|---|---|
| M1 sitrep manual | Sitrep otomatis harian (nasional/provinsi, cetak A4, salin teks WhatsApp) | `/sitrep`, `/sitrep?prov=62` | – | halaman + CSP (`bnpb.test.mjs`); logika layar diperiksa di peramban |
| M2 kaji cepat lambat | Meja Kerja: kaji cepat kerusakan | `/meja` (petugas berkode) | `/admin/meja` | `meja.test.mjs` |
| M3 logistik tak terlacak | Meja Kerja: logistik (diminta → disetujui → dikirim → diterima, selisih) | `/meja` | `/admin/meja` | `meja.test.mjs` |
| M4 relawan tak terkelola | Relawan + kampus PTN/MoU (kode koordinator, jam kerja untuk SKS/KKN) | `/relawan`, `/relawan/saya`, `/kampus` | `/admin/relawan` | `relawan.test.mjs` |
| M5 BPBD tak terukur | Rapor kinerja BPBD (waktu respons, keaktifan regu, kelengkapan meja) | – | `/admin/meja` tab Rapor | `meja.test.mjs` |
| M6 DSP | Meja Kerja: Dana Siap Pakai sampai SPJ | `/meja` | `/admin/meja` | `meja.test.mjs` |
| M7 renkon kedaluwarsa | Meja Kerja: registri renkon (berlaku/segera habis/kedaluwarsa/belum diuji) | `/meja` | `/admin/meja` | `meja.test.mjs` |
| M9 InaRISK statis | Indeks risiko operasional per kecamatan, harian | `/risiko` | – | data: `risiko.py --cek`; layar: halaman + CSP |
| M10 riset tak dipakai | Kemitraan riset: agenda BNPB, usulan, katalog data, luaran, pemanfaatan kebijakan | `/riset`, `/riset/mitra` | `/admin/riset` | `riset.test.mjs` |
| M11 komunikasi satu arah | Alun-alun: tanya, butuh bantuan, info lapangan, pengumuman resmi | `/alun-alun` | `/admin/alun` | `alun.test.mjs` |
| M12 Destana | Meja Kerja: Destana (aktif/pasif) | `/meja` | `/admin/meja` | `meja.test.mjs` |
| M13 anggaran musiman | Perkiraan kebutuhan musim 30/60/90 hari (jam terbang, regu, masker, rupiah) | `/kebutuhan` | – | data: `kebutuhan.py --cek`; layar: halaman + CSP |
| M14 Gakkum | Berkas Gakkum konsesi (lembar A4) | – | `/admin/gakkum` | halaman + sesi (`bnpb.test.mjs`); lembar A4 diperiksa di peramban |

Pintu semua sistem: `/bnpb` (tidak ada di nav utama situs). Di admin: satu menu "Ruang Koordinasi" dengan sub-nav.
M8 (pengungsi) dicoret pemilik.

Halaman admin relawan, alun-alun, riset, dan meja punya 🧪 isi dummy / 🧹 hapus dummy (Super Admin); Berkas Gakkum tidak, karena hanya membaca data konsesi nyata. Dummy tidak pernah masuk angka publik.

## Pengulas yang sudah lewat

- `security-reviewer`: tanpa temuan kritis; temuan tinggi/sedang (anonimisasi UU PDP, koordinat peminta bantuan, akun gerbang membaca moderasi, oracle pendaftaran, luaran mitra tanpa persetujuan) sudah dibetulkan dan diuji.
- `guard-api`: semua rute bergerbang; jalur 500 dan cache yang bisa dibobol sudah dibetulkan.
- `migrasi-idempoten`: 0022–0026 bersih, aman diterapkan ke D1 produksi berisi data.
- `inp-reviewer`: dua handler berat (risiko, kebutuhan) dipindah sesudah frame tercat.
- `selera-angka`: 15 temuan format/presisi, dibetulkan.

## Yang harus dikerjakan PEMILIK (tidak bisa dari sesi agent)

1. **Terapkan migrasi D1 produksi** (ditolak pengaman otomatis karena termasuk deploy produksi). Lakukan SEBELUM atau tepat sesudah push; sampai itu dijalankan, semua API baru menjawab 503 "fitur belum diaktifkan":
   ```bash
   npx wrangler d1 migrations apply poskowarga --remote -c wrangler.jsonc
   ```
2. **Push** commit lokal (atau commit "gas" seperti biasa). Termasuk `.github/workflows/lintas.yml` (langkah harian indeks risiko dan kebutuhan musim): token CLI tidak punya scope workflow, jadi berkas ini sengaja dibiarkan untuk commit GitHub Desktop.
3. **Turnstile** (pelindung bot form relawan & alun-alun): `TURNSTILE_SITEKEY` di `wrangler.jsonc` masih kosong, jadi pelindung bot mati. Isi sitekey dan secret `TURNSTILE_SECRET` bila form mulai diserbu spam.
4. **Super Admin**: tombol 🧪/🧹 hanya muncul bila secret `SUPER_ADMIN` memuat awalan hash akunmu (pola yang sama dengan Ruang Posko).
5. Putuskan kapan `/bnpb` masuk nav utama situs.

## Batas yang diketahui

- Indeks risiko dan kebutuhan musim berlabel "belum diuji balik"; ambang kekeringan yang dipakai indeks risiko gagal uji balik (FAR 0,93).
- Kapasitas di indeks risiko masih statis (jarak kantor BPBD); posko/relawan/Destana dari D1 belum masuk skor.
- Lapor Warga tidak punya kolom provinsi, jadi sitrep per provinsi menampilkannya nasional.
- Rapor BPBD dan ringkas Meja Kerja membaca maksimal 20.000 baris lalu menghitung di Worker (catatan `ponytail` di kode).
- Data kampus mitra relawan dan mitra riset masih dua tabel terpisah.
