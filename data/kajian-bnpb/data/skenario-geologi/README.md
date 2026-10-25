# Paket `skenario-geologi`: skenario terburuk gempa, tsunami, dan gunung api per kab/kota

Bahan Bab 6 Kajian Mitigasi (bencana geologi: kartu skenario terburuk yang masuk akal, tabel kerusakan pola Nankai,
analisis kepekaan) dan Lampiran C/F/G. Horizon 2026–2030, tanpa pagu atau biaya proyek.

**Membangun ulang:** `node data/kajian-bnpb/bangun/skenario-geologi.mjs` (node 22, `sharp` dari `node_modules` repo, ±20 detik).
Skrip menulis semua berkas di folder ini, lalu menjalankan self-check `assert` dan keluar non-nol bila satu invarian rusak.
Keluaran terakhir: `self-check hijau`. Prasyarat lokal yang **tidak dilacak git**: `data/raw/gunungapi/krb.geojson` dan
`data/raw/gunungapi/pop_piksel.json` (diunduh `scripts/gunungapi/paparan.py`). Ubin DEM terrarium untuk Merapi diunduh sekali
dari `s3.amazonaws.com/elevation-tiles-prod` lalu disimpan di `data/raw/terrarium/` (juga tidak dilacak git).

## 1. Mana angka utama, mana ilustrasi

| Butir | Angka utama di naskah (resmi/literatur) | Peran keluaran platform paket ini |
| --- | --- | --- |
| Penduduk terpapar tsunami nasional | **5.341.282 jiwa** (KRB 2022–2026; `riset/mentah/ks_tsunami.json`, riset A §1.4) | Ilustrasi per skenario: jiwa kecamatan pesisir rendah dengan tiba ≤ 30 menit (Jawa 2,9 jt; Mentawai 0,93 jt; Sumba 1,35 jt). Proksi, **bukan genangan** |
| Penduduk terpapar gempa nasional | **272.405.410 jiwa** (KRB 2022–2026) | Ilustrasi: jiwa per kelas MMI untuk satu kejadian |
| Penduduk terpapar gunung api nasional | **5.864.711 jiwa** (KRB 2022–2026) | 30 gunung di `paparan.json`: 866.389 jiwa di KRB III+II+I dalam 20 km (beda cakupan: 30 gunung, radius 20 km) |
| Zona dan penduduk KRB per gunung | **KRB PVMBG 2018** × WorldPop 2026 (`paparan.json`) | Dipecah ke kab/kota; jumlahnya **sama persis** dengan `paparan.json` (self-check) |
| Magnitudo maksimum megathrust | **Jawa 9,1; Mentawai/Enggano 8,9** (Peta Gempa 2024, sekunder riset A §6). Tabel Mmaks PuSGeN 2017 tidak dibuka | Skenario platform lebih kecil: 8,5 / 8,8 / 8,3 (`public/gempa/sim.js` DIKENAL) |
| Tinggi tsunami terburuk selatan Jawa | **~20 m Jabar selatan, ~12 m Jatim selatan, rata-rata maks 4,5 m** (Widiyantoro dkk. 2020, ITB/BMKG; abstrak) | Tinggi indikatif atas (Abe 1995 ×2): 14,2 m Jabar/Banten, 22,3 m Jatim. Bukan run-up |
| Genangan tsunami | Layer `Inun_7_8_Mw`…`Inun_9_0_Mw` InaRISK (ada; cakupan belum dicek) | Platform **tidak** menghitung genangan |
| Korban historis | **DIBI** (Merapi 2010: 386; Cianjur 2022: 602; Mentawai 2010: 447; Sulteng 2018: 4.141) | Dipakai sebagai rasio analog |
| Korban, rumah rusak, pengungsi skenario | Tidak ada angka resmi per skenario | **Semua angka skenario = estimasi-model**, selalu rentang, galat tercatat |

Aturan pakai di naskah: angka resmi di badan teks; angka platform hanya di kartu skenario dan lampiran, ditulis
"simulasi skenario Pantau Bencana, belum divalidasi", dua angka bermakna, selalu sebagai rentang.

## 2. Berkas

