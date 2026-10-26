---
kajian: rehab
lampiran: A
judul: Daftar Perhatian Rehabilitasi dan Rekonstruksi per Kab/Kota
status: final
---

# Daftar Perhatian Rehabilitasi dan Rekonstruksi per Kab/Kota {#lamp:kab}

Lampiran ini memuat kab/kota yang memenuhi aturan daftar perhatian sementara di @sub:rr-perhatian, dikelompokkan per provinsi menurut urutan kode wilayah. Nilai bahaya berasal dari IRBI 2025 InaRISK [@bnpb-irbi], sedangkan rumah rusak berasal dari DIBI tingkat kab/kota untuk jenis hidrometeorologi dan geologi 2015–2025 [@bnpb-dibi]. Nilai per bahaya berupa bilangan bulat dengan banyak nilai kembar, sehingga tabel tidak dipakai untuk memeringkat kab/kota.

**Daftar ini sementara karena hanya dua dari empat syarat yang dapat dihitung: {{angka:rehab.perhatian.sementara.n}} kab/kota memenuhi syarat bahaya pada kelas teratas dan syarat kerusakan rumah, dan {{angka:rehab.perhatian.sementara.n_dua_kelas}} kab/kota bila syarat bahaya dilonggarkan ke dua kelas teratas** (@tbl:a-kab). Syarat bahaya (a) dipenuhi bila nilai IRBI 2025 salah satu dari tiga bahaya di @tbl:a-kab berada di kelas kuintil teratas; batas kelas adalah turunan penyusun karena sumber resmi tidak memuat ambang kelas per bahaya. Untuk kerusakan rumah (c), kajian ini memakai proksi rumah rusak semua kelas 2015–2025 paling sedikit {{angka:rehab.perhatian.sementara.ambang_c}} unit, batas kuartil atas seluruh kab/kota. Jembatan rusak berulang (b) dan cekungan air tanah berzona kritis atau rusak (d) belum dapat dihitung, sehingga daftar final menunggu turunan jembatan per kab/kota dari Pusat Data, Informasi, dan Komunikasi Kebencanaan (@rek:r-rr-01).

**Pernyataan produsen.** Tabel disusun platform Pantau Bencana dari data produsen tersebut, bukan oleh unit kerja BNPB, sehingga bukan Data Bencana menurut Perban BNPB 1/2023 [@bnpb-2023-satudata]. Kolom daftar berlabel asumsi kebijakan. Daftar ini bukan daftar prioritas bantuan, dan penanda kehati-hatian air tanah tidak dipakai sebagai syarat prioritas. Catatan atas @tbl:a-kab. "Dua kelas teratas" hanya masuk uji kepekaan. Rumah rusak: berat dan sedang serta ringan. Daftar asumsi kebijakan.

::: tabel {#tbl:a-kab}
judul: Kab/kota daftar perhatian sementara rehabilitasi dan rekonstruksi menurut nilai bahaya IRBI 2025 dan rumah rusak DIBI, Indonesia, 2015–2025
csv: data/turunan/lampiran_rehab_kab.csv
kolom: prov_nama="PROVINSI"; nama="KAB/KOTA"; banjir="BANJIR" fmt=0; longsor="LONGSOR" fmt=0; gempabumi="GEMPA BUMI" fmt=0; rumah_rusak_2015_2025="RUMAH RUSAK (unit)" fmt=0; bahaya_kelas_teratas="BAHAYA KELAS TERATAS"; daftar="DAFTAR"
grup: PROVINSI
sumber: InaRISK BNPB, IRBI 2025; DIBI BNPB 2015–2025, ditarik 23 Okt 2026; pengolahan Pantau Bencana
keyakinan: asumsi-kebijakan
data_per: 25 Okt 2026
:::
