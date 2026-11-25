# Batasan dan pertanyaan terbuka

Halaman ini memuat batasan modul banjir dan pertanyaan yang belum diputuskan.

Batasan sistem:

- Uji balik status banjir menunjukkan FAR 0,92 sampai 0,97 dan ETS di bawah 0,03 pada periode uji. Status Waspada sampai Awas adalah penanda bersiaga yang konservatif terhadap kejadian yang tercatat, bukan prakiraan kejadian. Jalur sungai dan ansambel tidak masuk uji balik. Ketepatan per waktu-tunda baru dapat dinilai dari catatan prospektif.
- Peluang hujan lebat belum terkalibrasi dan bukan peluang banjir.
- Hujan model resolusi 0,25 derajat meremehkan hujan lokal; Open-Meteo gratis berkuota harian yang dibagi dengan modul lain.
- Radar GFM: tidak melihat di area ter-mask (kota padat, hutan, rawa; sekitar 75 persen DKI), lintasan 6 sampai 12 hari sekali, dan tidak boleh dibaca sebagai bukti negatif. Bangunan terendam tidak ditampilkan (5 sampai 12 kali di bawah DIBI pada Demak 2024).
- Penurunan tanah: kutipan literatur tidak sebanding antarkota; angka terukur dari radar baru sebagian lolos validasi dan belum tayang; kerangka acuan dan masker koherensi dapat menyaring cekungan paling cepat.
- Rob: arsip model baru sejak 24 November 2022; titik rob (66) tidak meliputi semua kabupaten sampel; tanggul dan pompa tidak dimodelkan.
- Simulasi genangan: belum dicocokkan dengan peta genangan nyata; DEM SRTM direkam tahun 2000 sehingga penurunan tanah sesudahnya tidak ada di medan. Model J3 tidak sah diuji karena label latihan. J4 baru bisa divonis sesudah musim hujan 2026/27.
- Sensor milik sendiri: firmware belum diuji di perangkat keras; ambang titik awal; bacaan tidak memicu peringatan publik.
- Data kejadian: DIBI mulai 2008 dan kurang mencatat kejadian kecil; laporan WA Koordalops yang menyatakan "surut" hanya ada sejak 27 Oktober 2026, sehingga faktor "belum surut" belum dapat diuji di arsip.
- Beberapa berkas di `public/banjir/data/` bisa basi bila pipeline gagal (misalnya `peluang.json` basi membuat kartu H+1 sampai H+3 kosong); kartu menyatakannya.

Perbedaan dokumen paket dan kode (kode menang):

- Dokumen `genangan-satelit` (ALGORITMA, DESAIN-TEKNIS) menyebut mode `kejadian`, opsi `--pra-sebelum-acuan`, `genangan_lahan.py`, `genangan_kaji.py`, `zona_dari_sel`, model `banjir_gfm`, rute berkas kaji, dan `public/inti/geser.*` sebagai berkas yang akan ada. Hanya GS-02 yang ada di kode; sisanya belum dikodekan. Docstring dan konstanta atribusi `genangan_nasional.py` memuat nama produk lama; teks yang tayang di layar harus memakai nama Centurisk97 (catatan agen `banjir` 10 November 2026 untuk `charter.json` serupa).
- Dokumen Siklus lama menulis "GFM hanya DKI"; kode `genangan_nasional.py` sudah membaca GFM se-Indonesia (catatan di KEPUTUSAN-GENANGAN).
- KEPUTUSAN-PENURUNAN Q1 masih bernilai bawaan "tidak diizinkan" sedangkan RISET 6.7 mencatat izin diberikan pemilik di percakapan 24 November 2026 dan LiCSBAS sudah dijalankan dua putaran. KEPUTUSAN belum diperbarui.
- Dokumen paket `ews` menyebut `public/inti/pantau_alat.*`, `src/alat.js`, dan jenis `geofon` sebagai berkas rencana; semuanya belum ada. `GET /api/sensor/status` lama tetap memakai batas basi 1 jam dan tidak diubah.
- `RISET-PARAMETER.md` menyebut `param_banjir.json` di `public/data/`; berkas sebenarnya di `public/banjir/data/` dan ditulis tangan. Docstring `status.py` dan `bahaya.py` menyebut jalur `scripts/data/`; jalur sebenarnya `scripts/banjir/`.

Pertanyaan pemilik yang belum diputuskan (bawaan sementara):

