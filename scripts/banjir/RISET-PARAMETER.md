# Riset parameter Posko Banjir Indonesia

Tanggal: 13 Oktober 2026. Data mesin: `public/data/param_banjir.json`. Formatnya sama dengan
`poskokarhutla`: `param` = `[tengah, rendah, tinggi, satuan, sumber, catatan]`, `harga` = `[Rp, sumber, estimasi]`.
Kata **lemah** di catatan berarti angkanya tidak boleh tampil tanpa rentang dan tanda asumsi.

## 1. Yang bersumber kuat (regulasi, dibaca dari naskah aslinya)

| Hal | Angka | Sumber |
| --- | --- | --- |
| Hunian pengungsi | 3 m²/orang | Perka BNPB 7/2008, Lampiran bag. A |
| Pangan | beras 400 g/orang/hari, setara 2.100 kkal, dapur umum 2 kali makan | Perka 7/2008 bag. B |
| Air | bersih 7 L (3 hari pertama), lalu 15 L/orang/hari; minum 2,5 L | Perka 7/2008 bag. E |
| Sanitasi | 1 jamban per 20 orang; tempat sampah 100 L per 10 KK; tempat cuci per 100 orang | Perka 7/2008 bag. E.3 |
| Struktur komando | Komandan, Wakil, Staf Komando (Sekretariat, Humas, K3, Perwakilan instansi), Staf Umum (Operasi, Perencanaan, Logistik & Peralatan, Administrasi Keuangan) | Perka BNPB 10/2008 Bab III |
| Jenis posko | Pos Komando (pengendali), Pos Lapangan (pelaksana), Pos Pendukung, Pos Pendampingan | Perka BNPB 3/2016, menggantikan 10/2008 & 14/2010 |
| Fasilitas dasar komando | perahu karet bermesin & perahu evakuasi (banjir), tenda peleton/regu, velbed, genset, dapur umum, tangki air, sanitasi, alat berat (longsor), HT VHF/UHF, SSB, telepon satelit, internet | Perka 10/2008 Lampiran-12 |
| Jumlah alat minimal per provinsi | tabel lengkap 33 provinsi, mis. median perahu karet 20, bermesin 9, pelampung 50, pompa 7, velbed 100, toilet mobile 5, WTP mobile 2 | Perka BNPB 17/2009 Bab III.B |
| Dana stimulan rumah | rusak ringan Rp15 jt, rusak sedang Rp30 jt, rusak berat huntap Rp60 jt, huntara Rp30 jt | Satgas PRR Sumatra 2025–26 (skema lama 2018–21: 10/25/50 jt) |
| Jaminan hidup | Rp10.000/orang/hari selama 3 bulan; lauk-pauk Rp15.000/orang/hari | Kemensos, banjir Sumatra 2025 |
| Kategori hujan harian BMKG | lebat 50–100, sangat lebat 100–150, ekstrem >150 mm/hari | BMKG |

Catatan Perka 17/2009: hanya ada tingkat nasional dan provinsi, **tidak ada tingkat kabupaten**.
Jumlah per provinsi tampak sama dengan jumlah kabupaten/kota (Jateng 33 perahu bermesin, 33 mobil
rescue). Karena itu angka kabupaten di JSON (2 perahu bermesin, 4 perahu dayung) adalah **turunan**,
bukan bunyi regulasi. Status Perka 17/2009 per 2026 belum dicek; regulasi ini sudah tua (data 2002–2007).

## 2. Yang lemah dan harus tampil sebagai asumsi

1. **Efek peringatan dini pada kematian banjir di Indonesia.** Belum ada studi kausal. Yang ada:
   Bangladesh (siklon, multi-intervensi), simulasi banjir Ahr (hingga 80%), dan asosiasi lintas negara
   (EW4All: kematian 6× lebih rendah). Dipakai **0,3 (0,1–0,8)**. Untuk bandang/longsor pakai rendah,
   karena lead time-nya cuma menit sampai 1–3 jam.
2. **Efek peringatan dini pada kerugian aset.** Angka "24 jam → 30%" (GCA 2019) berlaku untuk badai dan
   gelombang panas, bukan banjir Indonesia. Studi Parker dkk. menemukan manfaat riil lebih kecil.
   Dipakai **0,10 (0–0,35)**, dan hanya untuk isi rumah/kendaraan, bukan struktur.
3. **Lama mengungsi.** Data BNPB hanya memberi jumlah pengungsi. Dipakai 7 hari (3–30), murni asumsi.
4. **Pecahan rumah rusak berat/sedang/ringan.** `kejadian.json` hanya punya total `rumah_rusak`.
   Sementara diasumsikan 20/30/50%. Sebaiknya ditarik dari kolom DIBI sebelum dipakai.
5. **Efek tanggul/pompa rob.** Satu-satunya angka: genangan Kota Pekalongan turun 43% (2020→2022),
   tetapi itu gabungan tanggul, pompa, dan drainase. NCICD Tahap A melaporkan sekitar 100 ha per km tanggul. BCR
   NCICD (Ecorys) tidak ditemukan dalam bentuk publik. **Jangan hitung manfaat tanggul di dasbor**;
   tampilkan sebagai konteks saja.
6. **Harga alat.** 30 dari 51 item masih `estimasi` (flag 1), termasuk pompa mobile 250 L/detik,
   tenda pleton, toilet portabel, sirene EWS. Harga yang ada sumbernya kebanyakan dari marketplace
   (Tokopedia/Indotrading), bukan e-katalog LKPP (tidak bisa diakses tanpa login).
