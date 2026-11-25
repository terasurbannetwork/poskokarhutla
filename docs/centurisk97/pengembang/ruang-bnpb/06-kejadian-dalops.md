# Kejadian Dalops dan cek kabar luar

Halaman ini menjelaskan metode pemilihan kejadian Dalops, cek kabar luar, dan daftar perlu ditanya.

## Pemilihan kejadian dan status selesai (Pantau Dalops)

![Alur data Pantau Dalops: logbook dan rekap WA diolah dalops_banjir.py, label kabar luar ditambahkan dalops_kabar.py, hasilnya disimpan di R2 privat, dibaca rute API untuk staf, lalu ditampilkan di layar.](gambar/ruang-bnpb-alur-dalops.svg)

Sumber: logbook harian Pusdalops (`data/raw/logbook/arsip/<tahun>/kejadian.jsonl`, tidak di git), rekap WA Koordalops yang diurai (`data/laporan-bnpb/harian/**`), dan rekap yang diterima bot WA. Pipeline `scripts/data/dalops_banjir.py` menulis satu berkas per jenis: banjir, longsor, karhutla, gempa, cuaca, kekeringan, gelombang, permukiman, gunungapi (`JENIS_BOLEH`, baris 36). Jenis udara dan laporan punya berkas sendiri. Berkas diunggah ke R2 dengan `--unggah`.

Aturan pilihan (`saring`, `dalops_banjir.py:526`): kejadian masuk bila `mulai` tidak lebih tua dari `buka_maks()` hari, dan kabar terakhirnya tidak lebih tua dari `SENYAP_MAKS` (bawaan sama dengan `buka_maks`), dan kabarnya dalam 7 hari logbook terakhir (`SEPEKAN = 6`, baris 43) atau belum dinyatakan selesai.

| Jenis | Jendela mulai | Batas senyap |
| --- | --- | --- |
| banjir, longsor, karhutla | 30 hari | 30 hari |
| gempa, kekeringan, gunung api | 120 hari | gempa 14, kekeringan 30, gunung api 30 hari |
| cuaca, gelombang, permukiman | 30 hari | 14 hari |

Status selesai disimpan di kolom `surut` (satu nama untuk semua jenis). Untuk banjir (`surut()`, baris 61): `False` bila teks kondisi terakhir cocok pola BELUM (belum surut, masih tergenang, belum sepenuhnya kembali normal, air naik), selain itu `True` hanya bila cocok pola SUDAH (sudah atau telah surut, surut total, kembali normal). Kondisi "mulai" atau "berangsur" surut dihitung belum surut. Jenis lain memakai pasangan pola selesai dan belum (`POLA`, baris 93). Ragu berarti belum selesai. Angka tak diketahui disimpan `null`.

Pengelompokan di layar (`kelompok()`, `dalops_hitung.js:46`): satu baris per kab/kota dan status surut dan (sepekan atau senyap). Angka diambil dari kejadian terakhir yang mengisinya; riwayat harian dua kejadian digabung (angka dijumlah per tanggal, tinggi diambil rentang terlebar).

## Cek kabar luar

Tujuan: untuk kejadian yang belum dilaporkan selesai, memeriksa apakah ada bukti dari luar laporan BPBD. Tidak pernah menutup kejadian. Kode: `scripts/data/dalops_kabar.py`, dipanggil `dalops_banjir.py`.

Sumber: berkas tayang produksi `/banjir/data/berita*.json`, `/data/berita.json`, `/banjir/data/status.json`, `/kekeringan/data/gdo.json`, `/data/peta_karhutla_kab.json`, `/banjir/data/gunungapi_status.json` (peta jenis ke berkas di `dalops_kabar.py:28`). Dasar URL dapat ditimpa env `CEK_KABAR_DASAR` untuk uji lokal. Arsip berita lokal disimpan 60 hari (HIPOTESIS awal).

Langkah per kejadian:

