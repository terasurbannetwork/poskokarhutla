# Status Ruang Koordinasi BNPB

Ditulis 19 Okt 2026, diperbarui 20 Okt 2026 sesudah gelombang penyempurnaan. Rencana: `RENCANA-12-JAM.md`, `RENCANA-SEMPURNA-12-JAM.md`. Kontrak teknis: `ARSITEKTUR.md`.

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

## Gelombang penyempurnaan (20 Okt 2026)

| Butir | Hasil | Tempat |
|---|---|---|
| C1 integrasi | "Butuh bantuan" alun-alun diteruskan sekali klik menjadi permintaan relawan atau logistik; status tampil di utas publik tanpa data pribadi | `/admin/alun`, `src/alun.js` |
| C2 pengingat | Antrean harian 07.40 WIB: MoU/PKS hampir habis, logistik >24 jam, DSP tanpa SPJ, renkon, rehab macet, stok rendah, bantuan terbuka >24 jam. Email hanya bila admin menekan kirim | `/admin/pengingat` |
| C3 kapasitas dinamis | Relawan aktif per kab masuk indeks risiko (syarat ≥10 relawan dan ada jam sah; prioritas tetap pakai kapasitas statis supaya tidak bisa ditekan pendaftaran palsu) | `/api/relawan/kapasitas` (k-anonim: kab <5 orang dan keahlian <3 orang disembunyikan) |
| C4 uji balik | Jujur: banjir/longsor dan gempa **belum** mengalahkan pembanding bermakna (gempa kalah dari peta bahaya InaRISK saja). Label per bahaya di layar; arsip potret harian untuk uji prospektif | `/risiko`, `risiko_ujibalik.json` |
| C5 wilayah Lapor Warga | prov/kab per laporan (tabel samping 0027, isi mundur via cron), filter `?prov=`; tetap jalan bila 0027 belum diterapkan | `/api/warga` |
| C6 uji layar | 59 uji otomatis Chrome headless: 19 halaman × 1440/390 + interaksi (termasuk luring dan Teruskan) | `npm run uji:layar` |
| C7 institusi tunggal | Satu tabel institusi + perjanjian (MoU relawan, PKS riset) untuk relawan dan riset | tab Institusi di `/admin/relawan` dan `/admin/riset` |
| C8 agregat | `meja_ringkas` menggantikan pemindaian 20.000 baris; disegarkan tiap tulis dan cron | `src/meja.js` |
| C9 Turnstile | Siap pakai di relawan dan alun-alun; aktif begitu sitekey diisi | `public/bnpb/turnstile.js` |
| C10 arsip sitrep | Arsip harian 07 WIB di R2 (agregat, tanpa teks/koordinat warga, retensi 400 hari, hapus per tanggal oleh moderator) | `/sitrep?tgl=` |
| F1 Layar Pimpinan | Satu layar: situasi, prioritas dampak, rapor BPBD, tanda bahaya, relawan, alun-alun, kebutuhan, pengingat; cetak A4 | `/admin/pimpinan` |
| F2 prioritas dampak | **Sebagian.** Daftar kecamatan naik kelas / sangat tinggi dengan bahaya harian aktif, × jiwa, + BPBD terdekat sudah ada. Antrean kiriman ke BPBD (admin menekan kirim) BELUM dibuat, dan pipeline jalan harian lewat lintas.yml, bukan tiap 6 jam | `/risiko` (Prioritas hari ini) |
| F3 rehab-rekon | Meja baru tertaut kaji cepat: jitupasna → usulan → disetujui → cair → dibangun → selesai, tanda macet >60 hari | `/meja`, `/admin/meja` |
| F4 stok gudang | Stok per gudang; logistik dikirim memotong stok secara atomik; koreksi hanya admin | `/meja`, `/admin/meja` |
| F5 ekspor DIBI | CSV/JSON berkolom gaya DIBI dari kaji cepat (nama jenis bencana DIBI perlu dicek pemilik) | `/api/meja/ekspor` |
| F6 luring | Antrean kiriman `/meja` dan check-in relawan saat sinyal hilang, kirim ulang otomatis, idempoten | `public/bnpb/antre.js` |

## Pengulas yang sudah lewat

- `security-reviewer`: tanpa temuan kritis; temuan tinggi/sedang (anonimisasi UU PDP, koordinat peminta bantuan, akun gerbang membaca moderasi, oracle pendaftaran, luaran mitra tanpa persetujuan) sudah dibetulkan dan diuji.
- `guard-api`: semua rute bergerbang; jalur 500 dan cache yang bisa dibobol sudah dibetulkan.
- `migrasi-idempoten` dan `guard-api`: 0022–0028 bersih (hanya CREATE IF NOT EXISTS), aman diterapkan ke D1 produksi berisi data.
- `validasi-model`: uji balik dirombak supaya jujur (seri dipecah netral, vonis wajib mengalahkan semua pembanding bermakna), kebutuhan musim tampil sebagai rentang.
- Gelombang 2: `security-reviewer` (k-anonimitas kapasitas, arsip sitrep agregat + retensi, stok hanya admin, laju email) dan `guard-api` dibetulkan; uji worker 461/461, gerbang 57/57, layar 59/59.
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

- Indeks risiko: uji balik komponen statis banjir/longsor dan gempa belum mengalahkan pembanding; bahaya harian (karhutla, gunung api, cuaca, kekeringan) belum teruji mundur (uji prospektif butuh ±44 hari potret). Ambang kekeringan gagal uji balik (FAR 0,93).
- Kebutuhan musim: rentang lebar (skenario El Nino hanya 2 tahun data); tarif dan koefisien adalah asumsi kerja.
- Sitrep per provinsi kini memakai wilayah Lapor Warga, setelah migrasi 0027 diterapkan.
- Arsip sitrep masih memuat 5 judul utas "butuh bantuan" teratas; takedown utas tidak merambat otomatis (pakai hapus per tanggal).
- Mode luring butuh halaman sudah pernah dibuka saat daring (tanpa service worker). Aksi stok tidak lewat antrean luring.
- Uji layar butuh Chrome dan belum masuk CI.
