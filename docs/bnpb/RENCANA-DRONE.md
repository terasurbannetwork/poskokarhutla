# Rencana drone otomatis untuk api karhutla

Disusun 22 Okt 2026. Skrip: `scripts/bnpb/drone.py`. Contoh armada: `scripts/bnpb/drone_armada.contoh.json`.

## 1. Inti

Satelit sudah melihat api. Yang belum ada adalah mata di lokasi dalam hitungan menit: apakah api itu nyata, seberapa
luas, ke mana menjalar, dan apakah regu bisa masuk. Rencana ini menaruh drone di dalam kotak (dock) di zona yang sering
terbakar. Saat Himawari-9 melihat api yang **besar dan akan membesar**, sistem menyusun rute, memeriksa cuaca dan
baterai, lalu mengirim drone. Dalam 10 menit drone sudah berputar di atas api dan memotret termal. Hasilnya masuk ke tugas
api yang sudah ada di Pantau Bencana (L12 drone termal, `ops_drone`).

Drone di sini untuk **memastikan dan memetakan**, bukan memadamkan. Drone pembawa air (misalnya angkut 30 kg) tidak
berarti untuk api gambut yang membara di bawah permukaan. Yang memadamkan tetap regu darat dan water bombing, tetapi
mereka berangkat dengan peta dari drone, tidak lagi menebak.

Video contoh yang dikirim (garis hijau di udara) adalah tampilan rute pulang otomatis bawaan aplikasi DJI Fly. Idenya
sama: rute dihitung mesin, manusia mengawasi. Untuk karhutla, yang menghitung rute adalah skrip ini.

## 2. Kapan drone dikirim, kapan tidak

Prinsipnya hemat: satu dock hanya bisa terbang sekitar 12 kali sehari, jadi setiap sortie harus untuk api yang penting.

| Gerbang | Aturan | Alasan |
| --- | --- | --- |
| Api kecil | FRP < 30 MW: **tidak dikirim** | Kelas "kecil" lingkaran Himawari di peta. Cukup patroli biasa. |
| Api sekilas | < 3 pindaian 10 menit, level < 2, atau tak terlihat lagi > 60 menit: **tidak dikirim** | Belum terbukti bertahan; banyak yang padam sendiri atau derau. |
| Akan padam sendiri | Hujan >= 5 mm diperkirakan dalam 3 jam ke depan **dan gambutnya basah**: **tidak dikirim** | Gambut basah = muka air (TMAT) stasiun terdekat paling dalam 40 cm dan DC < 261. Gambut kering (DC > 350 atau TMAT lebih dalam dari 40 cm) tidak pernah dianggap padam oleh hujan, karena bara di bawah permukaan bertahan. Lihat bagian 2a. |
| Sudah dikirim | Ada misi <= 2 km dalam 3 jam terakhir: **tidak dikirim lagi** | Satu api, satu sortie. |
| Di luar jangkauan | Tidak ada dock siap dalam radius 6 km: **tidak dikirim** | Diteruskan ke regu seperti sekarang. |
| Cuaca/izin | Malam, hembusan > 10 m/s, hujan sekarang, atau baterai tidak cukup: **ditunda**, dicoba lagi putaran berikutnya | Keselamatan terbang dan PM 37/2020. |

Api yang lolos semua gerbang diberi skor 0-100:

- FRP (daya pancar api): sampai 50 poin, jenuh di 300 MW.
- Lama bertahan (jumlah pindaian): sampai 20 poin.
- Api baru (Himawari melihat sebelum NASA FIRMS): 20 poin.
- Menyala (level 3): 10 poin.
- Cuaca yang mendorong api membesar: udara kering (RH < 60%) 10 poin, angin >= 4 m/s 5 poin.
- Gambut kering, api cenderung masuk ke bawah permukaan dan sulit padam: DC > 350 10 poin, TMAT lebih dalam dari
  40 cm 10 poin.

