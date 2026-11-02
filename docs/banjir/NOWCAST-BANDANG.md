# Nowcast banjir bandang 0-6 jam (rancangan, belum aktif)

Status: kode `scripts/banjir/nowcast_bandang.py` menarik FITUR dan memberi `status` level 0-3 menurut ambang pra-registrasi. Protokol, ambang, label, pembanding, dan kriteria: **`scripts/banjir/PRAREG-BANDANG.md`** (draf, belum dibeku). Level BELUM TERUJI, tidak ada di workflow, tidak terbit ke layar (`tayang: false`).

## Yang sudah ada (dipakai ulang, tidak diduplikasi)

| Bagian | Berkas | Catatan |
| --- | --- | --- |
| Pengambil GSMaP | `genangan/gsmap.py` (`sambung`, `unduh_batas`, `isi_folder`, `FtpPalsu`), `genangan/m1_kumpul.py` (`cari_jam`, `NRT`) | FTP `hokusai.eorc.jaxa.jp`, secret `GSMAP_USER`/`GSMAP_PASS` hanya di Actions. NRT: `/realtime_ver/v8/hourly_G`, lalu `/hourly` |
| Arsip jam-jaman | `data/banjir/genangan/m1_hujan.jsonl` (append-only, 42 kecamatan DKI, beku oleh M1) | hanya Jakarta, hanya total/maks harian; tidak dipakai di sini |
| Tangki / M1 | `genangan/tangki.py`, `m1_*` | sidik beku sampai 30 Apr 2027; jangan sunting |
| Bandang di status | `status.py`: `I >= 30` mm/jam dan B >= 0,33 (Siaga) | Open-Meteo `imax`, 0,25 derajat, harian; jalur konservatif, bukan GSMaP |
| Hulu | `hulu.py`: persentase hujan per sub-DAS hulu (Open-Meteo harian) | berguna untuk sub-DAS, bukan intensitas jam |
| Flood Hub | `floodhub.py`: peristiwa bandang 24 jam per kabupaten (`kab[...].bandang`), PRAREG-FLOODHUB | pembanding independen, protokol sendiri |
| Bahaya | `public/banjir/data/bahaya.json` (InaRISK `bandang`), `pusat_kec.json` (7.274 pusat kecamatan) | 1.142 kecamatan dengan bandang >= 0,33 |

## Sumber dan latensi

- GSMaP NRT v8 per jam, 0,1 derajat, global. Latensi klaim JAXA sekitar 4 jam; yang nyata diukur: `tarik` mencatat `umur_jam_terbaru` dan `pola` (G = gauge, N = biasa, - = hilang) pada tiap jalan. Nowcast efektif 0-6 jam berarti hujan yang SUDAH jatuh sampai (sekarang - ~4 jam) menjadi dasar peringatan; kemungkinan 0-2 jam pertama praktis sudah lewat. Ini batas bawaan sumber, bukan kekurangan kode.
- GSMaP Now (produk JAXA latensi lebih pendek): tidak ada di kode dan jalurnya BELUM diketahui; jangan ditebak. Periksa daftar direktori lewat login pada jalan pertama (`gsmap.berkas_tanggal` mencetak susunan folder bila tak cocok).
- Akses: SUDAH terverifikasi lewat workflow `m1_prospektif.yml` (baca NRT `/realtime_ver/v8/hourly_G` tiap hari dengan `GSMAP_USER`/`GSMAP_PASS`): run 31 Okt 2026 pola 24 dari 24 jam "G", 2.592 nilai sel DKI, maks 7,1 mm/jam, rata-rata 0,02 mm/jam. Yang belum diukur: latensi jam terbaru (M1 membaca hari kemarin penuh) dan cakupan nasional (M1 hanya DKI).
- Zona waktu: berkas bernama UTC. Hari kejadian WIB/WITA/WIT dihitung per bujur (`zona_waktu`, pendekatan; batas provinsi tidak lurus). Jangan menjumlah per hari UTC untuk kejadian malam.

## Unit

