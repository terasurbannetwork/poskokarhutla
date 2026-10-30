# RENCANA-UJI: Kemitraan Kampus

Dokumen kesembilan dalam urutan otoritas. Kalah dari KP s.d. KM; menang atas TIKET.
Tidak menambah fitur; menetapkan perintah apa yang harus keluar 0. Versi 1.0, 30 Okt 2026.

## 0. Aturan dasar
- **Selesai** = semua perintah bukti tiket hijau + pengulas melapor tanpa temuan tinggi.
- `~/.claude/TEST.md`: logika di D1 (CHECK, trigger) diuji SQL langsung lewat Miniflare
  (`tests/warga/_bnpb.mjs siapkan()`), route diuji lewat handler worker utuh, alur
  lintas-tabel satu uji ujung ke ujung. Unit test bermock bukan bukti.
- Berhenti di galat pertama (`node --test` default per berkas; Python `assert`).
- **Uji yang salah DITOLAK** wajib ada untuk tiap CHECK, trigger, dan gerbang hak.
- Pesan gagal menyebut angka dan sebab.

## 1. Lapisan
| Logika | Uji | Perintah |
| --- | --- | --- |
| Fungsi murni ALG (Py) | `--cek` assert di tiap skrip | `python3 scripts/kemitraan/<x>.py --cek` |
| Paritas Py ↔ JS | kasus acuan | `node --test tests/kemitraan/paritas.test.mjs` |
| Fungsi murni JS layar | node:test | `node --test tests/kemitraan/hitung.test.mjs` |
| D1 skema | SQL wajib gagal / kembar wajib lolos | `node --test tests/warga/kemitraan_skema.test.mjs` |
| Rute + hak | matriks §2.4 | `node --test tests/warga/kemitraan_*.test.mjs` |
| Alur ujung ke ujung | §2.5 | `node --test tests/warga/kemitraan_alur.test.mjs` |
| Layar | Chrome CDP 1440/390 | `node --test tests/bnpb/kemitraan_layar.test.mjs` |
| Gerbang teks/aset | statis | `node --test tests/kemitraan/gerbang-kemitraan.test.mjs` |
| Cakupan | registri | `node --test tests/kemitraan/gerbang-cakupan.test.mjs` |
| Keseluruhan | – | `npm run uji:warga && npm run uji:agen && npm run uji:layar` |

`package.json` mendapat skrip `uji:kemitraan` = tiga baris pertama + skema + rute + alur.

## 2. Kriteria terima

### 2.1 Kasus acuan (`tests/kemitraan/fixtures/acuan.json`)
Per fungsi DT §5.1 ≥ 5 kasus. Wajib termasuk:
| No | Fungsi | Kasus | Hasil |
| --- | --- | --- | --- |
| A1 | skor_auto | semua komponen 1 | 1,00 |
| A2 | skor_auto | T null, sisanya 0,5 | 0,50 (bobot dinormalkan ulang) |
| A3 | skor_auto | 3 komponen saja | `null` (< 4) |
| A4 | kelas | H 0,85, K 0,65, S 0,45 | P1 (aturan H&K) |
| A5 | bm25 | dokumen tanpa token kueri | 0 |
| A6 | skor_pakar + ragam | 4 pakar teratas sekampus | yang ke-3 dan ke-4 tergeser |
| A7 | seri | dua pakar skor sama | h-index lebih tinggi dulu; seri lagi → id naik |
| A8 | solusi | abstrak "et al." dan "3.5" | tidak terpecah di sana |
| A9 | syarat | `"rpb == false and F >= 0.6"` | benar/salah sesuai profil |
| A10 | susun_panduan | slot `{n_kejadian}` kosong | templat itu dibuang, tak ada "{" di keluaran |
| A11 | cocok_donor | bahaya donor "semua" | komponen bahaya 0,35 |
| A12 | urut_panggil | km 0 vs 300, lain sama | km 0 dulu |
| A13 | status_perjanjian | berakhir = kini+60 hari | segera_habis; +61 → aktif |

### 2.2 Profil daerah (pipeline)
| No | Diberikan | Ketika | Maka | Bukti |
| --- | --- | --- | --- | --- |
| D1 | sumber repo saat ini | `profil_daerah.py` | 548 berkas kab + 38 prov, valid skema v1, tiap ≤ 60 KB | `profil_daerah.py --cek` |
| D2 | kab IRBI 3171 | baca berkas | nama "Kota Administrasi Jakarta Pusat" (persis indeks.json) | `kode.py --cek` |
| D3 | kab tanpa DIBI 12 bln | baca `kejadian.dampak_12bln` | `null` bukan 0 | `--cek` |
| D4 | blok non-null | – | punya sumber, tanggal, yakin | `--cek` |
| D5 | `public/data/kemitraan/**` | pindai | tidak ada email, nomor 62…, id `A[0-9]{6,}` | `gerbang-kemitraan.test.mjs` |
| D6 | 6211 Pulang Pisau | – | karhutla.gambut_ha > 0; ≥ 1 masalah karhutla | `--cek` |
| D7 | sumber hilang 1 berkas | jalankan | blok terkait null + catatan `sumber[]`, skrip keluar 0 | `--cek` (fixture rusak) |