Skor >= 50 menjadi misi. Mode `usul` (bawaan): petugas menyetujui dulu. Mode `otomatis`: skor >= 70 langsung terbang.
Contoh uji pada data nyata 22 Okt 2026 pukul 10.30 WIB: dari 538 api Himawari, 133 lolos gerbang keras. Yang teratas di
Pulang Pisau (Maliku, Jabiren, Sebangau Kuala) dan Barito Kuala, FRP 380-560 MW, RH 36-38%. Skornya 80-85.

### 2a. Keadaan gambut: DC dan muka air tanah

Satelit melihat panas, bukan seberapa kering gambut di bawahnya. Dua angka menjawab itu, dan keduanya sudah ada di
Pantau Bencana:

- **DC (Drought Code)** dari `public/data/fwi.json`: kekeringan lapisan organik dalam (8-18 cm), dihitung berantai
  dari cuaca harian. Ambang BMKG: 261-350 kering, di atas 350 sangat kering. Kisinya 0,5 derajat (sekitar 55 km),
  jadi kasar: satu nilai untuk satu kabupaten kecil.
- **TMAT (tinggi muka air tanah gambut)** dari tabel `ops_tmat` (unggahan CSV moderator, atau tarikan BRGM begitu
  aksesnya ada). Batas PP 57/2016: 0,4 m di bawah permukaan. Ini ukuran langsung, tetapi stasiunnya jarang. Skrip
  hanya memakai stasiun dalam 10 km dengan pembacaan paling lama 72 jam.

Aturan yang dipakai skrip:

| Keadaan | Syarat | Hujan lebat 3 jam ke depan | Skor |
| --- | --- | --- | --- |
| Kering | DC > 350, atau TMAT lebih dalam dari 40 cm | Tetap dikirim | +10 per tanda |
| Basah | TMAT paling dalam 40 cm dan DC < 261; tanpa TMAT, DC < 261 | Dibiarkan padam sendiri | 0 |
| Ragu | DC 261-350 tanpa TMAT, atau TMAT dangkal tapi DC 261-350 | Tetap dikirim | 0 |
| Tanpa data | DC dan TMAT tidak ada | Dibiarkan padam sendiri (hipotesis lama) | 0 |

Contoh data nyata 22 Okt 2026: DC di sel Pulang Pisau 691, jauh di atas 350. Di sana hujan sore tidak akan
membatalkan misi.

### 2b. Patroli pencegahan

Satu dock sanggup sekitar 12 sortie sehari, tetapi api yang lolos gerbang di jangkauannya biasanya hanya beberapa.
Sisa jatah dipakai patroli, tanpa menunggu titik panas:

- **Syarat**: dock menganggur (tidak ada misi api), area kering (DC > 350 di dock, atau ada stasiun TMAT lebih dalam
  dari 40 cm dalam jangkauan), siang, angin dan hujan layak, tidak ada hujan lebat 3 jam ke depan.
- **Jatah**: paling banyak 2 patroli per dock per hari WIB (`patroli_per_hari`), berjarak paling sedikit 3 jam.
- **Rute**: lewat stasiun TMAT yang kering, urut terdekat dari dock, sebanyak yang dicukupi baterai. Tidak ada
  stasiun: cincin 8 titik radius 1,8 km mengelilingi dock (sekitar 21 menit). Kamera tegak lurus di tiap titik.
- **Api mendahului patroli**: kalau ada api penting saat patroli sedang terbang, misi api tetap dibuat dan membawa
  `hentikan` berisi id patroli. Jembatan memanggil drone patroli pulang, lalu menjalankan misi api.
- Patroli mencari bara yang belum cukup besar untuk satelit (FRP kecil, di bawah ambang deteksi), di blok yang
  paling mungkin terbakar.

Skor ini aturan tangan, belum model teruji. Setelah 3 bulan misi, hasil drone (api nyata atau tidak, membesar atau
tidak) menjadi data untuk melatih ulang, atau diganti peluang eskalasi `model_sebaran` bila uji baliknya lulus di
tingkat titik.

## 3. Alur sistem

