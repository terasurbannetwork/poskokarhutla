# Paket `skenario-geologi`: skenario ilustratif platform (magnitudo di bawah Mmaks) dan kepekaan Mmaks untuk gempa, tsunami, dan gunung api per kab/kota

Bahan Bab 6 Kajian Mitigasi (bencana geologi: tabel kerusakan pola Nankai dan analisis kepekaan) serta Lampiran C/F/G.
Horizon 2026–2030, tanpa pagu atau biaya proyek.

**Bingkai.** Kerangka Bab 6 meminta "kartu skenario terburuk". Paket ini **belum** memenuhinya. Tiga skenario dasar memakai
magnitudo `public/gempa/sim.js` (8,5 / 8,8 / 8,3), dan ketiganya di bawah Mmaks yang dikutip paket ini sendiri (Jawa 9,1;
Mentawai/Enggano 8,9; Bali–Sumba tanpa sumber). Karena itu skenario dasar disebut **skenario ilustratif platform**. Dua varian
**kepekaan Mmaks** (`jawa-mmaks` M9,1, `mentawai-mmaks` M8,9) memakai geometri yang sama dan hanya mengganti magnitudo. Kartu
terburuk yang layak dikutip masih menunggu dua hal: dokumen Peta Gempa/PuSGeN 2024 dibuka, dan layer genangan InaRISK `Inun_*` dipakai.

**Membangun ulang:** `node data/kajian-bnpb/bangun/skenario-geologi.mjs` (node 22, `sharp` dari `node_modules` repo, ±25 detik).
Skrip menulis semua berkas di folder ini, lalu menjalankan self-check `assert` dan keluar non-nol bila satu invarian rusak.
Keluaran terakhir: `self-check hijau`. Ada prasyarat lokal yang **tidak dilacak git**: `data/raw/gunungapi/krb.geojson` dan
`data/raw/gunungapi/pop_piksel.json` (diunduh `scripts/gunungapi/paparan.py`). Ubin DEM terrarium untuk Merapi diunduh sekali
dari `s3.amazonaws.com/elevation-tiles-prod`, lalu disimpan di `data/raw/terrarium/` (juga tidak dilacak git).

## 1. Mana angka utama, mana ilustrasi

| Butir | Angka pembanding utama (label per baris) | Peran keluaran platform paket ini |
| --- | --- | --- |
| Penduduk terpapar tsunami nasional | **5.341.282 jiwa** (resmi; KRB 2022–2026, `riset/mentah/ks_tsunami.json`, riset A §1.4) | Ilustrasi per skenario: jiwa kecamatan pesisir rendah dengan tiba ≤ 30 menit (Jawa 2,9 jt; Mentawai 0,93 jt; Sumba 1,35 jt; Jawa M9,1 3,4 jt). Proksi, **bukan genangan** |
| Penduduk terpapar gempa nasional | **272.405.410 jiwa** (resmi; KRB 2022–2026) | Ilustrasi: jiwa per kelas MMI untuk satu kejadian |
| Penduduk terpapar gunung api nasional | **5.864.711 jiwa** (resmi; KRB 2022–2026) | 30 gunung di `paparan.json`: 866.389 jiwa di KRB III+II+I dalam 20 km (beda cakupan: 30 gunung, radius 20 km) |
| Zona dan penduduk KRB per gunung | **KRB PVMBG 2018** × WorldPop 2026 (`paparan.json`; resmi (zona) × terverifikasi (penduduk)) | Dipecah ke kab/kota. Baris ringkasan = jumlah `paparan.json`; jumlah `gunungapi_krb_kab.csv` selisih ≤ 3 jiwa karena pembulatan per baris (self-check) |
| Magnitudo maksimum megathrust | **Jawa 9,1; Mentawai/Enggano 8,9** (Peta Gempa 2024). **Literatur sekunder** (riset A §6: tektonesiana/katadata/CNBC); dokumen PuSGeN 2024 belum dibuka. Tabel Mmaks PuSGeN 2017 juga tidak dibuka | Skenario dasar lebih kecil: 8,5 / 8,8 / 8,3 (`sim.js` DIKENAL). Kepekaan memakai 9,1 dan 8,9 |
| Tinggi tsunami terburuk selatan Jawa | **~20 m Jabar selatan, ~12 m Jatim selatan, rata-rata maks 4,5 m** (Widiyantoro dkk. 2020, ITB/BMKG; abstrak, sekunder) | Tinggi indikatif atas (Abe 1995 ×2): 14,2 m Jabar/Banten dan 22,3 m Jatim (M8,5); 53,3 m (M9,1). Bukan run-up, jangan dikutip |
| Genangan tsunami | Layer `Inun_7_8_Mw`…`Inun_9_0_Mw` InaRISK (resmi, keberadaan layer; cakupan belum dicek) | Platform **tidak** menghitung genangan |
| Korban historis | **DIBI** (resmi; Merapi 2010: 386; Cianjur 2022: 602; Mentawai 2010: 447; Sulteng 2018: 4.141) | Dipakai sebagai rasio analog |
| Korban, rumah rusak, pengungsi skenario | Tidak ada angka resmi per skenario | **Semua angka skenario = estimasi-model**, selalu rentang, galat tercatat. Korban tsunami = **orde besaran, belum layak dikutip** |