### 2.3 Per layar (`tests/bnpb/kemitraan_layar.test.mjs`, 1440 dan 390)
| No | Layar | Maka |
| --- | --- | --- |
| L1 | `/kemitraan?tampil=daerah` (staf) | pita 4 angka; ≥ 24 kartu; cari "pulang" → 1 kartu; konsol tanpa galat selain favicon |
| L2 | lembar daerah | kepala tampil < 100 ms setelah klik; tab bab berisi; ikon Buku menuju `/kemitraan/buku?kab=` |
| L3 | `/kemitraan/buku?kab=6211` | ≥ 9 `h1` bab; `@page` A4; tidak ada "{" atau "undefined" atau "NaN" di teks; print PDF ≥ 8 halaman |
| L4 | masalah → tab Pakar | 10 kartu; pecahan skor 6 segmen; ≤ 2 pakar sekampus; pil "Belum diuji" bila `uji_cocok.json` tak lolos |
| L5 | panduan | per arah ada judul; tiap pertanyaan tanpa slot kosong |
| L6 | `/kemitraan/saya#k=` (AG) | fragmen hilang dari URL; kartu panggilan; tombol 56 px di 390 |
| L7 | tanpa sesi | `/kemitraan` menampilkan layar masuk, bukan galat |
| L8 | tema gelap | kontras teks kartu ≥ 4,5:1 (hitung dari computed style) |
| L9 | INP | klik segmen tampilan → bingkai berikutnya < 100 ms (ukur `performance.now`) |

### 2.4 Matriks rute
Satu baris per rute DT §4.3: `| Rute | Positif | Peran salah DITOLAK | Masukan liar DITOLAK | Ukuran | Laju |`.
Wajib minimal:
| Rute | Positif | Peran salah DITOLAK | Masukan liar DITOLAK |
| --- | --- | --- | --- |
| POST masalah | BP kabnya 201 | BP kab lain 403; AG 401/403 | uraian 49 huruf 400; bahaya liar 400 |
| GET daerah/:kab4/pakar | ST 200 | PB 401; BP kab lain 403 | kab4 "62AB" 400 |
| POST kampus/:id/anggota/:rid | KK kampusnya 200 | KK kampus lain 403 | aksi liar 400 |
| POST aktivasi | ST 201 | KK 403; PM 403 | radius 10 400 |
| POST panggilan/:id/jawab | AG yang dipanggil 200 | AG lain 403 | jawab "mungkin" 400 |
| POST hibah/:id/telaah | PL yang ditugaskan | PL lain 403; kirim kedua 409 | skor 6 400 |
| POST dummy | SA | ST 403 | aksi liar 400 |
| POST daftar/anggota | PB | – | duplikat → jawaban identik dengan baru |
| POST perjanjian | KK | – | berkas PNG berlabel .pdf 400; 6 MB 413 |
| GET sertifikat/:id | PB | – | id bukan 16 hex 404; jawaban tanpa wa/email |

### 2.5 Alur lintas-tabel (`tests/warga/kemitraan_alur.test.mjs`)
| No | Alur | Langkah yang diuji |
| --- | --- | --- |
| E1 | Kampus → anggota | daftar kampus → ST setujui → atur sandi → KK masuk → anggota daftar → KK setujui → kode → `/api/kemitraan/saya` 200 jenis AG |
| E2 | Masalah → pakar | BP ajukan → ST validasi → pakar dihitung (fixture indeks kecil) → `km_masalah_pakar` 10 baris → status `dicocokkan` |
| E3 | Pendataan luring | kunjungan → kirim larik 3 jawaban lalu larik sama lagi (klien_id per jawaban) → tetap 3 baris; jawaban ber-auto_id → masalah otomatis diambil; konfirmasi → masalah `tervalidasi`; koreksi → diterima → muncul di ringkas |
| E4 | Hibah | panggilan → 2 proposal → 2 penelaah (sekampus ditolak) → telaah dikirim → umumkan → lolos → `riset_usulan` `disetujui` |
| E5 | Satgas | satgas siap → aktivasi → panggilan → AG bersedia → tugaskan → `relawan_penugasan` → check-in/out → jam sah → sertifikat → verifikasi publik |
| E6 | Kaji cepat | aktivasi → tim → `meja_petugas` dibuat → isian meja kaji_cepat → tutup aktivasi → cron bersih mencabut kode |
| E7 | Magang | lowongan → lamar → diterima → mentor alumni disarankan → nilai pembimbing → sertifikat |
| E8 | Proposal donor | ide → tim (ketua kampus aktif) → surat nomor unik → diajukan → lolos (dana pendamping) → dasbor indikator 8 dan 14 berubah |
| E9 | Dummy | isi → dasbor tak berubah → hapus → semua `km_*` dummy=0 utuh, dummy=1 kosong |