```
Himawari-9 (10 menit) ──► /api/himawari ──► drone.py (tiap 10 menit, di server posko)
  fwi.json (DC) + ops_tmat (TMAT) ──────────► │ gerbang + skor + cuaca Open-Meteo + keadaan gambut
                                              │ dock terdekat yang siap, baterai cukup
                                              ▼
                                       misi KMZ (orbit 8 titik + 1 tegak lurus)
                                              │
                         mode usul: petugas setuju ─┤─ mode otomatis: skor >= 70
                                              ▼
                       jembatan (webhook) ──► DJI Cloud API / FlightHub 2 ──► dock ──► drone terbang
                                                                                         │
            foto termal + video ◄── unggah otomatis dock ◄────────────────────────────────┘
                     │
                     ▼
    tugas_api + ops_drone (titik bara, suhu) ──► peta operasi, regu, sitrep
```

Bentuk misi: drone naik ke 120 m (batas PM 37/2020), terbang lurus ke api dengan 12 m/s, berputar 8 titik pada radius
150 m dengan kamera menunduk 45° ke arah api, memotret termal dan lebar di tiap titik, lalu satu foto tegak lurus di atas
api untuk batas bakar, dan pulang. Misi 4 km dari dock memakan sekitar 15 menit. Misi yang butuh lebih dari 25 menit
ditolak sebelum terbang.

## 4. Perangkat yang direkomendasikan

### Pilihan utama: drone dalam kotak (dock)

**DJI Dock 3 + Matrice 4TD.** Alasannya bukan merek, tetapi tiga hal yang belum dimiliki pesaing di Indonesia sekaligus:
bisa dikendalikan penuh lewat API (Cloud API, FlightHub 2 OpenAPI), kameranya termal radiometrik ditambah pengukur jarak
laser, dan dukungan dealer serta suku cadang ada di Indonesia.

| Komponen | Spesifikasi yang relevan |
| --- | --- |
| Dock 3 | IP56, -30 sampai 50 °C, isi ulang drone sekitar 27 menit, radius kerja maksimum 10 km (kondisi tanpa angin), bisa dipasang di kendaraan |
| Matrice 4TD | Termal 640 × 512 radiometrik, kamera lebar + zoom, pengukur jarak laser, IP55, terbang maks 54 menit (lab), sekitar 32 menit di angin 12 m/s |
| Batas angin | 12 m/s saat terbang, lepas landas, dan mendarat. Skrip memakai 10 m/s supaya ada sisa. |

Radius kerja direncanakan **6 km**, bukan 10 km: sisa baterai untuk angin, orbit, dan pulang. Dari dock ke tepi
jangkauan sekitar 9 menit.

Harga eceran (USD, September 2026): Dock 3 saja sekitar 15.900; Dock 3 + Matrice 4TD sekitar 23.500-26.400. Di
Indonesia minta penawaran dealer resmi; harga, pajak impor, dan garansi berbeda.

### Pilihan kedua: drone regu (tanpa dock)

**Matrice 4T** (versi genggam). Dipegang regu di posko. Skrip yang sama menyusun rute, tetapi dikirim ke ponsel pilot
untuk dimuat di DJI Pilot 2, bukan ke dock. Murah dan cepat dimulai, tetapi bergantung pada pilot yang sudah di dekat api.

### Pilihan ketiga: jarak jauh (VTOL sayap tetap)

Untuk patroli luas puluhan km dari pangkalan, misalnya pemetaan pasca bakar atau zona tanpa dock. Drone VTOL bisa lepas
landas tegak tanpa landasan, lalu terbang seperti pesawat selama 1-3 jam. Contoh di pasar: JOUAV CW-15/CW-25 dengan
kamera termal, Quantum Systems Trinity (lebih untuk pemetaan). Produsen dan penyedia jasa dalam negeri: Aeroterrascan
(Bandung) dan Terra Drone Indonesia (pemegang izin BVLOS komersial pertama di Indonesia, 2020). Borneo Nature Foundation
sudah menguji VTOL untuk karhutla di Kalimantan Tengah (2022), dan Korpasgat TNI AU memakai drone termal di Kalteng.
Ini **dioperasikan pilot**, bukan dock otomatis; skrip ini bisa menyusun daftar target untuk mereka.

