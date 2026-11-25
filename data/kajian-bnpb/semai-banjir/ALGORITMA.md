# ALGORITMA: Semai Redistribusi Banjir dan Penguji Efektivitas

Semua ambang adalah nilai awal. Dasar: **I** = dipakai ulang dari paket induk (ALGORITMA semai-awan, nilai di `semai_bobot.json`),
**H** = hipotesis penyusun, **P** = pola uji karhutla Okt 2026 (`data/laporan-bnpb/omc/riset/PRAREG-EFEK-OMC.md`). Nilai baru masuk
blok `banjir` di `scripts/operasi/semai_bobot.json` berlabel HIPOTESIS dengan `versi_banjir` sendiri; kunci karhutla dan `versi`
karhutla tidak disentuh (uji golden, RENCANA-UJI §2).

## 1. Wilayah, grid, waktu

Sama dengan induk §1 (grid IFS 0,1 derajat, langkah 0 sampai 36, blok 3 jam, jam setempat per provinsi) (I). Tidak ada unduhan
baru: `semai.py --tujuan banjir` membaca `data/raw/semai/<putaran>/` yang ditulis `semai_ifs.py` untuk karhutla.

## 2. Pemilihan sasaran

Hari sasaran `d` = tanggal setempat dari langkah siang putaran (induk §1). Untuk putaran 12z yang dipakai pukul 05.00 WIB, `d` adalah
hari itu; untuk putaran 00z (17.00 WIB), `d` adalah besok.

Sasaran `S(d)` = gabungan empat sumber, tiap kab/kota membawa `asal`:

| Asal | Aturan | Dasar |
| ---- | ------ | ----- |
| `prakiraan` | `public/prediksi/data/prediksi.json`: tanggal tenggang dari `kode.BNJ.hari` (larik 3 tanggal), dipilih `t` 1 atau 2 dengan `kode.BNJ.hari[t-1] = d`; lalu baris `kab[]` dengan salah satu: `BNJ[t-1][0]` (level) >= 2; ada `waspada[]` beraturan `banjir` untuk kab itu dan tenggang itu; `HJN[t-1][2]` (peluang >= 50 mm) >= 0,3 | H (Q2, Q6) |
| `bmkg` | `public/banjir/data/cuaca_bmkg_kab10.json`, `kab["PP.KK"].hari[]` dengan `tgl = d` dan `kondisi` `Hujan Lebat` atau `Hujan Petir` (kunci `"11.01"` diubah ke kode BPS `"1101"`). `tangga.json` tidak dipakai: anak tangga `h3`-nya seluruhnya model kita (`s: "kita"`), dan butir ber-`s` `kita` apa pun tidak boleh berlabel BMKG | H (Q6) |
| `tetap` | `banjir.sasaran_tetap` di `semai_bobot.json`: 13 kab/kota daratan Jabodetabek (kode BPS) | H (Q5) |
| `manual` | baris aktif `op_semai_sasaran` untuk `d`, dibaca lewat `GET /api/operasi/semai/sasaran?tanggal=` dengan token pipeline | K2 |

- Sasaran `tetap` dan `manual` dihitung walau prakiraan tidak menandainya, tetapi kartu menulis asalnya.
- Prakiraan berumur > 36 jam dari jam putaran: asal `prakiraan` tidak dipakai, bilah sumber menulis "prakiraan banjir basi".
- `S(d)` kosong: `alasan_kosong = "tidak_ada_sasaran"`.
- Tiap sasaran yang asalnya hanya `prakiraan` berlabel "prakiraan kita, belum teruji" selama vonis di `kode.BNJ.vonis` `prediksi.json` bukan
  `lulus` (KEPUTUSAN prinsip 3).
- Sasaran tenggang 2 yang harinya belum tercakup langkah putaran tampil di daftar dengan "pantau, zona di putaran berikutnya", tanpa zona.

Geometri sasaran dari `public/geo/kabupaten/*.json` (sama dengan `efek.py`). Tepi sasaran = cincin poligon, disederhanakan ke titik
tiap sekitar 5 km untuk hitung jarak.

## 3. Sel kandidat: hulu angin sasaran

Untuk tiap sasaran `k` dan tiap langkah siang `s`:

