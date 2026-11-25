# TIKET: Misi Udara (`MU-*`)

Otoritas: `KEPUTUSAN-MISI.md`. Ambil satu tiket, kerjakan hanya cakupannya. Sebelum menyentuh berkas: `node scripts/agents/ilmu.mjs pemilik <berkas>`
dan `ilmu.mjs baca <agent>`. Subagent tidak commit dan tidak push.

## Tahap 1: mesin dan berkas (tanpa D1, tanpa layar)

| Tiket | Fitur | Berkas | Pengerja → pemeriksa | Bergantung | Tertahan Q | Bukti siap |
| ----- | ----- | ------ | -------------------- | ---------- | ---------- | ---------- |
| MU-01 | D5 | `scripts/umum/batas_terbang.json`, `scripts/umum/misi_templat.json` (enam misi, daftar periksa per bencana), uji bentuk di `misi_udara.py uji` | `pipa-umum` → `validasi-model` | – | – | `python3 -I scripts/umum/misi_udara.py uji` menolak baris tanpa sumber (mode gagal diuji) |
| MU-02 | F-2 | pembaca titik di `scripts/umum/misi_udara.py`: desimal, DMS, tautan Maps panjang dan pendek, plus code; validasi wilayah | `pipa-umum` → `security-reviewer` | MU-01 | Q11 | uji: delapan bentuk masukan sah dan enam yang ditolak |
| MU-03 | F-1, F-3, F-10, D9 | rute urut tetap dan keluaran di `misi_udara.py`; hanya fungsi `rencana` dan `susun_tetap` yang dihapus dari `scripts/operasi/renlap_banjir.py` (berkasnya urusan PB-15) | `pipa-umum` + `pipa-data` → verifier bersih | MU-02; PB-13 bila sudah ada | – | flight plan 15 Nov dibuat ulang: haluan 225, 139, 355, leg 121, 162, 208 km, total 491 km sama (LZ 2.7949, 97.8966); `python3 scripts/operasi/renlap_banjir.py uji` lulus |
| MU-04 | F-4, D7 | templat per misi, waktu di titik, halaman daftar periksa; keluaran bawaan di luar repo, `kunjungan` menolak `--keluar` di dalam repo | `pipa-umum` → `security-reviewer`, `selera-angka` | MU-03 | Q9 | uji: misi `kunjungan` dengan `--keluar` di dalam repo gagal; keluaran tanpa bidang nama |
| MU-05 | F-5, F-6, F-7 | `scripts/umum/zona_terbang.py`: zona gunung api (lingkaran, tanpa radius, Level I), abu, zona manual; belokan lingkaran; penolakan titik darat | `pipa-umum` → `validasi-model`, verifier bersih | MU-03 | Q4, Q5, Q14, Q16 | uji ALGORITMA 9.2 dan 9.3; kasus Semeru dari RISET sebagai fixture |
| MU-06 | F-8 | daya tahan dan saran isi ulang; tabel tipe berlabel | `pipa-umum` → `validasi-model` | MU-03 | Q2, Q3 | uji: tipe tanpa `daya_tahan_mnt` mencetak "belum ada datanya" |
| MU-07 | F-5, F-9 | zona tsunami, cuaca, banjir, longsor; kelayakan terbang Python dengan kasus uji bersama rumus JS | `pipa-umum` + `layar-peta` (kasus uji bersama, tanpa ubah rumus JS) → `validasi-model` | MU-05 | Q7, Q8, Q16 | `node --test tests/agen/gerbang-misi-udara.test.mjs` membandingkan hasil Python dan JS pada kasus yang sama |
| MU-08 | F-11 | pola kotak melebar dan lintasan sejajar | `pipa-umum` → `validasi-model` | MU-05 | Q13 | uji: panjang lintasan pola cocok hitungan tangan |
| MU-09 | gerbang | `tests/agen/gerbang-misi-udara.test.mjs`, uji teks tanpa kata "aman" pada status rute, uji tanpa keluaran di `public/` | `penulis-gerbang` → verifier bersih | MU-05 | – | `npm run uji:agen` hijau |
| MU-15 | F-5, K7, K8, D10, D11 | **Selesai 24 Nov 2026 (kode, belum dipakai flight plan).** Q18 dijawab K8 "Sebagai catatan". `scripts/umum/zona_terbang.py`: pencari `identify` ImageServer gunung api dan tsunami per titik, hanya tingkat `perhatian`, tiap baris memuat URL dan tanggal ambil, kelas "belum ada dari legenda" (legenda Stretched), gagal = "InaRISK tidak menjawab", tembolok di `data/raw/misi_udara/`. Penyambungan ke keluaran `misi_udara.py` menunggu MU-05 (pemeriksa zona) | `pipa-umum` → `validasi-model`, `security-reviewer` | MU-05 | token resmi (sisa Q18) | `python3 -I scripts/umum/zona_terbang.py uji` hijau: fixture dalam berkas, baris tanpa sumber atau tanggal ditolak, hasil tidak mengubah rute |

