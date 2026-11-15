# RISET: Misi Udara

Riset 15 Nov 2026. Tiga bagian: batas terbang per bencana, jenis misi dan parameternya, kode repo yang dipakai ulang.

Tingkat keyakinan tiap butir: **A** = sumber resmi dibaca langsung, **B** = sumber sekunder (media, ringkasan, Wikipedia),
**C** = tidak ketemu atau hanya pengetahuan umum yang belum diverifikasi. Butir C tidak boleh menjadi angka di mesin.

Banyak dokumen primer gagal diunduh di sesi riset (Permen ESDM 15/2011 lampiran, PM 94/2015, ICAO Annex 2, Doc 9974, IAMSAR,
INSARAG, UNDAC, Logistics Cluster). Daftar yang harus dibaca langsung sebelum angkanya dipakai ada di bagian 4.

## 1. Batas terbang per bencana

| Bencana | Temuan | Sumber | Keyakinan |
| ------- | ------ | ------ | --------- |
| Gunung api | Tidak ada radius baku per level untuk semua gunung. Badan Geologi (PVMBG) menetapkan radius dan sektor per gunung per kejadian. Contoh: Semeru Level IV, 19 Nov 2025, radius 8 km dari puncak, sektor tenggara sepanjang Besuk Kobokan 20 km, sempadan sungai 500 m. | esdm.go.id, siaran "PVMBG tingkatkan aktivitas Gunung Api Semeru ke Level IV Awas" | A (contoh), C (lampiran Permen ESDM 15/2011) |
| Gunung api | VONA memakai kode warna penerbangan merah, oranye, kuning, hijau, dan belum ditetapkan. Pembaruan minimum: kuning 14 hari, oranye 7 hari, merah 1 hari. | ICAO, "VONA Flyer for SVOs", 30 Mar 2026 | A |
| Gunung api | Pemetaan level PVMBG ke warna ICAO tidak ditemukan. | – | C |
| Abu vulkanik | Abu harus dihindari: partikel meleleh di turbin dan memadamkan mesin. Tidak ada ambang konsentrasi "aman" dan tidak ada ketentuan khusus helikopter yang terbaca. | SKYbrary (ringkasan ICAO Doc 9974) | B |
| Asap, jarak pandang | Angka batas terbang visual di PM 94/2015 (CASR 91) dan ICAO Annex 2 tidak terbaca; sumber sekunder saling bertentangan. | – | C |
| Gempa | INSARAG punya sinyal hening untuk mendengarkan korban; aturan khusus helikopter tidak ditemukan. | sekunder | B/C |
| Tsunami | Larangan mendarat di zona landaan saat peringatan aktif tidak ditemukan tertulis. | – | C |
| Longsor, banjir | Tidak ada angka atau aturan resmi. | – | C |
| Cuaca ekstrem | Hindari awan badai (kumulonimbus) dalam 20 NM: panduan umum pesawat, bukan angka helikopter. Batas angin harus dari manual tiap tipe. | FAA AC 00-24C (dicatat sekunder) | B |
| Kekeringan, udara, pesisir | Debu saat mendarat, suhu tinggi, angin laut, terbang di atas air: tidak ada sumber. | – | C |

Simpulan untuk rancangan: hanya dua hal yang layak mengubah rute secara otomatis, yaitu radius dan sektor PVMBG per gunung
(data resmi yang sudah ditarik repo) dan jejak abu. Sisanya dicetak sebagai perhatian atau menunggu jawaban pemilik.

## 2. Jenis misi dan parameter

| Butir | Temuan | Sumber | Keyakinan |
| ----- | ------ | ------ | --------- |
| Daftar jenis misi | Tidak ada satu dokumen resmi yang terbaca. Yang lazim: angkut dengan mendarat, dropping, muatan gantung, kaji cepat udara, evakuasi medis, pencarian, water bombing, modifikasi cuaca, pemetaan, kunjungan pimpinan, relai komunikasi. | pengetahuan umum | C |
| Lapangan pendaratan | Bidang darat dan lingkaran bebas halangan per kelas: ringan 4,6 x 4,6 m dan 23 m; sedang 6 x 6 m dan 27 m; berat 9 x 9 m dan 33,5 m. Lingkaran bebas halangan minimal 1,5 kali diameter rotor. Kemiringan maksimum 6 derajat. Tinggi halangan maksimum di jalur pendekatan: 3 m pada 24 m, 6 m pada 49 m, 9 m pada 73 m, 12 m pada 98 m dari tepi lingkaran bebas halangan. Hindari tanah lunak atau basah. | NWCG PMS 510, Standards for Helicopter Operations, Mei 2019, Bab 8 (standar kebakaran hutan Amerika Serikat; edisi 2023 belum dicek) | A |
| Kelas helikopter | Ringan sampai 2.722 kg berat lepas landas, 4 sampai 8 kursi; sedang 2.722 sampai 5.670 kg, 9 sampai 14 kursi; berat di atas 5.670 kg, 15 kursi atau lebih. | NWCG PMS 510 Exhibit 6.1 | A |
| Zona dropping | 200 x 1.000 m untuk pesawat, ditandai karung putih; perlu tim darat; massa bisa menyerbu zona. Angka resmi WFP tidak terbaca. | The New Humanitarian 2009; WFP USA | B |
| Pola pencarian | Kotak melebar, sektor, lintasan sejajar, garis merayap, garis lintasan, kontur. Tabel jarak lintasan ada di IAMSAR Vol II dan tidak terbaca. | sekunder | B/C |
| Kaji cepat udara | Tidak ada pedoman UNDAC, MapAction, atau OCHA yang terbaca. | – | C |
| Cadangan bahan bakar | Terbang visual siang 20 menit, malam 30 menit pada kecepatan jangkauan terbaik. Aturan Indonesia tidak ditemukan. | EASA CAT.OP.MPA.191; 14 CFR 135.209 | B |
| Data tipe helikopter | AW139 jelajah 306 km/jam, 15 penumpang; Bell 412EP 226 km/jam, 13 penumpang; AS332 L1 247 km/jam, 20 sampai 24 penumpang; Mi-171A2 260 km/jam, 24 penumpang, muatan dalam 4.000 kg. Caracal, Bell 505, Bo-105, Ka-32 tidak lengkap. | Wikipedia | B |
| Aturan dukungan udara BNPB, Basarnas, TNI AU | Tidak ditemukan lewat pencarian. | – | C |