1. Pencocokan artikel. Satu artikel cocok bila: kode kab kejadian ada di daftar kab artikel (artikel yang hanya punya provinsi tidak cocok; pengecualian kejadian tingkat provinsi seperti gempa), tanggal artikel antara `terakhir - 1 hari` dan hari acuan (`LONGGAR = 1`), dan teks artikel memuat kata jenis (`KATA_JENIS`).
2. Arah bukti. Teks `judul + ringkas`: arah `pulih` bila cocok pola selesai jenis itu dan tidak cocok pola belum, atau pola umum "kembali normal", "warga kembali ke rumah", "status darurat dicabut atau berakhir" selama tidak ada kata "belum"; arah `masih` bila memuat topik korban atau penanganan atau kata `AKTIF` (masih, terendam, mengungsi, evakuasi, belum surut, belum padam, terbakar, dalam penanganan, tanggap darurat). Selain itu artikel diabaikan, karena hampir semua artikel bertopik kejadian.
3. Sinyal alam per jenis: banjir dan longsor dari level tertinggi semua kecamatan di kab (normal bila 1 atau kurang, aktif bila 2 atau lebih); karhutla dari titik panas kab pada dua hari terakhir berkas; kekeringan dari kelas `gdo_spi3` dan `gdo_tanah` (normal bila keduanya 0, aktif bila salah satu 1 atau lebih); gunung api dari level resmi PVMBG (aktif bila level 2 atau lebih). Cuaca, gempa, gelombang, dan permukiman tidak punya sinyal alam. Ambang level 1 atau kurang adalah HIPOTESIS awal.
4. Label:

```
p = bukti pulih terbaru, m = bukti masih terbaru
senyap = hari_acuan - max(terakhir, tanggal artikel cocok terbaru)
jika p dan (tidak ada m atau p lebih baru dari m): mungkin_selesai (dasar berita)
selain itu jika m:                                   masih (dasar berita)
selain itu jika senyap >= AMBANG[jenis] dan alam normal: mungkin_selesai (dasar alam)
selain itu:                                           belum_ada
AMBANG (HIPOTESIS awal) = banjir 3, longsor 7, karhutla 3, kekeringan 14 hari
```

Ragu (tanggal sama) berarti masih. Tiap label membawa bukti (maksimal 5 artikel terbaru): judul, media, tanggal, tautan, arah. Label tanpa bukti tidak tampil, kecuali label berdasar sinyal alam yang tampil bersama sinyalnya.

![Urutan aturan penentu label kabar luar: empat aturan dicek berurutan dan aturan pertama yang cocok menentukan label. Ambang hari senyap masih hipotesis awal. Sumber: scripts/data/dalops_kabar.py.](gambar/ruang-bnpb-label-kabar-luar.svg)

5. Arsip beku. Label harian ditambah ke `data/raw/dalops/cek_arsip.jsonl` secara append-only agar ketepatan dapat dinilai nanti terhadap laporan selesai resmi. Rapor ketepatan (CK-07) belum ada: rancangannya menyebut label Kemungkinan selesai dianggap benar bila laporan selesai datang dalam 14 hari, label Masih benar bila laporan selesai tidak datang dalam 3 hari, tanpa persen bila n kurang dari 30. Status uji balik: belum diuji.

Jadwal: ikut rekap WA, dan `banjir.yml` menjalankan `dalops_banjir.py --kabar --unggah` tiap hari sesudah terbit; sumber gagal membuat berkas tayang dibiarkan.

## Perlu ditanya, kelompok, dan pesan WA

`perluDitanya` (`dalops_hitung.js:97`) memasukkan kelompok yang belum selesai dan memenuhi salah satu: kabar terakhir berumur 1 hari atau lebih (`kabar`), jumlah KK kosong, jumlah jiwa kosong, tinggi genangan kosong (hanya jenis yang punya tinggi), atau berlabel Kemungkinan selesai walau angkanya lengkap. Urutan: label kabar luar (Kemungkinan selesai, Belum ada kabar luar, Masih), lalu hari senyap terpanjang, lalu umur, lalu nama. Kolom `senyap` bernilai benar bila umur lebih dari 6 hari. Label kelompok memakai label baris paling waspada (Masih, lalu Belum ada kabar luar, lalu Kemungkinan selesai).
