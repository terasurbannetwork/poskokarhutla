# TIKET: Aplikasi terpasang dan peringatan dini (`PW-*`)

Ambil tiket berurutan, kerjakan hanya cakupannya. Tiap tiket layar ditinjau pemilik di `http://localhost:8800/lapor/`. Subagent tidak commit dan tidak deploy; sesi induk yang melakukannya. Migrasi diterapkan ke D1 produksi oleh pemilik.

| Tiket | Cakupan | Pengerja | Pemeriksa | Bukti siap | Bergantung |
| --- | --- | --- | --- | --- | --- |
| PW-00 | Bagian §2.33 di AGENTS.md (baca dulu, baru bangun) dan baris peta modul; pemilik berkas baru di roster | sesi induk | `higiene-repo` | `npm run uji:agen` | paket ini diterima |
| PW-01 | `migrations/0163_pw_peringatan.sql` (`pw_langganan`, `pw_status`, `pw_peristiwa`, `pw_kendali`); kolom `publik` pada `titik_pengungsian` bila Q8 disetujui (migrasi terpisah 0164) | `warga-api` | `migrasi-idempoten` | `node --test tests/lapor/peringatan_migrasi.test.mjs` (semua migrasi di SQLite, dijalankan dua kali) | Q8 untuk 0164 |
| PW-02 | `src/pw_peringatan.js` fungsi murni: peristiwa, penerima, teks, titik evakuasi; ekstraksi `levelKode` yang dipakai bersama layar dan Worker; verifikasi R1 sampai R5 dari sumbernya dan koreksi RISET | `warga-api` | `validasi-model`, `selera-angka` | `tests/lapor/peringatan_inti.test.mjs` | PW-01 |
| PW-03 | Ikon PNG 192, 512, maskable, lencana dari lambang resmi; `manifest.webmanifest`. **Pertanyaan ke pemilik:** berkas lambang BNPB resolusi 512 atau vektor, hanya 160 x 160 yang ada | `layar-peta` | `selera-angka` | `tests/lapor/pwa_manifest.test.mjs` | berkas ikon dari pemilik |
| PW-04 | `public/lapor/sw.js` (push, klik, penggantian langganan), registrasi di `index.html`, header `no-cache` untuk `sw.js` di `public/_headers` | `layar-peta` | `security-reviewer`, `inp-reviewer` | uji service worker di node (impor dengan `self` tiruan) dan uji `_headers` | PW-03 |
| PW-05 | Kartu Pasang (F-1, F-2), panduan iPhone, deteksi standalone, gelembung SIGAP tambahan, kamus terjemahan kunci baru | `layar-peta` | `inp-reviewer`, `selera-angka` | uji fungsi murni keadaan; M5 | PW-03 |
| PW-06 | Rute `kunci`, `langganan`, `ubah`, `berhenti`, `status`, pemetaan di `src/lapor_ai.js`, entri `tests/warga/cakupan.json`, batas laju, daftar `HOST_PUSH` | `warga-api` | `guard-api`, `security-reviewer` | `tests/lapor/peringatan_rute.test.mjs` | PW-01, PW-02 |
| PW-07 | Cron `jalankanPeringatan`, kursor, jeda global, rute staf `ringkas` dan `jeda`, entri `src/hak.js`, retensi di `bersihSemua`, var `PW_UJI`, `VAPID_*_WARGA` | `warga-api` | `guard-api`, `security-reviewer`, `migrasi-idempoten` | `tests/lapor/peringatan_cron.test.mjs` | PW-06, Q11 |
| PW-08 | Kartu kelola (F-3, F-4, F-5, F-8) dan pendaftaran push di `public/lapor/peringatan.js` | `layar-peta` | `inp-reviewer`, `selera-angka`, `security-reviewer` | uji keadaan; M1 | PW-05, PW-06 |
| PW-09 | Rute `arah` dan kartu Arahan (F-7), jarak dari GPS di perangkat, label sumber, rujukan BPBD bila kosong | `warga-api` dan `layar-peta` | `security-reviewer`, `selera-angka` | `tests/lapor/peringatan_arah.test.mjs`; M5 | PW-02, PW-08 |
| PW-10 | Gerbang `tests/agen/gerbang-pwa-peringatan.test.mjs` | `penulis-gerbang` | `higiene-repo` | `npm run uji:agen` | PW-04 sampai PW-09 |
| PW-11 | Tiruan lokal di `scripts/lapor/lokal.mjs` dan tinjau di localhost:8800 | pemilik berkas (`ilmu.mjs pemilik`) | `inp-reviewer` | buka `http://localhost:8800/lapor/` dan jalankan alur 3 sampai 5 | PW-08 |
| PW-12 | Uji perangkat M1 sampai M4 dengan `PW_UJI=1`, catat hasil, perbaiki | sesi induk dengan pemilik | `security-reviewer` | catatan hasil di tiket; bukan uji otomatis | PW-07, PW-09, Q17 |
| PW-13 | Kebijakan privasi: tambah bagian peringatan (data, retensi, penyedia push); tinjauan hukum BNPB | sesi induk dan pemilik | `security-reviewer` | teks terbit; surat tinjauan oleh pemilik | PW-08 |
| PW-14 | Versi aplikasi dan changelog Pantau Bencana naik; buka ke publik hanya sesudah Q2, Q7, Q8, dan PW-13 terjawab | sesi induk | `higiene-repo` | changelog dan keputusan pemilik tertulis | semua |

Catatan lintas tiket: tidak ada tiket yang menambah jadwal cron, mengubah `wrangler.jsonc` selain `vars`, atau mengubah `src/push.js` (hanya mengimpor `enkripsi` dan `kirimKe`; bila perlu diekspor tambahan, itu perubahan kecil milik `warga-api` dengan uji `tests/warga/push.test.mjs` tetap hijau).