### Siapa vendor yang diajak bicara

1. **Dealer resmi DJI Enterprise di Indonesia**: Dock 3, Matrice 4TD/4T, lisensi FlightHub 2, pelatihan pilot.
2. **Terra Drone Indonesia**: jasa operasi BVLOS dan pengurusan izin. Cocok untuk fase uji bila BNPB belum punya
   pilot bersertifikat sendiri.
3. **Aeroterrascan**: VTOL buatan dalam negeri, untuk fase jarak jauh dan bila ada syarat TKDN.

## 5. Sensor yang dibutuhkan

| Sensor | Di mana | Untuk apa | Ada di paket? |
| --- | --- | --- | --- |
| Kamera termal radiometrik 640 × 512 | Drone | Bara di bawah asap, suhu per piksel, titik api yang tersembunyi di gambut | Ya (4TD) |
| Kamera lebar + zoom | Drone | Asap, akses jalan, kanal, kebun, orang di lokasi | Ya |
| Pengukur jarak laser | Drone | Koordinat tepat titik bara, bukan koordinat drone | Ya |
| RTK | Dock + drone | Posisi senti-meter untuk mendarat presisi di dock | Ya |
| Stasiun cuaca (angin, hujan, suhu) | Dock | Larangan lepas landas otomatis | Ya |
| Internet 4G/5G atau Starlink | Dock | Perintah misi, unggah foto, video langsung | **Tidak**, dipasang sendiri |
| Panel surya + baterai | Lokasi dock | Banyak lokasi gambut tanpa listrik PLN | **Tidak**, dipasang sendiri |
| Sensor PM2.5/CO | Opsional | Kualitas udara di lokasi; repo sudah punya data udara regional | Tidak |
| Logger TMAT (sensor tekanan di pipa piezometer, vented atau absolut + barologger) | Darat, di blok gambut | Gerbang "padam sendiri", bonus skor, rute patroli. Kirim lewat LoRaWAN atau seluler ke `ops_tmat` | Terpisah |
| Stasiun cuaca otomatis (suhu, RH, angin 10 m, hujan 24 jam) | Darat | Mempertajam DC dan FWI dari kisi 55 km menjadi per lokasi | Terpisah |
| Sensor kelembapan tanah (TDR atau kapasitif >= 50 MHz, dikalibrasi untuk gambut) | Darat | Pendukung TMAT; `tanah.json` sekarang model tanah mineral, bukan gambut | Terpisah |
| LiDAR (misalnya Zenmuse L2 di Matrice 350/400) | Drone survei, bukan drone dock | Peta kanal dan kemiringan untuk sekat kanal; kedalaman gambut terbakar sesudah api. Sewa survei sekali-sekali | Terpisah |

## 6. Cara memasang dan menyetel

1. **Pilih lokasi dock.** Ambil kecamatan dengan titik panas terbanyak 2019-2026 dari riwayat Pantau Bencana. Taruh dock
   di tengah gugus itu, di lahan aman dari api (bukan gambut, ada sekat bakar), di pos pemerintah atau posko desa.
   Syarat: sinyal 4G atau Starlink, langit terbuka, dijaga.
2. **Pasang.** Dock di landasan beton atau atap, pagar, penangkal petir, panel surya (kebutuhan daya disesuaikan dengan
   spesifikasi dealer), internet. Daftarkan drone di SIDOPI Kemenhub.
3. **FlightHub 2.** Buat organisasi BNPB/BPBD, ikat dock, tetapkan zona larang terbang (bandara, permukiman padat) dan
   ketinggian aman. Ekspor satu rute contoh untuk drone itu, buka `wpmz/waylines.wpml` di dalamnya, salin
   `droneEnumValue`, `droneSubEnumValue`, dan `payloadEnumValue` ke berkas armada.
4. **Berkas armada.** Salin `scripts/bnpb/drone_armada.contoh.json`, isi `sn` dan koordinat tiap dock.
   Mulai dengan `"mode": "usul"` dan `"webhook": ""` (kering).