Catatan API-KRB (`riset/mentah/ks_*.json`, ditarik 23 Okt 2026). Angka "terpapar" adalah kolom *penduduk terpapar* RENAS
2025–2029 Tabel 2.x (cocok dengan riset A §1.4). Untuk gempa, 272.405.410 **melampaui** `wilayah_penduduk` 271.680.290 di record
yang sama. Artinya angka itu praktis seluruh penduduk, dengan basis yang berbeda. API juga punya field `jiwa_terpapar` yang
**artinya belum dikonfirmasi**: tsunami 4.252.077, gempa 131.881.978, gunung api 1.000.037. Ketiganya dicantumkan di
`pembanding_resmi.csv` tanpa ditafsirkan.

Aturan pakai di naskah: angka resmi di badan teks; angka platform hanya di kartu skenario dan lampiran, ditulis
"simulasi skenario Pantau Bencana, belum divalidasi", dua angka bermakna, selalu sebagai rentang. Korban tsunami platform
**tidak** dikutip sampai genangan InaRISK dipakai.

## 2. Berkas

| Berkas | Isi | Baris | Label utama | Keterbatasan |
| --- | --- | --- | --- | --- |
| `ringkasan.csv` | Tabel kerusakan nasional per skenario (pola Nankai): paparan, rumah RB/RS/RR, korban (mesin dan analog), tsunami 20/50/70%, pengungsi, kerugian materiil, YLL, hari-mengungsi 7/30/90 (tiga baris). Kolom `skenario,status_magnitudo,butir,rendah,tengah,tinggi,satuan,label,catatan` | 130 | campuran, per baris | Lihat §4 |
| `gempa_kab.csv` | 5 skenario × 514 kab: `status_magnitudo`, penduduk, MMI maks (2 desimal), jiwa per kelas MMI, jiwa MMI ≥ VII (pita), luas MMI ≥ VI/VII, rumah RB/RS/RR (pita), korban mesin dan analog, pengungsi, hari-mengungsi 7/30/90, kerugian stimulan (pita), YLL, sekolah dan faskes MMI ≥ VII | 2.570 | estimasi-model | rumah = jiwa/3,9; sekolah/faskes hanya 9 provinsi (kosong = tidak tercakup); **pita rendah/tinggi per kab tidak aditif** |
| `tsunami_kab.csv` | 5 skenario × 514 kab: tiba (tampilan ×0,85 dan sisi aman ×0,61), tinggi indikatif, panjang pantai total dan < 30 menit, jiwa pesisir rendah (≤ 180 dan ≤ 30 menit), jiwa tak sempat jalan kaki, korban **orde besaran** pada evakuasi segera 20/50/70% | 2.570 | estimasi-model; korban = orde besaran | tanpa genangan; proksi seluruh penduduk kecamatan; lubang proksi §6.4 |
| `merapi2010_kab.csv` | Merapi setara 2010 per kab: jiwa di sapuan (H/L 0,15 dan 0,18), luas sapuan dan awan panas, rumah di sapuan, sekolah/faskes di sapuan, pengungsi radius 20 km, korban/rumah analog, kerugian, YLL, dan angka DIBI 2010 per kab sebagai pembanding. Baris = kab model **digabung** kab DIBI (Kota Magelang ikut, nilai model 0) | 7 | estimasi-model + resmi | lihat §6.2 |
| `gunungapi_krb_kab.csv` | 30 gunung × kab: jiwa KRB III/II/I, luas KRB (ha), sekolah/faskes KRB III/II, rumah KRB III, korban/RB/pengungsi/kerugian pola historis, penduduk ≤ 20 km per gunung, hari-mengungsi 30, YLL | 65 | resmi (zona) × terverifikasi (penduduk) + estimasi-model (turunan) | sekolah/faskes zona I tidak berkoordinat di `paparan.json`; pengungsi = batas atas |
| `analog.csv` | Kejadian analog: meninggal, sumber, versi lain, paparan model, rasio, `catatan_rasio` (normalisasi okupansi / rincian pencocokan per kab), porsi korban di kab berpaparan, `dipakai` | 10 | resmi/terverifikasi | paparan dihitung dengan penduduk 2026 |
| `kepekaan.csv` | Tuas: porsi evakuasi segera 20/50/70%, kepatuhan bangunan (3 varian), jam kejadian | 35 | asumsi-kebijakan / estimasi-model | korban tsunami = orde besaran |
| `pembanding_pdna.csv` | Stimulan batas bawah dari rumah rusak DIBI vs angka kerugian kejadian nyata, juga terhadap skema stimulan saat kejadian; cek aturan pengungsi | 4 | resmi (DIBI) + sekunder (angka kerugian) | angka PDNA/R3P final tidak ditemukan |
| `pembanding_resmi.csv` | Rekonsiliasi dengan skenario resmi/literatur riset A §6 dan KRB 2022–2026 | 12 | resmi/sekunder | |
| `skenario.json` | `bingkai`, definisi skenario (parameter, bidang patahan, `status_magnitudo`), asumsi, rasio analog (tsunami: rincian pencocokan per kab), `lubang_proksi_tsunami`, **kamus kolom (label dan sumber tiap kolom)**, selisih KRB | – | – | |
| `peta_kab.json` | 369 kab terdampak: ringkasan per skenario untuk peta. Gabung ke `public/geo/kabupaten/<prov>.json` lewat (`prov`, `kab`) → kode | – | sama dengan CSV | tanpa geometri (pakai berkas geo repo) |
| `jejak.geojson` | Bidang patahan 5 skenario, ditambah titik pantai dengan tiba sisi aman ≤ 30 menit (1.833 titik) | – | estimasi-model | titik = sel ETOPO 3′ |

