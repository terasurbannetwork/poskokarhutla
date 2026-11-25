# PRD: Pemantauan satelit semua bencana

## 1. Tujuan

Staf Pusdalops, Koordalops, dan pengerja lapangan tahu dalam 20 menit sesudah satelit memotret: di mana api baru muncul, di mana abu gunung api terlihat, di mana awan konvektif tumbuh cepat, dan kapan sumber satelit terputus. Untuk bencana lambat (kawah, SO2, genangan, kekeringan, asap) mereka melihat deret harian atau mingguan per kab. Semua angka berlabel hipotesis sampai lolos uji lawan Dalops dan label lain (K4), dan tidak pernah menggantikan status resmi.

## 2. Pengguna dan hak

| Peran | Lihat | Terima alarm ke luar |
| --- | --- | --- |
| Pusdalops (PD), Koordalops (KO) | semua jenis, semua wilayah | hanya detektor ber-vonis `lolos` dan Q6 ya |
| BPBD kab (BP) | wilayahnya, lewat layar yang sudah punya hak BP | sama |
| Instansi (tugas api) | kolom Himawari di tugas api, hanya dari sumber ber-vonis `lolos` | lewat alur tugas api yang ada |
| Publik | tidak sebelum Q7 | tidak |

## 3. Fitur

- F-1 Status sumber: tiap sumber satelit menulis `acuan`, `status_sumber`, `sejak`; layar dan `/api/status` menulis "sumber terputus sejak <jam WIB>" (D3). Berlaku segera untuk WLF P-Tree.
- F-2 Pemulihan WLF: coba FTPS `ftplib.FTP_TLS`, siapkan surel ke JAXA (Q1).
- F-3 Pemindai bersama 10 menit: satu unduhan L1b NOAA per pindaian, semua detektor Himawari (D1), dipicu Worker (Q2).
- F-4 Titik panas Himawari L1b: detektor kontekstual B07/B14, saringan sumber statis dan alarm palsu yang ada, aturan penanda PKH-04 dipakai ulang; dinilai lawan VIIRS.
- F-5 Abu gunung api: selisih split-window terkoreksi uap air di kotak 100 km gunung level II ke atas; dinilai lawan VONA.
- F-6 Konveksi 10 menit: Tb minimum, laju pendinginan, puncak tembus per kab, koreksi paralaks; dinilai lawan Dalops cuaca (puting beliung, cuaca ekstrem).
- F-7 Panas kawah dan SO2: FIRMS VIIRS dalam 5 km kawah, SO2 TROPOMI dalam 50 km; dinilai lawan kenaikan level MAGMA.
- F-8 Genangan harian per kab: pola insiden karhutla (satu baris per kab per hari selama kejadian aktif) dari `genangan_nasional.py`; dinilai lawan Dalops banjir.
- F-9 Kekeringan vegetasi: VHI mingguan per kab; dinilai lawan Dalops kekeringan dan SPI-3.
- F-10 Asap: Aerosol Index TROPOMI per kab per hari; dinilai lawan PM2.5.
- F-11 Rapor uji per detektor di `public/data/gerbang/satelit.json`; layar membaca gagal-tertutup.
- F-12 Panel "Satelit" per layar bencana (karhutla, gunung api, cuaca, banjir, kekeringan, udara) dengan kartu standar.
- F-13 Lanjutan (Q14): kabut malam lawan METAR, GSMaP_NOW, LST.

## 4. Larangan

- Tanpa "aman", "padam", "bebas api", "tidak ada abu", "cerah" (D15).
- Tanpa 0 untuk sumber terputus, tertutup awan, di luar lintasan, atau kab tak teramati.
- Tanpa menjumlah titik Himawari dengan VIIRS atau MODIS (D10).
- Tanpa mengubah, menggabung, atau merata-rata status BMKG, PVMBG, VAAC (D9).
- Tanpa alarm ke luar dari detektor tanpa vonis `lolos` (D8).
- Tanpa ambang yang disetel sesudah melihat data uji; kriteria dikunci dulu (D5).
- Tanpa folder modul baru, tanpa pembaca HSD atau GFM kedua (D1, D2, D13).
- Tanpa commit hasil 10 menit (D11, Q4).
- Tanpa data orang.

## 5. Ukuran berhasil

- Sumber terputus terlihat di layar dalam satu siklus cron sesudah sumber mati (uji ST-01).
- Latensi pindai sampai R2: median <= 20 menit dari jam mulai pindai, diukur seminggu (ST-03).
- Tiap detektor F-4 sampai F-10 punya vonis tertulis (`lolos`, `gagal`, `tak dapat dinilai`) dengan kriteria yang dikunci sebelum dinilai.
- Titik panas L1b: median waktu dahulu terhadap VIIRS pertama dan presisi per kelas tercatat di rapor; alarm baru keluar hanya bila lolos.
- Layar lolos `inp-reviewer` dan `selera-angka`, ditinjau pemilik di `http://localhost:8800`.