5. **Jalankan kering 2 minggu.** `python3 scripts/bnpb/drone.py --armada armada.json` tiap 10 menit (cron di server
   posko). Bandingkan misi yang diusulkan dengan api yang benar-benar membesar. Setel ambang.
6. **Jembatan.** Layanan kecil di server posko yang menerima POST dari skrip, menaruh KMZ di penyimpanan yang bisa
   diunduh dock, lalu meneruskan ke DJI (lihat bagian 7). Kunci bersama lewat env `DRONE_KUNCI`, bukan di berkas.
7. **Uji terbang terkendali.** Mode `usul`, pilot jarak jauh mengawasi tiap misi dari FlightHub 2, tangan siap menekan
   pulang.
8. **Baru otomatis.** Setelah sekitar 50 misi tanpa insiden dan izin BVLOS terbit, nyalakan `"mode": "otomatis"`.

## 7. Skrip dan integrasinya

`scripts/bnpb/drone.py` (Python 3, tanpa pustaka luar):

| Perintah | Hasil |
| --- | --- |
| `--armada armada.json` | Satu putaran: misi api, lalu patroli untuk dock yang menganggur. Ditulis ke `data/raw/drone/misi/<id>.kmz` dan `riwayat.json`. DC dibaca dari `/data/fwi.json` (`--fwi` untuk alamat lain); TMAT dari `armada.tmat` |
| `--setujui ID` | Mengirim misi yang menunggu. Misi lebih tua dari 30 menit ditolak (api dan cuaca sudah berubah). |
| `--ukur 1000 --radius 6` | Jumlah dock untuk luas tertentu |
| `--uji` | Self-check tanpa jaringan: gerbang, skor, cuaca, keadaan gambut (DC, TMAT, umur dan jarak stasiun), patroli (jatah, jeda, rute stasiun, api mendahului patroli), ulang, baterai, KMZ, pesan MQTT, ukuran armada |

Jembatan ke DJI, dua jalur:

- **FlightHub 2 OpenAPI** (berlangganan): unggah KMZ sebagai rute, buat tugas terbang segera untuk dock itu. Paling
  sedikit kode.
- **DJI Cloud API** (server sendiri, berbasis demo resmi DJI): skrip sudah menyusun dua pesan untuk topik
  `thing/product/<sn_dock>/services`, yaitu `flighttask_prepare` (berisi sidik MD5 KMZ) lalu `flighttask_execute`.
  Jembatan mengisi `file.url`, menerbitkan ke broker MQTT, dan membaca `flighttask_progress` untuk status.

Hasil terbang kembali ke Pantau Bencana lewat unggahan CSV drone termal yang sudah ada (L12, `ops_drone`). Langkah
berikutnya yang wajar: route Worker yang menerima hasil jembatan langsung, tanpa unggah manual.

## 8. Regulasi

- **PM 37/2020 (Kemenhub)**: terbang di bawah 120 m tanpa izin khusus; di atasnya butuh izin Dirjen Perhubungan Udara.
  Prinsipnya **hanya siang hari** (matahari terbit sampai terbenam). Skrip menolak terbang malam.
- **BVLOS** (di luar jarak pandang pilot) dilarang kecuali ada izin khusus (CASR Part 107). Dock otomatis hampir selalu
  BVLOS. Terra Drone Indonesia mendapat izin BVLOS komersial pertama (Juli 2020), dan izin terbang malam lewat surat
  pengecualian. Jadi jalurnya ada, tetapi per operator dan per wilayah.
- Kemenhub sedang merevisi PM 37/2020 untuk terbang komersial di daerah 3T, target Desember 2026. Pantau isinya; bisa
  mempermudah dock di Kalimantan dan Sumatera.
- Untuk keadaan darurat bencana, ajukan dukungan BNPB ke Kemenhub dan TNI AU (izin ruang udara) sebelum musim kemarau,
  bukan saat api sudah menyala.
- Foto termal menangkap orang dan rumah. Simpan di sistem pemerintah, ikuti aturan privasi yang sama dengan foto warga.