Semua CSV UTF-8, pemisah koma, titik desimal di kolom angka (teks catatan memakai koma desimal). Sel kosong = tidak berlaku
atau tidak tercakup (bukan nol). Kode kab = Kemendagri 4 digit (`scripts/udara/kota.json`, Kepmendagri 300.2.2-2138/2025).
Rupiah dalam **juta rupiah**. Kolom `status_magnitudo`: `di bawah Mmaks` (Jawa 8,5, Mentawai 8,8), `tanpa sumber` (Sumba 8,3:
tanpa rujukan dan tanpa Mmaks), `Mmaks (sekunder)` (varian kepekaan).

**Pita tidak aditif.** Pita rendah/tinggi nasional di `ringkasan.csv` dihitung atas semua kecamatan sekaligus. Pita per kab di
`gempa_kab.csv` dihitung per kab (minimum/maksimum diambil per kab), jadi jumlahnya tidak sama dengan pita nasional. Contohnya:
Mentawai RB tinggi Σkab 352.095 vs nasional 350.761, kerugian tinggi Σkab Rp53,41 T vs Rp53,06 T, dan Jawa kerugian rendah Σkab
Rp836.634 juta vs Rp841.608 juta. Hanya kolom **tengah** yang menjumlah ke nasional, dan ini dicek self-check.

## 3. Masukan dan tanggal tarik

Tanggal = commit terakhir berkas di git (`git log -1`) atau field `dibuat`/`versi` di berkas itu.

| Masukan | Isi | Tanggal | Label |
| --- | --- | --- | --- |
| `public/gempa/{guncangan,kerusakan,tsunami}.js`, `public/gempa/sim.js` | Mesin guncangan (BSSA14/Zhao06 + Worden 2012), kerusakan HAZUS + kalibrasi + `okupansi()`, tsunami (Dijkstra, Abe 1995); skenario DIKENAL | sim.js 22 Okt 2026 (a9db9a7f) | estimasi-model |
| `public/gempa/data/{model_guncangan,kalibrasi_kerusakan,vs30,batimetri,sesar}` | Parameter GMPE, kalib 3,0586 dan faktor LOO 5,341 (8 gempa kerak), jam lokal kejadian kalibrasi, Vs30, ETOPO 2022 3′, sesar GEM + palung | 20 Okt 2026 (kalibrasi) | estimasi-model |
| `public/gempa/data/factsheet_gempa.json`, `riwayat_m5.json` | Korban gempa besar (USGS/BNPB, dicocokkan 19 Okt 2026); katalog USGS (parameter analog tsunami) | 19 Okt 2026 | terverifikasi |
| `data/kajian-bnpb/riset/mentah/usp000ensm.geojson` | Event USGS Pangandaran 2006: impact-text dengan rincian korban per kabupaten | diunduh 23 Okt 2026 (`earthquake.usgs.gov/fdsnws/event/1/query?eventid=usp000ensm&format=geojson`) | terverifikasi |
| `public/banjir/data/pusat_kec.json` | Pusat kecamatan: titik guncangan per kecamatan dan proksi pesisir rendah tsunami | 13 Okt 2026 (91afca4f) | terverifikasi |
| `public/geo/kabupaten/*.json` | Poligon kab/kota: luas MMI, penentuan kab titik/piksel | 14 Okt 2026 (acb69a63) | resmi (batas) |
| `scripts/udara/kota.json` | Daftar 514 kab/kota dan kode Kemendagri | 19 Okt 2026 (475bdaf6) | resmi |
| `public/data/meta.json` | Nama provinsi | `dibuat` 12 Okt 2026 (git 13 Okt, 2ae0f44e) | – |
| `public/banjir/data/gunungapi_status.json` | Koordinat puncak 30 gunung (pusat radius 20 km KRB) | `dibuat` 19 Okt 2026 (MAGMA/PVMBG) | resmi |
| `public/gunungapi/data/pop/merapi.json` | Piksel WorldPop 1 km di sekitar Merapi (sapuan dan radius 20 km) | 20 Okt 2026 (e620de8c) | terverifikasi |
| `public/gunungapi/{sim_lahar,sim_tanggap}.js`, `scripts/gunungapi/cek_merapi2010.mjs` | LAHARZ + kerucut energi H/L, paparan piksel | repo | estimasi-model |
| `public/gunungapi/data/paparan.json` | KRB PVMBG 2018 × WorldPop per gunung, sekolah/faskes OSM | `dibuat` 19 Okt 2026 | resmi (zona) × terverifikasi (penduduk) |
| `data/raw/gunungapi/krb.geojson`, `pop_piksel.json` (lokal) | Poligon KRB utuh (geoportal ESDM) dan piksel WorldPop 1 km tak dibulatkan | 18–19 Okt 2026 | resmi / terverifikasi |
| `public/data/penduduk.json` | WorldPop Global2 R2025A penduduk 2026 per kecamatan (286.674.532 jiwa di poligon) | 13 Okt 2026 (872a05f8) | terverifikasi |
| `public/data/sekolah.json`, `fasilitas.json` | Sekolah Dapodik/EMIS, faskes OSM; 9 provinsi (14, 15, 16, 53, 61, 62, 63, 64, 93) | 14 Okt 2026 (b622cd03) / 13 Okt 2026 (872a05f8) | terverifikasi |
| `public/banjir/data/param_banjir.json` | Stimulan rumah Rp60/30/15 jt (Cianjur 2022, kemenkopmk.go.id/node/3416; Satgas PRR 2025–26); skema lama 50/25/10 (2018–2021) | `versi` 13 Okt 2026 | asumsi-kebijakan |
| `data/kajian-bnpb/riset/mentah/dibi_baris.json`, `dibi_2025.json` | Baris DIBI per kab (2010, 2018, 2020–2022, 2025) | 23 Okt 2026 | resmi |
| `data/kajian-bnpb/riset/mentah/ks_{tsunami,gempabumi,letusan-gunungapi}.json` | API-KRB kajian-summary nasional | 23 Okt 2026 | resmi |
| Riset A §4.4, §6; riset C §1.1, §3.3 | Korban kejadian besar, skenario resmi, Nankai 2025, angka kerugian kejadian | 23 Okt 2026 | resmi/sekunder |

