# TIKET: Rantai Kejadian, Kalender Kewajiban, Rapor SPM

Dokumen terakhir dalam urutan otoritas. Versi 1, 10 Nov 2026.

> Untuk pekerja agen. Satu sesi = satu tiket. Baca tiketmu dan bagian dokumen di "Rujukan" saja. Kerjakan hanya "Berkas". Yang tidak tertulis atau bertabrakan dengan pertanyaan terbuka: berhenti dan tanya (AGENTS.md §2.6 setelah RT-00). Subagent tidak commit, tidak push, tidak deploy.

| Kode | Tiket | Pengerja | Bergantung | Status |
| --- | --- | --- | --- | --- |
| RT-00 | Pasang paket ke AGENTS.md | sesi induk | - | belum |
| RT-01 | Migrasi rantai, fungsi `hak.js`, uji integrasi tautan | warga-api | RT-00 | belum |
| RT-02 | Fungsi murni rantai `public/inti/rantai.js` + uji | ruang-bnpb | - | belum |
| RT-03 | Kunci Jam Aturan baru (10 kunci, satuan baru) | ruang-bnpb | - | belum |
| RT-04 | Rute rantai, ekspor `pelaku`, penautan di formulir Meja | warga-api | RT-01, RT-02, Q1 | belum |
| RT-05 | Layar `/bnpb/rantai` | ruang-bnpb | RT-04 | belum |
| RT-06 | Dummy rantai (dua ikon) + gerbang | warga-api | RT-04, RT-05 | belum |
| RT-07 | Migrasi kalender, fungsi `hak.js`, uji integrasi | warga-api | RT-00, RT-03 | belum |
| RT-08 | Fungsi murni kalender + rute kalender | ruang-bnpb dan warga-api | RT-03, RT-07, Q5, Q6, Q7, Q8 | menunggu pemilik |
| RT-09 | Layar `/bnpb/kalender` + dummy kalender | ruang-bnpb | RT-08 | belum |
| RT-10 | Tipe kolom `waktu` + meja `spm_respons` + migrasi meja | warga-api | RT-03, Q10 | menunggu pemilik |
| RT-11 | Meja `spm_kie` | warga-api | RT-10, Q11 | menunggu pemilik |
| RT-12 | Blok `spm` di `hitungRapor` + kartu di `pimpinan.js` + dummy | warga-api dan ruang-bnpb | RT-10, RT-11, Q9, Q13, Q14 | menunggu pemilik |
| RT-13 | Pemilik menjawab Q1 sampai Q14 di KEPUTUSAN-RANTAI | pemilik | - | menunggu pemilik |
| RT-14 | Pemilik menerapkan tiga migrasi di D1 produksi | pemilik | RT-01, RT-07, RT-10 | menunggu pemilik |

## RT-00 Pasang paket
- Berkas: `AGENTS.md` (tambah `### 2.6`, baris peta modul, baris router); `.claude/ilmu-agent/` lewat `ilmu.mjs`.
- Teks bagian baru harus lolos parser `gerbang-paket-modul.test.mjs`: judul `### 2.6 Rantai Kejadian, Kalender Kewajiban, Rapor SPM (`/bnpb/rantai`): baca dulu, baru bangun` dan satu rujukan folder `` `data/kajian-bnpb/rantai/` `` dengan urutan KEPUTUSAN-RANTAI, RISET, PRD, ALUR, ALGORITMA, DESIGN-SYSTEM, DESAIN-TEKNIS, KEAMANAN-PRIVASI, RENCANA-UJI, TIKET, GLOSARIUM, dan aturan berhenti sama dengan §2.1.
- Bukti: `node --test tests/agen/gerbang-paket-modul.test.mjs`.

## RT-01 Migrasi rantai
- Rujukan: DESAIN-TEKNIS §2, §3; KEAMANAN-PRIVASI §1-3.
- Berkas: `migrations/<nomor>_rantai.sql`, `src/hak.js`, `tests/warga/rantai.test.mjs`, `tests/warga/cakupan.json`, `tests/warga/migrasi_beku.json`.
- Selesai bila: RENCANA-UJI Rantai butir 2, 3, 4 hijau dengan D1 sungguhan; `migrasi-idempoten` tanpa temuan; `gerbang-d1` hijau.

## RT-02 Fungsi murni rantai
- Rujukan: ALGORITMA §1.
- Berkas: `public/inti/rantai.js`, `tests/bnpb/rantai_murni.test.mjs`.
- Selesai bila: butir 5, 6 dan contoh `umur_macet_hari` hijau; modul dimuat sama di Node, Worker, peramban (tanpa import JSON atau fetch).

