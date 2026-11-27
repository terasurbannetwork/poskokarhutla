# TIKET: Semai Redistribusi Banjir dan Penguji Efektivitas (`SB-*`)

Kerjakan berurutan, sesudah pemilik meninjau paket ini (K4). Ambil satu tiket, kerjakan hanya cakupannya, buktikan dengan perintahnya,
tiket layar ditinjau pemilik di `http://localhost:8800/operasi#semai/banjir`. Tiket yang menunggu Q memakai bawaan [SEMENTARA] kecuali
ditulis "berhenti". Tiap tiket yang menyentuh `scripts/operasi/semai*`, `semai_bobot.json`, atau `scripts/udara/lintasan.py` wajib
menjalankan uji golden karhutla (RENCANA-UJI §2) sebagai bagian bukti siapnya.

## Fase 0: pendaftaran

| Tiket | Isi | Cakupan | Di luar | Pengerja → pemeriksa | Bukti siap |
| ----- | --- | ------- | ------- | -------------------- | ---------- |
| SB-00 | Daftar paket | bagian AGENTS §2.51 (sudah ditambah sesi induk 25 Nov 2026) diperiksa menyebut `data/kajian-bnpb/semai-banjir/`; pemilik berkas baru dicek dengan `node scripts/agents/ilmu.mjs pemilik` (25 Nov 2026: `scripts/omc/efek_banjir.py` → `cuaca-udara`; fixture, `tests/operasi/**`, `riset/PRAREG-A.md` → `pipa-data`), tanpa mengubah roster; catatan silang di `semai-awan/KEPUTUSAN-SEMAI.md` bahwa K1 sampai K4 paket ini menambah tujuan banjir | kode | `mekanik-mesin` → `penulis-gerbang` | `node --test tests/agen/gerbang-paket-modul.test.mjs` dan `npm run uji:agen` hijau |

## Fase 1: mesin (tanpa layar)

| Tiket | Isi | Cakupan | Di luar | Pengerja → pemeriksa | Bukti siap |
| ----- | --- | ------- | ------- | -------------------- | ---------- |
| SB-01 | Rujukan golden | bekukan `fixture_semai_golden.json` dari `semai.py` saat ini (sebelum perubahan apa pun); tambah subperintah `uji golden` | logika banjir | `pipa-data` → `validasi-model` | `python3 scripts/operasi/semai.py uji golden` hijau di kode lama |
| SB-02 | Fungsi murni dan bobot | `semai_murni.py`: `faktor_h`, `lolos_gb`, `pilih_sasaran`; blok `banjir` di `semai_bobot.json` (`versi_banjir` "1"); kasus RENCANA-UJI §1 | `semai.py` cabang banjir | `pipa-data` → `validasi-model` | `python3 scripts/operasi/semai.py uji` dan `uji golden` hijau |
| SB-03 | Lintasan mundur | `lintasan.py`: `mundur()` di atas `angin_di`/`geser`, lapis pengarah 850/700 di kisi IFS mode semai bila diminta | perubahan mode bawaan atau mode semai karhutla | `cuaca-udara` → `validasi-model` | `python3 scripts/udara/lintasan.py uji` (kasus bolak-balik 0,5 km) dan `semai.py uji golden` hijau |
| SB-04 | Cabang banjir | `semai.py --tujuan banjir`: sasaran (ALGORITMA §2), koridor (§3), gerbang GB1 sampai GB4, H dan P, skor, zona `-B`, `kandidat_sasaran`, `semai_banjir.json`; `fixture_semai_banjir.json` | layar, rute, workflow | `pipa-data` → `validasi-model` | `semai.py uji` (fixture banjir: 0 zona di daratan kab sasaran, 0 titik hujan di dalam sasaran) dan `uji golden` hijau |
| SB-05 | Workflow | `semai.yml`: langkah "Semai banjir" (`continue-on-error`), unggah R2, arsip `_banjir` append-only lewat langkah "Arsip putaran"; rahasia `SEMAI_TOKEN` opsional | penguji | `mekanik-mesin` → `penulis-gerbang` | luring tanpa R2 produksi: jalankan urutan langkah workflow secara lokal atas fixture (`semai.py --tujuan karhutla` lalu `--tujuan banjir` ke folder sementara) dan `semai.py uji golden`; unggah R2 diuji dengan `--kering` (mencetak kunci tujuan tanpa mengunggah); `node --test tests/agen/` hijau. Tidak ada `workflow_dispatch` ke produksi |

## Fase 2: D1 dan rute