### 2.6–2.8 INP, a11y, larangan teks
- Handler klik berat → `nanti()`; diperiksa `inp-reviewer`.
- Semua tombol ikon punya `aria-label`; kartu role=button bisa Enter/Spasi.
- Gerbang teks (`gerbang-kemitraan.test.mjs`) di `public/kemitraan*`, `src/kemitraan*`:
  tanpa em dash, tanpa "terbukti", tanpa `toFixed(` di layar, tanpa skrip/gaya inline,
  tanpa `innerHTML` yang menyisipkan `${x}` tanpa `esc(`, tanpa CDN selain daftar ekspor,
  `KM.RUMPUN` sama dengan `RUMPUN` akademisi.js, `konst.js` sama `konst.py`. Tiap aturan
  punya fixture pelanggaran yang membuktikan gerbang menolak.

### 2.9 Uji relevansi pakar (ALG §11)
`python3 scripts/kemitraan/uji_cocok.py --label data/kajian-bnpb/kampus/label/cocok_*.csv`
→ `uji_cocok.json {ndcg_skor, ndcg_h, ndcg_terdekat, kappa, lolos}`. Syarat dibekukan
sebelum label dibuka: lolos bila skor ≥ maks(h, terdekat) + 0,10 dan κ ≥ 0,4. Label
dibuat 2 staf (tiket KM-C09, manusia). Sampai lolos, layar memakai pil "Belum diuji".

## 3. D1 (`tests/warga/kemitraan_skema.test.mjs`)
Untuk tiap migrasi 0079–0083: dijalankan dua kali tanpa galat; tiap tabel
`| Tabel | Aturan | SQL WAJIB GAGAL | Kembar WAJIB LOLOS |`. Minimal:
| Tabel | Aturan | WAJIB GAGAL | WAJIB LOLOS |
| --- | --- | --- | --- |
| km_masalah | alur | `diajukan→selesai` | `diajukan→ditelaah` |
| km_masalah | digabung tanpa induk | status digabung, induk_id NULL | dengan induk |
| km_masalah | auto unik | dua baris auto_id sama dummy=0 | satu dummy=1 + satu 0 |
| km_jejak | beku | UPDATE apa pun; DELETE dummy=0 | DELETE dummy=1 |
| km_perjanjian | tanggal | berakhir ≤ mulai | berakhir > mulai |
| km_telaah | beku setelah kirim | UPDATE skor sesudah dikirim | UPDATE sebelum |
| km_satgas | unsur | wakil_alumni berunsur mahasiswa | berunsur alumni |
| km_hibah_panggilan | Σbobot | rubrik Σ 90 | Σ 100 |
| km_proposal | alur | `ide→diajukan` | `ide→tim` |
| km_magang_lamar | alur | `diajukan→selesai` | `diajukan→diterima` |
| semua `km_*` | dummy | dummy=2 | 0/1 |
Semua tabel/trigger tercatat di `tests/warga/cakupan.json` (diuji/dikecualikan beralasan).

## 4. Pipeline
`kemitraan.yml` dan `kemitraan-pakar.yml` dijalankan `workflow_dispatch` sekali di cabang
uji (mode `--dry-run` untuk R2) sebelum dijadwalkan; log disimpan sebagai artefak.

## 5. Pengulas dan deploy
| Permukaan | Pengulas | Model |
| --- | --- | --- |
| Migrasi | `migrasi-idempoten` | haiku |
| Rute, hak, berkas | `guard-api`, `security-reviewer` | haiku, sonnet |
| Kartu, angka, buku | `selera-angka` | haiku |
| Handler | `inp-reviewer` | haiku |
| Skor, uji relevansi, prioritas | `validasi-model` | sonnet |
| Sebelum commit besar | `higiene-repo` | haiku |
Migrasi produksi diterapkan pemilik (`npx wrangler d1 migrations apply poskowarga --remote`).
Subagent tidak commit/push/deploy.
