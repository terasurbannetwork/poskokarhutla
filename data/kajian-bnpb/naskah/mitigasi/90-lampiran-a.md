---
kajian: mitigasi
lampiran: A
judul: IRBI 2025 dan Daftar Perhatian per Kab/Kota
status: final
---

# IRBI 2025 dan Daftar Perhatian per Kab/Kota {#lamp:kab}

Ketiga tabel lampiran ini memuat seluruh {{angka:irbi.kab.dinilai.2025}} kab/kota dari katalog wilayah IRBI 2025, dikelompokkan per provinsi menurut urutan kode wilayah. Nilai dan status IRBI berasal dari InaRISK [@bnpb-irbi], sedangkan syarat kejadian dan korban berasal dari DIBI [@bnpb-dibi]. Nilai per bahaya berupa bilangan bulat dengan banyak nilai kembar, sehingga tabel tidak dipakai untuk memeringkat kab/kota, dan skala 2025 tidak dibandingkan dengan seri 2015–2024 (@sub:irbi). Sel "–" berarti bahaya itu tidak dinilai di kab/kota tersebut, bukan nol. Kejadian per kab/kota memakai cakupan semua laporan DIBI.

**Pernyataan produsen.** Tabel disusun platform Pantau Bencana dari data produsen tersebut, bukan oleh unit kerja BNPB, sehingga bukan Data Bencana menurut Perban BNPB 1/2023 [@bnpb-2023-satudata]. Kolom daftar perhatian adalah hasil aturan syarat @sub:daftar-perhatian yang berlabel Asumsi kebijakan. Huruf dalam kurung menyebut syarat yang dipenuhi: untuk hidrometeorologi, (a) IRBI 2025 di kelas nilai teratas, (b) kejadian tercatat paling sedikit tiga dari sebelas tahun 2015–2025, dan (c) korban atau pengungsi DIBI di kuartil atas. Untuk geologi, (a) sama, (b) paparan di kuartil atas, dan (c) kejadian berkorban sejak 2008. Kelas per bahaya tidak ada di sumber mana pun, sehingga batas kelas teratas dipakai hanya untuk syarat (a) daftar perhatian. Nilai total IRBI 2025 bukan jumlah kolom bahaya, dan kolom bahaya dinilai adalah jumlah dari sembilan bahaya yang bernilai di kab/kota itu.

Daftar perhatian memuat {{angka:perhatian.mitigasi.pasangan|satuan}} di {{angka:perhatian.mitigasi.kab_unik}} kab/kota (@tbl:a-kab). Daftar itu bukan daftar prioritas: ukurannya ditentukan sifat data, dan aturannya dihitung ulang setelah catatan metode IRBI 2025 terbit (@rek:r-m20).

::: tabel {#tbl:a-kab}
judul: Penduduk, status IRBI 2025, dan daftar perhatian dengan syaratnya per kab/kota, Indonesia, 2015–2025
csv: data/turunan/lampiran_kab.csv
kolom: nama="KAB/KOTA"; prov_nama="PROVINSI"; penduduk_2026="PENDUDUK 2026 (jiwa)" fmt=0; irb_2025="IRB 2025" fmt=1; status_2025="STATUS"; daftar_perhatian="DAFTAR PERHATIAN (BAHAYA DAN SYARAT)"
grup: PROVINSI
sumber: InaRISK BNPB, IRBI 2025; DIBI BNPB 2008–2025; WorldPop 2026; pengolahan Pantau Bencana
keyakinan: asumsi-kebijakan
data_per: 23 Okt 2026
catatan: IRB dan status resmi; penduduk WorldPop estimasi model; daftar perhatian asumsi kebijakan.
:::

::: tabel {#tbl:a-hidromet}
judul: Nilai IRBI 2025 per bahaya hidrometeorologi per kab/kota, Indonesia, 2025
csv: data/irbi/irbi_kab_2025.csv
kolom: nama_kepmendagri="KAB/KOTA"; prov_nama="PROVINSI"; banjir="BANJIR" fmt=0; longsor="LONGSOR" fmt=0; kekeringan="KEKERINGAN" fmt=0; cuaca_ekstrem="CUACA EKSTREM" fmt=0; abrasi="ABRASI" fmt=0; karlahut="KARHUTLA" fmt=0
grup: PROVINSI
sumber: InaRISK BNPB, IRBI 2025, kolom per bahaya
keyakinan: resmi
data_per: 23 Okt 2026
catatan: Kolom abrasi memuat gelombang ekstrem dan abrasi.
:::

::: tabel {#tbl:a-geologi}
judul: Nilai IRBI 2025 per bahaya geologi dan nilai total per kab/kota, Indonesia, 2025
csv: data/irbi/irbi_kab_2025.csv
kolom: nama_kepmendagri="KAB/KOTA"; prov_nama="PROVINSI"; gempabumi="GEMPA BUMI" fmt=0; tsunami="TSUNAMI" fmt=0; gunungapi="GUNUNG API" fmt=0; total="IRB TOTAL" fmt=1; n_bahaya_bernilai="BAHAYA DINILAI" fmt=0
grup: PROVINSI
sumber: InaRISK BNPB, IRBI 2025, kolom per bahaya dan total
keyakinan: resmi
data_per: 23 Okt 2026
catatan: Nilai total IRBI 2025 bukan jumlah kolom bahaya.
:::
