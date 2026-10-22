# Rancangan: dari data ke api padam

Status: **Fase 0 dan 1 DISETUJUI pemilik 22 Okt 2026** dengan keputusan: tugas otomatis untuk level 3 + level 2
bersyarat; insiden Himawari hanya ke Posko pusat sampai VIIRS mengonfirmasi; server rute berbayar BOLEH bila graf sendiri tidak
cukup (Fase 3); permintaan akses data TMAT BRGM, SiPongi, Daops lewat jalur BNPB DIJALANKAN (draf surat:
`docs/bnpb/SURAT-AKSES-DATA.md`).
**Fase 0 dan 1 SELESAI 22 Okt 2026** (commit c6665052, f444167c, 73baff5f); berlaku di produksi setelah migrasi 0037-0041
diterapkan. Fase 2 sampai 5 masih draf. Disusun dari (1) review kode dan data produksi, (2) riset sistem operasional dan repo terbuka.

Tujuan tunggal: **api padam lebih cepat.** Ukurannya waktu nyata per insiden:
deteksi → tugas → dikonfirmasi → tim tiba → padam → padam terverifikasi.

## 1. Temuan review (keadaan sistem hari ini)

Yang sudah kuat: kluster kompleks ST-DBSCAN, garis luar api, ambang prioritas yang diuji balik,
taktik yang jujur soal asumsi, tugas api untuk daerah, pelacak GPS regu, verifikasi padam
(FIRMS + Himawari + regu, cek ulang gambut), Meja Pantau, operasi lapangan.

Yang menghambat api padam (urut dampak, bukti di laporan review):

| # | Masalah | Akibat di lapangan |
|---|---|---|
| R1 | Data akses dan rekomendasi dikunci ID kompleks harian (`K0001`) yang berubah tiap 3 jam | Rute dan kebutuhan bisa tertempel ke api yang salah |
| R2 | Tugas dibuat hanya jam kelipatan 3 menit 18, padahal data baru terbit sekitar menit 25 | 4,5 sampai 9 jam dari satelit lewat sampai daerah dapat tugas |
| R3 | Belum ada kiriman otomatis ke orang lapangan (push sedang dibangun, email EWS mati) | Daerah baru tahu kalau membuka layar |
| R4 | 1.927 tugas per putaran, 92% level 2 | Tugas penting tenggelam, daerah kelelahan |
| R5 | Lokasi tugas beku saat dibuat; navigasi ke pusat kompleks | Regu bisa diarahkan beberapa km dari front api |
| R6 | Isian lapangan tidak pernah kembali ke model | Luas, laju regu, kebutuhan air, kedalaman bara tidak pernah dikalibrasi |
| R7 | Ramalan "akan membesar" 2.619 dicatat, 0 dinilai | Peluang tampil tanpa bukti |
| R8 | Domain lama mati; pemeriksa kesehatan merah tiap jam | Data basi sungguhan tidak akan terlihat |
| R9 | Himawari (10 menit) tidak membuat tugas; FRE di taktik mati | Deteksi dini terbuang |
| R10 | Akses dan air dihitung garis lurus; rute graf hanya 183 kompleks; embung dan sungai kecil belum ada | Kebutuhan selang, pompa, dan waktu tiba meleset |
| R11 | Luas mentah dari piksel 375 m sekitar 200 kali lebih besar dari rekap BNPB | "Sebesar apa" menyesatkan bila angka mentah yang tampil |
| R12 | Pemegang konsesi di tugas selalu kosong | Penanggung jawab lahan tidak langsung terlihat |

## 2. Prinsip rancangan

1. **Satu insiden, satu ID, satu kartu.** Titik satelit, laporan warga, laporan regu, tugas, dan hasil
   menempel ke ID insiden yang stabil sepanjang umur api (meniru IRWIN di AS).
