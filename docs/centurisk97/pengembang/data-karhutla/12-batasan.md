# Batasan dan pertanyaan terbuka

Halaman ini mencatat batasan data, selisih antara dokumen dan kode, model yang masih hipotesis, dan pertanyaan yang belum dijawab pemilik.

## Batasan data

- Satelit tidak menembus awan dan asap tebal; hari tanpa titik panas tidak boleh dibaca sebagai hari tanpa api. Bara gambut dapat bertahan berhari-hari tanpa deteksi.
- Deteksi VIIRS terhadap pembaraan gambut di lapangan tercatat 71 persen pada satu studi Kalimantan Tengah (rujukan di docstring `titik_unik.py`), sehingga hitungan gambut cenderung terlalu rendah.
- Hari dengan "celah" lintasan di FIRMS tidak dikoreksi.
- Arsip FIRMS 2026 tidak tersedia tanpa kunci (SP 2026 belum terbit). Arsip lokal VIIRS bolong pada beberapa tahun (2012 sampai 2015, 2020 sampai 2022); petak 375 m 2012 sampai 2025 dibangun dari arsip negara publik FIRMS.
- Arsip SP tertinggal sekitar 3 bulan dan berbeda per sensor; `titik_hari` memakai `hotspot.json` untuk hari yang ada di jendela 7 hari, dan hari bolong di arsip live (16, 18 sampai 21, 24 November 2026) dicatat oleh pengerja.
- SiPALAGA/TMAT diblokir tantangan Cloudflare (403) dan tidak boleh ditembus; BoM memblokir akses otomatis.
- Bucket MapBiomas Indonesia menolak akses anonim (403) per 24 November 2026; angka MapBiomas 2026 hanya kutipan terbit di `data/mapbiomas_fire_rujukan.json`. Pembanding bias luas (PKH-41) bergantung pada kutipan itu.
- Logbook Pusdalops tanpa koordinat, sehingga uji luas dan durasi tingkat kabupaten tercampur api lain: jangan dijadikan faktor kalibrasi. Bandingkan lift, bukan deteksi mentah, dan sertakan uji null.

## Perbedaan antara dokumen dan kode (kode menang)

- `docs/cara-kerja.md` menyebut FIRMS VIIRS "S-NPP dan NOAA-20" dan "tiap 3 jam" untuk data; kode memuat empat sensor (M, S-NPP, NOAA-20, NOAA-21), S-NPP berhenti 1 November 2026, dan pipeline `data.yml` berjalan harian dengan `titik.yml` tiap 3 jam. Dokumen itu belum diperbarui.
- Catatan ilmu `pipa-data` menyebut faktor luas N20 4,22 dan N21 4,36; kode `peta_karhutla.py:84` memakai 4,12 dan 4,16 (kalibrasi pemilik 25 Oktober 2026). Kode dipakai di sini.
- Kajian ambang menetapkan garis 50 masuk dan 25 keluar dengan rata-rata 7 hari; layar memakai rata-rata 3 hari dengan garis dasar 60 dan 30 (keputusan pemilik 11 November 2026) dikalikan rasio satelit.
- Paket `data/kajian-bnpb/ambang-hotspot/` tidak memuat berkas KEPUTUSAN, PRD, ALGORITMA, DESAIN-TEKNIS; dokumen keputusan tertulisnya belum ada.
- Paket `insar-gambut` lengkap sebagai rancangan, tetapi kodenya belum dibuat.
- Paket `data/kajian-bnpb/desa-waspada/` ada, tetapi `scripts/data/desa_waspada.py` dan `public/desa-waspada/` belum ada di repo; paket itu tidak dicakup dokumen ini.

## Model yang berstatus hipotesis atau belum lulus

- ambang tugas otomatis Worker (permukiman 5 km, tumbuh >= 3 titik dan >= 1,5 kali): hipotesis, belum diuji balik;
- uraian skor peringkat (`alasan_skor`): hipotesis, bobot belum diuji;
- perkembangan per insiden (garis depan, laju, lompatan, titik awal): hipotesis, uji tahan A10 bervonis "belum";
- luas dNBR: indikatif, belum dibandingkan dengan luas lapangan pada >= 20 insiden; cadangan radar RBR: hipotesis, ambang belum disetel;
- estimasi bara gambut: estimasi, belum divalidasi lapangan, bergantung pada fraksi terbakar 10, 30, dan 100 persen (asumsi);
- ambang situasional Oktober, November, dan La Niña pada Prioritas provinsi: dari kajian, belum dihitung otomatis;
- lab InSAR gambut: belum diuji.

## Pertanyaan terbuka

- InSAR gambut, belum diputuskan (bawaan sementara):
  - Q1 izin unduhan LiCSAR dan LiCSBAS untuk Palangka Raya (tidak dijalankan sampai pemilik mengizinkan);
  - Q2 apakah D InSAR boleh menggantikan atau mempersempit D literatur bila vonis `selaras` (tidak menggantikan, hanya berdampingan dan berlabel hipotesis);
  - Q3 nilai `ALPHA` (1,0);
  - Q4 L-band ALOS-2: sumber, lisensi, dan pemroses di luar repo (tidak dikerjakan);
  - Q5 satu wilayah atau dua sebelum vonis (satu wilayah, vonis berlaku hanya untuk wilayah dan musim itu);
  - Q6 ambang koherensi dan jumlah piksel minimum (angka di RENCANA-UJI bagian 2 adalah tebakan perancang, dikunci sebelum lab).
- Paket insiden kaya: pertanyaan terbuka Q2 sampai Q4 dan Q6 sampai Q11 dengan bawaan sementara di `data/kajian-bnpb/insiden-kaya/KEPUTUSAN-INSIDEN.md`, antara lain vonis uji tahan A10 (Q11) yang masih "belum".
- Mask bergulir 365 hari di `titik_palsu.py` hanya mencatat laporan; menjadikannya penyaring mengubah angka utama dan menunggu keputusan pemilik.
- Perbandingan dengan SiPongi: selisih Kalimantan Barat sekitar dua kali angka BNPB belum terjelaskan; definisi titik panas berubah 28 Oktober 2026 (keyakinan rendah ikut), sehingga perbandingan perlu diulang (daftar antrean di `public/index.html`).
- Jalur Himawari belum memakai VIIRS segar sebagai penanda karena job `himawari.yml` tidak memiliki kunci FIRMS dan `hotspot72.json` segar; status penanda `viirs_tak_ada` sampai secret ditambahkan oleh pengerja mesin.
