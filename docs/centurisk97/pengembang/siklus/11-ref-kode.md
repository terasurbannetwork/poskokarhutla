# Referensi: berkas, hak, rute

Halaman ini mendaftar berkas utama, hak akses, rute API, serta halaman dan aset Siklus Bencana.

## Berkas utama

Layar (`public/siklus/`):

| Berkas | Peran |
| --- | --- |
| `index.html`, `inti.js`, `siklus.css`, `konst.js`, `hitung.js` | cangkang halaman staf, pembantu bersama, kembaran konstanta dan fungsi murni Worker |
| `pintu.js` | pintu tunggal F7 |
| `public/inti/kj_tanda.js` (di luar folder ini) | pil nomor KJ di baris tugas, Logbook, dan SIPPA, lewat `GET /api/siklus/kejadian/tautan` (maksimum 50 per panggilan, hanya baris yang terlihat) |
| `public/bnpb/dalops_lifeline.js` (di luar folder ini) | kartu ringkasan Status Lifeline di Pantau Dalops (tidak publik), memakai rute Lifeline |
| `scripts/bnpb/kunci_kejadian.py` (di luar folder ini) | algoritma ID `KJ-` (SHA-256 dan Crockford base32) |
| `kejadian.js` | daftar, detail, antrean, GLIDE |
| `paparan.js` | peta paparan |
| `kaji.js` | kaji cepat |
| `pulih.js` | Jitupasna, R3P, harga, pelaksanaan |
| `renkon.js`, `gladi.js` | renkon dan gladi |
| `masadepan.js` | risiko masa depan |
| `registri.js` | registri sumber |
| `lifeline.js`, `lifeline.css` | kisi Lifeline |
| `tiga_w.js`, `tiga_w.css` | kartu 3W dan tawaran |
| `antre.js` | antrean luring Siklus (memakai antrean bersama) |
| `dummy.js` | tombol data contoh Super Admin |
| `publik.html`, `publik.js`, `publik.css` | ringkasan publik satu kejadian |
| `data/` | `atribusi.json`, `kamus.json`, `masa_depan_ringkas.json` |

Halaman organisasi bertoken: `public/bantu.html`, `bantu.js`, `bantu.css`.

Worker (`src/`): `siklus.js` (cangkang rute, gerbang peran, halaman, aset), `siklus_kejadian.js`, `siklus_paparan.js`, `siklus_kaji.js`, `siklus_pulih.js`, `siklus_renkon.js`, `siklus_pintu.js`, `siklus_dummy.js`, `siklus_hitung.js` (fungsi murni F1 dan F4), `siklus_kab.js` (pemetaan nama wilayah ke kab4), `kejadian_tautan.js` (ingest modul), `lifeline.js` dan `lifeline_usulan.js`, `tiga_w.js`, `kaji_ulang.js` dan `kaji_ulang_rakit.js`. Semua SQL berada di `src/hak.js` (gerbang `tests/agen/gerbang-d1.test.mjs`): bagian Siklus, Lifeline (sekitar baris 1041 sampai 1200), 3W (sekitar baris 1206 sampai 1360), dan Kaji ulang (sekitar baris 1362 sampai 1580).

Pipeline (`scripts/siklus/`, Python stdlib): `panen.py`, `adapter_g1.py`, `adapter_g2.py`, `adapter_g4.py`, `bersih_dibi.py`, `bersih_logbook.py`, `titik_desa.py`, `arsip_kejadian.py`, `pasang.py`, `hidup.py`, `kunci.py`, `bps.py`, `paparan.py`, `fasilitas.py`, `bahaya_kelas.py`, `kaji_gempa.py`, `kaji_banjir.py`, `ujibalik.py`, `kerusakan.py`, `genangan_kriteria.py`, `iklim_lab.py`, `ghsl_lab.py`, `gudang.py`, `saji.py`, `registri.py`, `unggah_riwayat.py`, `dummy_saji.py`, `alur.py`, `konst.py`, `sumber.json`. `scripts/siklus/sumber.json` adalah registri sumber data (lisensi, jadwal, fitur, status uji).

## Hak akses

Singkatan hak di `src/siklus.js`: STAF (sesi staf atau moderator atau Super Admin), BP (akun BPBD provinsi, kabupaten, atau kota lewat `/api/instansi/siklus/*`), PDKO (Pusdalops, Koordalops, atau Super Admin), KO (Koordalops atau Super Admin), PM (Pimpinan), SA (Super Admin), sistem (token Bearer pipeline), tamu, opsional (tamu dilayani sebagai kartu publik). BPBD hanya melihat kabupaten wilayahnya, di luar itu dijawab 404 seragam. Semua jawaban staf berkepala `private, no-store`. Kiriman POST wajib berheader `x-pb: 1` dan Origin sama-situs. Variabel `SIKLUS_MATI=1` mematikan seluruh modul dengan status 503.

## Rute API

Rute baca dan tulis kejadian (`src/siklus_kejadian.js`, tabel rute di bagian akhir berkas):