## 4. Metode

### 4.1 Skenario megathrust
Tiga skenario `public/gempa/sim.js` (baris 24–26) dijalankan lewat jalur yang sama dengan layar: titik palung terdekat bujur
acuan di `sesar.geojson`, bidang patahan Strasser 2010 digeser setengah lebar ke arah darat, kedalaman 25 km, jenis antarmuka.
Skrip membaca magnitudo langsung dari `sim.js` dan menolak jalan bila bukan 8,5 / 8,8 / 8,3. Audit 21 Okt mencatat magnitudo
skenario **tidak bersumber per baris**; jejak disebut "perkiraan dari peta PuSGeN 2017/literatur" di komentar berkas. Label baris
magnitudo: `asumsi-model (tanpa sumber per baris)`. Varian Mmaks memanggil `bentuk()` yang sama dengan `m` diganti; `sim.js`
tidak diubah. Bali–Sumba tidak punya varian karena Mmaks-nya tidak ditemukan.

| Skenario | Status magnitudo | Pusat bidang | Strike | Panjang × lebar | Jendela |
| --- | --- | --- | --- | --- | --- |
| Megathrust selatan Jawa M8,5 | di bawah Mmaks 9,1 | −9,83; 110,72 | 278° | 313 × 122 km | 556 km |
| Megathrust Mentawai M8,8 | di bawah Mmaks 8,9 | −3,02; 99,85 | 320,5° | 469 × 156 km | 634 km |
| Megathrust selatan Bali–Sumba M8,3 | **tanpa sumber** | −10,89; 116,52 | 275° | 239 × 104 km | 520 km |
| Kepekaan Jawa M9,1 (`jawa-mmaks`) | Mmaks (sekunder) | −9,54; 110,76 | 278° | 702 × 187 km | 751 km |
| Kepekaan Mentawai M8,9 (`mentawai-mmaks`) | Mmaks (sekunder) | −2,99; 99,90 | 320,5° | 536 × 169 km | 668 km |

Okupansi rumah 0,85 (tanpa jam, sama dengan layar). Rumah = jiwa/3,9 (`kerusakan.js`), **bukan data bangunan**.

### 4.2 Korban jiwa
**Guncangan: dua jalur, keduanya rentang.**
1. **Pita mesin** `kerusakan.js` [rendah, tengah, tinggi]. Galat leave-one-out tercatat **×5,3** (`kalibrasi_kerusakan.json`;
   korban kalibrasi ditulis dari ingatan). Audit 21 Okt menilai jalur ini tidak layak untuk gempa nyata, jadi hanya ditampilkan sebagai pembanding.
2. **Rasio historis analog** (dipakai sebagai angka skenario): korban = jiwa MMI ≥ VII × rasio meninggal/terpapar kejadian analog.
   Paparan analog dihitung dengan mesin dan penduduk yang sama. Rasio membawa jam kejadian aslinya, jadi tiap rasio
   **dinormalkan ke okupansi 0,85**: rasio × 0,85 / okupansi(jam kejadian), dengan jam dari `kalibrasi_kerusakan.json` dan
   `okupansi()` dari `kerusakan.js`. Pita memakai **satu sumber ketidakpastian per ujung**, diambil yang lebih ekstrem:
   rendah = min(rasio min × paparan tengah, rasio median × paparan pita rendah); tinggi = maks(rasio maks × paparan tengah,
   rasio median × paparan pita tinggi). Versi lama menumpuk kedua ekor (rasio min × pita rendah), sehingga pita melebar tanpa dasar.
   Membuang pita paparan juga tidak dipilih, karena untuk Jawa dan Sumba pita paparan adalah satu-satunya sinyal guncangan (paparan tengah 0).

| Analog guncangan | Meninggal (sumber) | Jiwa MMI ≥ VII (mesin) | Jam → okupansi | Rasio mentah | Rasio dinormalkan |
| --- | --- | --- | --- | --- | --- |
| Yogyakarta 2006 M6,3 | 5.749 (USGS, factsheet) | 2.505.111 | 05.54 → 0,99 | 0,229% | 0,197% |
| Mamuju–Majene 2021 M6,2 | 107 (DIBI) | 62.705 | 01.30 → 0,99 | 0,171% | 0,147% |
| Lombok 5 Agu 2018 M6,9 | 528 (DIBI tanggal itu) | 978.191 | 19.48 → 0,94 | 0,054% | 0,049% |
| Cianjur 2022 M5,6 | 602 (DIBI) | 1.514.760 | 13.24 → 0,75 | 0,040% | 0,045% |
| Padang 2009 M7,6 (slab) | 1.117 (USGS, factsheet) | 5.246.327 | 17.12 → 0,94 | 0,021% | 0,019% |
| Pasaman 2022 M6,1 | 27 (DIBI) | 164.227 | 08.42 → 0,90 | 0,016% | 0,016% |

Rasio guncangan (dinormalkan): **0,016% / 0,047% (median) / 0,197%**. Pidie Jaya 2016 tidak dipakai (korban belum terverifikasi);
Sulteng 2018 tidak dipakai (gabungan tsunami dan likuefaksi). Semua analog adalah gempa kerak atau slab, dan rasionya diterapkan
ke megathrust antarmuka (§8).