1. **Lintasan mundur.** Dari pusat dan tiap titik tepi sasaran, mundur dengan angin pengarah (rerata vektor 850 dan 700 hPa, induk §2)
   memakai `angin_di` dan `geser` dari `scripts/udara/lintasan.py` dengan `u, v` dibalik tandanya, langkah 15 menit, sampai 4 jam
   atau keluar kisi. Angin = `u_pengarah`, `v_pengarah` yang sudah dihitung `semai.py` per langkah; adaptor `kisi_pengarah()` di `semai.py`
   mengemasnya ke bentuk kisi yang dibaca `angin_di` (`lat`, `lon`, `jam` per 3 jam, `u[0]`, `v[0]` dalam m/s x 10). `lintasan.semai()` tidak
   dipakai karena anginnya penutup sebaris 60% 10 m + 40% 850 hPa, bukan kisi (I, KEPUTUSAN D4).
2. **Koridor.** Sel kandidat = sel yang jaraknya <= 25 km dari salah satu titik lintasan mundur (H) DAN berjarak 30 sampai 150 km dari
   tepi sasaran (H, Q3).
3. **Angin lemah.** Bila angin pengarah di pusat sasaran < 2 m/s pada langkah itu, langkah itu tidak menghasilkan kandidat untuk `k`
   (H; RISET §2.3). Bila semua langkah siang begitu: `alasan_kosong` per sasaran `angin_lemah`.

Kandidat dari semua sasaran digabung; satu sel bisa melayani beberapa sasaran.

## 4. Gerbang

Sel lolos bila **semua** gerbang awan induk G1 sampai G9 lolos (nilai sama, mode skor `bawaan`) (I), ditambah:

| No | Syarat | Ambang awal | Dasar |
| -- | ------ | ----------- | ----- |
| GB1 | Titik hujan sel (sel digeser angin pengarah τ = 30 menit, induk §5) **tidak** berada di dalam poligon sasaran mana pun dan berjarak > 10 km dari tepinya | 10 km | H |
| GB2 | Titik hujan **dan sel zona itu sendiri** tidak berada di daratan kab/kota sasaran mana pun, dan tidak di daratan kab/kota yang masuk `S(d)` lewat asal `prakiraan` atau `bmkg` (terancam banjir hari itu) (aturan jangan memindah banjir, KEPUTUSAN D5) | – | H (Q7) |
| GB3 | Lintasan maju dari titik hujan memasuki sasaran `k` (atau <= 10 km dari tepinya) dalam tenggang tiba 1 sampai 4 jam | 1 sampai 4 jam | H (Q3) |
| GB4 | Hari jam tiba di sasaran sama dengan `d` | – | H |

Gerbang induk G6 (hujan prakiraan < 4 mm/jam) tetap: sel yang sudah hujan deras tidak disemai. Mode `nimbus` tidak tersedia untuk
tujuan banjir (KEPUTUSAN D3).

## 5. Tiga faktor

**Q, kualitas awan**: persis induk §5 (lima komponen) (I).

**H, lepas sebelum sasaran** (0 sampai 1), menggantikan D:

```
tiba = jam dari titik hujan sampai lintasan maju memasuki sasaran (GB3)
H = 1                          bila 1 <= tiba <= 3
H = 4 - tiba                   bila 3 < tiba <= 4      (turun linear ke 0 di 4 jam)
H = 0                          selain itu
```

Alasan bentuk: awan yang tiba < 1 jam sesudah disemai belum sempat melepas hujannya di luar sasaran; > 3 jam makin besar ketidakpastian
lintasan model (H). Bila sel melayani beberapa sasaran, H = maksimum, dan semua sasaran yang dilayani dicatat.

**P, paparan zona** (0 sampai 1), menggantikan T:

- Titik hujan di laut (di luar semua poligon kab): P = 1.
- Di darat: P = `faktor_t(jarak titik hujan ke titik kota terdekat, 10, 50)` dari `semai_murni.py` (fungsi induk T, dipakai ulang): 0 di
  <= 10 km, 1 di >= 50 km (I).

## 6. Skor dan zona

`skor = gerbang x Q^wQ x H^wH x P^wP`, bobot dinormalkan, bawaan 0,45 / 0,40 / 0,15 (pembagian bobot induk, H untuk tujuan ini), fungsi
`skor()` induk mode `bawaan` dipakai apa adanya dengan D diisi H dan T diisi P.

Zona: NMS 40 km, paling banyak 5, skor >= 0,35, jendela terbang 85% puncak, dipotong 07.00 sampai 16.00 (I, `zona_nms`,
`jendela_85`). Kode zona `<putaran>-B<huruf>` (KEPUTUSAN D6). Base: bandara terdekat tanpa batas jelajah (S10 induk). Ketinggian semai
LCL (induk §7b) ditulis; bahan tidak diusulkan mesin (Q9), kartu menulis "bahan dari BMKG".