| Berkas | Isi | Baris | Label utama | Keterbatasan |
| --- | --- | --- | --- | --- |
| `ringkasan.csv` | Tabel kerusakan nasional per skenario (pola Nankai): paparan, rumah RB/RS/RR, korban (mesin dan analog), tsunami 20/50/70%, pengungsi, kerugian materiil, YLL, hari-mengungsi. Kolom `rendah,tengah,tinggi,satuan,label,catatan` | 78 | campuran, per baris | Lihat §4 |
| `gempa_kab.csv` | 3 skenario × 514 kab: penduduk, MMI maks, jiwa per kelas MMI, jiwa MMI ≥ VII (pita), luas MMI ≥ VI/VII, rumah RB/RS/RR (pita), korban mesin dan analog, pengungsi, hari-mengungsi 7/30/90, kerugian stimulan (pita), YLL, sekolah dan faskes MMI ≥ VII | 1.542 | estimasi-model | rumah = jiwa/3,9; sekolah/faskes hanya 9 provinsi (kosong = tidak tercakup) |
| `tsunami_kab.csv` | 3 skenario × 514 kab: tiba (tampilan ×0,85 dan sisi aman ×0,61), tinggi indikatif, panjang pantai total dan < 30 menit, jiwa pesisir rendah (≤ 180 dan ≤ 30 menit), jiwa tak sempat jalan kaki, korban pada evakuasi segera 20/50/70% | 1.542 | estimasi-model | tanpa genangan; proksi seluruh penduduk kecamatan |
| `merapi2010_kab.csv` | Merapi setara 2010 per kab: jiwa di sapuan (H/L 0,15 dan 0,18), luas sapuan dan awan panas, rumah di sapuan, sekolah/faskes di sapuan, pengungsi radius 20 km, korban/rumah analog, kerugian, YLL, dan angka DIBI 2010 per kab sebagai pembanding | 6 | estimasi-model + resmi | lihat §5.3 |
| `gunungapi_krb_kab.csv` | 30 gunung × kab: jiwa KRB III/II/I, luas KRB (ha), sekolah/faskes KRB III/II, rumah KRB III, korban/RB/pengungsi/kerugian pola historis, hari-mengungsi 30, YLL | 65 | resmi (zona) + estimasi-model (turunan) | sekolah/faskes zona I tidak berkoordinat di `paparan.json` |
| `analog.csv` | Kejadian analog: meninggal, sumber, versi lain, paparan model, rasio | 10 | resmi/terverifikasi | paparan dihitung dengan penduduk 2026 |
| `kepekaan.csv` | Tuas: porsi evakuasi segera 20/50/70%, kepatuhan bangunan (3 varian), jam kejadian | 21 | asumsi-kebijakan / estimasi-model | |
| `pembanding_pdna.csv` | Stimulan batas bawah dari rumah rusak DIBI vs angka kerugian kejadian nyata; cek aturan pengungsi | 4 | resmi (DIBI) + sekunder (angka kerugian) | angka PDNA/R3P final tidak ditemukan |
| `pembanding_resmi.csv` | Rekonsiliasi dengan skenario resmi/literatur riset A §6 dan KRB 2022–2026 | 12 | resmi/sekunder | |
| `skenario.json` | Definisi skenario (parameter, bidang patahan), asumsi, rasio analog, **kamus kolom (label + sumber tiap kolom)**, selisih KRB | – | – | |
| `peta_kab.json` | 346 kab terdampak: ringkasan per skenario untuk peta. Gabung ke `public/geo/kabupaten/<prov>.json` lewat (`prov`, `kab`) → kode | – | sama dengan CSV | tanpa geometri (pakai berkas geo repo) |
| `jejak.geojson` | Bidang patahan 3 skenario + titik pantai dengan tiba sisi aman ≤ 30 menit (1.015 titik) | – | estimasi-model | titik = sel ETOPO 3′ |

Semua CSV UTF-8, pemisah koma, titik desimal. Sel kosong = tidak berlaku/tidak tercakup (bukan nol). Kode kab = Kemendagri 4 digit
(`scripts/udara/kota.json`, Kepmendagri 300.2.2-2138/2025). Rupiah dalam **juta rupiah**.

## 3. Masukan dan tanggal tarik

