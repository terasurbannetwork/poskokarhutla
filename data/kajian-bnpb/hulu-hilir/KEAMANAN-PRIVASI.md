# KEAMANAN-PRIVASI: Hulu ke hilir per kejadian

## 1. Data dan kepekaannya

| Data | Kepekaan | Tempat |
| --- | --- | --- |
| Hutan hilang, lereng, zona, sempadan per DAS dan sub-DAS (hektare) | rendah (sumber terbuka, agregat) | R2 di balik sesi; angka daerah langganan sudah publik di Bukti DAS |
| Hujan per DAS (IMERG, CHIRPS) | rendah | R2 di balik sesi |
| Luas genangan per zona, kilometer jalan, jumlah desa | sedang (dapat dibaca sebagai angka dampak) | R2 di balik sesi; D1 hanya ringkasan |
| Sel genangan GFM 110 m (hanya sel GFM yang masuk R2) dan kotak 5 km titik hutan hilang | sedang (sel menampung puluhan bangunan di kota, satu rumah di desa) | R2 di balik sesi, tidak pernah `public/` |
| Konsesi di dalam DAS (hanya bila ikut ditampilkan) | sedang | tidak ikut di paket ini; tetap di Bukti DAS |
| Poligon dan sel kisi UNOSAT (tidak pernah masuk R2; hanya agregat luas, jalan, desa, kesepakatan; Q12), segmen jalan Overture, aset HydroRIVERS | lisensi terbatas | `data/raw` lokal, tidak di-commit, tidak masuk `public/` atau R2 |
| Token Earthdata | rahasia | variabel lingkungan mesin, tidak pernah di berkas yang dilacak git |
| Objek bekas longsor (poligon kasar, titik pusat sel 5 km) | sedang | R2 di balik sesi; tidak `public/` |
| PNG citra sebelum dan sesudah per lokasi | rendah (citra terbuka) tetapi bisa memperlihatkan atap rumah | R2 di balik sesi; resolusi 10 m, tidak diperbesar |
| Inventaris manual kalibrasi (kotak Tapanuli Tengah) | sedang | `data/raw` lokal, tidak di-commit; hanya ringkasan presisi dan recall di JSON |
| Data orang | tidak ada | tidak ada |

## 2. Hak

Sama dengan Kaji Cepat Siklus (`src/hak.js` bagian Siklus): PD dan KO semua kejadian; BP hanya kab wilayahnya, rincian disaring ke `lingkupKab4` sesi sebelum dikirim; Pimpinan baca; tanpa sesi 401; peran lain 403. Ubah status hanya PD dan KO, tarik wajib alasan 3 sampai 300 karakter. Tidak ada hak baru. Tidak ada versi publik sebelum Q6.

## 3. Ancaman dan penjaga

| Ancaman | Penjaga |
| --- | --- |
| Kartu dibaca sebagai vonis penyebab ("hutan hilang menyebabkan banjir") | D8; templat kalimat tetap; gerbang bahasa menolak kata sebab; pil "keadaan, bukan sebab" |
| Urutan sebab terbalik (hutan hilang sesudah banjir dibaca sebelum) | D9; label waktu tampil di tiap angka; tahun kejadian tidak pernah digabung ke "sebelum"; uji T4 |
| Nol palsu | ALGORITMA 2, 5, 6; `validasi` menolak nol di bagian berstatus kosong |
| Dua sumber dijumlahkan | tidak ada bidang gabungan antarsumber; `validasi` dan `saji.kunci_terlarang` (`total`, `jumlah_gabungan`, `rata`) menolak; uji T9 |
| Ingest palsu ke `sk_kaji` | rute `ingest/kaji` yang ada dengan token pipeline; model di daftar `MODEL` |
| Penjelajahan kunci R2 lewat rute berkas | `:nama` dicocokkan daftar izin tetap; kunci R2 disusun server dari baris `sk_kaji`; BP dicek kab4 |
| BP melihat kab lain pada kejadian multi-kab | JSON disaring ke `lingkupKab4`; sel dan PNG per kab4 |
| R2 membengkak | batas ukuran per berkas, penolakan di Worker (DESAIN-TEKNIS 8) |
| Lisensi | atribusi Copernicus (GFM, GLO-30, Sentinel), Hansen/UMD/Google/USGS/NASA (CC BY 4.0), HydroSHEDS, CHIRPS, GPM IMERG (NASA GES DISC), UNOSAT per paket, Overture (ODbL); tertulis di Metode dan di JSON R2; poligon dan segmen turunan lisensi terbatas tidak didistribusikan (Q12) |
| SSRF lewat URL unduhan | pipeline yang mengunduh, bukan Worker; hanya host dalam daftar tetap di kode (storage.googleapis.com, data.hydrosheds.org, copernicus-dem-30m.s3.amazonaws.com, data.chc.ucsb.edu, *.earthdata.nasa.gov, *.eosdis.nasa.gov, data.humdata.org, earth-search.aws.element84.com dan sentinel-cogs.s3.us-west-2.amazonaws.com untuk Sentinel-2 COG, planetarycomputer.microsoft.com bila radar dipakai, overturemaps-us-west-2.s3.amazonaws.com untuk Overture) |
| Kebocoran token | header Authorization hanya diteruskan ke dua domain NASA; token tidak dicatat di log atau di JSON |
| Beban pada pihak ketiga | jeda, satu koneksi untuk CHIRPS, cache lokal, tanpa cron; mesin yang menjalankan dicatat |
| Kalimat "hutan hilang memperparah" atau sebaliknya dibaca sebagai vonis | ALGORITMA 12: templat tetap hanya di lampiran dan lipatan Metode, angka hujan satu blok dengan angka uji golongan, selang ditulis, gerbang menolak daftar terlarang ALGORITMA 9 |
| Label citra tampil sebagai fakta longsor resmi | label "perkiraan dari citra"; luas tak teramati tampil; tanpa hektare resmi sebelum dibandingkan (Q22); tak masuk Laporan Berkala |
| Hitung ulang diam-diam | versi append-only; versi lama tidak ditimpa; sidik kriteria tercatat di JSON |

## 4. Privasi

Tanpa koordinat bangunan, tanpa nama orang, tanpa NIK. Nama desa hanya administratif. Titik bukti hutan hilang dikelompokkan ke sel 5 km dan sel genangan 110 m; keduanya hanya di balik sesi. Kejadian dan wilayah korban tidak diberi nama personel. Angka dampak Pemkab dan DIBI tidak masuk paket ini (hanya di blok "Bandingkan" Kaji Cepat yang sudah ada).

## 5. Pemeriksa

`security-reviewer` dan `guard-api` untuk perubahan `src/siklus_kaji.js` dan migrasi; `migrasi-idempoten` untuk migrasi; `validasi-model` untuk kriteria dan uji bahaya; `selera-angka` dan `inp-reviewer` untuk layar; `higiene-repo` sebelum commit (berkas mentah tidak ikut).
