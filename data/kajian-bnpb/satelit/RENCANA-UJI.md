# RENCANA-UJI: Pemantauan satelit

Kriteria vonis tiap detektor dikunci (kriteria + sidik + jangkar commit) sebelum data uji dibaca; uji `prasyarat` menolak jalan bila sidik tidak cocok. Tiap uji `uji` adalah self-check stdlib berkasus sintetis, tanpa jaringan.

| Kode | Yang diuji | Perintah bukti | Kriteria terima |
| --- | --- | --- | --- |
| T1 | Status sumber WLF | `python3 -I scripts/data/himawari.py uji` | sambungan ditolak menulis `status_sumber: terputus` dan `sejak` = acuan sah terakhir, berkas data lama tidak ditimpa; FTPS dicoba sebelum FTP polos; tanpa sandi di log |
| T2 | Status sumber di Worker | `npm run uji:warga` (`tests/warga/himawari*.test.mjs`) | ambang ALUR 3 tepat di tiga batas; `/api/status` memuat `status_sumber`; umur di atas batas tidak pernah `hidup` |
| T3 | Kartu Satelit | `node --test tests/inti/satelit.test.mjs` | `terputus` menyembunyikan angka lama dan menulis "sumber terputus sejak"; tanpa vonis `lolos` pil hipotesis ada; gerbang hilang atau rusak = hipotesis (gagal-tertutup); tidak ada "aman", "padam", "bebas api", "cerah"; 0 hanya bila status `ok` dan `awan_persen` tersedia |
| T4 | Pemindai | `python3 -I scripts/umum/himawari_pindai.py uji` | kunci S3 tersusun benar; segmen sintetis terbaca lewat fungsi `awan_himawari` (bukan salinan); satu detektor galat tidak menghentikan yang lain; geometri matahari pada tiga kasus rujukan dalam 0,5 derajat |
| T5 | Ukur pemindai | `python3 scripts/umum/himawari_pindai.py ukur --pindai <YYYYMMDDHHMM>` | MB, detik, latensi tercatat; total <= 4 menit di runner |
| T6 | Pemicu Worker | `npm run uji:warga` (`tests/warga/satelit_picu.test.mjs`) | satu pindaian dipicu sekali; tanpa token lewat; host S3 tetap; daftar tanpa 6 kanal tidak memicu; galat dispatch tidak menulis `picu.json` |
| T7 | Detektor api | `python3 -I scripts/data/api_himawari.py uji` | kasus sintetis: api di latar seragam terdeteksi, latar < 25 persen sah = `latar_kurang`, awan tidak jadi api, sumber statis dan kawah dibuang, kilau matahari dibuang, `penanda` diimpor |
| T8 | Kriteria api terkunci | `python3 -I scripts/data/api_himawari.py prasyarat` | gagal bila sidik berubah atau jangkar kosong; minggu uji tidak terbaca saat kalibrasi |
| T9 | Vonis api | `python3 scripts/data/api_himawari.py vonis` | entri `api_himawari` di `public/data/gerbang/satelit.json` lewat `gerbang.py`; dua pembanding pada jumlah alarm sama; median menit dahulu tercatat; n < 20 = tak dapat dinilai |
| T10 | Migrasi dan alarm | `npm run uji:warga` (`tests/warga/alarm_himawari*.test.mjs`) | baris lama `sumber = 'wlf'`; sumber `l1b` ditolak bila gerbang tidak `boleh_tampil` atau vonis prospektif bukan `lolos`; idempoten |
| T11 | Abu | `python3 -I scripts/gunungapi/abu_satelit.py uji` lalu `vonis` | koreksi uap air menurunkan alarm pada kasus lembap sintetis; `koreksi_kurang` di bawah 200 piksel; gunung level I tidak dinilai; vonis lawan VONA tertulis |
| T12 | Konveksi | `python3 -I scripts/udara/awan_tumbuh.py uji` lalu `vonis` | definisi 30 menit lama sama dengan fixture sebelum perubahan (golden); OT sintetis terdeteksi, sirus dingin lebar tanpa cincin hangat tidak; paralaks tergeser ke arah benar; vonis lawan Dalops `cuaca` dengan `skor_dua` |
| T13 | Kawah dan SO2 | `python3 -I scripts/gunungapi/kawah.py uji`, `python3 -I scripts/gunungapi/so2.py uji` | api lereng di luar 2 km dibuang; median 0 = "baru muncul"; massa SO2 kasus 1 DU x 100 km2 = 2,85 t; lintasan berawan = `tak_teramati`; token tidak pernah tercetak |
| T14 | Genangan harian | `python3 -I scripts/banjir/genangan_harian.py uji` | hari tanpa lintasan tidak menghasilkan baris angka; status tak sah tidak pernah 0; memakai `hitung_pasangan` (bukan salinan) |
| T15 | VHI | `python3 -I scripts/kekeringan/vhi.py uji` | rerata per kab sintetis tepat; minggu tanpa data = tak teramati; vonis lawan Dalops kekeringan dan SPI-3 |
| T16 | Asap | `python3 -I scripts/udara/asap_aod.py uji` | kuantil 0,9 AI per kab tepat; hari berawan = tak teramati; Spearman dan AUC lawan PM2.5 tercatat |
| T17 | Gerbang repo | `npm run uji:agen` | paket lengkap, berkas baru punya tepat satu pemilik, token warna tidak bertambah, kartu standar |
| T18 | INP dan selera | `inp-reviewer`, `selera-angka` | ganti jenis dan klik baris tidak membekukan; angka tanpa presisi palsu |
| T19 | Tinjau lokal | `http://localhost:8800/`, `/gunungapi`, `/cuaca`, `/banjir`, `/kekeringan`, `/udara`, `/instansi` | pemilik melihat kartu Satelit dan keadaan terputus |
| T20 | Ujung ke ujung seminggu | `satelit.yml` jalan dari pemicu Worker 7 hari | median latensi <= 20 menit; ukuran R2 dibanding Q5; tidak ada pindaian dipicu dua kali |

Periode uji: musim kering 2026 (Jul sampai Okt) dari arsip R2 dan, untuk api, arsip WLF `arsip/himawari/` sebagai pembanding kedua; minggu kalibrasi dan uji berselang, dipilih di kriteria sebelum dibaca.