Temuan probe 24 Nov 2026 untuk MU-15 (curl, `gis.bnpb.go.id/server/rest/services/inarisk`): vektor poligon KRB gunung api dan tsunami: **tidak ada** (0 fitur; semuanya raster atau butuh token). Rinciannya di KEPUTUSAN-MISI D10.

## Tahap 2: bot WA dan penyimpanan

| Tiket | Fitur | Berkas | Pengerja → pemeriksa | Bergantung | Tertahan Q | Bukti siap |
| ----- | ----- | ------ | -------------------- | ---------- | ---------- | ---------- |
| MU-10 | F-12 | `scripts/wa/misi_udara.mjs`: pesan berformat, balasan PDF; hanya grup yang berhak; jenis `kunjungan` tidak dilayani lewat grup | `wa-bot` → `security-reviewer` | MU-09 | Q10, Q11 | `node --test tests/wa/misi_udara.test.mjs` |
| MU-11 | F-13 | migrasi `pb_misi` dan `pb_misi_hasil`, `src/pb_misi.js` (enam rute DESAIN-TEKNIS 7), `src/hak.js`; awalan R2 `operasi/misi/` | `warga-api` → `migrasi-idempoten`, `guard-api`, `security-reviewer` | PB-12, PB-14 (pola) | Q10 | `node --test tests/warga/pb_misi.test.mjs tests/agen/gerbang-d1.test.mjs`; migrasi dijalankan dua kali |

## Tahap 3: layar

| Tiket | Fitur | Berkas | Pengerja → pemeriksa | Bergantung | Tertahan Q | Bukti siap |
| ----- | ----- | ------ | -------------------- | ---------- | ---------- | ---------- |
| MU-12 | F-14 | `public/inti/misi_udara.js`, `.css`: formulir, pratinjau peta dengan zona, unduh | `inti-layar` → `inp-reviewer`, `selera-angka` | MU-11, PB-18 | Q10 | `node --test tests/layar/misi_udara.test.mjs`; tinjau `http://localhost:8800/operasi` |
| MU-13 | F-14 | seksi Misi udara di `public/operasi_laporan.js`, dinyalakan per bencana lewat `public/bencana.json` | `layar-peta` + `inti-layar` → `inp-reviewer` | MU-12 | – | gerbang kartu standar dan tanpa kesimpulan hijau; tinjau lokal |
| MU-14 | F-15 | isian hasil misi ke `pb_misi_hasil` | `warga-api` + `inti-layar` → `guard-api` | MU-11, MU-12 | Q10 | `node --test tests/warga/pb_misi.test.mjs` |

## Urutan

MU-01, MU-02, MU-03 berurutan. MU-04, MU-05, MU-06 boleh bersamaan bila berkasnya dipisah di brief (semuanya menyentuh `misi_udara.py`:
kerjakan satu per satu kecuali fungsi dipisah ke berkas sendiri). MU-07 dan MU-08 setelah MU-05. Tahap 2 dan 3 menunggu tiket Paritas.

## Yang menunggu jawaban pemilik

Tiket yang tertahan Q tetap dibangun dengan bawaan sementara berlabel. Tiga jawaban yang paling mengubah hasil: Q2 (data tipe), Q9 (berkas 15 Nov di repo), Q10 (hak akses layar). Satu-satunya yang benar-benar menunggu: kecuali penghapusan berkas 15 Nov: itu bukan tiket, hanya dikerjakan atas perintah pemilik, dan menghapus berkas tidak menghapus riwayat git publik.
