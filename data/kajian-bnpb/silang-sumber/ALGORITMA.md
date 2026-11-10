# ALGORITMA: Silang Sumber

Semua aturan terbuka dan dijalankan skrip yang disebut. Nilai ambang bertanda "awal" adalah usulan, belum punya dasar data (KEPUTUSAN Q3).

## 1. F1 Rapor Sumber

**Pasangan.** Satu baris prakiraan = (sumber, bahaya, daerah, tanggal target, tenggang, tanggal beku, tingkat). Tanggal beku harus lebih awal dari awal tanggal target. Baris yang tidak memenuhi ini dibuang dan dihitung di `dibuang`.

**Kejadian.** Per bahaya: hujan lebat dari SYNOP (ambang curah mengikuti definisi yang sudah dipakai `cuaca_verif_synop.json`), banjir dan longsor dan cuaca ekstrem dari DIBI, dan Logbook Pusdalops. Bahaya dan sumber kejadian tertulis di tiap baris keluaran. Pemetaan gelombang dan angin ke DIBI: KEPUTUSAN Q4.

**Peringatan menyala.** Sumber resmi: tingkat resmi apa adanya (Waspada atau lebih). Sumber model: ambang yang tertulis di arsip sumber itu; bila tidak ada ambang tertulis, sumber itu tidak dinilai dan dicatat di `dilewati`.

**Tabel.** Per sel (sumber, bahaya, daerah, tenggang): a = menyala dan terjadi, b = menyala dan tidak terjadi, c = tidak menyala dan terjadi, d = tidak menyala dan tidak terjadi. Satuan hitung = hari x daerah.

```
n_kejadian = a + c
POD = a / (a + c)
FAR = b / (a + b)
CSI = a / (a + b + c)
ar  = (a + b)(a + c) / (a + b + c + d)
ETS = (a - ar) / (a + b + c - ar)
```

Bagi dengan nol menghasilkan null, bukan nol.

**Gerbang.**

| Keadaan | Keluaran layar |
| --- | --- |
| Hari arsip sumber itu < 30 | "data belum cukup" (tanpa angka) |
| n_kejadian < 30 | a, b, c, d dan n saja; POD, FAR, CSI, ETS null |
| n_kejadian >= 30 | angka dengan selang kepercayaan Wilson untuk POD dan FAR |

**Telat lapor.** Hanya hari sampai 14 hari sebelum kejadian DIBI terakhir yang dinilai (pola `cuaca_verifikasi.json`, `dinilai_sampai`). Layar menulis bahwa b terlalu besar dan c terlalu kecil karena DIBI hanya memuat yang dilaporkan.

**Pembanding.** Tiap tabel disertai baris pembanding: persistensi (kejadian hari sebelumnya) dan klimatologi bulan itu, bila arsipnya ada. Tanpa pembanding, layar tidak menulis "lebih baik dari".

## 2. F2 Tsunami per zona

**Kamus zona.** Kunci = nama zona BMKG persis (huruf besar, ejaan BMKG seperti "KOTA-BITUNG"). Nilai = daftar kabupaten/kota pesisir lewat pencocokan nama (`scripts/umum/nama_wilayah.py`) ditambah tinjauan manusia; kamus disimpan sebagai berkas dan dibuat dari 60 zona unik di 5 kejadian, tiap penambahan zona baru dicatat sebagai "belum dipetakan". Frasa "BAGIAN UTARA" dan sejenisnya menunjuk sebagian garis pantai kabupaten; kamus menulis kabupaten itu dengan penanda `sebagian`.

**Tingkat per kabupaten.** Tingkat zona dipakai apa adanya (SIAGA, WASPADA, dan seterusnya). Bila satu kabupaten tercakup beberapa zona, tampil tingkat tertinggi beserta daftar zonanya. Tidak ada rata-rata.

**Eksposur.** Dijumlah dari data yang sudah ada di repo (penduduk, sekolah, faskes, titik evakuasi `public/cuaca/data/evakuasi_tsunami.json`, pusat kecamatan `pusat_kec.json`). Satuan tertulis; angka tanpa sumber tidak tampil. Eksposur kabupaten secara keseluruhan, bukan penduduk di zona rendah; layar menulis itu.

**Pengukuran muka air.** Diurai dari teks `judul` buletin: stasiun, jam, tinggi (m). Hanya tinggi yang terurai dengan pasti yang tampil; sisanya tampil sebagai teks asli.

**Urutan buletin.** Garis waktu: waktu terbit, subjek, jumlah zona, magnitudo, perubahan terhadap buletin sebelumnya.

