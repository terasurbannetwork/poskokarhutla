# Metode karhutla

Status uji balik tiap metode pada modul ini. Arti status ada di [ringkasan status](/docs/pengembang/metode/ikhtisar).

## 01. Peta utama karhutla

| Metode | Status | Catatan |
| --- | --- | --- |
| [1. Titik panas yang dihitung (angka utama)](/docs/pengembang/peta-karhutla) | Bukan model | Definisi angka utama (lokasi unik), bukan model. |
| [2. Cluster atau kompleks api](/docs/pengembang/peta-karhutla) | Campuran | Ambang tingkat 3 diuji balik 2019 dan 2023 (menangkap 90 sampai 95 persen api besar); skor urutan dan kartu alasan peringkat hipotesis. |
| [3. Luas terbakar, belum padam, dan padam](/docs/pengembang/peta-karhutla) | Hipotesis | Perkiraan satelit terkalibrasi ke luas resmi; angka resmi tetap dari KLHK dan BNPB. |
| [4. Prioritas provinsi (ambang masuk dan keluar)](/docs/pengembang/peta-karhutla) | Campuran | Ambang kajian (7 hari, 50 dan 25) lulus uji tertahan; aturan di layar (3 hari, 60 dan 30) dipilih sesudah uji balik ulang tanpa vonis lulus tertulis. |
| [5. Insiden api](/docs/pengembang/peta-karhutla) | Hipotesis | Luas terkoreksi adalah perkiraan perencanaan. |
| [6. Perkembangan api per insiden (HIPOTESIS)](/docs/pengembang/peta-karhutla) | Hipotesis | Uji tahan A10 bervonis belum; kartu belum ada di layar. |
| [7. Bangunan dekat api per insiden](/docs/pengembang/peta-karhutla) | Bukan model | Hitungan geometri atas Open Buildings; baru tiga provinsi tercakup, selebihnya belum tercakup. |
| [8. Desa Waspada (rancangan, belum dibangun)](/docs/pengembang/peta-karhutla) | Rancangan | Belum ada kode; status uji belum diuji. |
| [9. Alat gambar wilayah (rancangan, belum dibangun)](/docs/pengembang/peta-karhutla) | Rancangan | Belum ada kode; alat hitung geometri, uji balik tidak berlaku. |
| [10. Indeks risiko historis, musim, dan peluang api besar](/docs/pengembang/peta-karhutla) | Tidak dinyatakan | Pola masa lalu, bukan model fisika; vonis tidak ditulis. |
| [11. Model lain yang tampil di peta (HIPOTESIS)](/docs/pengembang/peta-karhutla) | Hipotesis | Rincian ada di dokumen 03. |

## 02. Pipeline data karhutla dan sumber data

| Metode | Status | Catatan |
| --- | --- | --- |
| [1. Sumber deteksi dan pengambilan](/docs/pengembang/data-karhutla) | Bukan model | Pengambilan data FIRMS. |
| [2. Definisi angka utama: lokasi unik](/docs/pengembang/data-karhutla) | Bukan model | Dijaga swa-uji titik_unik.py. |
| [3. Sumber panas tetap dan gunung api](/docs/pengembang/data-karhutla) | Tidak dinyatakan |  |
| [4. Berhentinya S-NPP dan rasio NOAA-20 per S-NPP](/docs/pengembang/data-karhutla) | Bukan model | Rasio terukur, bukan model. |
| [5. Kompleks api (ST-DBSCAN)](/docs/pengembang/data-karhutla) | Bukan model | Ada uji sensitivitas terdokumentasi; bukan uji balik. |
| [6. Keparahan, status taktis, dan prioritas pemadaman](/docs/pengembang/data-karhutla) | Campuran | Ambang px24 dan FWI menangkap 90 sampai 95 persen api besar; uraian skor hipotesis. |
| [7. Klasifikasi firespot](/docs/pengembang/data-karhutla) | Tidak dinyatakan | Hasil uji balik 2019 dan 2023 dilaporkan (api besar tidak pernah tertinggal tanpa status ya); kriteria lulus eksplisit tidak ditulis. |
| [8. Indeks cuaca kebakaran (FWI)](/docs/pengembang/data-karhutla) | Lulus | Swa-uji terhadap paket cffdrs dan fixture 1.730 baris. |
| [9. Insiden api](/docs/pengembang/data-karhutla) | Hipotesis | Faktor per provinsi dari median luas resmi. |
| [10. Luas terbakar harian, belum padam, dan padam](/docs/pengembang/data-karhutla) | Hipotesis | Perkiraan satelit; angka resmi tetap dari KLHK. |
| [11. Luas terbakar dari citra Sentinel-2 (dNBR)](/docs/pengembang/data-karhutla) | Hipotesis | Indikatif; ambang RBR belum disetel. |
| [12. Gambut: estimasi bara, KHG, kelembapan tanah](/docs/pengembang/data-karhutla) | Hipotesis | Estimasi, belum divalidasi lapangan. |
| [13. Konsesi](/docs/pengembang/data-karhutla) | Bukan model | Irisan geometri. |
| [14. Aturan Prioritas provinsi (kajian ambang hotspot)](/docs/pengembang/data-karhutla) | Campuran | Ambang kajian lulus uji tertahan kejadian besar; aturan yang dipakai layar berbeda; ambang situasional hanya di teks panel. |
| [15. Lab InSAR gambut (rancangan)](/docs/pengembang/data-karhutla) | Rancangan | Belum ada kode; belum diuji. |
| [16. Kesegaran dan keterbatasan satelit](/docs/pengembang/data-karhutla) | Bukan model |  |
| [17. Mesin pendukung lain di scripts/data](/docs/pengembang/data-karhutla) | Hipotesis | Hipotesis kecuali docstring menyatakan lulus. |