## 9. Berapa drone untuk luasan tertentu

Satu dock dengan radius kerja 6 km menutup sekitar **93,5 km²** (9.350 ha) bila disusun seperti sarang lebah. Wilayah
nyata tidak berbentuk sarang lebah, jadi ditambah 20% untuk tepi. Satu dock sanggup sekitar **12 sortie sehari**
(11 jam terang, 25 menit terbang + 27 menit isi ulang). Waktu tiba ke tepi jangkauan sekitar 9 menit.

| Luas yang dijaga | Hektare | Dock (radius 6 km) | Sortie maksimum per hari |
| --- | --- | --- | --- |
| 100 km² | 10.000 ha | 2 | 24 |
| 500 km² | 50.000 ha | 7 | 84 |
| 1.000 km² | 100.000 ha | 13 | 156 |
| 5.000 km² | 500.000 ha | 65 | 780 |
| 10.000 km² | 1 juta ha | 129 | 1.548 |

Kalau jarak tempuh dipersempit menjadi 4 km (tiba lebih cepat, 7 menit), 1.000 km² butuh 29 dock.
Hitung sendiri: `python3 scripts/bnpb/drone.py --ukur <km2> --radius <km>`.

Biaya kasar per lokasi dock (perkiraan, belum penawaran): perangkat Dock 3 + Matrice 4TD sekitar Rp 390-440 juta (kurs
Rp 16.500 per USD, sebelum pajak impor), ditambah pemasangan, panel surya, internet, dan pagar sekitar Rp 100-200 juta.
Jadi sekitar **Rp 500-650 juta per lokasi** di tahun pertama, belum termasuk lisensi FlightHub 2, pemeliharaan, dan
operator. Untuk 100.000 ha (13 dock): sekitar Rp 6,5-8,5 miliar.

## 10. Layak atau tidak

**Layak, kalau dijaga sempit.** Menutup seluruh gambut tidak layak: Kalimantan Tengah saja punya jutaan hektare gambut,
butuh ratusan dock. Yang layak:

- Dock di **zona langganan api** (beberapa kecamatan yang terbakar hampir tiap tahun), bukan seluruh provinsi.
- **Drone regu** untuk sisanya, rute dari skrip yang sama.
- **VTOL** untuk pemetaan luas setelah api.

Hambatan terbesar, berurutan:

1. **Izin BVLOS dan terbang malam.** Api gambut paling jelas di termal pada malam hari, tetapi PM 37/2020 hanya
   mengizinkan siang. Tanpa izin khusus, dock hanya bekerja 11 jam sehari.
2. **Listrik dan internet di lokasi gambut.** Sering tidak ada; panel surya dan Starlink menambah biaya dan risiko
   pencurian.
3. **Asap tebal.** Termal tetap menembus asap jauh lebih baik dari kamera biasa, tetapi jarak pandang pilot pengawas
   turun.
4. **Kapasitas.** Di puncak musim (lebih dari 20.000 titik sehari se-Indonesia), drone tidak bisa mendatangi semua.
   Karena itu gerbangnya ketat: hanya api besar yang akan membesar dan berada di jangkauan dock.

## 11. Tahapan

| Fase | Waktu | Isi | Ukuran berhasil |
| --- | --- | --- | --- |
| 0 | 2 minggu | Skrip berjalan kering pada data nyata, tanpa drone | Usulan misi dinilai petugas: berapa yang memang api besar |
| 1 | 3 bulan, 1 kabupaten | 2-3 dock di Pulang Pisau atau OKI, mode usul, pilot mengawasi | Waktu dari deteksi satelit sampai foto termal < 20 menit; 0 insiden |
| 2 | Musim berikutnya | 10-15 dock di 3-4 kabupaten langganan, izin BVLOS, mode otomatis untuk skor >= 70 | Regu berangkat dengan peta drone di sebagian besar tugas prioritas |
| 3 | Sesudahnya | VTOL pemetaan pasca bakar, skor diganti model yang dilatih dari data misi | Luas terbakar versi drone dibandingkan dengan perkiraan satelit |

