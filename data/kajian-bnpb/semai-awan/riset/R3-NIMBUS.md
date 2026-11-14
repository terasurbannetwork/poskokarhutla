# R3 Cerna Nimbus: apa yang ditiru, apa yang tidak

Sumber: 20 tangkapan layar yang dikirim pemilik 14 Nov 2026 dan "Nimbus Product Guide" versi 2.2 (12 Nov 2026, 13 halaman, PDF dari
pemilik). Berkas PDF tidak disalin ke repo; yang dicatat di sini hanya isi yang dipakai sebagai acuan rancangan.

## 1. Layar

| Layar Nimbus | Isi | Di sistem kita |
| ------------ | --- | -------------- |
| Beranda (hero, berita, tim) | pemasaran produk | tidak ditiru |
| Peta dunia | titik api 24 jam dunia per sel 0,25 derajat, pangsa daya api per negara, kotak konsol | tidak ditiru (S2) |
| Konsol wilayah | peta kiri, keputusan kanan; bilah sumber di atas; bilah waktu 24 jam per 3 jam dengan tombol putar; tabel cluster aktif; kartu "cara memutuskan"; kartu "yang tidak terlihat satelit dan model" | ditiru sebagai seksi Peluang semai di `/operasi` |
| Lapisan peta | titik api (merah > 40 MW, oranye di bawahnya, abu di luar negeri), awan bisa disemai (sel biru), prakiraan asap, angin pengarah 850 sampai 700 hPa (panah), zona semai (lingkaran merah "A 0,78" dengan garis putus ke titik hujan), kota dan posko (segitiga) | ditiru semua; kota dan base dari data repo |
| Kartu Rekomendasi | zona teratas: provinsi, skor, jendela terbang, koordinat DMS dan desimal, empat alasan berikon C (awan), F (api), T (kota), B (base, menit terbang) | ditiru |
| Daftar zona | A sampai E: provinsi, jendela terbang, kota terdekat, skor; klik memindah peta dan bilah waktu | ditiru |
| Kartu kosong | "tidak ada awan layak semai yang hanyut ke api 24 jam ke depan"; varian "tidak ada api cukup besar" | ditiru dengan kalimat Indonesia |
| Peringatan asap | hijau bila tidak ada asap ke negara lain; merah: jam pertama menyeberang, kota terdekat di sana, cluster asal; daftar kota di bawah asap dengan jam tiba dan tingkat tinggi/sedang/rendah | ditiru; mesin lintasan repo sudah menghitung kota dan lintas batas |
| Tampilan peran | Pos komando (penuh), Tinjau (bobot geser, tabel faktor 10 sel terbaik, salin CSV), Mitra (cluster teragregasi, zona dibulatkan 0,5 derajat, tanpa alasan) | ditiru (S4) |
| Ringkasan bagikan | teks pendek: cluster besar dan total MW, prospek asap, zona dibulatkan 0,5 derajat dengan jam, penafian | ditiru |
| Konsol Turki (30-30-30, pre-position) | cuaca api Mediterania | tidak ditiru; FWI repo sudah ada |

## 2. Metode Nimbus v2 (angka acuan)

Penyaring sel 0,1 derajat, semua harus terpenuhi pada jam itu:

| Syarat | Ambang | Dasar menurut Nimbus |
| ------ | ------ | -------------------- |
| Tutupan awan rendah | >= 25% | asumsi |
| MUCAPE | >= 1.500 J/kg | saran peninjau BMKG |
| Cairan awan kolom | >= 0,05 kg/m2 | literatur (mekanisme), asumsi (nilai) |
| Geseran 850 ke 200 hPa | <= 12,5 m/s | saran peninjau, asumsi nilai |
| RH 850 hPa | >= 65% | asumsi |
| Hujan sudah turun | < 4 mm/jam | asumsi |

Awan menengah tidak dihitung. Skor zona: Q (kualitas awan) 0,45, D (hanyut ke api) 0,40, T (jarak kota) 0,15, dijumlah berbobot.
D: titik hujan = sel digeser angin pengarah (rerata 850 dan 700 hPa) selama 30 menit; D naik dengan daya api dalam 25 km titik itu.
T: nol dalam 10 km dari kota, penuh di atas 50 km. Sel yang dinilai hanya dalam 60 km dari cluster besar: >= 40 MW, atau 2% cluster
terbesar bila lebih besar. Hanya jam siang (07.00 sampai 16.00 WIB untuk seluruh Indonesia). Sel bernilai nol bila tidak layak semai
atau tidak ada api di bawah titik hujannya. Zona >= 0,35, berjarak >= 40 km, lima terbaik. Jendela terbang = jam siang dengan skor
zona >= 85% puncaknya. Menit terbang dari posko atau bandara terdekat pada sekitar 300 km/jam.

Asap: partikel dilepas tiga kali per jam dari tiap cluster besar, digerakkan campuran angin 10 m (60%) dan 850 hPa (40%), langkah
15 menit selama 24 jam. Ditandai jam pertama "bagian berarti" asap mencapai daratan negara lain, dan kota dengan asap dalam 20 km.
Tingkat tinggi/sedang/rendah adalah beban relatif, bukan PM2.5.

Data: FIRMS VIIRS (SNPP, NOAA-20, NOAA-21) 24 jam; ECMWF IFS open data 0,1 derajat (cadangan GFS 0,25 derajat); Natural Earth.
Dibangun ulang sekitar tiap 2 jam; tiap layar menyebut jam data, satelit yang gagal diunduh, dan peringatan bila data lebih dari 6 jam.
Indonesia: 15 titik operasi, 6 posko TMC dan 9 bandara.

