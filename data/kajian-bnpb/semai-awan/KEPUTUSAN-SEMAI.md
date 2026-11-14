# KEPUTUSAN-SEMAI: Peluang Semai Awan dan Prakiraan Asap (`/operasi`, seksi Peluang semai)

Dokumen ini menang atas semua dokumen lain di folder ini. Untuk hal yang juga diatur `data/kajian-bnpb/operasi-udara/KEPUTUSAN-UDARA.md`
(selera layar, isian manual, hak baca `/operasi`), keputusan di sana tetap berlaku kecuali ditimpa di sini dengan tanggal.

Pertanyaan yang belum dijawab pemilik ditulis sebagai **Q**, dengan bawaan sementara bertanda **[SEMENTARA]**. Bawaan sementara boleh
dipakai untuk membangun, tetapi angka yang bergantung padanya tampil berlabel "hipotesis" sampai Q dijawab.

## Asal

Pemilik, 14 Nov 2026, mengirim 20 tangkapan layar produk "Nimbus" (pendukung keputusan semai awan: peta dunia titik api, konsol
Indonesia dengan zona semai A sampai E, prakiraan asap 24 jam, tampilan Pos komando, Tinjau BMKG, Mitra, ringkasan teks bagikan) dan
menulis: "Bisa kah lu tiru ini masukkan ke sistem. Untuk Operasi Udara", "lakukan riset besar-besaran untuk bisa mendapat model
terbaik seperti ini", "Coba buat tiket dan lain-lain design system dll. Seperti awal ketika bikin awal SIPPA."

## Keputusan pemilik

| No | Tanggal | Keputusan | Kalimat atau pilihan pemilik |
| -- | ------- | --------- | ---------------------------- |
| S1 | 14 Nov 2026 | Fitur ini seksi baru "Peluang semai" di Operasi Udara (`/operasi`), satu peta dengan base, cluster, dan renlap yang sudah ada. Bukan layar terpisah. | pilihan "Seksi baru di Operasi Udara" |
| S2 | 14 Nov 2026 | Wilayah Indonesia saja. Asap yang menyeberang ke Malaysia, Singapura, Brunei, Timor-Leste, dan PNG tetap ditandai. Tidak ada peta dunia, tidak ada konsol Asia Tenggara atau Turki. | pilihan "Indonesia saja" |
| S3 | 14 Nov 2026 | Zona semai adalah usulan. Pusdalops bisa menjadikan satu zona target renlap OMC dengan satu klik; tiap operasi tetap dikonfirmasi BMKG. Mesin tidak pernah memasukkan zona ke renlap sendiri. | pilihan "Usulan, bisa jadi target renlap" |
| S4 | 14 Nov 2026 | Empat tampilan: Pos komando, Tinjau BMKG (bobot bisa digeser, tabel faktor per sel, salin CSV), Mitra lintas batas (koordinat dibulatkan, ringkasan asap), dan Ringkasan teks bagikan siap tempel ke WA. | pilihan keempatnya |
| S5 | 14 Nov 2026 | Fitur besar: paket sebelas dokumen dan tiket dulu, baru kode (AGENTS §3.7). | "Seperti awal ketika bikin awal SIPPA" |

## Keputusan rancangan (dibuat penyusun paket dari riset, boleh dibatalkan pemilik)