| Masukan | Isi | Tanggal | Label |
| --- | --- | --- | --- |
| `public/gempa/{guncangan,kerusakan,tsunami}.js`, `public/gempa/sim.js` | Mesin guncangan (BSSA14/Zhao06 + Worden 2012), kerusakan HAZUS + kalibrasi, tsunami (Dijkstra, Abe 1995); skenario DIKENAL | repo 23 Okt 2026 | estimasi-model |
| `public/gempa/data/{model_guncangan,kalibrasi_kerusakan,vs30,batimetri,sesar}` | Parameter GMPE, kalib 3,0586 dan faktor LOO 5,341 (8 gempa kerak), Vs30, ETOPO 2022 3′, sesar GEM + palung | 20 Okt 2026 (kalibrasi) | estimasi-model |
| `public/gempa/data/factsheet_gempa.json`, `riwayat_m5.json` | Korban gempa besar (USGS/BNPB, dicocokkan 19 Okt 2026); katalog USGS (parameter analog tsunami) | 19 Okt 2026 | terverifikasi |
| `public/gunungapi/{sim_lahar,sim_tanggap}.js`, `scripts/gunungapi/cek_merapi2010.mjs` | LAHARZ + kerucut energi H/L, paparan piksel | repo | estimasi-model |
| `public/gunungapi/data/paparan.json` | KRB PVMBG 2018 × WorldPop per gunung, sekolah/faskes OSM | 19 Okt 2026 | resmi (zona) |
| `data/raw/gunungapi/krb.geojson`, `pop_piksel.json` (lokal) | Poligon KRB utuh (geoportal ESDM) dan piksel WorldPop 1 km tak dibulatkan | 18–19 Okt 2026 | resmi / terverifikasi |
| `public/data/penduduk.json` | WorldPop Global2 R2025A penduduk 2026 per kecamatan (286.674.532 jiwa di poligon) | – | terverifikasi |
| `public/data/sekolah.json`, `fasilitas.json` | Sekolah Dapodik/EMIS, faskes OSM; 9 provinsi (14, 15, 16, 53, 61, 62, 63, 64, 93) | – | terverifikasi |
| `public/banjir/data/param_banjir.json` | Stimulan rumah Rp60/30/15 jt (Cianjur 2022, kemenkopmk.go.id/node/3416; Satgas PRR 2025–26); skema lama 50/25/10 | – | asumsi-kebijakan |
| `data/kajian-bnpb/riset/mentah/dibi_baris.json`, `dibi_2025.json` | Baris DIBI per kab (2010, 2018, 2020–2022, 2025) | 23 Okt 2026 | resmi |
| `data/kajian-bnpb/riset/mentah/ks_{tsunami,gempabumi,letusan-gunungapi}.json` | API-KRB kajian-summary nasional | 23 Okt 2026 | resmi |
| Riset A §4.4, §6; riset C §1.1, §3.3 | Korban kejadian besar, skenario resmi, Nankai 2025, angka kerugian kejadian | 23 Okt 2026 | resmi/sekunder |

## 4. Metode

### 4.1 Skenario megathrust
Tiga skenario `public/gempa/sim.js` (baris 24–26) dijalankan lewat jalur yang sama dengan layar: titik palung terdekat bujur
acuan di `sesar.geojson`, bidang patahan Strasser 2010 digeser setengah lebar ke arah darat, kedalaman 25 km, jenis antarmuka.
Skrip membaca magnitudo langsung dari `sim.js` dan menolak jalan bila bukan 8,5 / 8,8 / 8,3. Audit 21 Okt mencatat magnitudo
skenario **tidak bersumber per baris**; jejak disebut "perkiraan dari peta PuSGeN 2017/literatur" di komentar berkas.

| Skenario | Pusat bidang | Strike | Panjang × lebar | Jendela |
| --- | --- | --- | --- | --- |
| Megathrust selatan Jawa M8,5 | −9,83; 110,72 | 278° | 313 × 122 km | 556 km |
| Megathrust Mentawai M8,8 | −3,02; 99,85 | 320,5° | 469 × 156 km | 634 km |
| Megathrust selatan Bali–Sumba M8,3 | −10,89; 116,52 | 275° | 239 × 104 km | 520 km |

Okupansi rumah 0,85 (tanpa jam, sama dengan layar). Rumah = jiwa/3,9 (`kerusakan.js`), **bukan data bangunan**.

### 4.2 Korban jiwa: dua jalur, keduanya rentang
1. **Pita mesin** `kerusakan.js` [rendah, tengah, tinggi]. Galat leave-one-out tercatat **×5,3** (`kalibrasi_kerusakan.json`, korban kalibrasi
   ditulis dari ingatan); audit 21 Okt: tidak layak untuk gempa nyata. Ditampilkan sebagai pembanding saja.
