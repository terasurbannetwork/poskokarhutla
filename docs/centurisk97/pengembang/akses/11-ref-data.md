# Referensi: tabel, R2, uji

Halaman ini mendaftar tabel D1 dan migrasi, penyimpanan R2, rahasia, cron, serta uji dan gerbang.

## Tabel D1 dan migrasi

| Migrasi | Tabel |
| --- | --- |
| `0029_instansi.sql` | `instansi_akun`, `instansi_sesi`, `tugas_api`, `tugas_isian`, `instansi_media`, `usulan_kontak_pt`, `instansi_jejak` |
| `0030_staf.sql` | `staf`, `staf_sesi`, `pantau_tugas`, `pantau_jejak` |
| `0095_lapangan_orang.sql` | `orang`, `orang_setuju`, `orang_wajah`, `wa_antre` |
| `0097_lapangan_absen.sql` | `lp_tugas`, `lp_anggota`, `lp_nonce`, `lp_absen`, `lp_logbook`, `lp_logbook_foto`, `lapangan_label`, `lp_wajah_baru` |
| `0101_lapangan_panggil.sql` | `lp_panggil`, `lp_panggil_penerima`, `orang_keahlian`, `lp_logbook_kit` |
| `0112_logpal.sql` | `logpal_gudang`, `logpal_barang`, `logpal_mutasi`, `logpal_opname`, `logpal_opname_baris`, `logpal_permintaan`, `logpal_tahap`, `logpal_kebutuhan`, `logpal_statis` |
| `0113_logpal_potongan.sql`, `0115_logpal_bantuan.sql` | `logpal_statis_potong`, `logpal_bantuan` |
| `0133_masuk.sql` | `mk_akun`, `mk_sesi`, `mk_kode`, `mk_anggota`, `mk_undang`, `mk_domain`, `mk_masuk_log`, `mk_pemirsa_wa`, `mk_denyut`, `alun_penulis` |
| `0138_orang_akun.sql`, `0139_orang_tinjau.sql` | `orang_akun`, `orang_tinjau` |
| `0145_masuk_kode_akun.sql` | `mk_kode_akun` (kode email terikat ke akun) |
| `0166_profil_bpbd.sql` | `instansi_profil`, `instansi_sesi_profil`, `instansi_profil_log` (dengan trigger penjaga log dan batas 4 profil) |
| `0171_segel.sql` | `segel`, `segel_cabut` (hanya CREATE IF NOT EXISTS, tanpa trigger; append-only dijaga kode) |

Migrasi bernomor lain yang menyentuh modul ini: `0136`, `0140`, `0144` (indeks masuk), `0098`, `0105`, `0114` (lapangan), `0113`. Sidik migrasi beku ada di `tests/warga/migrasi_beku.json`.

## Penyimpanan R2, rahasia, dan cron

| Item | Isi |
| --- | --- |
| `instansi/dok/<akun>/<jenis>` | surat tugas dan kartu pegawai |
| `instansi/profil/<akun>/<profil>` | foto profil PIC (JPEG tanpa EXIF) |
| foto absen dan logbook | R2 foto lapangan; retensi 2 tahun (`RETENSI_FOTO_MS`) |
| Rahasia (hanya nama) | `MASUK_KUNCI`, `PROFIL_KUNCI`, `TURNSTILE_SECRET`, `TURNSTILE_SITEKEY`, `WA_KUNCI`, `IP_SALT`, `ADMIN_TOKEN`, `AKUN_SITUS_*`, `SUPER_ADMIN` |
| Cron | satu jadwal `* * * * *` di `wrangler.jsonc`; pembersihan terjadwal (`bersihSemua`, menit 17) memanggil `bersihkanInstansi`, `bersihkanLapangan` yang juga membersihkan `mk_*` lewat `mkBersihkan`, dan pembersih staf |

Tidak ada workflow GitHub Actions yang khusus untuk modul ini. Tabel `mk_denyut` diperbarui gerbang WhatsApp paling sering sekali per menit dan dibaca `GET /api/masuk/saluran`.

## Uji dan gerbang

| Perintah | Isi |
| --- | --- |
| `npm run uji:warga` | seluruh `tests/warga/*.test.mjs`: `masuk*.test.mjs` (halaman, wa, peran, anggota, tahap 3), `instansi.test.mjs`, `profil*.test.mjs` (pic, ambil, log, layar, meja, papan, log_modul), `lapangan*.test.mjs`, `logpal.test.mjs`, `foto_lapangan.test.mjs` |
| `node --test tests/agen/gerbang-pintu-masuk.test.mjs` | G-1 kode tidak masuk log, G-2 tanpa pembaca WhatsApp masuk, G-3 tanpa data contoh, G-4 `PUBLIK_TANPA_SESI` beku (fixture `tests/agen/fixtures/pintu_masuk.json`), G-5 nomor rekaan berawalan 62800, G-6 ambang hanya di `masuk_konst.js`, G-7 tanpa tulis ke tabel akun modul lain, G-8 pintu masuk tidak mengaktifkan, menonaktifkan, atau mengubah akun modul lain (D19; `tests/agen/gerbang-pintu-masuk.test.mjs:74`) |
| `node --test tests/agen/gerbang-profil.test.mjs` | GP-1 sampai GP-17: PIN dan sandi tidak masuk log, tanpa WhatsApp di `src/profil*.js`, dan seterusnya; GP-14 sampai GP-16 menjaga kode PF-07 sampai PF-09; GP-17 menjaga log kerja per profil lewat satu titik, tanpa salinan `pfLog` per modul (`tests/agen/gerbang-profil.test.mjs:310-319`) |
| `node --test tests/lapangan/*.test.mjs` | uji murni klien petugas: antispoof, antre, logbook, panel, panggil, stempel, wajah |
| `npm run uji:agen` | gerbang agen termasuk `gerbang-d1`, `gerbang-d1-pindai`, dan gerbang cakupan rute (`tests/warga/cakupan.json`) |

Gerbang segel yang direncanakan (`tests/agen/gerbang-segel.test.mjs`, SG-11) belum ada.
