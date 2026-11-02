# TIKET: Pegawai dan Relawan Lapangan

Dokumen terakhir dalam urutan otoritas (KEPUTUSAN > RISET > PRD > ALUR > ALGORITMA > DESIGN-SYSTEM > DESAIN-TEKNIS >
KEAMANAN-PRIVASI > RENCANA-UJI > TIKET). Versi 1.0, 1 Nov 2026.

> **Untuk pekerja agen.** Satu sesi = satu tiket. Baca tiketmu, lalu bagian dokumen di "Rujukan" SAJA. Kerjakan hanya
> "Berkas". Yang tidak tertulis: berhenti dan tanya (AGENTS.md §2.3). Subagent: jangan commit, push, atau deploy.

## 0. Batasan global

| Batasan | Nilai |
|---|---|
| Migrasi | 0095 sampai 0098, hanya `CREATE … IF NOT EXISTS`, sha256 ke `tests/warga/migrasi_beku.json` |
| Kode pribadi | `kodeBaru()` 26 hex, simpan sha saja |
| Konstanta | hanya di `src/lapangan_konst.js`; klien membaca `/api/petugas/konst` |
| Wajah | hanya pustaka Human dipatok versinya, berkas di `public/petugas/model/` |
| Vektor | tidak pernah keluar dari Worker |
| Cron | tidak menambah jadwal |
| Gaya | kepala situs bersama + token `inti/tema.css`, kelas `.lp-*` |
| WA | hanya lewat `wa_antre` + gateway limiter |

## 1. Aturan semua tiket

1. Pengerja `lapangan` (sonnet); pengulas sesuai RENCANA-UJI; sesi induk (opus) merancang dan commit.
2. Selesai = semua perintah Bukti keluar 0 + pengulas tanpa temuan tinggi.
3. Uji yang salah DITOLAK wajib ada; tiap rute/tabel baru masuk `tests/warga/cakupan.json`.
4. Ukuran: S < ½ hari, M ≈ 1 hari, L > 1 hari.
5. `[induk]` dikerjakan sesi induk; `[manusia]` butuh pemilik.

## Tahap A (30 hari): fondasi dan data induk

| Tiket | Isi | Berkas | Rujukan | Bukti | Ukuran |
|---|---|---|---|---|---|
| LP-001 `[induk]` | Paket dokumen, AGENTS.md §2.3, agent `lapangan` di roster + ilmu | `data/kajian-bnpb/lapangan/**`, `AGENTS.md`, `scripts/agents/roster.json`, `.claude/ilmu-agent/lapangan.md` | semua | `npm run uji:agen` | S |
| LP-002 | `src/lapangan_konst.js`: konstanta + kosinus, haversine, `putusStatus`, `lompatanMustahil` | `src/lapangan_konst.js`, `tests/lapangan/konst.test.mjs` | ALG §3-§5 | `node --test tests/lapangan` | S |
| LP-003 | Migrasi 0095 `orang`, `orang_setuju`, `orang_wajah`, `wa_antre` | `migrations/0095_lapangan_orang.sql`, `tests/warga/migrasi_beku.json`, `tests/warga/lapangan_skema.test.mjs` | DT §3 | `npm run uji:warga` | S |
| LP-004 | Rute `konst`, `saya`, `setuju`; akses kode pribadi; tautan relawan ke `orang` saat diverifikasi | `src/lapangan.js`, `src/relawan.js` (satu kait), `src/worker.js` (spread rute), `tests/warga/lapangan.test.mjs` | DT §2, §4; ALUR A2 | `npm run uji:warga` | M |
| LP-005 | Impor CSV induk pegawai: pratinjau, simpan, laporan tolak; kirim tautan ke `wa_antre` | `src/lapangan_panel.js` (`wa_antre` ada di 0095) | ALUR A1; DT §4 | `npm run uji:warga` | M |
| LP-006 | Layar L1 dan L2 + cangkang PWA + kepala situs + dummy | `public/petugas/index.html`, `app.js`, `lapangan.css`, `sw.js` | DS §1-§2 | tangkapan 390 px; `inp-reviewer` | M |
| LP-007 `[manusia]` | CSV pegawai dari Biro SDM; teks persetujuan final | | KP U7 | | |
| LP-008 `[induk]` | Terapkan 0095 ke D1 produksi | | KP U8 | `wrangler d1 migrations list --remote` | S |

