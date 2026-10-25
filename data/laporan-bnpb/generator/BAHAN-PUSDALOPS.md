# Bahan harian Pusdalops / Dit. Koordalops BNPB

Peta bentuk bahan yang masuk tiap hari, hasil membaca 19 berkas **Laporan Harian Dit. Koordalops BNPB
20–24 Oktober 2026** dan tempelan WhatsApp pada periode yang sama. Dipakai sebagai acuan
`public/laporan_urai.js`; kalau bentuknya berubah, ubah di sini dulu lalu ubah penguraianya.

Kontak di kop laphar: Dit. Koordalops BNPB 117, WhatsApp 0812-123-7575, pusdalops@bnpb.go.id.

---

## 1. Dua terbitan per hari

| Terbitan | Periode | Isi |
| -------- | ------- | --- |
| Laporan pagi | hari ini 07.00 WIB s.d besok 07.00 WIB | lengkap, termasuk bagian I–M |
| Laporan petang | hari ini 07.00 WIB s.d hari ini 19.00 WIB | lebih pendek, kejadian saja |

Cut-off pemilik untuk deck harian tetap 12.00 WIB; yang dipakai sebagai bahan adalah laporan **pagi**.

## 2. Kerangka dokumen laphar

```
(kop BNPB)
LAPORAN HARIAN
<Hari>, <tanggal>
Dilaporkan kejadian bencana ... sejak hari <X> pukul 07.00 WIB sampai dengan hari <Y> pukul 07.00 WIB

A. Kejadian Bencana          -> 14-33 entri bernomor, tiap entri punya medan ➢
H. Infografis Bencana Indonesia
I. Rekapitulasi berdasarkan SK Darurat 2025/2026   -> tabel status darurat daerah
J. Laporan Aktivitas Gunung Api (PVMBG)
K. Laporan Meteorologi dan Klimatologi (BMKG)      -> PM2.5 10 besar + potensi cuaca sepekan
L. Komunikasi Radio BNPB
M. Petugas Piket
```

Huruf B–G tidak dipakai di tingkat dokumen; huruf itu muncul **di dalam** entri karhutla besar
(A. Armada standby, B. Pemadaman operasi udara, C. Hasil yang dicapai, D. Kekuatan personel satgas
darat, E. Hambatan, F. Kesimpulan, G. Saran).

## 3. Bagian A — medan per entri

Judul entri selalu dibuka kata jenis kejadian, lalu lokasi:
`<N>. Bencana Alam <jenis> di <Kab./Kota/Kawasan>, Provinsi <Prov>` atau `… di Provinsi <Prov>`.

Medan ditandai `➢`. Ejaan label berubah-ubah antar petugas; yang di kolom kanan adalah kunci yang
dipakai isian.

| Label di laphar (semua ejaan yang ditemukan) | Kunci isian |
| -------------------------------------------- | ----------- |
| Update, Update&nbsp;: | `update` |
| Kronologis, Kronologi | `kronologi` |
| Lokasi (diawali rekap `(12 Kecamatan / 2 Kel / 29 Desa)`) | `lokasi_rinci`, `lokasi_rekap` |
| Korban Jiwa | `korban` |
| Pengungsi | `pengungsi` |
| Kerugian Materiil | `kerugian` |
| Upaya, Giat BNPB | `upaya` |
| Kebutuhan Mendesak, Kebutuhan, Kebutuhan Peralatan, Kebutuhan Darurat, Kebutuhan MenDs.k | `kebutuhan` |
| Kendala, Hambatan | `kendala` |
| Unsur Yang Terlibat, Unsur yang Terlibat, Pihak Yang Terlibat, Personil Yang Terlibat, Unsur yg Terlibat | `terlibat` |
| Peralatan yang digunakan, Peralatan yang dimiliki, Kekuatan satgas darat, Dukungan Alat Berat BNPB | `peralatan` |
| Status (prosa SK: "Keputusan Gubernur … TMT … s.d …") | `status_sk` + ringkasan `status_penetapan` |
| Rekomendasi, Saran, Kesimpulan | `rekomendasi` |
| Kondisi Mutakhir | `kondisi` |
| Dokumentasi | `dokumentasi` |
| Sumber | `sumber` |