**Tsunami: orde besaran, belum layak dikutip.** Paparan proksi = penduduk kecamatan pesisir rendah: pusat kecamatan di sel ETOPO
≤ 10 m, pantai terdekat dengan tinggi indikatif atas ≥ 0,5 m (aturan evakuasi `sim.js`), dan **kab-nya punya sel pantai yang
tercapai**, yang dicapai gelombang ≤ 30 menit (waktu sisi aman ×0,61). Ini batas atas paparan, **bukan genangan**.

Rasio analog kini dihitung dengan **korban dan paparan dicocokkan per kab**: rasio = meninggal di kab yang p30-nya > 0, dibagi p30
kab yang sama. Analog hanya dipakai bila ≥ 80% korbannya jatuh di kab dengan p30 > 0 (self-check).

| Analog tsunami | Rincian korban per kab | Porsi korban di kab berpaparan | Rasio dicocokkan | Dipakai |
| --- | --- | --- | --- | --- |
| Mentawai 2010 M7,8 | DIBI: Kep. Mentawai 447 (p30 11.016) | 100% | **4,06%** (447/11.016) | ya |
| Pangandaran 2006 M7,7 | USGS impact-text: Ciamis 413, Tasikmalaya 62, Banjar 15, Garut 1 (p30 semuanya 0); Cilacap 157 (p30 1.028.616), Kebumen 10 (360.540), Bantul 3 (69.587); Banyumas 1, Gunungkidul 3 (p30 0) | 25,6% | 0,012% (170/1.458.743) | **tidak**: proksi tidak mewakili kejadian |

Versi sebelumnya membagi korban dengan paparan dari wilayah lain. Mentawai: 447 / 164.912 = 0,271%, padahal Kep. Mentawai hanya
menyumbang 11.016 jiwa ke penyebut, dan sisanya dari Kota Padang, Mukomuko, Kota Bengkulu, Kaur, Pesisir Selatan, dan Nias Barat
yang tidak berkorban pada 2010. Pangandaran: 665 / 2.172.924 = 0,031%, padahal 74% korbannya di kab yang p30-nya 0, sementara
penyebutnya memuat Pandeglang, Pesawaran, dan Banyumas (tak berpantai). Klaim lama "bias paparan sebagian saling meniadakan" tidak
berlaku. Kini rasio yang dipakai hanya Mentawai 4,06%, berupa satu angka tanpa pita. Dua rasio yang dicocokkan per kab terpaut
**348 kali** (0,012% vs 4,06%). Inilah alasan korban tsunami platform berlabel **orde besaran, belum layak dikutip**, dan tidak
masuk angka kunci. Aceh 2004 tidak dipakai: bidang patahan ±1.300 km tak bisa diwakili satu persegi berpusat di episenter, dan
angka korbannya regional (sekunder).

**Gunung api.** Rasio per jiwa KRB III `paparan.json`: Semeru 2021 (64 meninggal / 9.304 = 0,69%) dan Merapi 2010
(386 / 34.582 = 1,12%); rumah RB 7,1–10,1 per 100 jiwa KRB III; pengungsi 1,14–12,95 kali jiwa KRB III. Pengungsi per gunung
**dibatasi** penduduk ≤ 20 km dari puncak (`pop_piksel.json`; 20 km = radius Merapi 2010, sumber rasio 12,95×), lalu dibagi ke
kab menurut porsi KRB III. Ini **batas atas**.

### 4.3 Kepekaan
- **Porsi evakuasi segera (tsunami):** rasio analog dianggap setara 20% evakuasi segera (asumsi dasar Nankai). Faktornya dari
  perkiraan Nankai 2025 (Cabinet Office via JST *Science Japan*, sekunder): 215.000 kematian tsunami pada 20%, 94.000 pada 70%.
  Faktor 50% = interpolasi linear (asumsi). Hasil: **×1 / ×0,662 / ×0,437**. Korban hasilnya tetap orde besaran.
- **Kepatuhan bangunan:** porsi stok `kerusakan.js` (tembok tanpa tulangan / beton-tembok terkekang / kayu) 40/30/30 → 20/50/30 → 0/70/30.
  Faktor korban mesin: Jawa 0,60 / 0,20; Mentawai 0,68 / 0,36; Sumba 0,58 / 0,15; Jawa M9,1 0,68 / 0,35; Mentawai M8,9 0,69 / 0,38.
  Faktor itu lalu diterapkan ke korban analog. Kelas "beton" di mesin tetap kurva pre-code, jadi manfaat kepatuhan penuh kemungkinan **terlalu kecil**.
- **Jam kejadian:** malam (okupansi 0,99) = ×1,165 terhadap korban guncangan analog yang **sudah dinormalkan** ke 0,85. Versi lama
  mengalikan rasio mentah (Yogyakarta dan Mamuju sudah 0,99), sehingga malam terhitung ganda.

### 4.4 Pengungsi, kerugian, imateriil
- Pengungsi gempa = (RB + RS tengah) × 3,9. Cek ke DIBI (`pembanding_pdna.csv`): Cianjur (Kab. Cianjur saja) 115.799 vs 114.683 nyata;
  Lombok 425.233 vs 406.202; Sulteng 245.954 vs 221.450.