| Tiket | Isi | Cakupan | Di luar | Pengerja → pemeriksa | Bukti siap |
| ----- | --- | ------- | ------- | -------------------- | ---------- |
| SB-06 | Migrasi sasaran | `migrations/<nomor>_semai_sasaran.sql` (nomor diperiksa saat tiket); tanpa `ALTER` pada `op_semai_target` | rute | `warga-api` → `migrasi-idempoten` | `npm run uji:warga` kasus migrasi dua kali hijau |
| SB-07 | Rute | `src/operasi_semai.js`: `NAMA_SAH` banjir, `zona_id` `B?`, arsip dari awalan, rute sasaran GET/POST/hapus, `SEMAI_TOKEN` jalur auth baru (DESAIN-TEKNIS §4.1: baca saja, dua rute GET, banding waktu tetap), `hari_sasaran` dari arsip untuk zona `-B`, `?sejak=` pada GET target | layar | `warga-api` → `guard-api`, `security-reviewer` (wajib untuk jalur token) | `npm run uji:warga` (RENCANA-UJI §4, termasuk semua kasus induk) hijau |

Migrasi produksi diterapkan pemilik.

## Fase 3: layar

| Tiket | Isi | Cakupan | Di luar | Pengerja → pemeriksa | Bukti siap |
| ----- | --- | ------- | ------- | -------------------- | ---------- |
| SB-08 | Saklar dan peta | saklar tujuan, hash `#semai/banjir`, muat malas `semai_banjir.json`, lapisan sasaran dan zona cegat, sembunyikan api dan asap; token `--sm-sasaran` di `tema.css` (`inti-layar`) | kolom kanan | `layar-peta` + `inti-layar` → `inp-reviewer`, `selera-angka` | `node --test tests/operasi/semai_layar.test.mjs tests/agen/gerbang-token-warna.test.mjs` hijau; INP saklar p75 < 200 ms; tinjau pemilik |
| SB-09 | Kolom kanan | kartu Sasaran hari ini, Rekomendasi tujuan banjir, dialog Tambah sasaran, Tinjau (bobot Q H P, tabel, CSV), ringkasan teks; `operasi_semai_murni.js` banjir + uji silang | Rapor | `layar-peta` → `inp-reviewer`, `selera-angka` | `node --test tests/operasi/semai_banjir_silang.test.mjs` hijau; tinjau pemilik |
| SB-10 | Renlap OMC | `renlap_omc.js` membaca zona `-B`: judul, alasan sasaran, PDF, KML, GPX; rute terbang ALGORITMA §7c induk tanpa perubahan | rute terbang baru | `layar-peta` → `selera-angka` | `node --test tests/operasi/` hijau; `/renlap-omc?zona=<id -B>` dan `/renlap-omc?zona=<id karhutla>` ditinjau pemilik |
| SB-14 | Gerbang klaim | daftar berkas dan frasa tujuan banjir masuk `gerbang-semai-klaim` (batas kata) | – | `penulis-gerbang` | `node --test tests/agen/gerbang-semai-klaim.test.mjs` hijau |

## Fase 4: penguji efektivitas

| Tiket | Isi | Cakupan | Di luar | Pengerja → pemeriksa | Bukti siap |
| ----- | --- | ------- | ------- | -------------------- | ---------- |
| SB-11 | Kunci pra-registrasi | salin RENCANA-UJI §6 ke `riset/PRAREG-A.md`, `sha256` ke `PRAREG-A.sidik`; commit oleh sesi induk **sebelum** data hujan hasil ditarik; bukti urutan: hash commit dan waktu commit dicatat di PRAREG | data | `pipa-data` (pemilik `riset/PRAREG-A.md`) → `validasi-model` | `shasum -a 256` cocok dengan `.sidik`; `git log` menunjukkan commit PRAREG sebelum berkas apa pun di `data/raw/omc_banjir` |
| SB-12 | Penguji luring | hanya sesudah commit PRAREG SB-11 ada; `scripts/omc/efek_banjir.py` dengan `uji` (RENCANA-UJI §5), mengimpor `efek.py`; ukur r^2 kovariat IFS di data baseline tanpa perlakuan (bukan hasil) untuk memperbarui perkiraan n | analisis data nyata | `cuaca-udara` → `validasi-model` | `python3 scripts/omc/efek_banjir.py uji` hijau |
| SB-13 | Lapis A | `lapis-a tarik` dan `lapis-a analisis` atas `omc_bmkg.json`; `riset/HASIL-A.md` dan `hasil_a.json` dengan semua spesifikasi, plasebo, MDE, penyimpangan; tidak tampil di layar sebelum pemilik membaca | Lapis B | `cuaca-udara` → `validasi-model` | `python3 scripts/omc/efek_banjir.py lapis-a analisis` menulis HASIL-A; pemeriksa bersih mencocokkan dengan PRAREG-A |
| SB-15 | Lapis B dan Rapor | `lapis-b` harian di `semai.yml`, `rapor_banjir.json` di R2, kartu Rapor uji di seksi (`layar-peta`) | publikasi di luar staf (Q4) | `cuaca-udara` + `layar-peta` → `validasi-model`, `selera-angka` | `efek_banjir.py uji` hijau; kartu menampilkan "data kurang (n = 0 dari sekitar 250)" di produksi awal; tinjau pemilik |

