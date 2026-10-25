# Lapis (c) penyunting bahasa: mitigasi bab 07 (Bencana Hidrometeorologi)

Tanggal: 25 Okt 2026. Berkas: `naskah/mitigasi/bab-07.md`.

## Vonis slop

- Sebelum sunting: LOLOS, skor 0 (5.502 kata), nol temuan.
- Sesudah sunting: LOLOS, skor 0 (5.551 kata), nol temuan, kata kosong 0,0 per 1.000.
- Perintah: `.venv/bin/python qa/slop.py --final naskah/mitigasi/bab-07.md`.
- Satu putaran perantara GAGAL (S-21 kalimat penutup bergaya, baris 422) karena usulan "Oleh sebab itu, model hanya menjadi baris pembanding di kartu."; kalimat dikembalikan ke bentuk asal dan bab LOLOS lagi.

## Suntingan

| Letak | Sebelum | Sesudah | Alasan |
| --- | --- | --- | --- |
| Ringkasan, temuan 2 | El Niño dengan ONI | El Niño dengan *Oceanic Niño Index* (ONI) | singkatan pertama di bab (L66) |
| Ringkasan, temuan 3 | DIBI mencatat | Data dan Informasi Bencana Indonesia (DIBI) mencatat | L66; kepanjangan di 7.1 paragraf 2 dihapus agar tidak dobel |
| 7.1 paragraf 1 | KRB 2022–2026 mencatat ... [@bnpb-2025-renas] | KRB 2022–2026 dalam Rencana Nasional Penanggulangan Bencana (Renas PB) 2025–2029 mencatat | Renas dan PB pertama kali muncul di kebijakan kartu banjir tanpa kepanjangan |
| 7.1 paragraf 2 | Musim hujan di bab ini adalah 1 Oktober sampai 30 April. | Musim hujan dihitung dari 1 Oktober sampai 30 April. | meta-komentar ("di bab ini") |
| 7.1 paragraf 3 | Pemicu meteorologisnya tidak disebut, karena laporan kejadian BMKG ... hanya pers. | Pemicu meteorologisnya belum dapat dinyatakan karena laporan kejadian Badan Meteorologi, Klimatologi, dan Geofisika (BMKG) ... hanya pemberitaan pers. | BMKG pertama di bab (kepanjangan di 7.7 dikembalikan ke singkatan); meta-komentar diganti pernyataan substansi; koma sebelum "karena" dibuang (PUEBI) |
| 7.1 paragraf 4 | Renstra BNPB 2025–2029 | Rencana Strategis Badan Nasional Penanggulangan Bencana (Renstra BNPB) 2025–2029 | L66 untuk Renstra dan BNPB |
| 7.1 paragraf 5 | (DaLA) Bappenas | (DaLA) Badan Perencanaan Pembangunan Nasional (Bappenas) | L66 |
| 7.1 paragraf 5 | Penilaian kebutuhan pascabencana (PDNA) | Penilaian kebutuhan pascabencana (*Post-Disaster Needs Assessment*, PDNA) | kepanjangan glosarium |
| 7.1 paragraf 6 | Pemutakhirannya tercakup dalam @rek:r-m20, dan kartu ... karena itu memakai | Untuk sementara, kartu ... memakai ...; pemutakhirannya tercakup dalam @rek:r-m20. | "karena itu" muncul 11 kali di bab; urutan sebab-akibat diluruskan |
| Kartu banjir, respons | BPBD provinsi | Badan Penanggulangan Bencana Daerah (BPBD) provinsi | L66 |
| 7.2 paragraf 2 | Tahun 2024 karena itu tidak dipakai | Oleh sebab itu, tahun 2024 tidak dipakai | variasi penghubung |
| 7.2 paragraf 2 | sebab waktu tunggunya pendek dan koefisien asosiasi lintas negara hampir pasti melebih-lebihkan manfaatnya | sebab waktu tunggunya pendek | pengulangan antarsubbab; alasan lengkap tetap di 7.9 dan kebijakan kartu longsor |
| 7.4 paragraf 2 | di API KRB nasional | di antarmuka pemrograman aplikasi (API) KRB nasional | singkatan belum dieja |
| 7.5 paragraf 2 | Korban jiwa kekeringan karena itu jarang tetapi bukan nol | Korban jiwa kekeringan jarang, tetapi tidak nol | penghubung sebab tidak tepat (pengakuan Kemenko bukan sebab kelangkaan) |
| 7.6 paragraf 1 | untuk banjir hanya tersedia DaLA Jabodetabek 2007 | (@sub:hm-banjir) | pengulangan antarsubbab dengan 7.1 paragraf 5 |
| 7.6 paragraf 3 | API KRB ... membalas nol | API KRB ... mengembalikan nilai nol | ragam lisan |
| 7.7 paragraf 2 | definisi episode *Climate Prediction Center* (CPC) NOAA | ... (CPC) *National Oceanic and Atmospheric Administration* (NOAA) | singkatan belum dieja |
| 7.7 paragraf 2 | fase ENSO | fase *El Niño-Southern Oscillation* (ENSO) | L66 |
| 7.7 kebijakan kartu terburuk | lintasan IKP Renstra | lintasan indikator kinerja program (IKP) Renstra | L66; kepanjangan di 7.9 paragraf 1 dikembalikan ke singkatan |
| 7.7 paragraf ENSO 2026 | Badan Meteorologi, Klimatologi, dan Geofisika (BMKG) mencatat | BMKG mencatat | kepanjangan sudah di 7.1 |
| 7.7 paragraf El Niño kuat | Kartu ... karena itu memisahkan | Dengan demikian, kartu ... memisahkan | variasi penghubung |
| 7.7 paragraf musim berikut | Kalender kesiapan karena itu juga perlu | Atas dasar itu, kalender kesiapan juga perlu | variasi penghubung |
| 7.9 paragraf 3 | laporan UNDRR dan WMO | laporan *United Nations Office for Disaster Risk Reduction* (UNDRR) dan Organisasi Meteorologi Dunia (*World Meteorological Organization*, WMO) | singkatan belum dieja |
| 7.9 paragraf 3 | Rumus kepekaan karena itu memberi penduduk tercakup mortalitas | Dalam rumus kepekaan, penduduk tercakup diberi mortalitas | variasi penghubung dan struktur kalimat |
| 7.9 paragraf hulu | Badan Keahlian DPR ... kinerja BPK 2022 | Badan Keahlian Dewan Perwakilan Rakyat (DPR) ... kinerja Badan Pemeriksa Keuangan (BPK) 2022 | L66 |
| 7.9 paragraf Bangladesh | InaTEWS, sistem peringatan dini tsunami, berkekuatan sedang | Sistem peringatan dini tsunami *Indonesia Tsunami Early Warning System* (InaTEWS) berkekuatan sedang | kepanjangan glosarium |
| 7.10 paragraf 3 | Pemicu kemarau 2027 karena itu memakai | Untuk sementara, pemicu kemarau 2027 memakai | variasi penghubung |

