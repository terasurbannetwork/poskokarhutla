# RENCANA-UJI: Hulu ke hilir per kejadian

Aturan 3: tiap perilaku di luar TypeScript punya uji integrasi yang benar-benar menjalankannya. Mock tidak dihitung sebagai bukti untuk SQL, rute, dan pembaca berkas.

| Kode | Yang diuji | Perintah bukti | Kriteria terima |
| --- | --- | --- | --- |
| T1 | Golden `hitung_hansen` tidak berubah (D1) | `node --test tests/banjir/hitung_hansen_golden.test.mjs`, `python3 scripts/banjir/bukti_das.py uji`, `node --test tests/banjir/bukti.test.mjs` | tanpa `penanda`, keluaran `hitung_hansen` identik byte demi byte dengan golden luring `tests/banjir/fixtures/hitung_hansen_golden.json` yang dibuat HH-01 sebelum menyunting (tidak ada golden sebelum itu); `bukti_das.py uji` dan `tests/banjir/bukti.test.mjs` tetap hijau; plafon ukuran tetap |
| T2 | Lereng dan zona per titik | `python3 scripts/banjir/hulu_hilir_dem.py uji` | bidang miring sintetis 20, 40, 60 persen jatuh di kelas yang benar; batas 25 dan 40 tepat (25 masuk "25-40", 40 masuk "25-40", 40,01 masuk ">40"); tinggi 50 dan 500 masuk "tengah"; nodata di tetangga jadi kelas "tak" dan tidak dibuang; tepi ubin benar; `lereng_dem.py uji` hijau |
| T3 | Penanda dan jumlah kelas | `python3 scripts/banjir/bukti_das.py uji` (bagian hulu-hilir) | jumlah kelas lereng (termasuk "tak") sama dengan hutan hilang DAS untuk tiap tahun (selisih sampai satu ha per kelas); jumlah sub-DAS sama dengan DAS |
| T4 | Label waktu | `python3 -I scripts/siklus/hulu_hilir.py uji` | tahun kurang dari Y "sebelum", Y "tahun_kejadian" dan tidak pernah di "sebelum", lebih dari Y "sesudah"; Y 2026 memberi "belum_tercakup" dan bukan 0; alert: tiga bagian tahun Y berjumlah hilang Hansen Y; piksel tanpa alert tidak dipaksa ke sisi mana pun |
| T5 | Sempadan | `python3 scripts/banjir/hulu_hilir_sempadan.py uji` | kapsul analitik cocok dengan hitung kisi halus (selisih di bawah 2 persen) untuk ruas lurus, miring, dan bersudut; dua sungai berdekatan tidak dihitung dua kali; empat kelas berjumlah luas koridor tercuplik; invarian geometri lawan cuplikan 10 persen; uji lebar S=1, 2, 4 pada jendela sintetis |
| T6 | Cuplikan sempadan nyata | `python3 scripts/banjir/hulu_hilir_sempadan.py lebar` | pada tiga jendela koridor nyata, S=2 dan S=4 dibandingkan dengan S=1; hasil ditulis ke RISET; S dipilih menurut aturan ALGORITMA 4 |
| T7 | Pemilihan DAS | `python3 -I scripts/siklus/hulu_hilir.py uji` | sub-DAS bersarang digabung ke yang terbesar; maksimal tiga; kejadian tanpa kecamatan terpetakan memberi `tanpa_das`; tanpa `banjir_gfm` memakai status Siaga atau kecamatan anggota |
| T8 | Hujan | `python3 scripts/banjir/hulu_hilir_hujan.py uji` | sel sintetis berbobot irisan; slot dengan bobot sah di bawah 0,8 tidak sah; `curah_jendela_mm` tidak ditulis bila slot sah di bawah 95 persen; mulai naik sesuai definisi Q10 pada deret buatan; konversi UTC ke WIB benar (slot 21.00 UTC = 04.00 WIB); peringkat: seri buatan dengan nilai terbesar memberi "tertinggi dari n tahun", berikat benar; kalimat "bukan hujan setahun" hanya saat aturannya terpenuhi; tanpa token keluar "tidak tersedia" dan bukan 0 |
| T9 | Antarsumber tidak dijumlah | `python3 -I scripts/siklus/hulu_hilir.py uji` | `validasi` dan `saji.kunci_terlarang` (`total`, `jumlah_gabungan`, `rata`) menolak bidang gabungan yang menjumlah GFM dengan UNOSAT atau IMERG dengan CHIRPS; kesepakatan dihitung dari irisan, bukan jumlah |
| T10 | Genangan per zona, jalan, desa | `python3 scripts/banjir/hulu_hilir_resmi.py uji` | kasus sintetis: sel di zona hulu, tengah, hilir; luar DAS dicatat; jalan 50 m dipotong tepat pada batas sel; desa any dan 10 persen berbeda pada kasus buatan; poligon UNOSAT dan kisi 110 m konsisten; paket UNOSAT berupa tautan peta ditulis `tanpa_data` |
| T11 | Kriteria terkunci | `python3 scripts/siklus/hulu_hilir_kriteria.py prasyarat` dan `uji` | menolak uji bahaya bila sidik tidak cocok atau jangkar commit kosong; daftar kejadian kalibrasi dan uji tidak beririsan |
| T12 | Uji bahaya | `python3 -I scripts/siklus/hulu_hilir_bahaya.py uji` | lift, AUC kelas, bootstrap berblok pada data buatan dengan jawaban diketahui; "di luar zona" dihitung kelas 0; vonis sesuai Q13; peta yang menempatkan sel acak memberi lift sekitar 1 |
| T13 | Migrasi | `npm run uji:warga` (uji migrasi `sk_kaji`) | sesudah bangun ulang tabel: baris `gempa`, `banjir_jam1`, dan `banjir_gfm` lama utuh (isi dan indeks); `hulu_hilir` dengan ringkas tanpa rentang diterima; `gempa` tanpa rentang tetap ditolak; model lain ditolak; urutan terhadap migrasi GS-08 diuji pada kedua urutan; idempoten |
| T14 | Rute dan hak | `npm run uji:warga` (`tests/warga/siklus_kaji_hh.test.mjs`) | tanpa sesi 401; BP kab lain 403; ingest `hulu_hilir` dengan ringkas lebih dari 1.500 byte ditolak; `hasil_r2` hanya `<kj>_hulu_hilir_v<versi>.json` yang cocok dengan baris; BP pada kejadian dua kab hanya menerima kab miliknya; nama berkas di luar daftar izin ditolak |
| T15 | Layar murni | `node --test tests/siklus/hulu_hilir*.test.mjs` | tabel urut; baris kosong berteks; label waktu di tiap angka hutan hilang; "52 persen" tidak pernah tampil tanpa porsi hutan awal; tanpa kata dari daftar terlarang ALGORITMA 9; format angka Indonesia; "~" di bawah 10 ha |
| T16 | Cetak A4 | `node --test tests/agen/gerbang-kertas-a4.test.mjs` dan `tests/siklus/hulu_hilir_cetak.test.mjs` | lampiran muat satu lembar; nomor versi dan tanggal data per sumber ada |
| T17 | Replikasi lunak Aceh Tamiang | `python3 scripts/siklus/hulu_hilir.py jalan --kj <KJ> --kering` lalu jalan nyata sekali | tiap angka punya sumber atau alasan kosong; anggaran Q11 tercatat; selisih lawan storymap ditulis di RISET (ALGORITMA 10) tanpa menyetel apa pun |
| T18 | INP dan selera | `inp-reviewer`, `selera-angka` | klik segmen dan lapis peta tidak membekukan; angka tanpa presisi palsu; tabel panjang bertahap |
| T19 | Tinjau lokal | `http://localhost:8800/siklus/kaji` | pemilik melihat kartu pada kejadian pilot |
| T20 | Gerbang repo | `npm run uji:agen` | paket lengkap, berkas baru punya pemilik, token warna tidak bertambah, gerbang hulu-hilir hijau |
| T21 | Gerbang hulu-hilir | `node --test tests/agen/gerbang-hulu-hilir.test.mjs` | tanpa kata sebab di keluaran dan layar; tahun kejadian tidak di "sebelum"; tanpa bidang total antarsumber; berkas beku tidak berubah (sidik J4 dan nowcast cocok); `imerg.parse` tidak berubah (hash) |
| T22 | Komposit dan objek bekas longsor | `python3 scripts/longsor/lereng_kejadian.py uji` | adegan sintetis: awan dan bayangan SCL dibuang; piksel kurang adegan bersih jadi "tak teramati" dan bukan bebas longsor; komponen terhubung 8 tetangga; objek di bawah ukuran minimal dibuang; lereng di bawah ambang menyingkirkan sawah datar; air dan tanah terbuka dipisah |
| T23 | Kalibrasi lawan inventaris manual | `python3 scripts/siklus/hulu_hilir_kriteria.py prasyarat` dan `python3 scripts/longsor/lereng_kejadian.py kalibrasi` | blok kalibrasi dan blok uji tidak beririsan; ambang dikunci di `scripts/longsor/lereng_kejadian_kriteria.json` (milik `longsor`; sidiknya dicatat di `hulu_hilir_kriteria.json`) dengan jangkar commit sebelum blok uji dihitung; presisi dan recall dilaporkan per blok; tanpa angka ambang tertulis di kode sebelum kalibrasi |
| T24 | Golongan tutupan dan uji hipotesis | `python3 scripts/banjir/hulu_hilir_longsor.py uji` | data buatan dengan rasio diketahui (laju dua kali di lahan terbuka) dipulihkan dalam selang; kasus tanpa beda memberi selang memuat 1; kelas lereng dengan teramati di bawah 50 ha dikeluarkan dan dicatat; bekas longsor di hutan utuh tetap tampil jumlahnya; hujan satu blok dengan uji |
| T25 | Hubungan ke K6 | `python3 -I scripts/siklus/hulu_hilir.py uji` | piksel Hansen tahun Y di dalam objek berjendela sempit masuk `tahun_kejadian_di_longsor` dan tidak di "sebelum" atau "dibuka_manusia"; jendela lebar tidak memindahkan piksel apa pun; jumlah semua golongan tahun Y = hilang Hansen Y |
| T26 | Jarak sungai dan pelebaran alur | `python3 scripts/banjir/hulu_hilir_longsor.py uji` | jarak pada ruas sintetis benar di tiga lintang; pelebaran nol pada pasangan komposit sama; kepekaan koridor 100, 300, 500 m berurutan; piksel air tidak dihitung terbuka |
| T27 | Bahasa longsor | `node --test tests/agen/gerbang-hulu-hilir.test.mjs` | daftar terlarang ALGORITMA 9 ditolak; blok uji golongan tanpa angka hujan di blok yang sama (kartu) atau paragraf yang sama (lampiran) ditolak; kalimat templat di kartu (di luar lipatan Metode dan lampiran) ditolak |
| T28 | PNG lokasi dan penggeser | `python3 scripts/banjir/hulu_hilir_longsor.py uji` dan `node --test tests/inti/geser.test.mjs` | PNG sampai 120 KB, tiga PNG per lokasi (sebelum, sesudah, SWIR), paling banyak 6 lokasi; penggeser inti dipakai tanpa komponen baru |

