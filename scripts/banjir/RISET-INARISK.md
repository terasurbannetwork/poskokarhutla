# Uji peta bahaya banjir InaRISK lawan kejadian, dan rancangan peta bahaya yang bisa dijelaskan

Tanggal: 31 Oktober 2026. Skrip: `scripts/banjir/bahaya.py kelas` (sebaran kelas) dan `scripts/banjir/uji_inarisk.py`
(uji). Keluaran: `public/banjir/data/bahaya_kelas.json`, `public/banjir/data/uji_inarisk.json`. Pemicu: usulan riset FIT
Telkom University "Penguatan InaRISK melalui Explainable GIS" (Hakim & Mandasari, ICoICT 2026, DOI 10.1109/ICoICT71118.2026.11664790).

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

## 3. Kaitannya dengan usulan Telkom

Usulan itu menguji satu kejadian (Desember 2025) secara kualitatif. Ukurannya, GVF 0,957 dan Spearman > 0,94, menilai
kerapian kelas dan kestabilan bobot, bukan ketepatan. Uji di atas adalah H1 mereka pada skala nasional, dan hasilnya
menunjukkan tantangan sebenarnya: pembanding penduduk sangat kuat. Peta usulan baru perlu mengalahkan penduduk, bukan
hanya mengalahkan InaRISK.

Yang layak diminta dari mitra: DEMNAS 8 m, RBI 1:25.000, batas kelurahan, dan uji pemahaman petugas.
Yang kita tawarkan: label 26.800 kejadian (`label_banjir.py`) dan protokol uji ini.

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
