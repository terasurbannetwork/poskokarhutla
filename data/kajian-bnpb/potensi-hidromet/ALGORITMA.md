# ALGORITMA

## 1. Status

Dari induk ALGORITMA 5 (matriks K kali E, terkunci). Status pilihan hari h (0 Hari ini sampai 3 Hari ke-3) = `hari[h]`; "Ringkas 3 hari" = maksimum `hari[0..3]` yang bukan null; semua null = belum terukur.

BDG: K = kelas kab banjir bandang (bagian 5); E = E milik BNJ hari yang sama. Aturan K null sama dengan induk (dibatasi paling tinggi Siaga, ditandai sebagian).

## 2. Urutan daftar kab

Kunci urut menurun: status, E, K (tinggi, sedang, rendah, null), porsi desa kelas tinggi; seri diputus nama kab. Pil "Semua": per kab dipakai bahaya dengan status tertinggi.

## 3. Ringkas

Per kab status tertinggi atas bahaya yang tampil. Normal hanya bila semua bahaya kab itu 0 dan segar; ada null tanpa nilai lebih tinggi = belum terukur.

## 4. Analisis (`analisis.json`)

- Matriks: per bahaya jumlah kab K tinggi, jumlah desa kelas tinggi (baseline), jumlah kab per status "3 hari".
- Hujan: 10 kab dengan maksimum `tot` HJN hari +1 sampai +3, mm bulat.
- Hari tanpa hujan: 8 kab dengan `maks` terbesar, sampai kemarin.
- Gelombang: 8 kab pesisir dengan maksimum `hs` GEL, satu desimal.
- Debit: 8 kab dengan rasio puncak terhadap Q2 terbesar, satu desimal, hipotesis.
- Desa bahaya tinggi: 50 desa dengan jumlah bahaya kelas 3 baseline terbanyak; seri diputus jumlah kelas 3 proyeksi, lalu kode.

Tiap blok membawa `dibuat`, `sumber`, `tgl_data`. Sumber hilang: blok `null`.

## 5. Kelas desa dan kelas kab (terkunci sebelum uji balik)

Kelas desa per bahaya = digit ke-i string kelas baseline berkas BNPB (urutan: banjir, banjir bandang, longsor, gelombang, karhutla, kekeringan); 0 = belum terukur. Proyeksi dibaca terpisah, tidak dipakai status.

Kelas kab per bahaya dari jumlah desa [n0 tanpa kelas, n1 rendah, n2 sedang, n3 tinggi], total N = n0+n1+n2+n3:
- N = 0 atau n1+n2+n3 = 0: null (belum terukur).
- tinggi bila n3/N paling sedikit 0,40, atau n3 paling sedikit 30 dan n3/N paling sedikit 0,10;
- sedang bila n3/N paling sedikit 0,10, atau n3 paling sedikit 10, atau (n2+n3)/N paling sedikit 0,60;
- selain itu rendah.

Aturan ini dipinjam dari `ews-engine.js` dashboard hidromet (RISET 1) dan dikunci lewat `.sidik.v3`. Gelombang hanya untuk kab yang punya desa berkelas gelombang. Cuaca ekstrem tidak punya kelas desa; K-nya tetap dari induk (IRBI, Q6 induk).

## 6. Debit

Per kab: puncak ansambel rerata hari 0 sampai 3 dibagi Q2 titik kab. Q2 tidak ada = null.

## 7. ONI dan IOD

Dibaca dari `public/data/iklim.json` kolom `oni_status` `{nilai, musim, tahun, umur_hari, basi}` (basi bila lebih dari 45 hari dari tanggal 15 bulan terakhir musimnya) dan `iod` `{nilai, tgl_data, umur_hari, sumber, basi}` (DMI NOAA rerata 8 minggu bila segar, selain itu BoM; basi bila lebih dari 21 hari). Kolom lama `oni` (deret) tidak berubah. Bobot musim `bobot_el_nino` tetap memakai DMI saja; menyambungkannya ke BoM adalah keputusan model terpisah.

## 8. BMKG desa

Daftar desa kab dari `public/geo/desa/<kab>.json`; panggilan BMKG per desa lewat antrean 50 per menit global; cache per desa 3 jam (Cache API); respons ringkas per desa per hari: hujan dijumlah dari langkah 3 jam (mm), suhu min dan maks, angin maks, kode cuaca terbanyak. Lebih dari 50 desa: halaman 50 desa.

## 9. Ringkasan (bab)

Templat kalimat tetap, diisi angka bagian 3 dan 4. Tiap angka membawa chip D16. Kalimat tanpa sebab, tanpa "aman", tanpa ramalan kejadian.

## 10. Lapisan

Objek: peringatan (CAP aktif), bahaya (7 kode), provinsi, kab, kecamatan, desa. Relasi: peringatan menyentuh kab (dari keluaran induk); bahaya berlaku di kab (status bukan null); provinsi berisi kab; kab berisi kecamatan; kecamatan berisi desa. Garis penghubung antarlapis digambar dari relasi objek terpilih saja.