Jumlah entri per hari pada 20–24 Okt: 18, 14, 33, 19, 22.

## 4. Bagian I — tabel status darurat daerah

Satu baris per **daerah per jenis kejadian**, dikelompokkan per provinsi. 123–124 baris per hari,
29–30 provinsi. Kolomnya:

| Kolom tabel | Kunci isian | Catatan |
| ----------- | ----------- | ------- |
| No. | `no` | ulang dari 1 di tiap provinsi |
| Jenis Kejadian | `jenis_teks` | tulisannya tidak baku ("Karhutla", "Kebakaran Hutan dan Lahan", "Hidrometeorologi"); kode bakunya di `jenis` |
| Lokasi · Prov. | `prov`, `prov_teks` | |
| Lokasi · Kab/Kota | `kabkota` | kosong = SK tingkat provinsi |
| Waktu Kejadian · Waktu Kejadian Bencana | `waktu_kejadian` | |
| Waktu Kejadian · Tanggal Surat | `tgl_surat` | |
| Masa Status · Siaga | `siaga` | tepat satu dari tiga kolom ini terisi |
| Masa Status · Tanggap / Keadaan Darurat | `tanggap` | |
| Masa Status · Transisi | `transisi` | |
| SK Posko | `sk_posko` | |

Isi kolom masa status disalin apa adanya ("SK TMT 17 Sep s/d 31 Des 2026", "Perpanjangan TMT 1 Mei
2026 sd 31 Oktober 2026"); `macam`, `mulai`, dan `sampai` diturunkan darinya bila terbaca.

**Kenapa tabel ini hanya bisa dibaca dari koordinat.** Selnya rata tengah tegak, jadi potongan sel
sebuah baris dicetak di ATAS dan di BAWAH angka nomornya (laphar 24 Okt, baris 1: tiga baris cetak di
atas "1.", tiga di bawah). Jarak tegak antar-baris tabel 18,5 pt sedangkan jarak baris di dalam satu
sel 6,6–13,3 pt — tetapi jarak 18,5 pt juga muncul di dalam sel, jadi memisah lewat baris kosong pun
salah. Yang tidak pernah salah: angka nomor selalu di tengah barisnya.

## 5. Rekap WhatsApp (turunan laphar)

```
*Yth. Kepala BNPB*
CC: - Sekretaris Utama BNPB / - Unsur Pengarah BNPB / - Ess I BNPB / - Ess II BNPB / - Tenaga Ahli Ka.BNPB
Mohon izin menyampaikan hasil pemantauan Dit. Koordalops BNPB tanggal DD/MM/YYYY pkl 07.00 WIB s.d DD/MM/YYYY pkl 07.00 WIB sebagai berikut:
1. Laporan kejadian bencana sejumlah N (terbilang) kejadian.
2. Kejadian menonjol/kejadian berdampak signifikan sejumlah N (terbilang) kejadian.
*A. Prov. <Nama>*
1. Bencana Alam <jenis> di <lokasi> *(Kejadian Baru | Pengkinian Data)*
- Dampak: ...
- Penetapan status: ...
- Pendampingan BNPB: ...
- Kondisi mutakhir: ...
- Detail: Entry no NN laphar DD/MM/YYYY
Koordinator pembuat laporan: <nama>
```

Lima medan itu yang masuk ke tabel Kejadian menonjol. Rekap WA **tidak** memuat tabel bagian I.

## 6. Bahan lain yang datang lewat WA, di luar jangkauan pengurai ini

Dicatat supaya tidak dikira hilang; semuanya sudah punya tempatnya sendiri di repo.

- Laporan Karhutla / Penanganan Pengendalian Karhutla 6 provinsi prioritas → `penanganan.py`, `wa_operasi.py`.
- Laporan Meteorologi dan Klimatologi BMKG (PM2.5 10 besar, potensi cuaca sepekan) → `wa_harian.bmkg`.
- Laporan aktivitas gunung api PVMBG (Level I–IV) → modul gunungapi.
- Laporan gelar pesawat dan helikopter, rekap dry ice OMC, laporan hujan pasca-OMC → bagian operasi udara deck penanganan.
- Laporan BPBD provinsi (mis. Jatim) per kejadian → masuk sebagai entri biasa.