## 12. Yang belum diuji

- Isi KMZ mengikuti format DJI WPML 1.0.6, tetapi **belum dibuka di FlightHub 2 atau diterbangkan**. Nilai enum drone
  dan kamera di contoh armada belum diverifikasi; salin dari rute ekspor (langkah 6.3).
- Bentuk pesan `flighttask_prepare`/`flighttask_execute` disusun dari dokumentasi Cloud API Dock 2. Cocokkan dengan versi
  firmware Dock 3 sebelum dipakai.
- Ambang "akan padam sendiri" (hujan 5 mm dalam 3 jam di gambut basah) belum diuji pada data api yang benar-benar
  padam. DC per kisi 55 km terlalu kasar untuk satu blok; stasiun TMAT masih jarang dan diisi manual.
- Rute patroli (cincin 1,8 km atau lewat stasiun) belum dibandingkan dengan lokasi api yang lalu. Lebih baik bila
  diganti blok yang paling sering terbakar dari riwayat titik panas.
- Skor 0-100 aturan tangan; belum ada uji balik.
- Harga dari pengecer luar negeri, bukan penawaran dealer Indonesia.

## Sumber

- Spesifikasi Dock 3: [enterprise.dji.com/dock-3/specs](https://enterprise.dji.com/dock-3/specs)
- Harga Dock 3 dan Matrice 4TD: [Global Drone HQ](https://globaldronehq.com/collections/dock/products/dji-dock-3), [Dronefly](https://www.dronefly.com/products/dji-dock-3-matrice-4td-with-care-enterprise-plus), [Advexure](https://advexure.com/collections/drone-docking-stations/products/dji-dock-3-for-matrice-4d-and-4td)
- Daya tahan di angin dan IP55: [DSLRPros](https://www.dslrpros.com/collections/shop-dji-dock-3-matrice-4d-series-bundles), [UAV Coach](https://uavcoach.com/dock-3/)
- Cloud API rute dock: [DJI Developer, Wayline Management Dock 2](https://developer.dji.com/doc/cloud-api-tutorial/en/api-reference/dock-to-cloud/mqtt/dock/dock2/wayline.html), [DroneDeploy, Wayline Flights](https://docs-automate.dronedeploy.com/robotics-toolkit/agent-plugins/dji/api-reference/wayline-flight)
- FlightHub 2 OpenAPI dan dukungan Dock 3: [DJI Enterprise Insights](https://enterprise-insights.dji.com/blog/new-update-flighthub2-april), [Heliguy](https://www.heliguy.com/products/dji-flighthub)
- Regulasi: [ICAO COSCAP, UAS Integration in Indonesia](https://www.icao.int/sites/default/files/APAC/Meetings/2020/2020%20COSCAP%20SEA%20UAS%20WBN/5-Presentations/UAS%20INTEGRATION%20IN%20INDONESIA_COSCAP%20WEBINAR_ver5.pdf), [Terra Drone Indonesia, izin BVLOS](https://www.geoconnexion.com/news/terra-drone-indonesia-obtained-the-first-commercial-bvlos-permit-in-indonesia), [Revisi PM 37/2020](https://investortrust.id/business/90748/instran-soroti-keselamatan-dan-privasi-dalam-rencana-komersial-drone-2026)
- Drone untuk karhutla di Indonesia: [Borneo Nature Foundation, VTOL di Kalteng](https://borneonaturefoundation.org/firefighting-and-prevention/vtol-technology-opens-up-the-skies-of-central-kalimantan/), [RRI, Korpasgat TNI AU](https://rri.co.id/en/national/2727238/korpasgat-tni-au-uses-thermal-drones-to-detect-wildfire-hotspots), [LJMU, drone termal untuk api gambut bawah tanah](https://researchonline.ljmu.ac.uk/id/eprint/10221), [Vice, Aeroterrascan](https://news.vice.com/en/article/vbyzx3/aeroterrascan-indonesias-homegrown-drone-startup-flies-into-a-volcano)