Tahap 1 (kode sekarang): kecamatan dengan indeks InaRISK bandang >= `B_MIN` 0,33 (sementara, nilai yang sama dengan B di `status.py`; bukan ambang hujan). Sel GSMaP = sel yang memuat pusat kecamatan; 0,1 derajat (~11 km) jauh lebih kasar daripada DAS kecil, jadi keluaran adalah hujan di sekitar kecamatan, bukan di hulunya.
Tahap 2 (belum): sub-DAS kecil. Berkas HydroBASINS level 09 ada di `data/raw/banjir/das` (level 10-12 belum diunduh), dan `bukti_das.py subdas` sudah memetakan sub-DAS hulu. Hujan GSMaP dirata-ratakan di sub-DAS hulu kecamatan. Dikerjakan hanya jika tahap 1 punya skor di atas dasar.

## Fitur (per unit, per jalan)

`h1` maks 1 jam, `h3` maks 3 jam berurutan, `h6` jumlah 6 jam terakhir (semua di jendela 6 jam yang berakhir pada jam terbaru tersedia); `a24` jumlah 24 jam SEBELUM jendela (anteseden); `hilang` jumlah jam kosong (dihitung 0 dan dilaporkan). Jam harus berurutan, celah ditolak. Lereng: belum dipakai di kode; calon dari DEM yang sudah ada di pipeline (belum dipetakan per kecamatan), baru dimasukkan bila terbukti menambah skill.

## Ambang: lihat PRAREG-BANDANG.md §4

Diperbarui 2 Nov 2026: ambang kini ada sebagai hipotesis dari kategori BMKG, aturan `status.py` (30 mm/jam), dan kurva intensitas-durasi Caine 1980; asal tiap angka dan mutunya di PRAREG-BANDANG.md §4. Paragraf di bawah adalah catatan awal (cara data-driven) yang belum dijalankan karena belum ada arsip GSMaP jam-jaman bandang.

Tidak ada sumber terverifikasi yang saya pegang untuk ambang intensitas-durasi banjir bandang tropis di Indonesia, jadi tidak ada angka. Bahan yang boleh dibaca sebagai pembanding SESUDAH diverifikasi teksnya (belum diperiksa di sini): kerangka FFG/FLASH (Gourley dkk., 2013) dan ambang intensitas-durasi longsor (Caine 1980; Guzzetti dkk. 2008) yang sering dipakai untuk bandang berlongsor. Tidak satu pun dipasang sebagai bukti ambang bandang; Caine hanya analogi longsor yang mengilhami h3/h6 di PRAREG-BANDANG.md §4 (ambang awal heuristik).

Cara menetapkan dari data, bukan literatur:
1. Label: kejadian jenis banjir bandang dari logbook Pusdalops (jenis `banjir_bandang`, `uji_logbook.py`) dan DIBI `bandang`. DIBI bandang sejak 2016 hanya sekitar 300 kabupaten-hari (DIBI 2024 tidak lengkap) dan logbook baru mulai 2026; jumlah ini kecil, jadi unit evaluasi = kecamatan-hari, dan pembagian uji ditentukan dulu.
2. Arsip GSMaP jam-jaman 2016-2025 untuk tanggal kejadian harus diunduh (jalur standar `hourly_G`); `m1_hujan.jsonl` tidak cukup (hanya DKI).
3. Pembagian waktu: pilih ambang (kuantil h1/h3/h6 pada kecamatan-hari bandang) dari 2016-2021, tolak/tahan di 2022-2025, buka 2026 sekali. Arsip hanya BOLEH MENOLAK (ambang yang gagal di arsip dibuang); tidak boleh memutuskan.
4. Prospektif memutuskan: pra-registrasi `PRAREG-BANDANG.md` (beku sebelum ambang dipakai), penilaian hanya dari jalan nowcast yang ditulis SEBELUM kejadian, pembanding = status.py (imax >= 30) dan Flood Hub bandang. Lulus bila batas bawah CI blok > dasar, seperti protokol PRAREG lain. Sebelum lulus, layar memakai label "Hipotesis, belum lolos uji" atau tidak muncul.

## Langkah pemilik

1. Akses GSMaP NRT per jam sudah jalan di `m1_prospektif.yml`; yang masih perlu ditanyakan ke JAXA hanya jalur GSMaP Now (latensi lebih pendek).
2. Jalankan `tarik` sekali di Actions untuk mengukur latensi jam terbaru dan nilai di luar DKI.
3. Putuskan unit tahap 2 dan izin mengunduh arsip 2016-2025 (puluhan GB berkas global; ambil hanya sel kecamatan).
