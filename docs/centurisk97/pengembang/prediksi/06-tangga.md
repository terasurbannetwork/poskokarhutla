# Metode Tangga

Halaman ini menjelaskan metode Tangga peringatan yang dihitung oleh tangga.py.

## Metode Tangga (`tangga.py`)

Tangga menyusun pernyataan menurut skala `musim, bulan, dasarian, h10 (10 hari), sepekan, h3 (3 hari), jam` dan ancaman `k` (kering) dan `b` (basah). Tiap pernyataan (`item`) membawa jenis, peringkat `tk` (0 sampai 3 atau kosong), label resmi apa adanya, kalimat, id sumber, dan cakupan (`nas`, `prov`, `kab`, `kec`). Pernyataan nasional dan provinsi disimpan sekali dan digabung di layar, bukan disalin ke 514 kab.

**Sumber dan peringkat `tk`** (ringkas dari `data/kajian-bnpb/tangga/ALGORITMA.md` bagian 3, diperiksa terhadap kode):

| Skala | Sumber | Cakupan | Peringkat `tk` |
| --- | --- | --- | --- |
| Musim | Prediksi musim BMKG (arsip `iklim_bmkg_arsip.json`, berlaku sampai 240 hari) | nasional (pemetaan ZOM ke kab belum ada) | kosong |
| Bulan, dasarian | Prediksi curah hujan dan sifat hujan BMKG per kab | kab | kosong (selisih dari normal bukan peringatan) |
| Bulan | SPI 1 dan 3 bulan BMKG dari PDF, kategori Agak Kering, Kering, Sangat Kering | kab | kosong |
| Dasarian | Peringatan dini kekeringan meteorologis BMKG (kecamatan, diringkas ke kab dengan tingkat tertinggi) | kec ke kab | Waspada 1, Siaga 2, Awas 3; kosong bila masa berlaku berakhir hari ini |
| 10 hari | Prakiraan kondisi harian BMKG per kab | kab | basah: Hujan Sangat Lebat atau Ekstrem 3, Hujan Lebat 2, lain kosong (pemilik 19 November 2026); kering: kosong |
| Sepekan | Prakiraan sepekan BMKG | provinsi | Awas 3, Siaga 2, hujan sedang kosong |
| Sepekan | Factsheet karhutla BMKG | provinsi | perhatian khusus karhutla 2; FWI tertinggi per pulau dan provinsi berasap kosong |
| 3 hari | Ensemble 3 hari BMKG (peluang ensemble lebih dari 60% untuk hujan lebat) | provinsi | 2 |
| 3 hari | Prediksi kita BNJ, LSR (level terbesar 3 hari), API (aturan karhutla terpenuhi 1, belum 0), ASP (kategori ISPU terbesar) | kab | 0 sampai 3 (jenis "kita", tidak ikut sinyal) |
| Sepekan | Prediksi kita: hari tanpa hujan berturut sampai H+3 (HTH; hari tanpa hujan bila curah < 1 mm) dengan kelas sangat pendek (sampai 5 hari), pendek (10), menengah (20), panjang (30), sangat panjang (60), kekeringan ekstrem | kab | kosong, berlabel belum teruji |
| Bulan | Prediksi kita: peluang kekeringan bulan depan (hipotesis, `peluang_bayangan.json`; dilewati bila bulan sasaran sudah lewat atau berkas lebih dari 45 hari) | kab | kosong |
| Bulan | Prediksi kita: bulan rawan (`musim_rawan.json`, pengingat sebulan sebelum bulan puncak; berlabel "pola berulang" bila jenisnya lulus uji, selain itu "hipotesis") | kab | kosong |
| Jam | Nowcast BMKG (peringatan dini aktif, severity Minor 1, Moderate 2, Severe atau Extreme 3) | provinsi | 1 sampai 3 |
| Jam | Petir BMKG (sambaran 30 menit terakhir) dan awan dingin Himawari-9 (analisis kita) | kab | kosong, bukan peringatan |

Pernyataan yang tidak punya tingkat tetap tampil, tetapi tidak ikut sinyal. "Tidak disebut" tidak pernah menjadi nol.