- Kerugian materiil batas bawah = RB × 60 + RS × 30 + RR × 15 juta (stimulan rehab rumah BNPB), **bukan kerugian ekonomi penuh**.
  Pada kejadian nyata, angka kerugian yang dilaporkan = 1,7–3,8 kali stimulan 60/30/15 dari rumah rusak DIBI: **Lombok 1,69
  (2,13 terhadap skema 2018: 50/25/10); Cianjur 2,35 (Kab. Cianjur saja, karena angka Rp4 T adalah perkiraan Bupati untuk
  Cianjur); Sulteng 3,81 (4,76 terhadap skema 2018–2021)**. Angka Lombok dan Cianjur bersumber media, **belum dibuka ulang**
  (tempo 403, medcom kosong saat dicek pemeriksa). Sulteng Rp13,82 T = kerugian 1,99 T + kerusakan 11,83 T, data sementara
  20 Okt 2018 di bnpb.go.id. Pengali ini hanya pembanding, tidak dikalikan ke skenario.
- Imateriil non-rupiah: jiwa mengungsi, hari-mengungsi (× 7/30/90 hari, tiga baris terpisah, asumsi durasi), sekolah dan faskes
  terpapar (bila datanya ada), dan YLL = korban × sisa harapan hidup 25/35/45 tahun (asumsi kebijakan; umur korban tidak tersedia).
  UHH BPS hanya **konteks** dan tidak masuk hitungan: seri lama 2024 70,32 laki-laki / 74,21 perempuan (ringkasan pencarian
  bps.go.id, dikutip media; tabel belum dibuka). Pemeriksa 23 Okt 2026 mencatat rilis IPM 2024 metode baru memakai UHH total
  74,15 (juga belum dibuka).

## 5. Hasil kunci (skenario ilustratif platform; dua angka bermakna untuk naskah)

| Butir | Jawa M8,5 (di bawah Mmaks) | Mentawai M8,8 (di bawah Mmaks) | Bali–Sumba M8,3 (**tanpa sumber**) |
| --- | --- | --- | --- |
| Jiwa MMI ≥ VI / ≥ VII (tengah) | 17 jt / 0 (pita tinggi 5,5 jt) | 9,6 jt / 3,9 jt | 0 / 0 |
| Luas MMI ≥ VI | 17.000 km² | 81.000 km² | 120 km² |
| Rumah rusak berat (pita) | 2.600–220.000 (tengah 25.000) | 6.800–350.000 (50.000) | 81–9.300 (930) |
| Korban guncangan, analog | 0–2.600 (tengah 0) | 570–7.700 (1.800) | 0 |
| Korban guncangan, mesin | 29–3.000 (310) | 120–6.600 (900) | 1–110 (10) |
| Korban tsunami | **orde besaran, belum layak dikutip** (`ringkasan.csv`) | idem | idem |
| Jiwa pesisir rendah tiba ≤ 30 menit | 2,9 jt (pantai selatan Jabar tidak termuat, §6.4) | 0,93 jt | 1,35 jt |
| Panjang pantai tiba < 30 menit | 850–1.400 km | 1.400–2.100 km | 1.300–2.000 km |
| Pengungsi (RB+RS) | 430.000 | 560.000 | 20.000 |
| Kerugian materiil batas bawah | Rp7,1 T (0,84–54 T) | Rp8,1 T (1,2–53 T) | Rp0,35 T (0,04–3,0 T) |

**Kepekaan Mmaks** (estimasi-model; magnitudo = literatur sekunder):

| Butir | Jawa M9,1 | Mentawai M8,9 |
| --- | --- | --- |
| Jiwa MMI ≥ VI / ≥ VII (tengah) | 130 jt / 69 jt (pita 30–110 jt) | 12 jt / 5,8 jt (2,2–9,7 jt) |
| Luas MMI ≥ VI | 121.000 km² | 107.000 km² |
| Rumah rusak berat (pita) | 120.000–6,2 jt (tengah 900.000) | 12.000–570.000 (84.000) |
| Korban guncangan, analog | 11.000–140.000 (32.000) | 900–11.000 (2.700) |
| Korban guncangan, mesin | 2.000–120.000 (16.000) | 210–11.000 (1.600) |
| Jiwa pesisir rendah tiba ≤ 30 menit | 3,4 jt | 0,93 jt |
| Pengungsi (RB+RS) | 9,7 jt | 890.000 |
| Kerugian materiil batas bawah | Rp140 T (20–880 T) | Rp13 T (1,9–81 T) |

Pada M8,5, guncangan megathrust selatan Jawa praktis tidak muncul (MMI ≥ VII = 0). Pada Mmaks 9,1, guncangan yang sama
menjadi bahaya utama: 69 juta jiwa pada MMI ≥ VII. Jadi kesimpulan "risiko utama selatan Jawa adalah tsunami, bukan guncangan"
hanya berlaku untuk magnitudo ilustratif, dan **tidak boleh** dibawa ke kartu terburuk.

**Merapi setara 2010** (V 10 juta m³, H/L 0,15; awan panas 17,6 km, lahar 21,1 km): 90.000 jiwa di area sapuan tanpa evakuasi
(H/L 0,18: 35.000), 8.000 ha. Korban dengan pola evakuasi 2010 = 347–386, label resmi (DIBI 386) / sekunder (347), dipakai sebagai
asumsi skenario. Rumah RB/RS/RR 2.465/158/296 (DIBI 2010, dipakai sebagai asumsi skenario). Kerugian batas bawah Rp0,16 T. Penduduk
radius 20 km 1,55 juta (DIBI 2010 mengungsi 447.982; jumlah kolom `dibi2010_mengungsi` di CSV = 447.982).

