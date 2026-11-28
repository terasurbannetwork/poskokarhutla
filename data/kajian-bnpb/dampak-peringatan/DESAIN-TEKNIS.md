# DESAIN-TEKNIS: Dampak peringatan dini dan status prakiraan

## Berkas

| Berkas | Pemilik | Isi |
| --- | --- | --- |
| `scripts/siklus/dampak_peringatan.py` (baru, stdlib Python 3.12) | siklus | orkestrasi: baca peringatan aktif, petakan bahaya, panggil `paparan.py` dan `fasilitas.py`, tulis keluaran; argumen `--kini`, `--umpan` (berkas CAP uji), `--cek` |
| `scripts/prediksi/status_prakiraan.py` dan `status_prakiraan_kriteria.json` (baru) | prediksi | status per kab per bahaya, arsip harian, sidik, entri gerbang |
| `public/prediksi/data/status_arsip/YYYY-MM.jsonl` (baru) | prediksi | arsip harian append-only (D19) |
| `public/data/gerbang/status_prakiraan.json` (baru) | pipa-umum (format), prediksi (isi) | keluaran gerbang bersama |
| R2 `dampak_peringatan/ringkas.json`, `status.json`, `desa/<kab4>.json` | siklus | keluaran jam-jaman |
| `src/dampak_peringatan.js` (baru) dan bagian di `src/hak.js` | warga-api | rute baca: publik `GET /api/dampak-peringatan/ringkas` dan `/status` (cache tepi 120 detik, batas laju), staf `GET /api/dampak-peringatan/desa?kab=` di balik sesi |
| `src/pw_peringatan.js`, `src/pw_inti.js` | warga-api | masukan status ke pemicu push (tanpa kanal baru) |
| `public/inti/dampak_peringatan.js` dan `.css` (baru), kunci `kemampuan.layar.status_dampak` (daftar kode bahaya) di `public/bencana.json`, skema `LAYAR_LIST` di `scripts/umum/bencana.py` (pipa-umum), berkas bangkitan `src/bencana.generated.js` | inti-layar (dan pipa-umum untuk `bencana.py`) | modul bersama lapisan status dan peringatan untuk peta tiap bencana; satu salinan, dinyalakan per bencana (D25); fungsi murni dan penggambar terpisah |
| `public/index.html` (karhutla), `public/banjir/**` (peta utama dan tab Longsor `public/banjir/longsor.js`), `public/cuaca/**` | layar-peta, banjir, cuaca-udara | satu baris pemasangan modul bersama per halaman, tanpa salinan; `/longsor` bukan halaman (registri `longsor`: status mati, layar induk banjir) |
| `public/lapor/dampak_peringatan.js` (baru, fungsi murni) dan sentuhan `lapor.js`, `lapor.css`, `index.html` | layar-peta | saklar, peta status, kartu kab, baris kecil di kartu kejadian |
| `public/prediksi/*` bagian tab Besok | prediksi | status, penduduk, fasilitas per kab |
| `public/bnpb/dalops*.js`, `public/admin/pimpinan.js` | ruang-bnpb | seksi Dalops, kartu Pimpinan |
| `.github/workflows/dampak_peringatan.yml` (baru) | mekanik-mesin | jadwal jam-jaman dan arsip harian |
| `tests/dampak-peringatan/**` (baru), `tests/warga/dampak_peringatan.test.mjs`, `tests/agen/gerbang-dampak-peringatan.test.mjs` | penulis-gerbang | uji |
| `docs/centurisk97/**` halaman metode | docs-situs | F-13 |

Registri: pola `kemampuan.layar` (PB-69, W8): `LAYAR_LIST` di `scripts/umum/bencana.py` mendapat `status_dampak` (daftar slug kode bahaya huruf kecil); semua entri `public/bencana.json` mendapat `status_dampak: []`; `src/bencana.generated.js` dibangkitkan ulang lewat `python3 -I scripts/umum/bencana.py js`. Perubahan skema dan uji `bencana.py uji` ada di DP-10; DP-14 hanya mengisi daftar per bahaya (banjir `["bnj","lsr"]`, karhutla `["kht"]`, cuaca `["cex"]`). Golden registri (PB-03) tidak boleh mundur.

Folder baru: `tests/dampak-peringatan/` dan `public/prediksi/data/status_arsip/` tercakup paket ini (DP-00). Tidak ada folder baru di `scripts/` (sudah `scripts/siklus/` dan `scripts/prediksi/`). Satu migrasi D1 baru, hanya di DP-13 (D30): `pw_kendali_status` dan `pw_kirim_harian`. Keluaran jam-jaman di R2; `pw_status` yang ada dipakai bersama.

## Satu mesin

