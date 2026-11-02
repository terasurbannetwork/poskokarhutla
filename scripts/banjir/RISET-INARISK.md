# Uji peta bahaya banjir InaRISK lawan kejadian, dan rancangan peta bahaya yang bisa dijelaskan

Tanggal: 31 Oktober 2026. Skrip: `scripts/banjir/bahaya.py kelas` (sebaran kelas) dan `scripts/banjir/uji_inarisk.py`
(uji). Keluaran: `public/banjir/data/bahaya_kelas.json`, `public/banjir/data/uji_inarisk.json`.

## 1. Sebaran kelas per kecamatan

Sebelumnya `bahaya.json` menyimpan satu angka per kecamatan: nilai tertinggi dari 10 titik cuplik. Kecamatan luas
jadi tampak sangat rawan hanya karena satu titik jatuh di zona tinggi. Sekarang tiap kecamatan dikirim utuh ke
`computeHistograms` InaRISK, sehingga semua piksel 100 m di dalamnya terhitung. Hasilnya persen luas per kelas
(rendah < 0,333 <= sedang < 0,666 <= tinggi), dan sisanya di luar zona.

- 7.270 kecamatan x 3 lapisan (banjir, bandang, longsor) = 21.810 histogram, sekitar 5 menit, tanpa gagal.
- Banjir: 6.511 kecamatan punya zona; 1.323 kecamatan dengan >= 25% luas di kelas tinggi.
- Contoh: Dayeuhkolot (Bandung) 21% tinggi, 61% sedang, 5% rendah; Martapura (Banjar) sekitar 64% luas di zona.
- Arah putaran cincin poligon tidak berpengaruh (diuji searah dan berlawanan jarum jam, hasil identik).
- `bahaya.json` tidak diubah, karena `status.py` memakai nilai tertingginya dan ambangnya sudah diuji balik dengan nilai itu.

## 2. Uji InaRISK lawan kejadian (pra-registrasi)

Vonis ditulis sebelum data dibuka (commit `0610d77d`, amandemen sebelum data dibuka `70c89b8e`). Unit kabupaten,
karena DIBI dicatat per kabupaten.

| Ukuran | Nilai (selang 95%) |
| --- | --- |
| Kabupaten, kejadian banjir + bandang DIBI 2008-2025 | 515 kabupaten, 18.475 kejadian |
| rho(zona sedang + tinggi, jumlah kejadian) | 0,245 (0,161 sampai 0,327) |
| rho(penduduk, jumlah kejadian), pembanding | 0,590 (0,525 sampai 0,648) |
| rho(zona, kejadian sesudah penduduk diperhitungkan) | 0,042 (−0,048 sampai 0,129) |
| idem, cara lama (nilai tertinggi 10 titik) | 0,066 (−0,026 sampai 0,155) |
| idem, hanya kelas tinggi (tidak menentukan vonis) | 0,077 (−0,011 sampai 0,162) |
| 2008-2016 / 2017-2025 | 0,008 (−0,083 sampai 0,095) / 0,077 (−0,012 sampai 0,166) |
| Presisi = recall = F1 kuartil atas (acak 0,25) | 0,217 |

Vonis: **V1 lolos**, V2, V3, dan V4 gagal.

Artinya: kabupaten yang zona banjirnya lebih luas memang lebih sering mencatat banjir, tetapi hampir seluruh
keterkaitan itu sudah dijelaskan oleh jumlah penduduk. Di antara kabupaten yang sama padatnya, luas zona InaRISK
tidak terbukti membedakan mana yang lebih sering banjir. Cara baru (sebaran kelas) juga tidak lebih baik dari cara
lama di uji ini.

Yang TIDAK boleh disimpulkan:
- "InaRISK salah." DIBI hanya mencatat kejadian yang dilaporkan dan berdampak, per kabupaten. Banjir di kabupaten
  sepi bisa tidak tercatat, sehingga penduduk menjelaskan pelaporan, bukan hanya bahaya.
