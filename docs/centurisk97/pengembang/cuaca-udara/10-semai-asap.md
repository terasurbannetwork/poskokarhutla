# Asap 24 jam, data basi, uji prospektif

Halaman ini menjelaskan prakiraan asap 24 jam di mode semai, penanganan data basi, dan uji prospektif peluang semai.

## M15. Prakiraan asap 24 jam dan peringatan lintas batas (mode semai)

Mesin tunggal `scripts/udara/lintasan.py semai` (`lintasan.py:272-562`), tidak ada mesin kedua:

1. Angin dari IFS 0,1 derajat: campuran 60% angin 10 m dan 40% angin 850 hPa.
2. Tiap cluster besar melepas 10 partikel (`NP_RILIS`) tiga kali per jam (langkah 15 menit, pelepasan pada 3 dari 4 langkah), digerakkan skema Heun. Pemanasan 12 jam sebelum jam pertama layar. Bobot tiap partikel `frp24 / jumlah partikel cluster`. Sebaran awal 0,03 derajat. Partikel yang keluar kotak dibuang.
3. Beban relatif per jam: bobot partikel per sel 0,1 derajat dihaluskan kernel Gauss (`SIGMA_HALUS_KM = 10`, terpotong 2 sel), dinormalkan ke persentil 99 dari nilai positif. Tingkat: tinggi 0,5 atau lebih, sedang 0,2, rendah 0,05 (HIPOTESIS). Ini beban relatif, bukan PM2,5.
4. Kota di bawah asap: beban 0,05 atau lebih dalam 20 km (`KOTA_KM`); status "sudah berasap" bila sudah ada pada jam pertama, selain itu "tiba +N jam"; tingkat maksimum; lama maksimal 24 jam; urutan tiba lebih dulu, lalu sudah berasap menurut tingkat; maksimal 8 baris, sisanya "+N kota lain".
5. Lintas batas: jam pertama ketika 5% atau lebih bobot partikel satu cluster berada di poligon Malaysia, Singapura, Brunei, Timor Leste, atau Papua Nugini (`LINTAS_FRAKSI`); dicatat negara, kota terdekat di negara itu (`scripts/udara/data/kota_tetangga.json`, GeoNames CC BY 4.0), dan cluster asal. Poligon negara berupa penyederhanaan kasar.

## M16. Satelit hilang, data basi, dan ringkasan teks

- **Satelit hilang**: jumlah titik 24 jam per sumber (S-NPP, NOAA-20, NOAA-21) dari `hotspot24.json`; satelit yang diharapkan tetapi bernilai nol piksel ditandai "belum masuk". S-NPP hanya diharapkan sebelum tanggal pensiunnya (`scripts/data/firms_sumber.py`). Data FIRMS basi bila lebih tua dari 6 jam; berkas prakiraan basi di layar bila lebih tua dari 13 jam (`public/operasi_semai.js`, fungsi `pitaBasi`).
- **Ringkasan teks** (`semai_murni.py:308`, `public/operasi_semai_murni.js`): memuat jam putaran, jumlah cluster besar dan total MW, asap lintas batas, serta daftar zona dengan koordinat, jendela, skor, dan base; ditutup kalimat "Usulan mesin, bukan prakiraan resmi. Konfirmasi tiap operasi dengan BMKG." Versi Mitra (Inggris, koordinat dibulatkan 0,5 derajat, tanpa skor, alasan, dan base) dirancang tetapi belum ada di layar.

## M17. Uji prospektif peluang semai (terdaftar, belum berjalan)

Pra-registrasi di `data/kajian-bnpb/semai-awan/ALGORITMA.md` §12 menetapkan: unit zona dari putaran beku, kejadian hujan satelit 1 mm/jam atau lebih (GSMaP NRT, cadangan IMERG Early) dalam 25 km titik hujan pada 30 sampai 90 menit sesudah jam terbaik zona, pembanding lima sel acak lolos gerbang berjarak 40 km atau lebih dari zona dengan benih tetap `20261114`, ukuran selisih laju dan selang Wilson 95%, angka tampil hanya bila minimal 30 zona. Efek semai tidak diklaim; yang diuji hanya apakah mesin memilih awan yang memang menjadi hujan alami. Kode `semai_nilai.py` dan `semai_beku.py` belum ada di repo; status uji: **belum diuji**, sehingga seluruh zona berstatus HIPOTESIS.