7. **Ambang rob.** Tidak ada ambang nasional. Peringatan BMKG berbasis fase bulan + perigee,
   dengan tinggi pasang per stasiun (Jatim 120–150 cm di atas MSL). Ambang Pasar Ikan (Siaga 2 ≈ 202–207 cm)
   hanya dari berita dan tampak berubah antar tahun.
8. **Ambang longsor.** ILEWS Balai Sabo Jawa 30 mm/1 hari dan 64 mm/3 hari dikutip dari tabel suplemen
   preprint (Faqi dkk.), belum dicek di naskah Yuniawan dkk. 2022, yang diblokir bot.
   Ambang lokal (Banjarnegara, Grindulu, Wonosobo, Magelang) tidak boleh dipakai di luar DAS-nya.
9. **Biaya pengungsi per hari Rp35.000 (25–60 rb)** adalah turunan (beras + lauk Kemensos + air + dapur),
   bukan indeks resmi.
10. **Nilai nyawa statistik** Rp13,9 M (6–15,7 M) adalah pilihan kebijakan. Viscusi & Masterman 2017 memberi
    Indonesia US$0,592 jt (2015), lalu diskalakan dengan GNI. Tampilkan terpisah dari kerugian aset,
    seperti `rugi_kesehatan_ha` di karhutla.

## 3. Rekomendasi pilihan parameter

- **Kerugian rumah = jumlah rumah rusak × campuran stimulan** (15/30/60 jt). Ini angka belanja
  pemerintah, bukan nilai ekonomi rumah. Labelnya harus "biaya pemulihan rumah (stimulan)", bukan
  "kerugian". Ini lebih jujur daripada mengarang nilai rumah per provinsi.
- **Biaya pengungsi = pengungsi × hari × (Rp35.000 + jadup Rp10.000)**. Jadup hanya untuk yang rumahnya
  rusak, jadi pisahkan bila datanya ada.
- **Manfaat posko/EWS** dihitung dari tiga baris terpisah: kematian dihindari × VSL (lemah), aset
  dihindari (lemah), dan hari-pengungsi dihindari (default 0). Gunakan BCR Hallegatte 4–36 sebagai
  uji kewajaran. Kalau hasil model jauh di luar rentang itu, cek asumsinya.
- **Sarana per tingkat:** provinsi pakai median Perka 17/2009 (kuat), lapangan pakai Perka 7/2008 per
  100 pengungsi (kuat) + kit evakuasi rekomendasi (R), kabupaten pakai turunan (lemah).
- **Uang harian:** `uh_sbm2026` hanya memuat 25 provinsi dari berita (PMK 32/2025). Lampiran resmi
  gagal diunduh (jdih.kemenkeu timeout). Unduh ulang dan lengkapi sebelum rilis.
- **Ambang di peta:** pakai kategori BMKG harian (lebat ≥50, sangat lebat ≥100, ekstrem ≥150 mm) dan
  IBF waspada/siaga/awas. Untuk longsor, pakai 64 mm/3 hari (Jawa) dan 91 mm/3 hari (Sumatra) **hanya
  di zona kerentanan menengah–tinggi PVMBG**, dengan label "ambang operasional ILEWS, perlu verifikasi".

## 4. Sumber utama

- Perka BNPB 7/2008: https://www.gitews.de/tsunami-kit/id/E6/sumber_lainnya/produk_hukum_nasional/peraturan_kepala_BNPB/Perka%20BNPB%207-2008_Tata%20Cara%20Pemberian%20Bantuan%20Pemenuhan%20Kebutuhan%20Dasar.pdf
- Perka BNPB 10/2008: https://www.gitews.org/tsunami-kit/id/E6/sumber_lainnya/produk_hukum_nasional/peraturan_kepala_BNPB/Perka%20BNPB%2010-2008_Pedoman%20Komando%20Tanggap%20Darurat%20Bencana.pdf
- Perka BNPB 17/2009: https://bpbd.bangka.go.id/sites/default/files/dokumen/produk_hukum/PERKA%20NO%2017%20THN%202009%20PEDOMAN%20STANDARISASI%20PENANGGULANGAN%20BENCANA.pdf
- Perka BNPB 3/2016: https://peraturan.go.id/files/bn1777-2016.pdf
- Stimulan Sumatra: https://www.metrotvnews.com/read/KZmCQ05d-penyintas-bencana-sumatra-terima-dana-perbaikan-rumah
- Jadup/lauk-pauk: https://tirto.id/korban-bencana-sumatra-dapat-bantuan-lauk-pauk-selama-3-bulan-hoBb
- Viscusi & Masterman 2017: https://doi.org/10.1017/bca.2017.12
- Hallegatte 2012 (WPS6058): https://documents1.worldbank.org/curated/en/190261468181486694/text/WPS6058.txt
- Pappenberger dkk. 2015 (EFAS): https://centaur.reading.ac.uk/40264/
- Haque dkk. 2012: https://scielosp.org/article/bwho/2012.v90n2/150-156
- Ahr ABM 2025: https://nhess.copernicus.org/articles/25/1501/2025/
- Yuniawan dkk. 2022: https://doi.org/10.3390/geosciences12030129 ; Faqi dkk. (preprint): https://www.researchsquare.com/article/rs-9938553
- Pekalongan genangan: https://jurnal.pekalongankota.go.id/index.php/litbang/article/download/292/182
- NCICD Tahap A: https://www.iahr.org/library/info?pid=38127