- Ketepatan batas zona di lapangan. Untuk itu perlu label poligon atau titik (Groundsource, PetaBencana, citra radar
  Copernicus GFM) per kecamatan atau kelurahan.

## 3. Akibatnya bagi peta bahaya baru

Mengukur kerapian kelas (misalnya GVF Jenks) atau kestabilan bobot (Spearman antar-bobot) tidak sama dengan menguji
ketepatan. Peta bahaya baru, dari pihak mana pun, harus diuji lawan kejadian yang tidak dipakai menyetelnya, dan harus
mengalahkan pembanding penduduk, bukan hanya mengalahkan InaRISK.

## 4. Rancangan peta bahaya banjir yang bisa dijelaskan (urutan kerja)

1. **Selesai (31 Okt)**: sebaran kelas InaRISK per kecamatan dan tampil di pop-up wilayah; uji lawan DIBI dengan
   vonis tertulis di layar.
2. **Label tingkat kecamatan**: Groundsource (poligon 2016 sampai Jan 2026, `label_banjir.py`) dipetakan ke
   kecamatan; ditambah PetaBencana dan genangan radar GFM. Lalu ulangi uji ini per kecamatan dengan blok wilayah
   dan waktu terpisah. Ukuran: AUC, presisi, recall, F1 dengan selang; IoU bila labelnya poligon.
3. **Faktor per kecamatan** (bukan per kabupaten seperti `fitur_banjir.py`): HAND < 2 m, lereng, elevasi, tutupan
   WorldCover, jarak sungai, hujan ekstrem P95, kejadian 10 tahun. Ditampilkan sebagai kartu "Kenapa rawan" dengan
   persentil nasional tiap faktor dan sumbernya.
4. **Model bahaya terkalibrasi**: bobot dipelajari dari label (regresi logistik monoton atau GBDT dangkal resep
   karhutla), BUKAN bobot pakar AHP. Pembanding wajib: InaRISK, penduduk, dan riwayat kabupaten. Lolos hanya bila
   batas bawah selang selisihnya > 0 di wilayah dan periode yang ditahan.
5. **Penjelasan dari model**: kontribusi tiap faktor per kecamatan (selisih dari rata-rata nasional x bobot),
   ditampilkan dengan pita ketidakpastian, dan "data kosong" ditandai, bukan diisi nol.
6. **Uji pemahaman petugas**: tugas sepadan "peta saja" lawan "peta + penjelasan" (ketepatan, waktu, mengenali
   keterbatasan), dijalankan di /uji-pilot.

## 5. Hasil model bahaya kecamatan (dijalankan 1 Nov 2026)

Satu kali jalan `model_bahaya.py` sesuai pra-registrasi (commit 628f2454 dan amandemen 194e80da, c6eb2715, 7fea98eb,
d64eb0c1), tanpa mengubah fitur, label, ambang, atau lambda sesudah melihat hasil. Elevasi `faktor_kec.json` terisi
7.268 dari 7.270 kecamatan (99,97%); tidak ada fitur yang dibuang karena null. Label uji: kuartil atas jumlah kejadian
Groundsource 2022-2025 (ambang 18 kejadian, laju dasar 26%); label latih: kuartil atas 2016-2021 (ambang 12).
Selang 95% bootstrap 1.000 ulangan atas provinsi, format titik [bawah, atas].

**Vonis: gagal. Label "Hipotesis, belum lolos uji".** `model_bahaya.json` tidak di-commit dan tidak tampil.

| Skor | AUC | Selang 95% |
| --- | --- | --- |
| Model (logistik L2, 9 fitur) | 0,728 | 0,680 sampai 0,784 |
| InaRISK % zona sedang+tinggi | 0,688 | 0,636 sampai 0,739 |
| Kepadatan penduduk (log) | 0,678 | 0,618 sampai 0,741 |
| Riwayat kejadian 2016-2021 (tanpa vonis) | 0,909 | 0,893 sampai 0,926 |