## Tahap B (60 hari): wajah, absen, logbook, tinjauan

| Tiket | Isi | Berkas | Rujukan | Bukti | Ukuran |
|---|---|---|---|---|---|
| LP-010 | Pasang Human + model di aset statis, `wajah.js` (muat, sudut, mutu, tantangan, vektor) | `public/petugas/model/**`, `public/petugas/wajah.js`, `tests/lapangan/wajah.test.mjs` (fungsi murni sudut/mutu) | ALG §1-§3 | uji + coba di 2 HP | L |
| LP-011 | Layar L3 daftar wajah + rute `POST/DELETE /api/petugas/wajah` | `app.js`, `src/lapangan.js` | ALUR A3; ALG §2 | U-08, U-15 | M |
| LP-012 | Migrasi 0097 (tugas, anggota, nonce, absen, logbook, foto, label; 0096 dipakai sesi lain) | `migrations/0097_lapangan_absen.sql` | DT §3 | U-02, U-18 | S |
| LP-013 | Rute nonce + absen: putus status, `nilaiGps`, sha256 unik, R2, `relawan_jam` | `src/lapangan.js` | ALG §4-§5; ALUR A5, A7 | U-05, U-06, U-09, U-10, U-12 | L |
| LP-014 | Layar L4 absen + stempel + antrean luring | `app.js`, `stempel.js`, `antre.js`, `tests/lapangan/stempel.test.mjs` | DS §2; ALG §6 | U-19 | L |
| LP-015 | Logbook: rute + layar L5 (kondisi lapangan per bencana) + `lapangan_label` | `src/lapangan.js`, `app.js` | ALUR A6; ALG §7 | U-13 | M |
| LP-016 | Panel pimpinan: ringkas, peta, tugas, antrean tinjauan, pengisian logbook Dirdalops | `src/lapangan_panel.js`, `public/petugas/panel.*` | ALUR A8-A9; DS §3 | U-04, U-16 | L |
| LP-017 | Uji perangkat tanda yaw/pitch (U-07) | | ALG §2 | catatan di KP | S |
| LP-018 `[induk]` | Terapkan 0097 ke produksi | | KP U8 | | S |
| LP-030 | Gabung regu Posko: kode regu lama (`x-kode-regu`) diterima sebagai orang modul ini; layar regu lama dialihkan ke `/petugas` sesudah fitur setara | `src/lapangan.js`, `src/posko.js` (kait kecil), `public/petugas/**` | KP K11, K12; R3 | uji regu lama tetap hijau + uji alih | L |
| LP-031 | Peta personel dari `penugasan_posisi` (`/lacak`) di panel pimpinan; jejak GPS petugas saat tugas | `src/lapangan_panel.js`, `public/petugas/panel.*` | KP K11 | uji rute + tangkapan layar | M |
| LP-032 | Foto absen dan logbook memakai jalur media yang ada (`bacaExif`, aturan 48 jam / 5 km, `bersihMedia`, sha256, hitung orang) | `src/lapangan.js` | KP K11; DT §5 | U-06 | S |
| LP-033 | Tugas api Ruang Instansi: kondisi menyala/bara/padam dari logbook regu tersambung ke tugas api terdekat dan jadi `lapangan_label` | `src/lapangan.js`, `src/instansi.js` (kait kecil) | ALG §7 | uji label | M |

## Tahap C (90 hari): bot WA, relawan, label model

