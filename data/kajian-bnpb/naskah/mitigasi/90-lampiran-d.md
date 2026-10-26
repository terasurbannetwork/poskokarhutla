---
kajian: mitigasi
lampiran: D
judul: Rekap DIBI dan Rekonsiliasi Kejadian
status: final
---

# Rekap DIBI dan Rekonsiliasi Kejadian {#lamp:dibi}

Rekap ini memuat catatan DIBI tingkat nasional per tahun 2008–2026 dan per jenis bencana alam 2015–2025, ditarik dari dasbor publik Pusat Data, Informasi, dan Komunikasi Kebencanaan pada 23 Oktober 2026 [@bnpb-dibi]. Semua angka memakai cakupan kejadian bencana. Angka 2026 masih sementara, dan kejadian lintas kab/kota dibagi rata sehingga jumlah kejadian dapat berupa pecahan, lalu dibulatkan di tabel jenis. Angka mengungsi dicatat sebagai nominal terbesar selama tanggap darurat, bukan pengungsi serentak.

**Seri DIBI patah dua kali, sehingga kolom bencana alam menjadi dasar perbandingan lintas tahun dan kolom semua klasifikasi hanya menunjukkan komposisi.** Sejak data 2024, laporan ditandai kejadian bencana menurut ambang Juklak BNPB 7/2023, sehingga cakupan bencana dan semua laporan baru berbeda sejak tahun itu [@bnpb-2023-standar-data, hlm. 7]. Pada 2018 kategori Banjir Bandang, Banjir dan Tanah Longsor, Banjir Rob, serta Puting Beliung baru muncul, sedangkan kategori di luar bencana alam nol kejadian pada 2020–2023 tetapi {{angka:dibi.nasional.nonalam_sosial.kejadian.2025}} kejadian pada 2025 (@sub:dibi).

::: tabel {#tbl:d-tahun}
judul: Kejadian dan dampak bencana alam serta korban semua klasifikasi menurut DIBI per tahun, Indonesia, 2008–2026
csv: data/turunan/lampiran_dibi_tahun.csv
kolom: tahun="TAHUN" fmt=teks; seri="SERI"; kejadian_alam="KEJADIAN ALAM" fmt=0; meninggal_alam="MENINGGAL ALAM (jiwa)" fmt=0; hilang_alam="HILANG ALAM (jiwa)" fmt=0; mengungsi_alam="MENGUNGSI ALAM (jiwa)" fmt=0; rumah_rb_alam="RUMAH RUSAK BERAT ALAM (unit)" fmt=0; meninggal_semua="MENINGGAL SEMUA KLASIFIKASI (jiwa)" fmt=0; hilang_semua="HILANG SEMUA KLASIFIKASI (jiwa)" fmt=0
grup: SERI
sumber: DIBI BNPB, dasbor publik, ditarik 23 Oktober 2026; pengolahan Pantau Bencana
keyakinan: resmi
data_per: 23 Okt 2026
catatan: Bencana alam mencakup sembilan jenis DIBI; semua klasifikasi memuat nonalam, sosial, dan lainnya.
:::

**Gempa bumi menyumbang korban meninggal dan hilang terbanyak di antara jenis bencana alam 2015–2025, sedangkan banjir dan cuaca ekstrem mencatat kejadian terbanyak** (@tbl:d-jenis). Pola ini sejalan dengan temuan Bab 4 bahwa bencana geologi menyumbang {{angka:dibi.nasional.kejadian_geologi_porsi.2015_2025|fmt=2|persen}} kejadian tetapi {{angka:dibi.nasional.meninggal_geologi_porsi.2015_2025|fmt=1|persen}} korban meninggal [@bnpb-dibi].

::: tabel {#tbl:d-jenis}
judul: Kejadian dan dampak bencana alam menurut jenis DIBI, Indonesia, 2015–2025
csv: data/turunan/lampiran_dibi_jenis.csv
kolom: jenis="JENIS DIBI"; kejadian="KEJADIAN" fmt=0; meninggal_hilang="MENINGGAL DAN HILANG (jiwa)" fmt=0; mengungsi="MENGUNGSI (jiwa)" fmt=0; rumah_rb="RUMAH RUSAK BERAT (unit)" fmt=0
total: ya
sumber: DIBI BNPB, dasbor publik, ditarik 23 Oktober 2026; pengolahan Pantau Bencana
keyakinan: resmi
data_per: 23 Okt 2026
catatan: Urutan menurut meninggal dan hilang; nama jenis mengikuti kategori DIBI.
:::

**Jumlah kejadian 2024 dan 2025 bergantung pada cakupan yang dipilih: kejadian bencana nasional 2025 berjumlah {{angka:dibi.nasional.kejadian.2025|fmt=0}}, sedangkan semua laporan {{angka:dibi.nasional.kejadian_semua_laporan.2025|fmt=0}}** (@tbl:d-rekonsiliasi). Untuk korban jiwa, selisih kedua cakupan kecil. Laporan Kinerja BNPB 2025 memuat angka korban 2025 dari data terverifikasi yang berbeda dari DIBI per 23 Oktober 2026; selisih itu menjadi permintaan data (@rek:r-m08).

::: tabel {#tbl:d-rekonsiliasi}
judul: Versi jumlah kejadian dan korban meninggal nasional menurut cakupan dan penerbit, Indonesia, 2024–2025
sumber: DIBI BNPB, dasbor publik, ditarik 23 Oktober 2026; portal data terbuka BNPB; LKIP BNPB 2025
keyakinan: resmi
data_per: 23 Okt 2026
catatan: Versi beda definisi diberi nama besarannya, tidak dirata-rata; "–" berarti tidak tersedia.
angka: 2; 3

| VERSI | CAKUPAN | 2024 | 2025 |
| --- | --- | ---: | ---: |
| Kejadian, semua laporan | semua klasifikasi, tanpa saring ambang | {{angka:dibi.nasional.kejadian_semua_laporan.2024|fmt=0}} | {{angka:dibi.nasional.kejadian_semua_laporan.2025|fmt=0}} |
| Kejadian bencana | semua klasifikasi, ambang Juklak BNPB 7/2023 | {{angka:dibi.nasional.kejadian.2024|fmt=0}} | {{angka:dibi.nasional.kejadian.2025|fmt=0}} |
| Kejadian bencana alam, semua laporan | jenis bencana alam | {{angka:dibi.nasional.kejadian_alam_semua_laporan.2024|fmt=0}} | {{angka:dibi.nasional.kejadian_alam_semua_laporan.2025|fmt=0}} |
| Kejadian bencana alam | jenis bencana alam, ambang Juklak BNPB 7/2023 | {{angka:dibi.nasional.kejadian_alam.2024|fmt=0}} | {{angka:dibi.nasional.kejadian_alam.2025|fmt=0}} |
| Kejadian, portal data terbuka | rekap 2010–2024 | {{angka:dibi.nasional.kejadian_ckan.2024}} | – |
| Meninggal, semua klasifikasi | kejadian bencana | – | {{angka:dibi.nasional.meninggal.2025}} |
| Meninggal, semua laporan | tanpa saring ambang | – | {{angka:dibi.nasional.meninggal_semua_laporan.2025}} |
| Meninggal, bencana alam | jenis bencana alam | – | {{angka:dibi.alam.meninggal.2025}} |
| Meninggal, LKIP BNPB 2025 | data terverifikasi, terbit Februari 2026 | – | {{angka:bnpb.lkip2025.meninggal.2025}} |
:::