| Metode dan jalur | Hak |
| --- | --- |
| GET `/api/siklus/saya` | STAF |
| GET `/api/siklus/publik/kejadian/:id` | tamu (ditembolok 60 detik di peramban, 300 detik di tepi) |
| GET `/api/siklus/kejadian`, `/kejadian/arsip`, `/kejadian/:id` | STAF, BP |
| POST `/api/siklus/kejadian` | PDKO |
| POST `/api/siklus/kejadian/:id/promosi`, `/fase`, `/glide` | PDKO |
| POST `/api/siklus/kejadian/:id/publik`, `/gabung`, `/koreksi` | KO |
| GET `/api/siklus/glide/pengingat` | PDKO |
| GET `/api/siklus/antrean` dan POST `/api/siklus/antrean/:sid` | PDKO |
| GET `/api/siklus/jejak` | STAF |
| GET `/api/siklus/ingest/jendela`, `/ingest/sumber`, `/ingest/modul`; POST `/ingest/kejadian`, `/ingest/kaji` | sistem |
| GET `/api/siklus/kejadian/tautan` | STAF, BP |

Paparan (`src/siklus_paparan.js`, sekitar baris 47 sampai 50): GET `/api/siklus/paparan/ringkas` (STAF), `/paparan/kab` (STAF, BP), `/fasilitas` (PDKO, PM, BP), `/paparan/rinci` (PDKO, BP). Parameter `contoh=1` hanya untuk Super Admin dan membaca awalan `_dummy`. Akses ke `rinci` dibatasi laju dan dicatat dalam jejak baca.

Kaji cepat (`src/siklus_kaji.js`): GET `/api/siklus/kaji` dan `/kaji/:sid` (STAF, BP), POST `/kaji/:sid/status` (PDKO), POST `/ingest/kaji` (sistem).

Jitupasna dan R3P (`src/siklus_pulih.js`, sekitar baris 273 sampai 285): GET `/api/siklus/pulih`, `/pulih/:sid`, `/r3p/:sid` (STAF, BP); POST `/pulih` dan `/pulih/:sid/status`, `/r3p`, `/r3p/:sid/status`, `/r3p/:sid/kegiatan` (KO); POST `/pulih/:sid/baris` (PDKO, BP); POST `/pulih/:sid/hitung` (PDKO); GET dan POST `/harga` (STAF baca, PDKO tulis); POST `/r3p/:sid/setuju` (PM).

Renkon dan gladi (`src/siklus_renkon.js`, sekitar baris 270 sampai 279): GET `/renkon`, `/renkon/:sid` (STAF, BP); POST `/renkon` dan `/renkon/:sid/asumsi` (PDKO); POST `/renkon/:sid/status` (KO); GET `/gladi`, `/gladi/:sid` (STAF); POST `/gladi` dan `/gladi/:sid/status` (KO); POST `/gladi/:sid/catatan` (PDKO).

Pintu dan masa depan (`src/siklus_pintu.js`, sekitar baris 101 sampai 103): GET `/masadepan` dan `/pintu` (opsional), GET `/registri` (PDKO, PM, SA). POST `/api/siklus/dummy` (SA, `src/siklus_dummy.js`).

Lifeline (`src/lifeline.js`, sekitar baris 82 sampai 84): GET `/api/siklus/kejadian/:id/lifeline` dan `/lifeline/sel?kab4=&layanan=` (STAF, BP), POST `/api/siklus/kejadian/:id/lifeline` (PDKO, BP).

3W (`src/tiga_w.js`, sekitar baris 138 sampai 146 dan 205 sampai 207): GET dan POST `/api/siklus/kejadian/:id/tiga-w`, `/tawaran`, `/tawaran/:sid/keputusan`, `/tiga-w/token`, `/tiga-w/token/cabut`, GET dan POST `/api/siklus/org`. Untuk organisasi bertoken: GET `/api/bantu`, POST `/api/bantu/baris`, POST `/api/bantu/tawaran`, dengan header `x-bantu`.

Kaji ulang (`src/kaji_ulang.js`, sekitar baris 195 sampai 207): GET `/api/siklus/kaji-ulang/kandidat` dan `/kaji-ulang/rekomendasi` (STAF); GET `/api/siklus/kejadian/:id/kaji-ulang` (STAF, BP); POST `.../kaji-ulang`, `/pelajaran`, `/pelajaran/:sid`, `/rekomendasi`, `/rekomendasi/status` (PDKO); GET `.../rekomendasi/riwayat` (STAF); POST `.../sahkan` (KO).

## Halaman dan aset

Rute halaman: `/siklus`, `/siklus/kejadian`, `/siklus/paparan`, `/siklus/kaji`, `/siklus/pulih`, `/siklus/renkon`, `/siklus/gladi`, `/siklus/masa-depan`, `/siklus/kejadian/KJ-...`, `/siklus/kaji/<16 heks>`, `/siklus/pulih/<16 heks>`, `/siklus/renkon/<16 heks>` (ekspresi `RE_HAL` di `src/siklus.js`). Seluruh `/siklus/*` ada di `run_worker_first` pada `wrangler.jsonc`, sehingga aset staf tidak terbuka tanpa sesi. Daftar putih aset publik: `publik.js`, `publik.css`, `data/atribusi.json`, `data/kamus.json`, `data/masa_depan_ringkas.json`. Halaman `/bantu` didaftarkan di `src/worker.js`.