## 03. Model sebaran api dan indeks risiko karhutla

| Metode | Status | Catatan |
| --- | --- | --- |
| [Data, grid, dan pembagian waktu](/docs/pengembang/model-sebaran) | Bukan model |  |
| [Pelacak peristiwa (lacak.py)](/docs/pengembang/model-sebaran) | Bukan model |  |
| [Fitur dan indeks cuaca kebakaran (fitur.py, cuaca.py, sebaran_model.js)](/docs/pengembang/model-sebaran) | Bukan model |  |
| [Model sel: peluang tiap sel terbakar, Monte Carlo, kalibrasi (gbdt.py, latih_jalan.py, sebaran_model.js)](/docs/pengembang/model-sebaran) | Gagal | Kalah dari pembanding api tetap di tempat (IoU 0,58 lawan 0,67); tampil eksperimental. |
| [Model "akan membesar" dan tanda WASPADA (lolos.py)](/docs/pengembang/model-sebaran) | Campuran | Uji balik baik (AUC 0,91); uji prospektif belum_cukup_data. |
| [Uji balik 123 kejadian lalu (kasus.py)](/docs/pengembang/model-sebaran) | Bukan model | Alat uji; galat luas 72 jam mesin fisika 3,50 lawan 1,01. |
| [Analisis kesalahan dan kalibrasi per strata (galat.py)](/docs/pengembang/model-sebaran) | Gagal | Kalibrasi per strata gagal; koefisien produksi tidak ditulis. |
| [Uji prospektif pra-registrasi (prospektif.py)](/docs/pengembang/model-sebaran) | Bukan model | Mekanisme uji; belum ada vonis. |
| [Gerbang pembanding sederhana (gerbang.py)](/docs/pengembang/model-sebaran) | Bukan model | Gerbang gagal-tertutup. |
| [Mesin fisika Simulasi (public/index.html:6706 sampai 6830, port simfisika.py)](/docs/pengembang/model-sebaran) | Hipotesis | Tidak divalidasi untuk Indonesia. |
| [Jejak api kompleks aktif (jejak.py)](/docs/pengembang/model-sebaran) | Hipotesis | Dipakai hanya bila boleh_tampil bernilai true. |
| [Peluang api 7 hari per sel (indeks risiko mingguan): uji balik dan model produksi P1](/docs/pengembang/model-sebaran) | Campuran | Uji balik lolos empat syarat; prospektif mingguan berjalan, belum ada vonis. |
| [Pendorong, awal musim, dan tren (pendorong.py, musim_awal.py)](/docs/pengembang/model-sebaran) | Tidak dinyatakan |  |
| [Uji PFVI lawan FWI di sel gambut (pfvi_balik.py, scripts/data/pfvi.py)](/docs/pengembang/model-sebaran) | Gagal | Tidak dipasang; hanya riset. |
| [Skor prioritas dan kalibrasi wilayah (prioritas.py, kalibrasi_wilayah.py)](/docs/pengembang/model-sebaran) | Gagal | Versi 1 (23 Oktober 2026) gagal. |
