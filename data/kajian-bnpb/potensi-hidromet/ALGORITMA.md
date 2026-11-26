# ALGORITMA

## 1. Status

Status per kab, bahaya, hari dari induk ALGORITMA 5 (matriks K kali E, terkunci). Status pada pilihan hari h = `hari[h]`; pilihan 3 hari = maksimum `hari[0..3]` yang bukan null; semua null = belum terukur.

BDG: K = kelas kab bahaya banjir bandang dari `kelas_bahaya_kab.json`; E = E milik BNJ pada hari yang sama. Aturan K null sama dengan induk (dibatasi paling tinggi Siaga, ditandai sebagian).

## 2. Urutan daftar kab

Kunci urut menurun: status, lalu E, lalu urutan K (tinggi, sedang, rendah, null), lalu porsi desa kelas tinggi; seri diputus nama kab. Pil "Semua": per kab dipakai bahaya dengan status tertinggi.

## 3. Ringkas

Per kab status tertinggi atas bahaya yang tampil. Normal hanya bila semua bahaya kab itu bernilai 0 dan segar; ada null tanpa nilai lebih tinggi = belum terukur.

## 4. Analisis (`analisis.json`)

- Matriks: per bahaya, jumlah kab K tinggi; jumlah desa kelas tinggi; jumlah kab per status pada pilihan 3 hari.
- Hujan: 10 kab dengan maksimum `tot` HJN hari +1 sampai +3, mm dibulatkan ke bilangan bulat.
- Hari tanpa hujan: 8 kab dengan `maks` terbesar, sampai kemarin.
- Gelombang: 8 kab pesisir dengan maksimum `hs` GEL, satu desimal meter.
- Debit: 8 kab dengan rasio puncak terhadap Q2 terbesar, satu desimal, pil hipotesis.
- Desa bahaya tinggi: 50 desa dengan jumlah bahaya kelas tinggi terbanyak, seri diputus jumlah sampel lalu kode.

Tiap blok membawa `dibuat` dan `sumber_segar`. Sumber hilang: blok `null`, tidak pernah daftar kosong yang dibaca sebagai nol.

## 5. Kelas desa

Sampel bangunan `kelas_kab.py` diberi kode desa (titik dalam poligon desa `public/geo/desa/<kab>.json`). Per desa per bahaya: kelas = kelas terbanyak di antara sampel terbaca; seri ke kelas lebih tinggi; sampel terbaca kurang dari Q1 = null. Nodata raster tidak dihitung sebagai rendah.

## 6. Debit

Per kab: puncak ansambel rerata hari 0 sampai 3 dibagi Q2 titik kab. Q2 tidak ada = null.

## 7. ONI dan IOD

ONI: `oni_terakhir.nilai`, basi bila musim terakhir lebih dari 45 hari dari tengah bulan terakhirnya. IOD: `dmi_8_minggu` bila `dmi_basi` false, selain itu nilai BoM dengan umur sendiri; basi bila lebih dari 21 hari.

## 8. BMKG desa

Rute: daftar desa kab dari `public/geo/desa/<kab>.json`; panggil BMKG per desa dengan antrean 50 per menit global; cache per desa 3 jam di Cache API; respons ringkas per desa: tanggal, hujan per 3 jam dijumlah per hari (mm), suhu min dan maks, angin maks, kode cuaca terbanyak. Kab lebih dari 50 desa: dimuat bertahap (halaman 50 desa).
