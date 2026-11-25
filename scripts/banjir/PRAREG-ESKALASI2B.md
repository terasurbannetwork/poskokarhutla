# PRAREG-ESKALASI2B: amandemen PRAREG-ESKALASI2 (KI-77)

Status: **MENUNGGU PEMBEKUAN.** Belum ada `eskalasi2b.kab.json` dan belum ada `eskalasi2b.sidik`; tidak ada yang dikunci atau dibuka. Urutan: (1) `debit_glofas.py ambil` sampai semua 514 kab dicoba (`ringkas`: belum_diambil = 0); (2) `eskalasi2b.py kunci` (menolak bila cakupan belum lengkap) menulis `eskalasi2b.kab.json`; (3) `eskalasi2b.py sidik`; (4) komit dan dorong ke origin/main SEBELUM 2027-01-01.

## 1. Mengapa PRAREG-ESKALASI2 digantikan

`eskalasi2.sidik` (d80dadde7f78265e) dikomit tetapi tidak pernah dibuka (tak ada `eskalasi2.buka`). Pemeriksa bersih menemukan cacat yang tak bisa ditambal tanpa mengubah berkas ber-sidik, jadi amandemen dengan id dan sidik baru, berkas lama tidak disunting dan `sidik.py cek`-nya tetap lolos:
1. `latih_model` melewati semua lipatan OOF bila latih < 20 satuan, `pav([], [])` kosong, `iso` melempar IndexError: `buka` jatuh sebelum vonis TAK_CUKUP.
2. Himpunan kab dihitung ulang saat `buka` dari cache GloFAS yang tak ter-hash.
3. Penjaga hanya memeriksa HEAD lokal.
4. Jeda lapor tak mencakup label d+2 hari terakhir.
5. `min_prov` tak ditentukan dari aturan data.
6. Kelemahan desain hujan tak dicatat.

## 2. Perubahan (semua definisi lain, label, fitur, model, pembanding, vonis, tetap seperti PRAREG-ESKALASI2)

- **Cacat 1.** `jalankan()` memutuskan TAK_CUKUP SEBELUM `nilai`: latih < `min_latih` (60), uji < `min_n`, y=1 < `min_y1`, atau provinsi < `min_prov`. `iso` pada kalibrasi kosong aman (kalibrasi dilewati).
- **Cacat 2.** `eskalasi2b.py kunci` menulis `eskalasi2b.kab.json` (O_EXCL, sekali): daftar kab layak, provinsi layak, dan sha berkas cache debit serta ERA5 tiap kab. `buka` memakai daftar itu dan menolak bila hash beda. `kunci` MENOLAK selama ada kab belum dicoba diambil. `kab.json` masuk sidik.
- **Jendela** digeser: prospektif **2027-01-01 .. 2027-05-31**, supaya pembekuan bisa dilakukan Desember 2026.
- **Cacat 3.** `buka` mensyaratkan sidik, PRAREG, kab.json, dan kriteria ada di `origin/main` dengan isi PERSIS sama dengan berkas lokal, dan tanggal komitnya sebelum 2027-01-01.
- **Cacat 4.** Tanggal buka = akhir jendela + 2 hari + 14 hari lapor = 2027-06-16 (d+2 terakhir punya 14 hari penuh); `buka` ditolak pada atau sebelum tanggal itu.
- **Cacat 5 (aturan data, ditetapkan sebelum melihat hasil).** Bila sesudah cakupan lengkap provinsi yang punya sungai layak (`n_prov_layak` di kab.json) < 4, vonis = **TAK_CUKUP menurut aturan**, tanpa menghitung skor apa pun.

## 3. Kelemahan desain yang diakui (cacat 6)

Latih memakai hujan d+1..d+3 dari ERA5 (teramati, ideal), uji memakai prakiraan `fitur.h3` arsip KAB2. Kalibrasi isotonik dilatih pada skor yang dibangun dari hujan ideal itu, jadi peluang uji bisa terlalu yakin. Arsip prakiraan untuk melatih dengan hujan yang tersedia saat nyata belum ada (arsip KAB2 baru mulai November 2026), sehingga skor dilaporkan DENGAN kelemahan ini. Varian sensitivitas **sekunder**, terdaftar dari sekarang: model tanpa fitur `lh13` (`sekunder_tanpa_hujan` di hasil), tanpa vonis sendiri; bila varian itu lebih baik dari yang utama, itu bahan amandemen berikutnya, bukan pengganti vonis.