Tidak ada penghitung penduduk, kelas bahaya, atau fasilitas baru. `dampak_peringatan.py` hanya memuat modul yang ada lewat pola `_muat` (`scripts/siklus/paparan.py:18`): `paparan.py` (zona, `hitung_kab`), `bahaya_kelas.py`, `fasilitas.py`, dan `terpapar.py` (titik pusat Dukcapil x, y, kolom `pria` dan `wanita`). `paparan.py` diperluas di DP-03 (siklus) dengan uji emas; perluasan `terpapar.py` di DP-27 (ruang-bnpb). `scripts/banjir/peringatan.py` tidak dipakai (D2). Peta jenis ke kode prakiraan memakai `scripts/prediksi` `dasar.py`. Gerbang memakai `scripts/umum/gerbang.py`, `pembanding.py`, `selang.py`, `sidik.py`. Fungsi tingkat memakai `besok_inti.js` (diuji kesetaraan Python-JS lewat `scripts/umum/setara.mjs` bila status dihitung di Python dan dibaca di JS; DP-05).

## Alur kode

- Pembaca peringatan: `urllib` ke `GET /api/cuaca/nowcast` pada alamat dasar dari variabel lingkungan; satu panggilan per jalan, gagal berarti R = null, bukan galat.
- Kab tersentuh: poligon berpotongan dengan geometri batas kab dari `public/geo/kabupaten/` (uji kotak pembatas dulu, lalu irisan); poligon kecil tidak terlewat (D35). Hanya kab tersentuh dihitung keterpaparannya.
- Nama desa: `public/data/desa_cari.json` (`baris [[kd, nama, kec]]`).
- Tabel kelas bahaya nasional `public/data/kelas_bahaya_kab.json` dibangun `scripts/siklus/kelas_kab.py` bulanan (DP-02b) dan hanya dibaca saat jalan jam-jaman.
- Beban: `halus_*.json` per provinsi dimuat sesuai kebutuhan; kab tanpa peringatan tidak disentuh. Tanpa peringatan aktif: hanya `status.json` yang dibangun.
- Keluaran ditulis atomik; unggahan ke R2 lewat pola `scripts/siklus/gudang.py`.
- Peringatan baru dengan himpunan poligon yang sama dengan jalan terakhir: hitung dilewati (sidik himpunan), `dibuat` diperbarui.

## Saklar terbit dan pelacakan git (Q2)

`public/prediksi/data/status_arsip/` boleh di-commit (status per kab, tanpa data pribadi). Keluaran per desa tidak pernah masuk `public/` atau git; ia di R2 di balik sesi (D18). Keluaran publik `ringkas.json` dan `status.json` disajikan Worker dari R2, bukan dari `public/` (D19), jadi tidak ada saklar `.assetsignore`.

## Notifikasi (K6)

`jalankanPeringatan` (`src/pw_peringatan.js:88`) dipanggil `peringatanTiapMenit` dari cron Worker jam-jaman pada menit 29 (`src/worker.js:1021`) dan sudah membaca `dibuat` pada `prediksi.json`. Ditambahkan (DP-13): bila `status.json` berubah (penanda di `pw_kendali_status`), hitung peristiwa dari status dengan aturan yang sama (naik ke ambang pelanggan, lebih tinggi dari `pw_status` untuk (kab, jenis, tanggal sasaran), satu notifikasi per perangkat per terbitan, batas 40 kiriman per putaran, data basi tidak dikirim) ditambah penjaga `pw_kirim_harian`: paling banyak satu notifikasi per perangkat per kab per jenis per hari WIB lintas kedua pemicu. Teks lewat `teksNotif` dengan nama kab dan kecamatan dari `kec_nama`, tidak kode, label hipotesis. Jenis karhutla belum ada di langganan (D16). Penerima, ambang, jam tenang, dan batas 5.000 langganan mengikuti `pwa-peringatan`. Rute baru didaftarkan di `src/worker.js` (blok `...RUTE_*`, sekitar baris 658 sampai 666) dengan entri hak di `src/hak.js` (DP-09).

## Rahasia dan akses R2

Workflow unggah ke R2 memakai `CLOUDFLARE_API_TOKEN` dan `CLOUDFLARE_ACCOUNT_ID` (rahasia GitHub yang sudah ada, seperti `siklus.yml` baris 40 dan 41); tidak ada rahasia baru. Nilainya tidak pernah masuk berkas yang dilacak.

## Kinerja dan biaya

Keluaran R2 beberapa ratus KB. Hitung jam-jaman O(kab tersentuh x sel bangunan kab); jalan tanpa peringatan hanya membaca satu berkas. Jadwal menit 20 tiap jam menghindari menit sibuk GitHub (Q3). Kuota baca D1 produksi terbatas (memori `d1-kuota-baca`): paket ini tidak menambah baca D1; satu panggilan HTTP ke `/api/cuaca/nowcast` per jam memakai cache tepi.

## Pengerja dan pemeriksa

siklus (mesin), prediksi (status), warga-api (rute, push), layar-peta, ruang-bnpb, mekanik-mesin, penulis-gerbang, docs-situs, cuaca-udara (pemeriksaan sumber). Pemeriksa: `validasi-model` (status dan uji balik), `selera-angka` dan `inp-reviewer` (layar), `guard-api`, `security-reviewer` (rute staf), `higiene-repo` (sebelum commit besar). Tidak ada agent baru.