| No | Keputusan | Alasan (bukti) |
| -- | --------- | -------------- |
| D1 | Cuaca dari ECMWF IFS Open Data 0,1 derajat (CC BY 4.0), putaran 00 dan 12 UTC, langkah 0 sampai 24 jam per 3 jam. | Diverifikasi 14 Nov 2026 di `data.ecmwf.int`: berkas `ifs/0p1/oper/*-sfc` memuat `lcc, mcc, tcc, mucape, tclw, tcwv, tp, cp, 10u, 10v, 2t, 2d`; berkas `*-pl` memuat `u, v, w, t, q, r, gh` di 14 lapisan termasuk 925, 850, 700, 500, 200 hPa. Grid sama dengan Nimbus (R2 §1). |
| D2 | Field GRIB2 diambil per potong lewat berkas `.index` (rentang byte), bukan unduh utuh. | Satu langkah `sfc` utuh 94 MB; satu field global sekitar 1,5 MB. 29 field x 13 langkah = sekitar 570 MB per putaran, layak di GitHub Actions. Putaran 0,1 derajat lengkap sekitar 9,5 jam sesudah jam awalnya (00z terbit 09.34 UTC, diverifikasi 14 Nov 2026). |
| D3 | Pengurai GRIB2 memakai `eccodes` (roda pip yang membawa pustaka). Ini pengecualian dari pipeline stdlib (Q1). | Paket data `template 42` (CCSDS/AEC) terverifikasi; stdlib tidak bisa membukanya (R2 §1). |
| D4 | Skor = gerbang kelayakan dikali rerata geometris berbobot tiga faktor (kualitas awan, hanyut ke api, keselamatan jarak), bukan jumlah berbobot ala Nimbus. Slider bobot Tinjau BMKG mengubah pangkat, jadi tetap bisa digeser. | R1 §6: faktor yang nol harus membuat zona nol; jumlah berbobot membiarkan awan buruk menang karena api besar. |
| D5 | Kriteria Nimbus dipakai sebagai titik awal, ditambah syarat yang hilang dari Nimbus: suhu dasar awan hangat, kedalaman dasar awan ke level beku, updraf (w) 850 sampai 700 hPa, dan tanda bahaya MUCAPE sangat tinggi. | R1 §4 (Flossmann dkk. 2019; Silverman dan Sukarnjanaset 2000; Tessendorf dkk. 2012). |
| D6 | Asap memakai mesin lintasan yang sudah ada (`scripts/udara/lintasan.py`), tidak membuat mesin kedua. Peningkatan: angin IFS 0,1 derajat dan bobot FRP per partikel. HYSPLIT tidak dipakai. | R2 §5: READY dibatasi 250 panggilan per hari dengan kunci atas kebijakan ARL. Mesin repo sudah menandai kota dan lintas batas. |
| D7 | Kesahihan diuji prospektif sejak hari pertama: tiap putaran dibekukan append-only, lalu dinilai lawan hujan GSMaP atau IMERG di titik hujan 30 sampai 90 menit sesudah jam zona. Efek semai tidak diklaim. | R1 §5 dan §6: bukti kemanjuran untuk api dan gambut tidak ada; yang bisa diuji jujur adalah "awan berskor tinggi memang menjadi hujan". |
| D8 | Tidak ada kalimat "akan hujan", "akan padam", mm tambahan, atau persen titik panas turun di layar atau ringkasan. Kalimat baku: "awan layak semai", "peluang hujan alami", "konfirmasi BMKG". | R1 §5: klaim aman hanya peringkat awan layak semai. |
| D9 | Satelit VIIRS yang hilang ditampilkan di bilah sumber ("2 dari 3 satelit, NOAA-21 belum masuk"), dihitung dari jumlah titik per satelit lawan rerata 7 hari. | Nimbus menampilkan ini; R2 §6. |
| D10 | Panduan produk Nimbus v2.2 (12 Nov 2026, dikirim pemilik 14 Nov 2026, diringkas di `riset/R3-NIMBUS.md`) jadi acuan baku nilai awal: ambang penyaring, jarak sel ke cluster, aturan kota, ambang zona, jendela terbang 85%, dan mesin partikel asap. Penyimpangan dari Nimbus hanya yang tertulis di D4 dan D5, dan tiap penyimpangan punya mode "seperti Nimbus" untuk pembanding di Tinjau BMKG. | Pemilik minta "tiru ini"; riset R1 menambah syarat yang hilang. |

## Prinsip yang mengikat semua tiket

1. **Tidak ada data dummy.** Tanpa putaran IFS yang sah, seksi menampilkan "prakiraan belum tersedia" dan jam putaran terakhir, bukan zona karangan.
2. **Usulan, bukan perintah.** Tiap zona berlabel "usulan, konfirmasi BMKG". Tombol "Jadikan target renlap" hanya menambah target; renlap tetap disusun Pusdalops.
3. **Tiap angka menyebut sumbernya.** Bilah sumber di atas peta: FIRMS VIIRS (jumlah satelit), ECMWF IFS (putaran, resolusi), batas wilayah. Lisensi CC BY 4.0 ECMWF disebut.
4. **Satu sumber per angka.** PM2.5 CAMS, beban asap relatif dari lintasan, dan PM2.5 terukur BMKG tidak dijumlah atau dicampur; label "beban asap relatif dari model lintasan, bukan PM2.5 terukur".
5. **Klik tidak membekukan layar.** Geser jam, pilih zona, dan ganti tampilan: chrome kontrol dicat dulu, raster dan daftar menyusul (`~/.claude/INP.md`).
6. **Selera layar Operasi Udara berlaku**: tanpa huruf kapital semua, tanpa latar sorot abu-abu, label berikon, kartu tidak menempel, tanpa kalimat kesimpulan di kepala kartu (AGENTS §3.5 pembaruan 11 Nov).
7. **Koordinat penuh hanya untuk staf berperan.** Keluaran prakiraan disimpan di R2 dan dibaca lewat rute staf, bukan aset publik. Tampilan Mitra dan ringkasan mitra dibulatkan 0,5 derajat dan tanpa titik api per piksel (KEAMANAN-PRIVASI §3).