2. **Kartu Api menjawab empat pertanyaan dalam satu layar ponsel:** di mana, sebesar apa, bagaimana
   situasinya, apa yang dibutuhkan. Kartu yang sama untuk Posko, regu, dan pimpinan, bisa dicetak dan
   dikirim sebagai teks WhatsApp.
3. **Jujur soal ketidakpastian.** Setiap titik punya radius ketidakpastian (VIIRS sekitar 375 m,
   Himawari sekitar 2 km), setiap angka kebutuhan punya rentang, dan yang belum teruji diberi label.
4. **Kecepatan dulu, ketelitian menyusul.** Alarm cepat dari Himawari, lokasi dari VIIRS, luas akhir
   dari Sentinel-2.
5. **Lapangan memperbaiki model.** Tiap isian regu menjadi data kalibrasi.

## 3. Rancangan per fase

### Fase 0: betulkan yang rusak (paling cepat, dampak paling besar)

| Butir | Isi | Menutup |
|---|---|---|
| 0.1 | Ganti domain mati ke centurisk97.id di pemeriksa kesehatan, tautan email/pengingat, teks prioritas, dan pembaca kapasitas | R8 |
| 0.2 | Akses dan rekomendasi dicocokkan ke kompleks berdasarkan lokasi (jarak), bukan ID harian | R1 |
| 0.3 | Tugas dibuat begitu data kompleks baru terbit (diperiksa tiap menit), bukan menunggu jam kelipatan 3 | R2 |
| 0.4 | Tugas otomatis hanya untuk level 3 dan level 2 yang memenuhi syarat tambahan (dekat permukiman, di konsesi, atau tumbuh); sisanya masuk daftar pantau tanpa membebani daerah | R4 |
| 0.5 | Lokasi tugas mengikuti deteksi terbaru/terpanas; navigasi ke titik masuk dari jalan terdekat | R5 |
| 0.6 | Penilaian ramalan "akan membesar" dibetulkan; sampai ada bukti, peluang tidak tampil | R7 |
| 0.7 | Pemegang konsesi terisi di tugas | R12 |

### Fase 1: insiden dan Kartu Api (inti)

| Butir | Isi |
|---|---|
| 1.1 | **ID insiden stabil** lintas putaran: kompleks baru dicocokkan ke insiden lama lewat tumpang tindih/jarak (meniru algoritma NASA FEDS/fireatlas). Dipakai pipeline, worker, warga, regu |
| 1.2 | **Perimeter dan front aktif**: garis luar (sudah ada) ditambah front aktif dari deteksi ≤ 12 jam dan riwayat pertumbuhan per putaran |
| 1.3 | **Radius ketidakpastian** per titik dan per front, ditampilkan di peta dan kartu |
| 1.4 | **Ukuran yang jujur**: luas front aktif dan luas terkoreksi (faktor rekonsiliasi), dengan rentang; angka mentah piksel tidak lagi tampil sebagai luas |
| 1.5 | **Kartu Api** per insiden: lokasi (koordinat front, titik masuk terdekat, desa terdekat), ukuran (luas, panjang front, tren 24 jam), lahan (gambut + ketebalan, kawasan, pemegang konsesi + kontak), cuaca (FWI, angin, arah sebaran 6 sampai 24 jam), akses (rute, jalan kaki km, waktu tiba), air (sumber terdekat, jarak selang, pompa estafet), kebutuhan (regu, pompa, air, durasi, perlu heli atau tidak, dengan rentang), keselamatan (arah angin ke jalur masuk), penanggung jawab (BPBD kab, Daops terdekat, perusahaan) |
| 1.6 | Kartu sebagai teks WhatsApp dan lembar cetak satu halaman |

### Fase 2: deteksi dan kabar lebih cepat