| Selisih | Titik | Selang 95% | Vonis |
| --- | --- | --- | --- |
| Model lawan InaRISK (L1) | +0,040 | -0,003 sampai +0,091 | tidak lolos (batas bawah < 0) |
| Model lawan kepadatan (L2) | +0,051 | -0,024 sampai +0,121 | tidak lolos (batas bawah < 0) |
| Terkalibrasi (L1 dan L2) | | | tidak lolos |

Presisi pada 25% skor teratas (tanpa vonis): model 51,6%, kepadatan 47,0%, InaRISK 44,5% (recall 49,7%, 45,3%,
42,9%).

### Per pulau (AUC, tanpa selang, tanpa vonis)

| Pulau | Kecamatan | Model | InaRISK | Kepadatan |
| --- | --- | --- | --- | --- |
| Sumatra | 1.963 | 0,708 | 0,600 | 0,592 |
| Jawa | 2.148 | 0,676 | 0,686 | 0,695 |
| Bali dan Nusa Tenggara | 489 | 0,725 | 0,703 | 0,729 |
| Kalimantan | 628 | 0,631 | 0,579 | 0,630 |
| Sulawesi | 1.024 | 0,730 | 0,662 | 0,670 |
| Maluku | 237 | 0,825 | 0,426 | 0,787 |
| Papua | 781 | 0,960 | 0,747 | 0,967 |

Di Jawa, tempat sebagian besar label berada, model kalah dari kepadatan dan InaRISK. Keunggulan muncul di Sumatra
dan Sulawesi. AUC Papua tinggi pada ketiga skor karena label hampir hanya di kecamatan kota.

### Kepekaan label tunggal (poligon kecil di satu kecamatan, tanpa vonis)

AUC model 0,737 (0,700 sampai 0,781), InaRISK 0,674 (0,627 sampai 0,715), kepadatan 0,687 (0,643 sampai 0,733),
riwayat 0,884 (0,865 sampai 0,905). Selisih model lawan InaRISK +0,063 (+0,029 sampai +0,105), lawan kepadatan +0,050
(+0,006 sampai +0,094). Dengan label ini kedua syarat lolos, tetapi pra-registrasi menetapkan label ini sebagai uji
kepekaan tanpa vonis, jadi vonis tetap gagal. Ini petunjuk bahwa label n_th yang dihitung di titik berat poligon lebar
mengaburkan sinyal faktor; perbaikan label harus dipra-registrasi ulang sebelum diuji lagi.

### Bobot fitur (model tampilan, dilatih pada semua kecamatan dengan label 2016-2021, fitur terstandar)

| Fitur | Bobot |
| --- | --- |
| Kepadatan (log) | +1,033 |
| Riwayat DIBI kabupaten 2008-2021 | +0,556 |
| Elevasi tengah (log) | -0,385 |
| InaRISK zona sedang+tinggi | +0,308 |
| Jarak titik sungai (log) | -0,282 |
| Beda tinggi | +0,195 |
| Dataran rendah lokal | -0,188 |
| InaRISK zona tinggi | +0,095 |
| Pesisir | +0,017 |

Bobot terbesar kepadatan, sesuai label berita yang condong ke kota. Bobot negatif "dataran rendah lokal" berlawanan
dengan dugaan fisik dan kemungkinan kolinear dengan elevasi; bobot menjelaskan model, bukan sebab di lapangan.

### Akibatnya

- Skor model tidak ditampilkan sebagai ramalan. Faktor per kecamatan tetap boleh tampil di kartu "Kenapa rawan
  banjir" sebagai deskripsi (persentil nasional dan sumber), tanpa skor model.
- Riwayat kejadian kecamatan 2016-2021 (AUC 0,909) jauh lebih tepat dari semua skor faktor. Pembanding yang jujur
  untuk model berikutnya adalah persistensi, bukan hanya InaRISK dan kepadatan.