"karena itu" tinggal 4 dari 11. Token `{{angka:...}}`, rujukan pustaka `[@...]`, kutipan berpetik, dan rujukan silang tidak berubah (dicek mesin: himpunan sebelum dan sesudah sama), kecuali satu rujukan silang baru `@sub:hm-banjir` yang menggantikan kalimat ulangan. Tanpa em dash dan tanpa " · ". Makna tidak diubah.

## Daftar periksa M-1 sampai M-14

- M-1 pasif penyembunyi pelaku: tidak ditemukan; pencatat (DIBI, BMKG, CPC, Renas PB, Renstra, Bank Dunia, SiPongi) dan pelaku tindak lanjut (BPBD, Deputi, kementerian) tersebut.
- M-2 sinonim berputar: istilah konsisten (lantai, kandidat lantai, kejadian majemuk, musim acuan, asumsi kebijakan).
- M-3 kalimat pertama mengulang judul: tidak ada.
- M-4 keberatan fiktif: tidak ada.
- M-5 angka ketik tangan: angka data bertoken; "delapan belas musim", "tiga musim", "delapan episode", "seperdelapan" adalah bilangan teks penjelas, bukan angka data baru.
- M-6 sebab dari korelasi: koefisien WMO ditulis sebagai asosiasi, bukan efek kausal; kaitan ENSO dan korban tidak diklaim sebab.
- M-7 paragraf satu gagasan: terpenuhi.
- M-8 subbab templat: kartu skenario mengikuti direktif; prosa antarsubbab tidak berpola sama.
- M-9 rekomendasi: semua tindak lanjut merujuk @rek berlembaga.
- M-10 kontras "X, bukan Y": tiap kontras berlandas (paparan bukan jejak kejadian, intensitas pelaporan bukan keparahan, aset terpapar bukan kerugian kejadian, jumlah semusim bukan pengungsi serentak).
- M-11 register: formal ilmiah; "membalas nol" diganti.
- M-12 tebal sebagai penekanan: tebal hanya pada kalimat pembuka temuan (L16) dan label ringkasan.
- M-13 kalimat bijak kosong: tidak ada.
- M-14 uji tukar logo: tidak berlaku untuk naskah.

Program yang terkait peringatan dini tidak disebut terbukti: InaTEWS sedang, Sekolah Lapang Iklim lemah, dan kekuatan bukti Bangladesh tidak dialihkan. Angka model (rasio, Koplitz dkk.) selalu bersanding dengan angka tercatat dan berlabel.

## Catatan untuk sesi induk

- `bangun/kontrak/naskah.py` menolak bab ini dengan `kunci angka "hidromet.nasional.lantai.rasio_musim_kedua" tidak ada di data/angka.json` (baris 15). Galat ini sudah ada pada berkas sebelum sunting (dicek ke salinan asal); tokennya tidak disentuh. Kuncinya perlu ditambahkan pemilik paket angka.
- API, CPC, DPR, NOAA, PDB, UNDRR, dan WMO belum terdaftar di `data/glosarium.json`; semuanya sudah dieja di bab ini, tetapi T-10 akan menandai yang berhuruf kapital penuh sampai didaftarkan. KD-2 adalah kode keputusan dalam register, bukan singkatan. Glosarium di luar cakupan lapis ini.
- Pemeriksaan L66 di atas memakai tiruan T-9 atas markdown; T-9 sebenarnya (`qa/periksa.py`) baru dapat dijalankan pada DOCX hasil bangun.