Contoh hitung (dipakai RENCANA-UJI §1): komponen 0,53 / 0,36 / 1 / 0,54 / 0,40 memberi Q = 0,566 (induk); tiba 3,5 jam memberi
H = 0,5; titik hujan di laut, P = 1. Skor = 0,566^0,45 x 0,5^0,40 x 1 = 0,774 x 0,758 = 0,59.

## 7. Keadaan kosong

| Keadaan | `alasan_kosong` | Kalimat layar |
| ------- | --------------- | ------------- |
| Tidak ada sasaran | `tidak_ada_sasaran` | "Tidak ada sasaran banjir untuk <hari> dari prakiraan kita, BMKG, daftar tetap, atau Pusdalops." |
| Sasaran ada, semua langkah angin lemah | `angin_lemah` | "Angin pengarah di sasaran terlalu lemah untuk mencegat awan dari hulu." |
| Sasaran ada, tidak ada sel lolos | `tidak_ada_awan_hulu` | "Tidak ada awan layak semai di hulu sasaran dalam 24 jam ke depan. Hujan sasaran bisa tumbuh di tempat." |
| Putaran IFS tidak ada | `tanpa_prakiraan` | kalimat induk |

## 8. `kandidat_sasaran` untuk peramban

`semai_banjir.json` membawa sampai 40 sel kandidat terbaik per sasaran untuk paling banyak 60 sasaran (urut: `tetap`, `manual`, `bmkg`,
`prakiraan` berperingkat peluang), kolom `[lat, lon, langkah, Q, H, P, sasaran_idx, laut]`. Peramban menghitung ulang zona saat bobot
digeser atau saat sasaran manual yang sudah ada di daftar dipilih; algoritma sama dengan §6 dan diuji silang (RENCANA-UJI §3).
Batas ukuran 300 KB, sama dengan induk.

## 9. Penguji efektivitas

Penguji hanya menilai **kesesuaian**: apakah hujan di sasaran pada hari ber-OMC lebih rendah dari hujan pada hari tanpa OMC yang
prakiraannya setara. Seleksi (OMC digelar justru pada hari yang diprakirakan basah) tidak bisa dipisahkan dari efek tanpa randomisasi;
kovariat IFS hanya mengendalikan bagian seleksi yang terbaca model (P). Aturan rinci, ambang n, dan kriteria vonis dikunci di
`RENCANA-UJI.md` §6. Bagian ini menjelaskan rancangan.

### 9.1 Lapis A: provinsi-hari dari OMC resmi BMKG (retrospektif)

- **Perlakuan.** Baris `omc_bmkg.json` berjenis `Pengurangan CH - Bencana`, tanggal `periode_awal` sampai `periode_akhir`. Baris bertanggal terbalik
  (satu baris Jawa Timur) tidak jadi perlakuan dan provinsi itu dibuang pada kedua rentang yang mungkin dimaksud. Satuan perlakuan provinsi-hari (Q8). Semua kab di provinsi itu ber-D = 1 pada hari itu; kab tidak diklaim sebagai tempat semai.
- **Hasil primer.** Hujan harian kab CHIRPS (rata-rata sel dalam poligon, hari UTC), sama dengan `efek.py` (P, Q1).
- **Kovariat dan kontrafaktual.** Prakiraan IFS harian di pusat kab (Open-Meteo historical-forecast `ecmwf_ifs025`, `efek.ambil_ifs`).
  Hanya tersedia sejak 3 Feb 2024 (KEPUTUSAN D11); provinsi-hari sebelumnya dibuang dan jumlahnya dilaporkan.
- **Kontrol.** Kab-hari di provinsi tanpa periode OMC jenis apa pun hari itu, bukan provinsi bertetangga dengan provinsi ber-D = 1 hari
  itu (penyangga). Hari ber-OMC jenis `Pengisian Waduk` (tujuan menambah hujan) dibuang dari kontrol dan perlakuan di provinsi itu.
- **Estimator.** Efek tetap kab dan hari, `y = a_kab + g_hari + b D + c IFS + e`, lewat `efek.resid()` dan `efek.ols()`; galat baku
  klaster per provinsi-periode (satu baris BMKG = satu klaster; hari kontrol diklaster per provinsi-bulan).
- **Inferensi utama.** Permutasi blok: tiap periode provinsi dipindah ke tanggal mulai acak di bulan kalender yang sama pada tahun lain
  dalam data, tanpa beririsan periode OMC apa pun; 2.000 ulangan, benih `20261125`.