**Pemilihan periode.** Hari acuan = tanggal WIB saat skrip jalan. Untuk bulan dan dasarian dipilih pernyataan yang periodenya belum berakhir, urut menurut awal periode, dua yang pertama; peringkat skala memakai periode pertama. Dasarian I = tanggal 1 sampai 10, II = 11 sampai 20, III = 21 sampai akhir bulan. Bila satu kab muncul di dua kategori pada produk dan periode yang sama, keduanya dibuang: pernyataan tampil "Entri ganda bertentangan" tanpa peringkat dan dihitung di `ringkas.tak_cocok.iklim_ganda`.

**Peringkat per skala dan ancaman.** Untuk tiap skala dan ancaman, peringkat = nilai `tk` tertinggi di antara pernyataan BMKG (jenis "resmi") di kab itu, provinsinya, dan nasional; seri dimenangkan cakupan lebih halus (nasional kurang halus dari provinsi, provinsi kurang halus dari kab). Prediksi kita tidak masuk peringkat resmi.

![Tujuh skala tangga dan tiga tanda sinyal (searah, menguat, belum selaras). Sinyal belum diuji balik.](gambar/prediksi-sinyal-tangga.svg)

**Sinyal lintas skala** (`sinyal()`, `tangga.py:550`). Misalkan `v` = daftar peringkat resmi tanpa nilai kosong, urut dari skala terjauh ke terdekat.

```
searah (d)           : len(v) >= 2, v tidak menurun, v[-1] >= 1, dan sedikitnya dua skala bernilai >= 1
menguat (m)          : searah, NAIK TEGAS (v[-1] > v[0]), dan semua skala yang dihitung bercakupan sama
searah tanpa menguat : cakupan beda atau datar, dihitung terpisah sebagai "searah"
belum selaras (s)    : ada dua skala BERCAKUPAN SAMA (kecamatan dihitung kab) dengan selisih peringkat >= 2
```

Dua tanda bebas, boleh menyala bersamaan. Skala bercakupan beda tidak dibandingkan: pernyataan provinsi tidak "bertentangan" dengan pernyataan kab. Sinyal tidak memberi persen dan tidak memakai kata "peluang".

**Batas basi** (`BASI_JAM`, `tangga.py:24`): jam (nowcast, petir, awan) 4 jam; harian (10 hari, sepekan, factsheet, prediksi kita, peringatan kekeringan) 48 jam selama periodenya belum lewat; iklim bulan dan dasarian 14 hari; SPI 45 hari sejak tanggal update PDF; musim 240 hari; peluang kekeringan bulan 45 hari; bulan rawan 400 hari. Sumber yang melewati batas dilewati dan dicatat di `gagal`.

**Gagal-lunak dan sumber jam segar.** Setiap pembaca sumber dibungkus; pengecualian, berkas hilang, bentuk berubah, atau basi menambah satu baris `gagal` tanpa menjatuhkan tangga lain. Bila hasil akhir tanpa satu pernyataan dan `tangga.json` lama ada, yang lama dipertahankan. Proses selalu keluar dengan kode 0. Salinan git untuk nowcast, petir, dan awan Himawari sering basi; bila variabel lingkungan `LIVE` ada, `tangga.py` mengunduh salinan segar dari situs live dengan batas waktu 20 detik.

**Arsip.** Satu baris per tanggal ke `public/prediksi/data/tangga_arsip/YYYY-MM.jsonl`: `{t, dibuat, skala, kab: {id: [[peringkat kering x7], [peringkat basah x7]]}}`, hanya bila ada sedikitnya satu peringkat bukan kosong; baris yang ada tidak diubah.

**Uji balik sinyal (rencana, belum boleh diklaim).** Mengukur tingkat kejadian DIBI dalam 7 hari sesudah hari bersinyal dibanding baseline klimatologi dan persistensi, dengan selang blok per hari; syarat klaim: sedikitnya 90 hari arsip dan 30 hari bersinyal per ancaman; di bawah itu layar menulis "belum teruji". Status uji balik: belum diuji.