2. **Rasio historis analog** (dipakai sebagai angka skenario): korban = jiwa MMI ≥ VII × rasio meninggal/terpapar kejadian analog.
   Paparan analog dihitung dengan **mesin dan penduduk yang sama**, jadi bias paparan sebagian saling meniadakan.
   Rendah = rasio minimum × paparan pita rendah, tengah = median × paparan tengah, tinggi = maksimum × paparan pita tinggi.

| Analog guncangan | Meninggal (sumber) | Jiwa MMI ≥ VII (mesin) | Rasio |
| --- | --- | --- | --- |
| Yogyakarta 2006 M6,3 | 5.749 (USGS, factsheet) | 2.505.111 | 0,229% |
| Mamuju–Majene 2021 M6,2 | 107 (DIBI) | 62.705 | 0,171% |
| Lombok 5 Agu 2018 M6,9 | 528 (DIBI tanggal itu) | 978.191 | 0,054% |
| Cianjur 2022 M5,6 | 602 (DIBI) | 1.514.760 | 0,040% |
| Padang 2009 M7,6 (slab) | 1.117 (USGS, factsheet) | 5.246.327 | 0,021% |
| Pasaman 2022 M6,1 | 27 (DIBI) | 164.227 | 0,016% |

Rasio guncangan: **0,016% / 0,047% (median) / 0,229%**. Pidie Jaya 2016 tidak dipakai (korban belum terverifikasi);
Sulteng 2018 tidak dipakai (gabungan tsunami dan likuefaksi).

**Tsunami.** Paparan proksi = penduduk kecamatan pesisir rendah (pusat kecamatan di sel ETOPO ≤ 10 m, pantai terdekat dengan
tinggi indikatif atas ≥ 0,5 m: aturan evakuasi `sim.js`) yang dicapai gelombang ≤ 30 menit (waktu sisi aman ×0,61). Ini
**batas atas paparan, bukan genangan**. Rasio dari dua analog dengan geometri yang bisa dijalankan mesin:
Mentawai 2010 (447 meninggal DIBI / 164.912 = 0,271%) dan Pangandaran 2006 (665, rincian USGS dijumlah / 2.172.924 = 0,031%).
Tengah = rerata geometrik 0,091%. Aceh 2004 tidak dipakai: bidang patahan ±1.300 km tak bisa diwakili satu persegi
berpusat di episenter, dan angka korbannya regional (sekunder).

**Gunung api.** Rasio per jiwa KRB III `paparan.json`: Semeru 2021 (64 meninggal / 9.304 = 0,69%) dan Merapi 2010
(386 / 34.582 = 1,12%); rumah RB 7,1–10,1 per 100 jiwa KRB III; pengungsi 1,1–13 kali jiwa KRB III.

### 4.3 Kepekaan
- **Porsi evakuasi segera (tsunami):** rasio analog dianggap setara 20% evakuasi segera (asumsi dasar Nankai). Faktor dari
  perkiraan Nankai 2025 (Cabinet Office via JST *Science Japan*, sekunder): 215.000 kematian tsunami pada 20%, 94.000 pada 70%.
  Faktor 50% = interpolasi linear (asumsi). Hasil: **×1 / ×0,662 / ×0,437**.
- **Kepatuhan bangunan:** porsi stok `kerusakan.js` (tembok tanpa tulangan / beton-tembok terkekang / kayu) 40/30/30 → 20/50/30 → 0/70/30.
  Faktor korban mesin: Jawa 0,60 / 0,20; Mentawai 0,68 / 0,36; Sumba 0,58 / 0,15, lalu diterapkan ke korban analog.
  Kelas "beton" di mesin tetap kurva pre-code, jadi manfaat kepatuhan penuh kemungkinan **terlalu kecil**.
- **Jam kejadian:** malam (okupansi 0,99) = ×1,16 korban guncangan.

### 4.4 Pengungsi, kerugian, imateriil
- Pengungsi gempa = (RB + RS tengah) × 3,9. Cek ke DIBI (`pembanding_pdna.csv`): Cianjur 117.195 vs 115.382 nyata; Lombok 425.233 vs
  406.202; Sulteng 245.954 vs 221.450.