| Paket | Pertanyaan | Bawaan sementara |
| --- | --- | --- |
| genangan-satelit | Q1 Tampil publik di `/banjir` juga atau staf saja | Belum diputuskan (bawaan sementara: staf saja di `/siklus/kaji/:id`). |
| genangan-satelit | Q2 Kejadian mana yang dihitung | Belum diputuskan (bawaan sementara: kejadian banjir Buku Besar berfase tanggap atau dibuka staf manual). |
| genangan-satelit | Q3 Penduduk di area genangan tampil sebelum uji balik lulus | Belum diputuskan (bawaan sementara: tampil dengan pil hipotesis). |
| genangan-satelit | Q4 Ambang cakupan sah | Belum diputuskan (bawaan sementara, HIPOTESIS: cakupan 10 persen atau lebih dan `sinyal_lemah` salah); dibekukan di kriteria GS-02. |
| genangan-satelit | Q5 Kebenaran uji balik | Belum diputuskan (bawaan sementara: DIBI terdampak per kabupaten-hari, hanya peringkat Spearman). |
| genangan-satelit | Q6 Kedalaman FwDET untuk kurva kerusakan | Belum diputuskan (bawaan sementara: tidak; "kedalaman belum tersedia"). |
| genangan-satelit | Q7 Anggaran jaringan dan R2 | Belum diputuskan (bawaan sementara, HIPOTESIS: 400 MB, 300 MB, 120 KB per citra, 5 MB per kejadian). |
| genangan-satelit | Q8 Sumber optik | Belum diputuskan (bawaan sementara: Earth Search Element84, adegan terbersih 0 sampai 15 hari). |
| genangan-satelit | Q9 Jadwal | Belum diputuskan (bawaan sementara: langkah di `siklus.yml` sesudah lintasan GFM, sekali per lintasan baru per kejadian). |
| genangan-satelit | Q10 Menyatukan ambang bangunan terendam paket `kerusakan-satelit` dengan GFM | Belum diputuskan (bawaan sementara: dua jalur tetap terpisah). |
| penurunan-tanah | Q1 Izin menjalankan skrip LiCSBAS dan pengunduh di luar repo | Dokumen: belum diputuskan (bawaan sementara: tidak diizinkan); catatan riset: diizinkan 24 November 2026. KEPUTUSAN perlu diperbarui. |
| penurunan-tanah | Q2 Akun NASA Earthdata dan ASF HyP3 | Belum diputuskan (bawaan sementara: tidak). |
| penurunan-tanah | Q3 Kota yang diproses | Belum diputuskan (bawaan sementara: Jakarta, Semarang dan Demak, Pekalongan, Surabaya; Medan dan Cirebon literatur; cekungan Bandung usulan 23 November 2026). |
| penurunan-tanah | Q4 Satuan tampil | Belum diputuskan (bawaan sementara: kecamatan dulu). |
| penurunan-tanah | Q5 Horizon dan skenario | Belum diputuskan (bawaan sementara: 10 dan 20 tahun, laju tetap). |
| penurunan-tanah | Q6 Unduh DeltaDTM (17,3 GB) | Belum diputuskan (bawaan sementara: ya, tiket tersendiri). |
| penurunan-tanah | Q7 Tayang di mana | Belum diputuskan (bawaan sementara: lapis dan kartu di peta banjir publik berlabel hipotesis, tanpa angka kelurahan). |
| penurunan-tanah | Q8 sampai Q12 (jadwal tahunan manual, tanpa GACOS, angka gabungan rob hanya sesudah uji balik, data GNSS dari literatur, tidak tayang bila validasi gagal) | Belum diputuskan (bawaan sementara: sesuai yang disebut dalam kurung). Catatan: putaran 2 memakai GACOS, berbeda dari bawaan Q9. |
| ews | Q1 Mengambil data dan CCTV dari dasbor vendor dan MHEWS BNPB | Belum diputuskan (bawaan sementara: tidak diambil; minta akses resmi). |
| ews | Q2 Panel publik atau staf saja | Belum diputuskan (bawaan sementara: pos SIHKA dan level PVMBG publik; sensor sendiri dan sumber berizin untuk tiga peran staf). |
| ews | Q3 Jenis sensor gunung api | Belum diputuskan (bawaan sementara: tambah `geofon`). |
| ews | Q4 sampai Q8 (batas basi, langkah cepat, ringkasan geofon, status resmi SIHKA tidak dipetakan, interval kirim) | Belum diputuskan (bawaan sementara: tma dan hujan 30 menit, geofon 10 menit; langkah cepat dari tangga tindakan; ringkasan per menit; tidak dipetakan; 5 menit dan 1 menit). |

Pertanyaan teknis terbuka lain: jumlah piksel efektif untuk galat InSAR (variogram atau bootstrap blok); kapan angka gabungan rob dan penurunan tanah boleh ada (Q10 paket penurunan-tanah); apakah ambang hujan dan jendela status perlu diverifikasi dengan kebenaran independen (stasiun atau GSMaP) selain DIBI dan ERA5; dan peninjauan ulang kerentanan sesudah J4 divonis.