| Butir | Isi |
|---|---|
| 2.1 | **Himawari sebagai alarm dini**: api baru yang terlihat Himawari (belum ada di FIRMS) menjadi insiden "perkiraan, radius 2 km" berstatus siaga, lalu dikunci lokasinya begitu VIIRS lewat |
| 2.2 | Data Himawari dipakai pipeline taktik (FRE hidup lagi sebagai pemeriksa intensitas) |
| 2.3 | **Push seketika** untuk insiden level 3 baru dan tombol darurat regu; push 3 jam untuk ringkasan (sedang dibangun) |

### Fase 3: serinci dan seakurat mungkin dari semua lapisan

| Butir | Isi | Data |
|---|---|---|
| 3.1 | Rute nyata untuk semua insiden prioritas tiap putaran (jalan, sungai, kanal), titik masuk terbaik, koreksi dari jejak GPS regu | OSM + graf yang sudah ada (diperluas); Valhalla/GraphHopper hanya bila graf sendiri tidak cukup |
| 3.2 | Sumber air lengkap: kanal, sungai kecil, embung, sumber air temuan regu; jarak selang dan pompa estafet per insiden | OSM, embung, ops_sumber_air |
| 3.3 | Elevasi untuk beda tinggi selang dan arah aliran air | Copernicus DEM 30 m (terbuka) |
| 3.4 | Gambut: ketebalan, perkiraan kebasahan (hujan beberapa minggu terakhir, kelembapan tanah satelit), status sekat kanal bila ada data; risiko bara diberi label perkiraan | peta gambut, hujan, TMAT bila ada akses |
| 3.5 | Luas akhir terverifikasi dari Sentinel-2 (dNBR) setelah api padam | citra.py yang sudah ada |
| 3.6 | Masker sumber panas tetap (industri, flare, titik berulang di lokasi sama) supaya regu tidak dikerahkan ke false positive | riwayat FIRMS |

### Fase 4: umpan balik dan kalibrasi

| Butir | Isi |
|---|---|
| 4.1 | Ekspor isian lapangan harian (luas nyata, status, lahan, kedalaman bara, durasi padam, regu, air) ke pipeline |
| 4.2 | Kalibrasi faktor luas, laju kerja regu, kebutuhan air, dan kedalaman bara dari data itu; tampilkan "berdasarkan N insiden" |
| 4.3 | Metrik waktu per kabupaten (deteksi → tugas → konfirmasi → tiba → padam → terverifikasi) masuk Rapor BPBD |

### Fase 5: alat regu

| Butir | Isi |
|---|---|
| 5.1 | Halaman regu menampilkan api terdekat dengan Kartu Api, bukan hanya formulir lapor |
| 5.2 | Peta luring di ponsel regu (ubin peta yang sudah ada) |
| 5.3 | Mosaik drone (OpenDroneMap) sebagai bukti verifikasi padam; ATAK/FreeTAKServer hanya bila regu butuh komunikasi tanpa internet |

## 4. Repo dan sistem yang dipakai atau ditiru

| Repo / sistem | Keputusan | Untuk |
|---|---|---|
| NASA FEDS / fireatlas (github.com/Earth-Information-System/fireatlas) | Tiru algoritma, tidak dipasang | 1.1, 1.2 |
| DEA Hotspots Australia | Tiru radius ketidakpastian | 1.3 |
| IRWIN (NIFC, AS) | Tiru konsep ID insiden tunggal | 1.1 |
| CIFFC Kanada | Tiru papan sumber daya | Meja Pantau |
| cffdrs | Pakai sebagai uji silang FWI | kesehatan |
| Valhalla / GraphHopper | Cadangan bila graf sendiri tidak cukup (butuh server) | 3.1 |
| OpenDroneMap | Pakai untuk mosaik drone | 5.3 |
| FreeTAKServer / ATAK-CIV | Opsional bila regu butuh luring penuh | 5.3 |
| Cell2Fire, ELMFIRE, ForeFire | Abaikan: tidak ada model bahan bakar gambut | – |

Lisensi dan keaktifan repo dicek ulang sebelum dipakai.

## 5. Yang perlu diputuskan pemilik