- Kerugian materiil batas bawah = RB × 60 + RS × 30 + RR × 15 juta (stimulan rehab rumah BNPB), **bukan kerugian ekonomi penuh**.
  Pada kejadian nyata, angka kerugian yang dilaporkan = **1,7–3,8 kali** stimulan dari rumah rusak DIBI (Lombok 1,69; Cianjur 2,32;
  Sulteng 3,81; angka kerugian sekunder/sementara). Pengali ini pembanding, tidak dikalikan ke skenario.
- Imateriil non-rupiah: jiwa mengungsi, hari-mengungsi (× 7/30/90 hari, asumsi), sekolah dan faskes terpapar (bila datanya ada),
  dan YLL = korban × sisa harapan hidup 25/35/45 tahun (asumsi; UHH BPS 2024 70,32 laki-laki / 74,21 perempuan dari ringkasan
  pencarian bps.go.id, tabel tidak terbuka langsung; umur korban tidak tersedia).

## 5. Hasil kunci (dua angka bermakna untuk naskah)

| Butir | Jawa M8,5 | Mentawai M8,8 | Bali–Sumba M8,3 |
| --- | --- | --- | --- |
| Jiwa MMI ≥ VI / ≥ VII (tengah) | 17 jt / 0 (pita tinggi 5,5 jt) | 9,6 jt / 3,9 jt | 0 / 0 |
| Luas MMI ≥ VI | 17.000 km² | 81.000 km² | 120 km² |
| Rumah rusak berat (pita) | 2.600–220.000 (tengah 25.000) | 6.800–350.000 (50.000) | 81–9.300 (930) |
| Korban guncangan, analog | 0–13.000 (tengah 0) | 200–17.000 (1.800) | 0 |
| Korban guncangan, mesin | 29–3.000 (310) | 120–6.600 (900) | 1–110 (10) |
| Korban tsunami, evakuasi 20% | 900–7.900 (2.700) | 280–2.500 (850) | 410–3.700 (1.200) |
| … evakuasi 50% / 70% (tengah) | 1.800 / 1.200 | 560 / 370 | 820 / 540 |
| Jiwa pesisir rendah tiba ≤ 30 menit | 2,9 jt | 0,93 jt | 1,35 jt |
| Panjang pantai tiba < 30 menit | 850–1.400 km | 1.400–2.100 km | 1.300–2.000 km |
| Pengungsi (RB+RS) | 430.000 | 560.000 | 20.000 |
| Kerugian materiil batas bawah | Rp7,1 T (0,8–54 T) | Rp8,1 T (1,2–53 T) | Rp0,35 T (0,04–3,0 T) |

**Merapi setara 2010** (V 10 juta m³, H/L 0,15; awan panas 17,6 km, lahar 21,1 km): 90.000 jiwa di area sapuan tanpa evakuasi
(H/L 0,18: 35.000), 8.000 ha; korban dengan pola evakuasi 2010 347–386; rumah RB/RS/RR 2.465/158/296 (DIBI); kerugian batas bawah
Rp0,16 T; penduduk radius 20 km 1,55 juta (DIBI 2010 mengungsi 447.982).

**KRB 30 gunung:** 86.614 jiwa KRB III, 297.012 KRB II, 482.762 KRB I (= `paparan.json`). Bila semua mengalami erupsi besar dengan pola
Semeru 2021–Merapi 2010: korban 600–970, RB 6.200–8.800, pengungsi 98.000–1,1 juta. Ini **jumlah maksimum lintas gunung**, bukan satu kejadian.

## 6. Kejanggalan yang wajib dibaca sebelum mengutip

1. **Megathrust Jawa M8,5 dan Sumba M8,3 tidak menghasilkan MMI ≥ VII di pusat kecamatan mana pun** (maks VI dan V). Bidang
   patahan mesin seluruhnya di laut (pusat −9,8° dan −10,9°), dan GMPE Zhao 2006 antarmuka meluruh cepat. Akibatnya korban guncangan
   analog tengah = 0, sementara mesin kerusakan tetap memberi 310 dan 10 korban dari kurva kerapuhan pada MMI VI. Untuk naskah: risiko
   utama skenario selatan Jawa dan Sumba di platform adalah **tsunami**, bukan guncangan; ini bertentangan dengan pengalaman Yogyakarta
   2006 (gempa kerak, bukan megathrust) dan belum diuji (`model_guncangan.json` `kinerja_uji` = `belum_diuji`).
