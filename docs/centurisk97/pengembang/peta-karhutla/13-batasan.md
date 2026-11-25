# Batasan dan perbedaan dokumen

Halaman ini mencatat batasan data dan metode, selisih dokumen dengan kode, dan hal yang belum terdokumentasi.

## Batasan data dan metode

- Titik panas adalah deteksi satelit, bukan luas terbakar dan bukan bukti api menyala atau berhenti. Awan, asap, dan jeda lintasan membuat banyak api tidak terlihat; gambut bisa membara tanpa terdeteksi. Layar tidak boleh menyimpulkan keadaan dari ketiadaan titik.
- Keyakinan rendah ikut dihitung di angka utama, tetapi luas terbakar, cluster, faktor insiden, dan rasio satelit tetap memakai nominal dan tinggi karena koefisiennya diukur dari kelas itu dan belum dikalibrasi ulang (`titik_unik.py`).
- Angka utama (lokasi unik, semua sensor dan keyakinan) tidak sama dengan SiPongi atau GIS BNPB. Jangan menjumlah atau menyamakannya.
- Pensiun S-NPP (1 November 2026) membuat rasio N20 terhadap N dipakai di insiden (0,89, IQR 0,72 sampai 1,07) dan mengubah satuan laporan di Prioritas provinsi (3,0 menjadi 2,4). Sesudah itu jendela hitung 3 hari penuh baru berlaku mulai 3 November 2026.
- Luas cluster adalah indikatif dari piksel; luas insiden terkoreksi adalah perkiraan perencanaan.
- Perkembangan api per insiden tidak dapat dilacak untuk insiden berpiksel unik kurang dari 20, atau yang arsipnya kurang dari dua hari. Arsip hanya dari 1 Juli 2026, memakai geometri insiden saat ini, dan hanya deteksi pertama per lokasi per hari. Dari 54 insiden aktif pada saat uji, hanya 3 punya sedikitnya 20 petak VIIRS sesudah penyaring awal (KEPUTUSAN-INSIDEN D20).
- Pemangkasan arsip insiden `tak_terdeteksi` dan `gabung` terhadap `SIMPAN_HARI` sudah ada di `arsip_insiden.py` (`pangkas()`), sedangkan dokumen DESAIN-TEKNIS masih menulisnya sebagai sisa kerja IK-01. Dokumen tertinggal dari kode.
- Cakupan bangunan dekat api baru tiga provinsi pada pengamatan lokal; provinsi lain tampil "belum tercakup" sampai IK-08 selesai.

## Perbedaan dokumen dan kode

- `data/kajian-bnpb/desa-waspada/RISET.md` (baris 21) menyebut `public/prioritas.js` dengan "masuk 60, keluar 30". Itu benar sebagai garis dasar VIIRS; satuan laporan yang dipakai kode adalah 180 dan 90 (sampai 2 November 2026) atau 144 dan 72 (sesudahnya).
- Catatan memori memuat hasil kajian awal masuk 50 dan keluar 25 dengan rata-rata 7 hari; aturan yang dipakai kode adalah rata-rata 3 hari, masuk 60 dan keluar 30 (VIIRS).
- DESAIN-TEKNIS insiden menulis `arsip_insiden.py` berstatus "sudah ada, sisa kerja di IK-01"; kode sudah memuat pemisahan MODIS (`petak_m`), tanda `terpotong`, dan `pangkas()`.
- Bagian "Insiden api" di laci sudah memakai `insiden.json` (PKH-08 sampai 11), padahal paket insiden-kaya menyebut titik pasang pop-up "belum ditemukan". Titik pasangnya ternyata `Laci.buka` yang dibungkus di `public/pembanding.js:76`.
- `scripts/data/peta_karhutla.py` dan `laporan.py` memakai dua faktor luas berbeda (4,12 dan 4,16 ha per titik NOAA di peta; 4,30 ha per titik S-NPP di `laporan.py:47`). Keduanya hidup berdampingan; pemakaian `laporan.py` untuk laporan harian tidak dirinci di sini.

## Hal yang belum terdokumentasi di kode yang dibaca

- Peran dan akun mana saja yang boleh membuka `/` dan `/k/<id>`, serta tabel D1 yang khusus mendukung peta utama.
- Isi lengkap kajian ambang hotspot (PDF, PPTX, dan berkas Word di folder itu belum dibaca untuk dokumen ini) dan skrip analisisnya yang menurut catatan memori hanya ada di sesi lama, belum masuk repo.
- Rincian tab Posko, Simulasi, Berita, Foto, Informasi, Laporan, Dalops, dan Operasi, yang dimiliki modul lain.