## Pertanyaan terbuka untuk pemilik

| Q | Pertanyaan | Bawaan sementara |
| - | ---------- | ---------------- |
| Q1 | Boleh pipeline ini memasang `eccodes` (pip) di GitHub Actions, satu-satunya dependensi di luar stdlib? Alternatifnya pakai Open-Meteo 0,25 derajat, yang kuota gratisnya tidak cukup untuk grid Indonesia (12.765 titik, kuota 10.000 per hari). | [SEMENTARA] ya, `eccodes` di workflow sendiri; skrip tetap jalan `uji` luring tanpa eccodes |
| Q2 | Base mana yang dihitung untuk jarak terbang OMC: semua base `op_base`, atau hanya base yang punya armada OMC (CASA, C-212, Caravan, Hercules) hari itu? | [SEMENTARA] base yang hari itu punya armada dengan misi OMC di gelar armada; bila tidak ada laporan, semua base `op_base` berlabel "armada OMC belum lapor" |
| Q3 | Siapa boleh menekan "Jadikan target renlap"? Renlap milik Pusdalops, OMC tertulis milik peran `tmc`. | [SEMENTARA] `pusdalops` dan `tmc`, plus moderator `ADMIN_TOKEN` |
| Q4 | Tinjau BMKG: diakses staf BMKG lewat akun berperan baru (`bmkg`), atau tetap tampilan dalam akun BNPB yang bisa dipilih siapa pun yang bisa membuka `/operasi`? | [SEMENTARA] tampilan yang bisa dipilih semua pembaca `/operasi`; peran `bmkg` menunggu jawaban |
| Q5 | Tampilan Mitra lintas batas: hanya di layar dan ringkasan teks (disalin staf lalu dikirim), atau tautan baca tanpa login untuk mitra asing (ASMC, Malaysia, Timor-Leste)? | [SEMENTARA] hanya layar dan ringkasan teks; tanpa tautan publik |
| Q6 | Ambang skor zona yang ditampilkan dan jumlah zona maksimum. | [SEMENTARA] ikut panduan Nimbus v2.2: skor >= 0,35, paling banyak 5 zona (A sampai E) per 24 jam, jarak antarzona >= 40 km |
| Q7 | Jendela terbang: 07.00 sampai 16.00 waktu setempat (seperti Nimbus Indonesia), atau ikut batas terang per base (UD-07)? | [SEMENTARA] 07.00 sampai 16.00 waktu setempat zona waktu sel, dan zona yang jatuh di luar batas terang base terdekat diberi tanda |
| Q8 | Kecepatan jelajah per jenis armada OMC untuk menghitung menit terbang. | [SEMENTARA] 300 km/j semua jenis, berlabel perkiraan (Nimbus: 81 km sekitar 16 menit) |
| Q9 | Tujuan utama semai yang diberi bobot: memadamkan api aktif, membasahi gambut yang kering sebelum terbakar, atau mengurangi asap? Ini menentukan faktor "manfaat". | [SEMENTARA] api aktif 24 jam (FRP) dikali pengali gambut 1,5; pembasahan gambut tanpa api jadi tiket lanjutan SA-14 |
| Q10 | Apakah BNPB bisa memperoleh log sortie OMC BMKG yang berjam dan berkoordinat (bukan hanya rekap per provinsi di situs BMKG) untuk uji balik? | [SEMENTARA] uji balik memakai `omc_sortie` di D1 (`src/omc.js`) yang diisi peran `tmc`; tanpa log BMKG, kepatuhan zona lawan sortie hanya dihitung dari isian itu |
| Q11 | Tampilan Mitra: kota di negara tetangga yang terkena asap boleh disebut namanya? | [SEMENTARA] ya, nama kota dan jam tiba saja, tanpa angka beban |
| Q12 | Ringkasan teks bagikan dalam bahasa apa? | [SEMENTARA] Indonesia untuk Pos komando; Inggris untuk Mitra |
| Q13 | `op_base` hari ini hanya 9 base Sumatera dan Kalimantan (PNK, KTG, PKY, SMQ, KLP, BDJ, PLM, DJB, PKU). Posko TMC dan bandara OMC di Sulawesi, Nusa Tenggara, Maluku, dan Papua ditambahkan ke `op_base`? Daftarnya dari siapa (BMKG, Pusdalops)? | [SEMENTARA] tidak ditambah; zona di luar jelajah 9 base tetap tampil berlabel "di luar jelajah base terdaftar" dan tidak bisa dijadikan target renlap |