2. **Sebaran Merapi per kab tidak cocok dengan 2010.** Model menaruh 51% paparan sapuan di Magelang, 25% Klaten, 25% Sleman;
   korban nyata 72% di Sleman (Kali Gendol). Korban analog per kab dibagi menurut porsi model, jadi sebaran per kab hanya ilustrasi.
3. **Radius 20 km Merapi = 1,55 juta jiwa**, 3,5 kali pengungsi DIBI 2010 (447.982). Dipakai sebagai batas atas pengungsi.
4. **Proksi pesisir rendah melewatkan kecamatan yang pusatnya tinggi** (contoh skenario Jawa: Malang, Blitar, Tulungagung, Gunungkidul
   = 0 walau tiba 14–18 menit) dan **menghitung seluruh penduduk kecamatan** yang pusatnya rendah (Cilacap, Kebumen, Kota Bengkulu).
   Korban tsunami per kab karena itu orde besaran.
5. **Tinggi indikatif** (Abe 1995 ×2) memberi 22 m di Jatim untuk M8,5, lebih tinggi dari ~12 m Widiyantoro dkk. untuk skenario yang
   lebih besar, dan 14 m di Jabar (literatur ~20 m). Jangan dipakai sebagai run-up.
6. **Rasio analog memakai penduduk 2026** untuk kejadian 2006–2022 (penduduk saat kejadian lebih kecil → rasio sedikit terlalu kecil).

## 7. Self-check (`assert`, gagal = exit non-nol)

- 514 kab/kota, 119 di Jawa; tiap kab punya poligon; 514 baris per skenario di `gempa_kab.csv` dan `tsunami_kab.csv`.
- Penduduk kab = jumlah kecamatan = `penduduk.json` total − di luar poligon (286.674.532).
- Per skenario: jiwa per kab = jiwa per kecamatan; RB/RS/RR/korban tengah per kab = nasional; jiwa MMI ≥ VII per kab = nasional.
- Magnitudo skenario = sim.js (8,5 / 8,8 / 8,3); tsunami mencapai pantai; kepatuhan bangunan naik tidak menambah korban.
- Rasio analog positif dan berhingga; faktor Nankai ×1 pada 20% dan 94.000/215.000 pada 70%.
- DIBI: Merapi 2010 = 386, Cianjur = 602, Mentawai 2010 = 447, Sulteng 2018 = 4.141 (riset A: 4.140).
- Merapi H/L 0,15 terpapar = 89.707 ± 2% (`cek_merapi2010.mjs`, `sim.js:355`); jiwa per kab = total.
- KRB: jumlah per kab tiap gunung dan zona = `paparan.json` (selisih ≤ 1 jiwa, pembulatan).
- Semua kode kab dikenal; tidak ada NaN atau tak hingga di semua angka yang ditulis.

## 8. Celah

- **Gempa sesar darat dekat kota besar tidak dibuat.** Mmaks PuSGeN 2017 tidak bisa dibuktikan di sesi ini: PDF buku
  (`luk.tsipil.ugm.ac.id/gempa/pdf/Pusgen2017PetaGempaIndonesia.pdf`, 37,6 MB) melebihi batas baca dan tidak diunduh tanpa izin;
  pencarian hanya menemukan Lembang M6,8 dari siaran pers BMKG tanpa menyebut PuSGeN. `sim.js` punya Lembang 6,8 / Cimandiri 6,9 /
  Opak 6,6 tanpa sumber per baris. Mesin mendukung (sesar geser, garis jejak); tinggal tabel Mmaks.
- Luka-luka tidak dimodelkan. Genangan tsunami tidak dihitung (layer InaRISK `Inun_*` ada, belum dibuka).
- Data bangunan tidak ada untuk zona skenario (Open Buildings hanya Kalteng); rumah = jiwa/3,9.
- Sekolah dan faskes terpapar gempa hanya 9 provinsi; tidak satu pun di Jawa, Sumbar, Bengkulu, Bali, NTB.
- Angka PDNA/R3P final Lombok, Sulteng, Cianjur, Merapi 2010 tidak ditemukan; pembanding memakai angka sementara/media.
- Geometri analog guncangan (strike, jenis) dari `kalibrasi_kerusakan.json` yang ditulis dari ingatan; korbannya sudah diganti ke DIBI/USGS.
- Nankai 50% interpolasi; Nankai sendiri sekunder (JST, bukan dokumen Cabinet Office).
- Mmaks Bali–Sumba tidak ditemukan di riset.