**KRB 30 gunung:** 86.615 jiwa KRB III, 297.012 KRB II, 482.762 KRB I. Angka ini sama dengan jumlah `paparan.json`; jumlah
`gunungapi_krb_kab.csv` selisih ≤ 3 jiwa karena pembulatan per baris. Bila semua gunung mengalami erupsi besar dengan pola
Semeru 2021–Merapi 2010: korban 600–970, RB 6.200–8.800, pengungsi 98.000–1,1 juta (batas atas). Ini **jumlah maksimum lintas
gunung**, bukan satu kejadian.

## 6. Kejanggalan yang wajib dibaca sebelum mengutip

1. **Megathrust Jawa M8,5 dan Sumba M8,3 tidak menghasilkan MMI ≥ VII di pusat kecamatan mana pun** (maks VI dan V). Bidang
   patahan mesin seluruhnya di laut (pusat −9,8° dan −10,9°), dan GMPE Zhao 2006 antarmuka meluruh cepat. Akibatnya korban guncangan
   analog tengah = 0, sementara mesin kerusakan tetap memberi 310 dan 10 korban dari kurva kerapuhan pada MMI VI. Ini artefak
   magnitudo ilustratif: pada M9,1 (kepekaan Mmaks) Jawa mendapat 69 juta jiwa MMI ≥ VII. GMPE belum diuji
   (`model_guncangan.json` `kinerja_uji` = `belum_diuji`).
2. **Sebaran Merapi per kab tidak cocok dengan 2010.** Model menaruh 51% paparan sapuan di Magelang, 25% Klaten, dan 25% Sleman,
   padahal 72% korban nyata ada di Sleman (Kali Gendol). Korban analog per kab dibagi menurut porsi model, jadi sebaran per kab hanya ilustrasi.
3. **Radius 20 km Merapi = 1,55 juta jiwa**, 3,5 kali pengungsi DIBI 2010 (447.982). Angka ini dipakai sebagai batas atas pengungsi.
   Batas yang sama dipasang ke 30 gunung. Dengan radius 20 km tidak ada gunung yang terpotong: Agung 393.992 ≤ 636.736, Tambora
   3.250 ≤ 9.103. Pembanding pemeriksa memakai cincin 15 km `paparan.json` (Agung 338.747; Tambora 428), yang lebih sempit dari
   radius 2010 yang menghasilkan rasio 12,95×. Total 1,1 juta melampaui jiwa KRB III+II+I (866.389) karena evakuasi 2010 berbasis
   radius, bukan zona.
4. **Lubang proksi pesisir rendah.** Proksi melewatkan kecamatan yang pusatnya tinggi atau pantai dekatnya < 0,5 m, dan
   menghitung **seluruh penduduk kecamatan** yang pusatnya rendah (Cilacap, Kebumen, Kota Bengkulu). Kab tanpa sel pantai tercapai
   kini dipaksa 0 (sebelumnya Banyumas, yang tak berpantai, mendapat 68.702 jiwa pada skenario Jawa). Kab dengan tiba sisi aman
   < 30 menit tetapi jiwa pesisir rendah = 0 (daftar lengkap per skenario di `skenario.json` `lubang_proksi_tsunami`):
   - **Jawa M8,5 (18 kab):** Malang 9,9 mnt; Tulungagung 10,5; Blitar 11,6; Wonogiri 11,8; Gunungkidul 12,8; **Tasikmalaya 14,3;
     Banyuwangi 15,5; Pangandaran 16,7 (tinggi atas 14,2 m); Garut 17,1; Cianjur 18,2; Sukabumi 24,0**; Klungkung 24,5; Lombok Barat
     25,4; Lombok Tengah 27,3; **Lebak 27,7**; Tabanan 27,9; **Pandeglang 28,1**; Lombok Timur 29,5.
   - Mentawai M8,8 (3 kab): Bengkulu Utara 10,6; Bengkulu Selatan 12,1; Aceh Singkil 29,0.
   - Sumba M8,3 (17 kab), termasuk seluruh Sumba (Sumba Barat Daya, Barat, Tengah, Timur), Sumbawa, Lombok Tengah/Timur, dan pantai Bali.
   - Jawa M9,1 (20 kab) dan Mentawai M8,9 (4 kab): pola yang sama.

   **Korban tsunami skenario Jawa tidak memuat pantai selatan Jawa Barat** (Sukabumi–Cianjur–Garut–Tasikmalaya–Pangandaran) maupun
   Lebak/Pandeglang dan Banyuwangi, padahal literatur menaruh kasus terburuk (~20 m) di Jabar selatan. Sebaliknya, kab yang pusat
   kecamatannya rendah dihitung penuh. Korban tsunami per kab karena itu orde besaran dan belum layak dikutip.
5. **Tinggi indikatif** (Abe 1995 ×2, batas atas rentang) **bukan run-up dan jangan dikutip**:
   - Jawa M8,5: 22 m di Jatim, lebih tinggi dari ~12 m Widiyantoro dkk. untuk skenario yang lebih besar, dan 14 m di Jabar (literatur ~20 m).
   - Mentawai M8,8: **37,8 m**, dicapai di 12 kab termasuk Kota Pariaman (daratan yang terlindung Kep. Mentawai). Angka ini di atas
     skenario terburuk literatur di paket ini sendiri (Supendi dkk. 2022: hingga 34 m). Batas bawahnya (tinggi_lo) 9,4 m.
   - Varian Mmaks: Jawa M9,1 53,3 m (10 kab), Mentawai M8,9 42,4 m. Ini jelas di luar rentang fisik yang wajar untuk dikutip.
6. **Rasio analog memakai penduduk 2026** untuk kejadian 2006–2022 (penduduk saat kejadian lebih kecil → rasio sedikit terlalu kecil).