## Mode gagal yang wajib punya uji tersendiri

- DEM nodata di separuh DAS: `cakupan_dem` di bawah 90 persen menutup angka kelas.
- Hansen tahun terakhir: kejadian 2026 tidak diam-diam memakai tahun 2025 sebagai "tahun kejadian".
- Sungai tanpa atribut luas hulu: ruas dilewati dan jumlahnya dicatat, bukan dianggap kecil.
- IMERG slot hilang di tengah jendela: total tidak ditulis.
- CHIRPS 429: berhenti, cache utuh, laporan "belum dihitung".
- UNOSAT paket tanpa poligon: `tanpa_data`.
- Semua adegan sesudah berawan: bagian bekas longsor "citra belum cukup bersih", tidak 0 objek.
- Jendela citra lebar: hasil berlabel "perubahan antara dua tanggal" dan tidak memindahkan piksel di K6.
- Inventaris manual kosong atau di luar kotak: kalibrasi menolak jalan.
- Poligon desa tidak ditemukan untuk kab: desa tergenang "tidak dihitung", bukan 0.

Kejadian uji bahaya dipilih dan dipisah (kalibrasi lawan uji) di HH-11 sebelum satu pun dihitung; kejadian yang sudah terlihat (Aceh Tamiang, Sumatera Barat November 2025 dan Padang) masuk kalibrasi.