## Fase 5: wilayah OMC aktif (K5 sampai K8, pemilik 27 Nov 2026)

| Tiket | Isi | Bergantung | Pengerja | Bukti |
| ----- | --- | ---------- | -------- | ----- |
| SB-30 | Kuota provinsi ber-OMC: `P_omc(d)` dari `omc_bmkg.json`, sampai 3 zona per provinsi di luar 5 nasional, `kuota` di zona (ALGORITMA §6) | SB-04 | `pipa-data` | uji fungsi murni kuota di `semai_murni.py`; `semai.py uji golden` karhutla tetap |
| SB-31 | Sasaran asal `kejadian` dari `kabar.json`, cocok nama ke kode BPS, didahulukan pada skor sama, label asal di `sasaran[]` dan ringkasan | SB-04 | `pipa-data` | uji pencocokan nama (Kota/Kab, ejaan) dan kasus basi |
| SB-32 | Bot WA mengurai laporan OMC posko (armada, sorti, engine on/off, wilayah semai, ketinggian, bahan, kg, posko), tanpa nama orang; contoh di `tests/wa/fixtures` | – | `wa-bot` | uji pengurai atas contoh 25 Nov 2026 |
| SB-33 | Simpan laporan OMC posko: rute staf atau token pipeline dan tabel D1 baru (nomor migrasi diperiksa saat tiket; diterapkan pemilik) | SB-32 | `warga-api` → `guard-api`, `migrasi-idempoten` | `npm run uji:warga` |
| SB-34 | Base dari posko OMC (K7): `semai.py` membaca posko provinsi ber-OMC lewat rute SB-33; tanpa posko, bandara terdekat | SB-30, SB-33 | `pipa-data` | uji base posko dan bawaan |
| SB-35 | Catatan perlakuan dari laporan posko masuk penguji Lapis B (sorti per provinsi-hari) | SB-33, SB-15 | `cuaca-udara` | RENCANA-UJI §5 tidak berubah sebelum PRAREG diamandemen |

## Lanjutan (tidak dikerjakan sebelum pemilik memutuskan)

| Tiket | Isi | Menunggu |
| ----- | --- | -------- |
| SB-20 | Uji acak hari-layak (sebagian hari layak sengaja tidak disemai, diundi sebelum terbang) | Q11, keputusan kebijakan BNPB dan BMKG |
| SB-21 | Usulan bahan NaCl atau CaO untuk tujuan banjir | Q9, jawaban BMKG RISET §5 |
| SB-22 | Operasi malam di luar 07.00 sampai 16.00 | Q10 |
| SB-23 | Rapor penguji di Laporan Berkala atau Layar Pimpinan | Q4 |
| SB-24 | Hujan jam-an GSMaP untuk penguji dan pemeriksa waktu tiba | akun JAXA (Q1) |
| SB-25 | Log sortie BMKG berjam dan berkoordinat untuk penguji tingkat sortie | jawaban BMKG RISET §5 butir 3 |

## Urutan

SB-00 → SB-01 → SB-02 → SB-03 → SB-04 → SB-05 → SB-06 → SB-07 → SB-08 → SB-09 → SB-10 → SB-14 → SB-11 → SB-12 → SB-13 → SB-15.
Fase 5: SB-30 dan SB-31 dulu (boleh bersamaan bila berkas tidak beririsan, keduanya di `semai.py` jadi berurutan), SB-32 bersamaan, lalu SB-33, SB-34, SB-35.
SB-11 boleh berjalan bersamaan dengan Fase 2 dan 3 (berkas tidak beririsan). SB-12 dan SB-13 baru boleh mulai sesudah commit PRAREG
SB-11 ada di `main`, karena SB-12 sudah menyentuh data baseline. SB-02 dan SB-06 boleh bersamaan. SB-01 selalu pertama di antara tiket mesin.
