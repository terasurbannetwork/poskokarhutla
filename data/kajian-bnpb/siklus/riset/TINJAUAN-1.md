# Tinjauan 1: temuan pemeriksa bersih dan keputusan orkestrator (10 November 2026)

Tiap baris: temuan, lalu keputusan. Keputusan ini mengikat dan diterapkan ke seluruh dokumen.

1. Format ID `KJ-` bertentangan (ALG 10 heks, DT dan GLOSARIUM 8 base32). **Keputusan:** `KJ-<tahun>-<8 Crockford base32>`, panjang 16, dari SHA-256 kunci. Tabrakan: hash ulang `kunci|n`, tetap 8 karakter, tanpa sufiks. Pembeda "karakter pertama angka untuk arsip" dicabut: rute mencari D1 dulu, lalu R2. Hitung ulang vektor ALG, RU, `acuan.json`.
2. `tests/agen/gerbang-d1.test.mjs` menolak berkas `src/` baru yang menyentuh D1, dan gerbang tidak boleh dilonggarkan. **Keputusan:** semua SQL `sk_*` berupa fungsi bernama di bagian Siklus `src/hak.js` memakai `MATRIKS` dan `sedia`. `src/siklus*.js` tidak menyentuh `env.DB`. Masukkan `src/hak.js` ke Berkas tiket rute; sebelum menyunting, periksa `git status` berkas itu.
3. Promosi arsip tidak menemukan berkas. **Keputusan:** body `{tahun, kab4}` dari baris daftar. Baris tanpa wilayah tidak bisa dipromosikan dan tertulis begitu di layar.
4. Skema tidak memuat multi-kabupaten dan gabung. **Keputusan:** tambah `sk_kejadian_kab`, `asal_id`, status `digabung` dan kolom `ke`, disaring dari daftar. "Pecah" dicabut dari ALG dan RU; salah gabung dibetulkan lewat koreksi manual di `sk_kejadian_sumber` yang tercatat di jejak.
5. Pembatas wilayah BP memakai nama. **Keputusan:** tambah `lingkupKab4(akun, kab4)` di DT, memakai prov = 2 digit pertama dan nama dari `scripts/udara/kota.json` di tahap build ke konstanta; uji untuk akun `kab` dan `prov`.
6. Satu grup concurrency. **Keputusan:** grup `siklus-kaji` dan `siklus-batch`; geser `mingguan` agar menit dan jamnya tidak sama dengan `kaji`.
7. Unggah R2 lambat dan `wrangler@4.42.0` tidak punya `r2 bulk` maupun daftar objek. **Keputusan:** unggah hanya berkas yang sidiknya berubah, `xargs -P 8` memakai biner `wrangler` hasil pasang sekali (bukan `npx` per objek), manifes sidik disimpan sebagai objek R2 sendiri, sehingga tidak butuh perintah daftar. Tulis perhitungan waktu di DT 6.2.
8. KA 27a dan 27b kalah dari PRD soal hak tulis. **Keputusan:** KA diubah: PM boleh `setuju`; BP mengisi baris Jitupasna di wilayahnya. (KA sudah diubah induk.)
9. KA 6 hanya diuji separuh. **Keputusan:** untuk karhutla, `terdampak` dari sumber bukan sistem kita bernilai `null` dan tidak tampil; perluas INV-7.
10. `pasang.py` tidak punya jalur baca D1. **Keputusan:** rute Bearer baca terindeks per tanggal dengan kolom minimal, dipaginasi: `GET /api/siklus/ingest/sumber`.
11. Bukti tiket menunjuk berkas uji yang belum ada. **Keputusan:** tiap berkas uji jadi Berkas tiket pertama yang memakainya; putus ketergantungan melingkar SK-043.
12. Tiket melanggar kepemilikan. **Keputusan:** `tests/warga/**` selalu `warga-api`, `tests/siklus/**` selalu `siklus`; pecah tiket bila perlu.
13. Adapter sumber G1 tanpa tiket. **Keputusan:** tambah tiket adapter G1 untuk DIBI riwayat, GDACS, GLIDE, USGS; job `mingguan` pindah ke G1. Agregat Overture (PRD F2-03) ditunda, Open Buildings tetap utama, tandai di PRD. WorldPop dan Dukcapil memakai yang sudah ada. Adapter G2 dan G4 masuk gelombangnya.
14. Kolom dan algoritma F5. **Keputusan:** tambah `reviu_terakhir`; F5-03 jadi isian manual dengan usulan angka dari ALG F5.1 yang tertulis.
15. Kolom F4. **Keputusan:** tambah `komponen`, `arus_rp`, `bulan` ber-CHECK untuk `jenis='rugi'`.
16. Gladi arsip tanpa garis waktu. **Keputusan:** gladi hanya untuk kejadian yang sudah dipromosikan ke D1.
17. Rantai per KIB dan `meja_dampak`. **Keputusan:** baca `data/kajian-bnpb/rantai/KEPUTUSAN-RANTAI.md` bila ada. `sk_kejadian` adalah satu-satunya buku kejadian; Rantai dan `meja_dampak` dirujuk baca saja lewat tabel pemetaan (sumber, kode sumber); nomor KIB masuk kolom nomor induk bila tersedia. Tambah pertanyaan U21.
18. SK-045 bergantung pada tiket pemilik. **Keputusan:** SK-002 dan SK-014 tidak wajib untuk rilis; sasaran yang butuh riwayat tampil `menunggu`.
19. Butir kecil. **Keputusan:** F6 hanya tiga indeks (Rx1day, Rx5day, CDD), cabut CWD, R20mm, R95pTOT dari PRD dan DT. Tambah tiket F7-04, F4-08, berkas uji UJ-F2-06. Betulkan rujukan UJ-F7-05. Layar tanpa tabel D1 memakai berkas contoh dummy di R2 `siklus/saji/_dummy/`, dimuat bila Super Admin menekan isi.
20. Nama. **Keputusan:** jalur mentah menurut DT 5.1; `manifest.json`; jeda minimal 2 detik; DS memakai `fmt` dari `inti.js`; hitungan berkas DT dibetulkan.
21. Nomor migrasi. **Keputusan:** selalu "nomor kosong berikutnya saat tiket".
22. Fase. **Keputusan:** rute menurunkan `publik` dalam satu batch; syarat R3P diusulkan ditegakkan di G3.
23. Rujukan kode. **Keputusan:** betulkan semua jalur: `scripts/gempa/`, `public/banjir/data/`, `public/gempa/data/`, `hvc_dasar.kab_kode` untuk BPS 4 digit; hapus rujukan `src/hak.js:68`. SK-003 melengkapi `sumber.json` dengan `pemilik`, `pemakai`, `jeda`. SK-001 tinggal skrip `uji:siklus`.
24. Kelayakan. **Keputusan:** job `bulanan` boleh `pip install osmium` untuk Geofabrik, tertulis di DT; `ingest/jendela` dan `ingest/sumber` dipaginasi dengan penanda lanjut.
25. Token. **Keputusan:** pakai ulang `PIPA_TOKEN` yang sudah ada di Worker dan GitHub, tidak ada `SIKLUS_TOKEN`, supaya G1 tidak menunggu pemilik. SK-002 dihapus. Tulis D1 lewat rute Bearer.
