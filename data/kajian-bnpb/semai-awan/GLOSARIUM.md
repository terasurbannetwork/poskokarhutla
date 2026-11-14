# GLOSARIUM: Peluang Semai Awan dan Prakiraan Asap

Istilah Operasi Udara (base, armada, renlap, OMC, cluster, tinjau lokal) mengikuti `data/kajian-bnpb/operasi-udara/GLOSARIUM.md`.

| Istilah | Arti di modul ini |
| ------- | ----------------- |
| Semai awan higroskopis | Pesawat menaburkan partikel garam (NaCl, CaO) ke awan yang sedang tumbuh supaya tetes awan cepat membesar dan bergabung; bisa membantu hujan turun, tidak menjamin |
| TMC, OMC | Teknologi atau operasi modifikasi cuaca; di layar disebut OMC |
| Awan layak semai | Sel grid yang lolos semua gerbang G1 sampai G9 pada satu jam prakiraan |
| Sel | Kotak grid 0,1 derajat (sekitar 11 km) model ECMWF IFS |
| Putaran | Satu prakiraan model yang dimulai pukul 00 atau 12 UTC, mis. "putaran 14 Nov 00z" |
| Langkah | Jam prakiraan sejak awal putaran: 0, 3, ..., 36; tiap langkah mewakili blok 3 jam mulai jam sahnya |
| Gerbang | Syarat ya/tidak; sel yang gagal satu gerbang bernilai nol |
| Q, kualitas awan | Faktor 0 sampai 1 dari CAPE, cairan awan, kelembapan 850 hPa, geseran rendah, dan updraf |
| D, hanyut ke api | Faktor 0 sampai 1 dari daya api dalam 25 km titik hujan |
| T, jarak kota | Faktor 0 sampai 1: nol dalam 10 km dari kota atau bandara, penuh di atas 50 km |
| C, F, T, B (label alasan) | Empat baris alasan di kartu Rekomendasi: C awan (faktor Q), F api (faktor D), T kota (faktor T), B base (bukan faktor skor, hanya jarak dan menit terbang) |
| Skor | Rerata geometris berbobot Q, D, T dikali gerbang (bawaan), atau jumlah berbobot (mode seperti Nimbus) |
| Zona semai | Sel berskor tertinggi setempat, A sampai E, berjarak >= 40 km satu sama lain, skor >= 0,35 |
| Titik hujan | Letak awan yang diperkirakan sesudah τ menit dari penyemaian, digeser angin pengarah |
| τ (jeda semai ke hujan) | Bawaan 30 menit; 20, 45, 60 sebagai uji kepekaan |
| Angin pengarah | Rerata vektor angin 850 dan 700 hPa, lapisan tempat awan rendah bergerak |
| Jendela terbang | Jam siang berurutan ketika skor zona >= 85% puncaknya |
| CAPE, MUCAPE | Energi potensial konvektif: energi awan untuk terus naik; MUCAPE dihitung dari udara paling labil di lapisan bawah |
| Cairan awan (tclw) | Air cair dalam tetes awan di satu kolom udara, kg/m2 |
| Geseran angin | Beda vektor angin 850 dan 200 hPa; geseran kuat merobek awan muda |
| LCL | Tinggi dasar awan perkiraan: tempat udara naik menjadi jenuh |
| Suhu dasar awan | Suhu udara di LCL; awan "hangat" bila di atas sekitar 10 derajat C |
| Level beku | Tinggi tempat suhu turun ke 0 derajat C |
| Kedalaman awan hangat | Level beku dikurangi LCL; bagian awan tempat garam bekerja |
| Updraf (w) | Kecepatan udara naik; model memberi Pa/s, diubah ke m/s |
| hPa | Hektopascal; 850 hPa sekitar 1,5 km, 700 hPa sekitar 3 km, 200 hPa sekitar 12 km |
| FRP, daya api | Daya radiasi api dari satelit, MW; untuk membandingkan tempat, bukan ukuran mutlak |
| Cluster besar | Cluster api dengan `frp24` (FRP 24 jam) >= maksimum(40 MW, 2% `frp24` cluster terbesar) |
| Beban asap relatif | Jumlah bobot partikel lintasan per sel, dinormalkan per putaran; bukan PM2.5 |
| Lintas batas | Jam pertama >= 5% partikel satu cluster berada di daratan negara lain |
| Pos komando | Tampilan penuh untuk Pusdalops, posko TMC, pimpinan |
| Tinjau BMKG | Tampilan peninjau: bobot bisa digeser, tabel faktor, CSV |
| Mitra | Tampilan untuk bahan mitra lintas batas: cluster teragregasi, zona dibulatkan 0,5 derajat |
| Mode seperti Nimbus | Skor jumlah berbobot tanpa gerbang G7 dan G8, tanpa tanda bahaya, dan Q tanpa komponen updraf, untuk pembanding |
| Satelit hilang | Sumber VIIRS dengan titik < 20% rerata 7 hari atau gagal unduh |
| Putaran beku | Salinan keluaran satu putaran di arsip append-only untuk uji prospektif |
| Uji prospektif | Menilai zona sesudah waktunya lewat, lawan hujan satelit, tanpa mengubah aturan sesudah melihat hasil |
| GSMaP, IMERG | Hujan satelit jam-an (JAXA, NASA) untuk menilai zona |
| ECMWF IFS | Model cuaca global Pusat Eropa; data terbuka 0,1 derajat berlisensi CC BY 4.0 |
| GRIB2, `.index` | Format berkas model cuaca; berkas index menyebut letak byte tiap field |