## 3. Kode repo yang dipakai ulang

| Kebutuhan | Yang sudah ada | Catatan |
| --------- | -------------- | ------- |
| Jarak, haluan, DMS | `scripts/operasi/renlap.py`: `jarak_nm`, `baringan`, `dms`, `dari_dms`, `NM_KM` | dipakai apa adanya |
| Titik dalam poligon, indeks ruang | `renlap.py`: `dalam_cincin`, `Ruang`, `Gambut` | pola untuk zona |
| Peta citra dan gambar rute | `scripts/operasi/renlap_pdf.py`: `bingkai`, `gpx`, `svg_rute`, `penanda`, `skala`, `utara`, `kepala`, `CSS`, `cari_chrome` | pindah ke `scripts/umum/renlap_keluaran.py` di PB-13 |
| Rute urut tetap | `scripts/operasi/renlap_banjir.py`: `susun_tetap`, `rencana` (15 Nov 2026) | dipindah di MU-03 lalu dihapus |
| KML, GPX, teks WA | `renlap_banjir.py`: `kml`, `gpx_teks`, `teks_wa`; salinan di `public/operasi_laporan.js` | sudah tersalin empat kali; disatukan PB-13 |
| Kelayakan terbang | `public/operasi_peta.js:52-65` `kelayakan(b)`: tidak layak bila jarak pandang di bawah 1.500 m, ada badai guntur, atau angin di atas 30 knot; terbatas bila di bawah 5.000 m, ada asap, atau angin di atas 20 knot | hanya ada di layar; angin dari `public/data/metar.json` yang basi. Sumber angin segar: `public/banjir/data/cuaca_metar.json` |
| Gunung api | `public/banjir/data/gunungapi_status.json` (`scripts/gunungapi/magma.py`): `gunung[]{nama, level, lat, lon, radius_km, rekomendasi}`, 69 gunung; `vona` sering kosong | sumber zona larang |
| Abu | `public/banjir/data/abu_gunungapi.json` (`abu.py`): jejak di atas ambang penerbangan, `bandara_terdampak` | skenario model, bukan pengamatan |
| Tsunami | `public/gempa/data/inatews_tsunami.json`, `tsunami_zona.json` (tingkat per kabupaten) | |
| Peringatan cuaca | `public/banjir/data/peringatan.json` `nowcast[]{event, polygon, mulai, selesai}`; `cuaca_siklon.json` | poligon siap pakai |
| Longsor | `public/longsor/data/nowcast.json`, `pvmbg.json` | per kecamatan |
| Banjir | `public/banjir/data/status.json` | per kecamatan |
| Bandara, helipad, pangkalan | `public/data/udara.json` (`scripts/scrape/udara.py`): 864 titik, 184 helipad | sumber base di luar sembilan base karhutla |
| Penyimpanan | `pb_renlap`, `pb_titik` (migrasi 0130), kunci R2 `operasi/renlap/<bencana>/...` | `pb_renlap` belum punya kolom jenis misi |

Sedang dikerjakan sesi lain per 15 Nov (ada di folder kerja, belum di-commit): `scripts/umum/renlap.py` dan `scripts/umum/renlap_keluaran.py` (PB-13).
Yang belum ada: rute `/api/pb/renlap*`, `public/inti/renlap.js`
(tiket Paritas PB-12 sampai PB-18), kelayakan terbang di sisi Python, pemeriksaan zona pada rute, dan data tipe helikopter.

Risiko bentrok: PB-13 dan PB-15 memesan `scripts/umum/renlap.py` dan menghapus `renlap_banjir.py`; `src/pb_isian.js` sedang
dikerjakan sesi lain; kartu renlap di `public/operasi_laporan.js` bersinggungan dengan PB-18 dan seksi Peluang semai.

## 4. Yang harus dibaca langsung sebelum angkanya dipakai

1. Permen ESDM 15/2011, lampiran gunung api (arti tiap level).
2. PM 94/2015 (CASR 91) dan perubahannya: batas terbang visual dan cadangan bahan bakar.
3. ICAO Annex 2 dan Doc 9974.
4. IAMSAR Manual Vol II bagian pola dan jarak lintasan.
5. NWCG PMS 510 edisi 2023.
6. Manual terbang tiap tipe helikopter yang dipakai (batas angin, daya tahan, muatan).