## RT-03 Kunci Jam Aturan
- Rujukan: DESAIN-TEKNIS §5.
- Berkas: `public/inti/jam_aturan.js`, `public/inti/jam_aturan.json` (kembar), `tests/bnpb/unit_kembar.test.mjs` bila perlu.
- Selesai bila: `gerbang-jam-aturan` dan `unit_kembar` hijau tanpa melonggarkan gerbang. Kutipan yang tidak cocok diganti, bukan pasal dikarang.

## RT-04 Rute rantai
- Rujukan: DESAIN-TEKNIS §3, §4; ALUR §1; ALGORITMA §1 (penautan).
- Berkas: `src/rantai.js` (baru), `src/meja.js` (ekspor `pelaku`, `adminSaja`; isian opsional KIB), `src/meja_spek.js` (isian KIB di formulir), `src/worker.js` (daftar rute dan peta halaman), `tests/warga/rantai.test.mjs`.
- Selesai bila: RENCANA-UJI Rantai butir 1 sampai 4, 6 sampai 10 hijau; `guard-api` dan `security-reviewer` tanpa temuan.

## RT-05 Layar rantai
- Rujukan: DESIGN-SYSTEM §1-3; ALUR §1.
- Berkas: `public/bnpb/rantai.{html,js,css}`, daftar `LAYAR` di `tests/agen/gerbang-kartu-std.test.mjs`.
- Selesai bila: `selera-angka` dan `inp-reviewer` tanpa temuan; `npm run uji:layar` hijau.

## RT-06 Dummy rantai
- Rujukan: DESAIN-TEKNIS §7; `~/.claude/DUMMY.md`.
- Berkas: `src/rantai.js`, `public/bnpb/rantai.js`, `tests/e2e/05-dummy-jejak.sql`.
- Selesai bila: `gerbang-dummy` hijau; layar kosong tanpa dummy menulis penyebab.

## RT-07 Migrasi kalender
- Rujukan: DESAIN-TEKNIS §2, §3.
- Berkas: `migrations/<nomor>_kalender.sql`, `src/hak.js`, `tests/warga/rantai.test.mjs`, registri cakupan.
- Selesai bila: RENCANA-UJI Kalender butir 5 dan 6 hijau dengan D1 sungguhan.

## RT-08 Kalender: fungsi murni dan rute
- Rujukan: ALGORITMA §2; DESAIN-TEKNIS §4; KEPUTUSAN Q5 sampai Q8.
- Berkas: `public/inti/kalender.js`, `src/rantai.js`, `tests/bnpb/rantai_murni.test.mjs`.
- Selesai bila: RENCANA-UJI Kalender butir 1 sampai 4, 7, 8 hijau. Pengisi jangkar mengikuti jawaban Q5, Q6; sebelum itu hanya admin.

## RT-09 Layar kalender
- Rujukan: DESIGN-SYSTEM §3; ALUR §2.
- Berkas: `public/bnpb/kalender.{html,js,css}`, daftar `LAYAR`, dummy kalender di `src/rantai.js`.
- Selesai bila: `selera-angka` dan `inp-reviewer` tanpa temuan; dummy dua ikon.

## RT-10 Meja `spm_respons`
- Rujukan: DESAIN-TEKNIS §2 (meja SPM, tipe `waktu`); ALGORITMA §3; Q10.
- Berkas: `migrations/<nomor>_meja_spm.sql`, `src/meja_spek.js`, `src/meja.js`, `tests/warga/meja.test.mjs`, `tests/warga/rantai.test.mjs`.
- Selesai bila: RENCANA-UJI SPM butir 2 dan 8 hijau; CHECK dan trigger sama dengan spek.

## RT-11 Meja `spm_kie`
- Rujukan: DESAIN-TEKNIS §2; Q11.
- Berkas: sama dengan RT-10.
- Selesai bila: `meja.test.mjs` hijau dengan meja ke-13.

## RT-12 Blok SPM di rapor
- Rujukan: ALGORITMA §3; DESIGN-SYSTEM §3; Q9, Q13, Q14.
- Berkas: `src/meja.js` (`hitungRapor`), `public/admin/pimpinan.js`, dummy di `POST /api/meja/dummy`, `tests/warga/meja.test.mjs`.
- Selesai bila: RENCANA-UJI SPM butir 1, 3 sampai 7 hijau; skor komposit tidak berubah.

## RT-13 dan RT-14
Tidak dikerjakan agen. RT-13: pemilik menulis jawaban Q1 sampai Q14 di "Sudah diputuskan" KEPUTUSAN-RANTAI. RT-14: pemilik menjalankan migrasi hasil RT-01, RT-07, RT-10 di D1 produksi; sebelum itu `GET /api/rantai/*` dan blok `spm` menjawab "menunggu migrasi" seperti `tabelNarasiAda` di `src/hak.js`.