## 3. Yang diakui Nimbus sendiri sebagai kelemahan

- Ambang dan bobot nilai awal, sebagian asumsi; uji balik musim 2019 dan 2023 baru direncanakan Desember 2026.
- Baru satu peninjauan informal oleh satu meteorolog BMKG; belum ada lembaga yang meninjau resmi.
- Peran hanya tampilan data publik yang sama, tanpa masuk per lembaga.
- Himawari belum dipakai (rencana Q2 2027).

## 4. Di mana kita bisa lebih baik dari Nimbus

1. **Syarat awan hangat yang hilang** (R1 §4): suhu dasar awan, kedalaman dasar awan ke level beku, dan updraf w 850 sampai 700 hPa.
   Berkas `pl` IFS 0,1 derajat membawa `t, q, w, gh`, jadi bisa dihitung tanpa sumber baru.
2. **Gerbang dikali nilai**, bukan jumlah berbobot (D4), dengan mode "seperti Nimbus" di Tinjau BMKG untuk pembanding.
3. **Base nyata**: base dan armada dari `op_base` dan gelar armada hari itu, bukan daftar bandara statis.
4. **Uji prospektif sejak hari pertama** (D7), padahal Nimbus baru merencanakan uji balik.
5. **Pemeriksa awan teramati**: Himawari B13 puncak dingin per kabupaten sudah ada di repo (`scripts/udara/awan_himawari.py`).
6. **Renlap**: zona bisa langsung jadi target renlap OMC (S3), dan sortie OMC (`omc_sortie`) bisa dinilai lawan zona.
7. **Asap**: mesin lintasan repo sudah 72 jam, tiga lapisan, dengan poligon lintas batas; tinggal angin 0,1 derajat dan bobot FRP.

## 5. Bahan pitch Nimbus (tangkapan layar Instagram dan Zoom, dikirim pemilik 14 Nov 2026)

Bahan dari presentasi KREATE Climate Tech (Koç University) dan COP31. Angka di bawah adalah klaim Nimbus, belum diverifikasi kecuali
ditandai.

| Bagian pitch | Isi | Arti bagi kita |
| ------------ | --- | -------------- |
| Masalah | "Pesawat bukan masalahnya, keputusannya." 271 operasi semai melawan api pada musim 2023 (Apr sampai Okt); kepala BNPB disebut melaporkan pertumbuhan awan hujan "tidak signifikan", jadi hanya sedikit yang menjadi hujan. Data api, awan, dan angin di tiga sistem tanpa gambar bersama | masalah yang sama dengan PRD §1; angka 271 dan kutipan kepala BNPB dicek ke laporan BNPB sebelum dipakai di deck mana pun |
| Pasar | 10 pesawat siaga untuk Riau, Jambi, Sumsel, Kalbar, Kalteng (2023); 238 operasi modifikasi cuaca BMKG 2025 semua tujuan, kebanyakan didanai BNPB; APP Group ikut mendanai operasi 10 hari Jambi dan Sumsel (Agt 2025) | BNPB adalah pembeli sasaran Nimbus; membangun sendiri berarti tidak perlu lisensi |
| Persona | "Rina", koordinator posko semai Pekanbaru: tiap pagi memutuskan terbang atau tidak, di mana, kapan; butuh satu peta api, awan, angin, keputusan yang bisa dibela di depan BNPB dan BMKG, peringatan asap dini | sama dengan alur Pos komando (ALUR §2) |
| Harga | pilot didanai hibah; provinsi USD 20 ribu per tahun; nasional USD 120 ribu per tahun; modul lintas batas +USD 40 ribu per negara mitra; umpan risiko konsesi USD 8 ribu per tahun. Jangkar: satu operasi modifikasi cuaca sekitar Rp 400 juta | biaya membangun sendiri dibanding lisensi nasional; tidak dipakai di layar |
| Pesaing | Nimbus mengklaim satu-satunya yang menggabungkan titik api, awan layak semai, zona dan jam, prakiraan asap lintas batas, dan tampilan bersama multi-lembaga. Pembanding: koordinasi manual, FIRMS/SiPongi/EFFIS, ASMC, OroraTech/Pano AI, Rainmaker | sistem kita sudah punya titik api, asap, dan renlap; yang ditambah awan layak semai dan zona |
| Langkah berikut | Nov sampai Des 2026 uji balik musim 2019 dan 2023; Q1 2027 tinjau teknis BMKG; Q2 2027 versi pilot (masuk per lembaga, peringatan, Himawari, segar 10 menit sesudah data baru); Jul sampai Okt 2027 pilot satu provinsi; 2028 lisensi nasional dengan BNPB | uji prospektif kita (D7) mulai sejak tiket SA-10, lebih awal dari jadwal Nimbus |
| Ukuran pilot | jeda data baru ke rekomendasi < 10 menit; sortie yang terbang ke awan berskor layak naik dari musim lalu; akurasi arah asap 24 jam lawan pengamatan; posko yang memakai tiap hari | dipakai di PRD §5 |
| Masukan data | slide teknologi (24 Okt 2026) masih menyebut NOAA GFS 0,25 derajat per jam dan segar tiap 3 jam; panduan v2.2 (12 Nov) sudah ECMWF 0,1 derajat dengan cadangan GFS | sumber sama dengan D1 |

Pelajaran untuk rancangan: tombol renlap dan penilaian sortie lawan zona (PRD F-9, F-21) menjawab langsung klaim "hanya sedikit yang
menjadi hujan": tiap sortie bisa diperiksa apakah terbang ke awan berskor layak.