1. Syarat tugas otomatis (0.4): hanya level 3, atau level 3 + level 2 bersyarat?
2. Insiden dari Himawari (2.1) ikut dikirim ke daerah sebagai "perkiraan 2 km", atau hanya untuk Posko pusat sampai VIIRS mengonfirmasi?
3. Server rute (Valhalla/GraphHopper) bila graf sendiri tidak cukup: ada biaya server di luar Cloudflare.
4. Permintaan akses data resmi lewat jalur BNPB: TMAT BRGM, SiPongi KLHK, status regu Daops.

## 6. Yang tidak diklaim

- Kedalaman bara gambut tidak bisa diukur satelit; ditampilkan sebagai perkiraan dan diverifikasi regu.
- Angka kebutuhan air per hektare gambut di literatur sangat lebar (ratusan ribu sampai satu juta liter); dipakai sebagai rentang, bukan angka pasti.
- Target waktu respons ditetapkan dari data tugas sendiri (4.3), bukan dari angka luar yang tidak terverifikasi.

## 7. Kontrak data Fase 0 dan 1 (dipegang semua pengerja)

`public/data/tugas_kompleks.json` tetap satu-satunya berkas yang dibaca Worker (menit-menit cron, CPU kecil).
Tiap entri `kompleks[]` mempertahankan kunci lama (`id, lat, lon, prov, kab, kec, level, n24, jam_sejak, luas,
rekomendasi, akses, konsesi`) dan menambah kunci di bawah. Kunci yang belum ada = Worker memakai perilaku lama.

| Kunci | Bentuk | Penulis | Arti |
|---|---|---|---|
| `insiden` | string, contoh `"62-261022-007"` (kode prov, tanggal WIB pertama terdeteksi, urut) | `scripts/data/insiden.py` | ID stabil sepanjang umur api |
| `otomatis` | bool | `scripts/data/harian.py` | true = Worker membuat tugas baru (level 3, atau level 2 dengan syarat) |
| `syarat` | daftar dari `"permukiman"`, `"konsesi"`, `"tumbuh"` | `scripts/data/harian.py` | alasan level 2 ikut otomatis |
| `konsesi` | daftar `{jenis, nama, pemegang}` (maks 3) | `scripts/data/konsesi_kompleks.py` | pemegang lahan di bawah kompleks |
| `front` | `{lat, lon, waktu, sensor, radius_m}` | `insiden.py` | deteksi terbaru, terpanas bila seri |
| `masuk` | `{lat, lon, jarak_km, jenis}` atau null | `insiden.py` | titik jalan/sungai terdekat ke front |
| `radius_m` | angka | `insiden.py` | ketidakpastian lokasi front (VIIRS 375, MODIS 1000, Himawari 2000) |
| `luas_aktif` | `{ha, min, maks}` | `insiden.py` | piksel deteksi <= 12 jam, dikoreksi |
| `luas_koreksi` | `{ha, min, maks, faktor, dasar}` | `insiden.py` | luas terbakar terkoreksi faktor rekonsiliasi; `luas` mentah tetap untuk kompatibilitas tapi tidak lagi tampil sebagai luas |
| `tren` | `{n24, n24_kemarin, arah}` | `insiden.py` | tumbuh/stabil/menyusut |

`public/data/insiden.json` (penulis `insiden.py`): status bergulir semua insiden aktif dan padam <= 14 hari
(id, kompleks hari ini, garis luar, front, riwayat per putaran, desa terdekat). Bergulir lewat cache `data-` di titik.yml.

Worker: `tugas_api` menyimpan `insiden`; pencocokan tugas lama memakai `insiden` dulu, jarak 2 km kabupaten sama
sebagai cadangan. Lokasi tugas (`lat, lon`) ikut `front` terbaru selama tugas belum padam. Tugas dibuat begitu
`dibuat` di tugas_kompleks.json berubah (diperiksa tiap menit), bukan jam kelipatan 3.