**Pemutaran ulang.** Pemutar menampilkan keadaan setelah buletin ke-k untuk k = 1..N pada kejadian arsip. Berlabel "latihan", dengan tanggal kejadian aslinya di tiap tampilan.

## 3. F3 Alarm beda sumber

Satuan: kabupaten atau perairan x hari x bahaya (hujan, gelombang, angin, titik panas bila ada dua sumber).

1. Ubah tiap sumber ke peringkat 0 sampai 3 memakai tabel yang tertulis di berkas konfigurasi `beda_sumber_peta.json` (tiap baris menyebut sumber, nilai, peringkat, alasan). Pemetaan itu usulan agent dan ditinjau pemilik; peringkat hanya untuk perbandingan, label resmi tetap tampil.
2. Untuk besaran kontinu (tinggi gelombang): rasio = maks(nilai) / maks(min(nilai), lantai). Lantai awal 0,1 m.
3. `perlu dicek` bila: peringkat berbeda >= 2 (awal) atau rasio > 2 (awal).
4. Bila salah satu sumber tidak ada pada hari itu: "tidak dibandingkan", bukan "sama".
5. Keluaran memuat kedua nilai, lembaga masing-masing, tanggal ambil, dan alasan tanda. Tidak ada kolom "yang benar".

Tanda dihitung ulang tiap hari; tidak ada tanda yang bertahan dari hari lain.

## 4. F5 Deteksi gempa beruntun

**Sasaran.** Lingkaran di sekitar gunung api (Q2) dengan jari-jari R (awal 30 km). Pusat dan jari-jari ada di berkas konfigurasi.

**Mc.** Dari katalog dalam jendela (awal 90 hari) dengan maximum curvature: Mc = magnitudo dengan hitungan frekuensi terbesar pada histogram bin 0,1, ditambah koreksi 0,2 (nilai awal; diperiksa agent dengan nilai b). Bila n gempa di atas Mc kurang dari 50, sasaran itu dilewati dengan alasan "data kurang".

**Laju.** r = jumlah gempa M >= Mc dalam jendela deteksi (awal 7 hari) dibagi lamanya dalam hari.

**Baseline (Q1 terjawab 10 Nov 2026: USGS M >= 4,5).** Laju historis M >= 4,5 sejak 2000 di lingkaran sasaran; harapan = laju x lama jendela; sasaran dengan laju nol tidak dinilai. Teks lama di bawah (mode relatif) tidak lagi dipakai: Sebelum Q1 dijawab, hanya mode "sekitar lawan sekitar": laju sasaran dibandingkan median laju sasaran lain pada Mc yang sama. Mode ini diberi label "perbandingan relatif" dan tidak disebut baseline historis.

**Kejutan.** P = peluang ekor Poisson dari N pengamatan (jumlah gempa di jendela deteksi) terhadap harapan = r_baseline x lama jendela. Dikoreksi untuk banyak sasaran: P_koreksi = min(1, P x jumlah sasaran). Tanda "perlu dicek" bila P_koreksi < 0,01 (awal). Keluaran memuat N, harapan, P_koreksi, Mc, R, jendela.

**Silang MAGMA.** Untuk gunung api, tampilkan juga hitungan kegempaan dan status level dari `public/gunungapi/data/kegempaan.json` dan `gunung.json`. Tidak digabung menjadi angka.

**Larangan.** Tidak ada kalimat "akan terjadi". Tanda berlabel "Deteksi Centurisk97" dan tidak tampil sebagai peringatan sebelum uji balik (RENCANA-UJI bagian 5).

## 5. F6 Kalender ancaman daerah

Per kabupaten, per bulan 1..12, per bahaya (banjir, longsor, karhutla, kekeringan bila ada):

- Kolom laju: dari `kalender_risiko.json` (logbook, tahun penuh) dan DIBI kejadian bulanan. Tampil p (bagian tahun yang bulan itu punya kejadian), n, dan "kecil" bila total kurang dari 5 (aturan yang sudah ada).
- Kolom BMKG: untuk bulan dan dasarian ke depan, sifat hujan dan kategori curah dari narasi iklim yang dipetakan ke kabupaten lewat nama. Tampil sebagai label resmi.
- Tidak ada skor gabungan. Bulan tanpa narasi BMKG: "tidak disebut".
- Di tingkat kabupaten tidak ada persen selain p (bagian tahun yang punya kejadian); p selalu tampil dengan pembilang dan penyebutnya, dan "kecil" bila total kurang dari 5.