- **Plasebo waktu.** Pola perlakuan yang sama digeser tepat satu tahun ke belakang (tanggal yang sama, tahun sebelumnya, hanya
  provinsi-hari tanpa OMC).
- **Plasebo ruang.** Pola hari perlakuan diterapkan ke provinsi acak di pulau yang sama tanpa OMC hari itu, 300 ulangan; laporkan
  galat tipe I.
- **Hasil sekunder.** ln(1 + mm); indikator hujan >= 50 mm; anomali CHIRPS dikurangi IFS. Tidak ada hasil "hujan di zona" karena
  Lapis A tidak punya zona.
- **Rincian eksploratori.** DKI Jakarta, Jawa Barat, Banten sendiri; per operator (`BMKG`, `BRIN`, `Operator Swasta`); koreksi Holm.

### 9.2 Lapis B: sasaran-hari dari target renlap (prospektif)

- **Perlakuan (niat semai).** Sasaran-hari `(k, d)`: ada baris aktif `op_semai_target` dengan `zona_id` berawalan `-B`, `d` = `hari_sasaran`
  yang ditulis server ke `alasan_json` dari arsip `_banjir` (bukan kolom `tanggal` yang dikirim klien, `src/operasi_semai.js` `buat`),
  dan `k` tercatat di sasaran zona (`alasan_json`, diambil server dari arsip). Ini niat Pusdalops, bukan bukti pesawat terbang.
  Subkelompok **terkonfirmasi BMKG**: provinsi `k` punya periode `Pengurangan CH - Bencana` aktif pada `d`.
- **Pembanding cocokan.** Untuk tiap sasaran-hari, sampai 5 kab-hari yang: bukan sasaran target hari itu, di provinsi tanpa OMC apa pun
  hari itu, bukan tetangga berbatasan kab perlakuan, bulan sama, pulau sama, dan prakiraan IFS harian paling dekat (selisih absolut
  terkecil, dalam desil prakiraan yang sama); tanpa pengembalian, benih `20261125`.
- **Estimator.** TWFE seperti 9.1 pada panel perlakuan dan pembanding, klaster per hari, permutasi label D antar hari 2.000 kali.
- **Hasil sekunder (arah yang diharapkan naik).** Hujan IMERG Late harian (CHIRPS hanya mencakup daratan, sedangkan zona cegat sering
  di laut) rata-rata dalam 25 km titik hujan zona yang dijadikan target, lawan sel
  pembanding yang lolos gerbang awan di langkah yang sama tetapi tidak terpilih dan berjarak >= 40 km dari semua zona.
- **Plasebo.** Waktu: D digeser 7 hari ke belakang. Ruang: pola hari perlakuan diterapkan ke kab acak satu pulau tanpa target.
- **Ambang tampil.** Vonis hanya bila n perlakuan dan jumlah hari mencapai ambang RENCANA-UJI §6; sebelumnya "data kurang
  (n = x dari sekitar 250 yang dibutuhkan)".

### 9.3 Kekuatan statistik

MDE (daya 80%, alfa 5% dua sisi) = 2,8 x simpangan baku taksiran permutasi, dalam persen terhadap rata-rata kontrafaktual kelompok
perlakuan (P). Selalu dilaporkan. Efek sasaran yang ingin bisa dilihat adalah 30%; MDE di atas 30% membuat hasil tak bermakna
berlabel "tidak informatif" (RENCANA-UJI §6.3). Perkiraan kebutuhan n di RISET §4: sekitar 250 sampai 3.000 sasaran-hari untuk pengurangan 20 sampai
30%. Uji karhutla Okt 2026 mencapai MDE 106% dengan 109 kab-hari; penguji ini berangkat dari harapan yang sama rendahnya.

### 9.4 Yang tidak bisa dijawab penguji

1. Sebab-akibat (tanpa randomisasi, Q11).
2. Apakah pesawat benar terbang ke zona usulan, jam berapa, berapa kg (tidak ada log sortie berjam dan berkoordinat; K3).
3. Kab mana di provinsi yang sebenarnya disasar BMKG (Lapis A).
4. Hujan jam-an dan waktu hujan relatif terhadap semai (CHIRPS harian, hari UTC).
5. Ke mana hujan yang "dilepas" jatuh di laut (CHIRPS tidak mencakup laut; hasil sekunder Lapis B memakai IMERG harian dan tanpa
   `EARTHDATA_TOKEN` berstatus `data_kurang`).
6. Banjir itu sendiri: hujan lebih rendah tidak sama dengan banjir lebih kecil; penguji tidak menilai genangan atau kejadian.