## 7. Self-check (`assert`, gagal = exit non-nol)

- 514 kab/kota, 119 di Jawa; tiap kab punya poligon; 5 skenario (3 `sim.js` + 2 Mmaks).
- Per skenario di `gempa_kab.csv` dan `tsunami_kab.csv`: tepat 514 baris, **kode unik**, semua kode dikenal; tidak ada kunci kab
  null di agregasi guncangan, tsunami, Merapi, dan KRB; nama kab tanpa spasi di ujung.
- Penduduk kab = jumlah kecamatan = `penduduk.json` total − di luar poligon (286.674.532).
- Per skenario: jiwa per kab = jiwa per kecamatan; RB/RS/RR/korban tengah per kab = nasional; jiwa MMI ≥ VII per kab = nasional;
  jumlah kolom tengah CSV (`rb_tengah`, `korban_analog_tengah`, `jiwa_mmi7plus_tengah`) = nasional. Pita rendah/tinggi per kab
  sengaja tidak diuji aditif (§2).
- Magnitudo skenario = `sim.js` (8,5 / 8,8 / 8,3) atau Mmaks (9,1 / 8,9); tsunami mencapai pantai; kepatuhan bangunan naik tidak menambah korban.
- **Tsunami: `tercapai_180_menit` = 0 berarti jiwa pesisir rendah (≤ 180 dan ≤ 30 menit) = 0.**
- **Pencocokan wilayah analog tsunami:** rincian korban per kab = total kejadian; penyebut (p30 kab berkorban) ≤ paparan semua kab,
  jadi tidak bisa memuat paparan dari kab lain (diuji dengan mutan: penyebut lintas wilayah ditolak); analog dipakai bila dan hanya
  bila ≥ 80% korbannya di kab dengan p30 > 0; rincian USGS Pangandaran = 665 dan tiap frasa ada di impact-text `usp000ensm.geojson`.
- Rasio analog guncangan positif dan sama dengan rasio mentah × 0,85 / okupansi(jam kejadian); faktor Nankai ×1 pada 20% dan 94.000/215.000 pada 70%.
- DIBI: Merapi 2010 = 386, Cianjur = 602 (semuanya Kab. Cianjur), Mentawai 2010 = 447, Sulteng 2018 = 4.141 (riset A: 4.140).
- Merapi H/L 0,15 terpapar = 89.707 ± 2%. Ini **regresi** atas keluaran 23 Okt 2026, bukan validasi; `public/gunungapi/sim.js:355`
  hanya menyebut "sekitar 90.000". Jiwa per kab = total.
- `merapi2010_kab.csv`: jumlah `dibi2010_mengungsi` = 447.982 dan `dibi2010_meninggal` = 386; kode unik.
- KRB: jumlah per kab tiap gunung dan zona = `paparan.json` (selisih ≤ 1 jiwa sebelum pembulatan); jumlah CSV per zona =
  `paparan.json` ± 3; kode unik per gunung; pengungsi per gunung ≤ penduduk ≤ 20 km.
- Tidak ada NaN atau tak hingga di semua angka yang ditulis.

## 8. Celah

- **Kartu skenario terburuk belum ada.** Skenario dasar di bawah Mmaks; varian Mmaks memakai Mmaks sekunder (dokumen Peta Gempa
  2024 belum dibuka) dan geometri `sim.js`, bukan segmentasi PuSGeN.
- **Korban tsunami belum layak dikutip.** Satu analog (Mentawai 2010), proksi pesisir rendah dengan lubang besar (§6.4), tanpa
  genangan. Jalan keluarnya: layer InaRISK `Inun_*` × penduduk, lalu rasio analog dicocokkan per kab di atas genangan itu.
- **Rasio analog guncangan berasal dari gempa kerak/slab. Belum ada analog megathrust guncangan**; rasionya diterapkan ke
  megathrust antarmuka tanpa uji.
- **Gempa sesar darat dekat kota besar tidak dibuat.** Mmaks PuSGeN 2017 tidak bisa dibuktikan di sesi ini: PDF buku
  (`luk.tsipil.ugm.ac.id/gempa/pdf/Pusgen2017PetaGempaIndonesia.pdf`, 37,6 MB) melebihi batas baca dan tidak diunduh tanpa izin;
  pencarian hanya menemukan Lembang M6,8 dari siaran pers BMKG tanpa menyebut PuSGeN. `sim.js` punya Lembang 6,8 / Cimandiri 6,9 /
  Opak 6,6 tanpa sumber per baris. Mesinnya sudah mendukung (sesar geser, garis jejak); yang kurang tinggal tabel Mmaks.
- Luka-luka tidak dimodelkan.
- Data bangunan tidak ada untuk zona skenario (Open Buildings hanya Kalteng); rumah = jiwa/3,9.
- Sekolah dan faskes terpapar gempa hanya 9 provinsi; tidak satu pun di Jawa, Sumbar, Bengkulu, Bali, NTB.
- Angka PDNA/R3P final Lombok, Sulteng, Cianjur, dan Merapi 2010 tidak ditemukan. Pembanding memakai angka sementara (Sulteng, resmi)
  dan angka media yang belum dibuka ulang (Lombok, Cianjur).
- Geometri analog guncangan (strike, jenis, jam) diambil dari `kalibrasi_kerusakan.json`, yang ditulis dari ingatan; korbannya sudah diganti ke DIBI/USGS.
- Nankai 50% adalah interpolasi; Nankai sendiri sekunder (JST, bukan dokumen Cabinet Office).
- Mmaks Bali–Sumba tidak ditemukan di riset; skenario Sumba 8,3 tanpa sumber.