| Tiket | Isi | Berkas | Rujukan | Bukti | Ukuran |
|---|---|---|---|---|---|
| LP-020 | Migrasi 0098 panggilan + `src/lapangan_wa.js` (antre, hasil, balas SIAP/TIDAK) + kait di `src/wa.js` | `migrations/0098_*.sql`, `src/lapangan_wa.js`, `src/wa.js` | ALUR A10; ALG §8 | U-14 | M |
| LP-021 | Gateway menarik `wa_antre` lewat limiter | `scripts/wa/lapangan_tarik.mjs`, `tests/wa/lapangan_tarik.test.mjs` (pengerja `wa-bot`) | DT §4 | `npm run uji:wa` | M |
| LP-022 | Bot WA kirim Renlap dan penugasan saat anggota ditambahkan; tanya kondisi lapangan harian | `src/lapangan_panel.js`, `src/lapangan_wa.js` | ALUR A4; PRD F-14 | uji rute | M |
| LP-023 | Ekspor label harian untuk model | `scripts/lapangan/ekspor_label.py` (pengerja `pipa-data`), `data.yml` (pengerja `mekanik-mesin`) | DT §6 | self-check Python | S |
| LP-024 | Rekap per tugas + ekspor CSV tanpa vektor | `src/lapangan_panel.js` | PRD F-17; KM §2 | U-11 | S |
| LP-025 | Kalibrasi ambang dari 200 pasang sah | `scripts/lapangan/kalibrasi.py` | ALG §3 | hasil ke KP | S |
| LP-026 `[induk]` | Terapkan 0098 ke produksi; uji ujung ke ujung di satu tugas nyata | | | laporan uji | S |
| LP-040 | Renlap Generator: tugas lapangan memilih Renlap; bot WA mengirim Renlap ke anggota saat ditambahkan | `src/lapangan_panel.js`, `src/lapangan_wa.js` | KP K11 | uji rute | M |
| LP-041 | Panggilan relawan memakai `relawan_permintaan` dan `relawan_penugasan` yang ada (keahlian, jumlah, asuransi, nilai) | `src/lapangan_wa.js`, `src/relawan.js` (kait) | ALUR A10 | U-14 | M |
| LP-042 | Riwayat pelatihan relawan (`relawan_pelatihan`) tampil di profil dan jadi syarat panggilan | `src/lapangan.js`, `public/petugas/**` | KP K11 | uji | S |
| LP-043 | Kit SIPPA: alat yang dibawa regu per tugas (pinjam pompa, selang) tercatat dan tampil di logbook | `src/lapangan.js`, kait `src/sippa.js` | KP K11 | uji | M |
| LP-044 | Pengingat belum absen dan belum isi logbook lewat mesin pengingat yang ada | `src/pengingat.js` (pendeteksi baru) | KP K11 | uji pendeteksi | S |
| LP-045 | Isian genangan dan hujan lokal mengalir ke konfirmasi `/prediksi` dan uji lapangan banjir | `src/lapangan.js`, kait `src/prediksi.js` | ALG §7 | uji label | M |
| LP-046 | Penanda keahlian drone di data induk; panel drone gambut bisa memanggil petugas berlisensi | `src/lapangan_panel.js`, `public/petugas/panel.*` | KP K11 | uji | S |
| LP-047 | Logbook harian petugas tampil di sitrep; panel memantau pengisian logbook Dirdalops | `src/lapangan_panel.js`, kait `src/sitrep.js` | PRD F-12 | uji | M |
| LP-048 | Alihkan halaman lama (regu `/lapangan`, `/lacak` petugas, relawan-saya) ke `/petugas` sesudah setara; satu desain | `src/worker.js`, `public/petugas/**` | KP K12 | uji alih + CSP | M |
| LP-049 | Retensi 2 tahun: cron menit 17 menghapus foto absen/logbook (R2) yang lebih tua dari 2 tahun dan mengosongkan `foto_key`, baris tetap; label dan agregat tidak ikut. Janji ini sudah tertulis di teks persetujuan wajah dan KEAMANAN-PRIVASI §2 butir 5, tetapi belum ada kodenya | `src/lapangan_panel.js` (`bersihkanLapangan`), `migrations/` (foto_key nullable bila perlu) | KP §2.5 | uji miniflare: baris lama kehilangan foto, baris baru utuh | S |
