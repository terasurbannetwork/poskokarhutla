# Risiko masa depan dan Lifeline

Halaman ini merinci metode risiko masa depan, prioritas kartu pintu, dan usulan status Lifeline.

## Risiko masa depan (F6)

Sumber: NEX-GDDP-CMIP6 harian curah hujan 0,25 derajat per model (skenario historical, SSP2-4.5, SSP5-8.5), muka laut AR6, GHSL BUILT-S R2023A 100 meter, dan CHIRPS v3 sebagai pembanding bias. Data raksasa dibaca di tempat dan hanya agregat yang disimpan.

Indeks per sel dan tahun kalender:

```
RR = pr x 86400 (mm per hari)
Rx1day(y) = maks RR harian;  Rx5day(y) = maks jumlah RR lima hari berurutan (tidak melintasi tahun)
CDD(y)    = rentang terpanjang hari berurutan dengan RR < 1 mm
delta_m   = P_m(skenario, periode) - B_m          (dasar 1995 sampai 2014 pada model yang sama)
relatif_m = delta_m / B_m x 100                    hanya bila B_m > 0
```

Median dan rentang antarmodel memakai persentil dengan interpolasi linear (posisi `q = (n - 1) x p`) dengan rentang p17 sampai p83 (konvensi AR6). Persentil p17 dan p83 baru tampil dari paling sedikit 5 model, dan rentang dianggap andal dari 10 model (ambang usulan, belum disetujui pemilik; `scripts/siklus/iklim_lab.py:129-131`). Horizon 2021 sampai 2040 dan 2041 sampai 2060. Hanya tiga indeks yang dibuat. Nilai kabupaten adalah rerata sel yang berpusat di poligon, dan bila tidak ada sel di dalam, dipakai sel terdekat ke titik pusat. Grid sekitar 27 km lebih kasar daripada banyak kabupaten, dan ini ditulis di layar. Selisih terhadap CHIRPS tidak dicampur ke delta.

Muka laut: median AR6 2050 SSP2-4.5 0,20 m (0,17 sampai 0,26) dan SSP5-8.5 0,23 m (0,20 sampai 0,29) dari dasar 1995 sampai 2014, nilai global. Horizon 2021 sampai 2040 menunggu rekaman AR6. Penurunan muka tanah tidak dihitung.

Pertumbuhan bangunan di zona bahaya (GHSL):

```
CAGR_Z = ( B_Z(e2) / B_Z(e1) )^(1 / (e2 - e1)) - 1                       bila B_Z(e1) > 0
indeks konsentrasi = ( (B_Z(e2) - B_Z(e1)) / (B_k(e2) - B_k(e1)) ) / ( A_Z / A_k )
```

Indeks lebih dari 1 berarti pertumbuhan terkonsentrasi di zona melebihi porsi luasnya. Epoch 2015 dan 2020 berbasis pengamatan, 2025 dan 2030 model. Status: semua keluaran F6 berstatus `hipotesis` dan belum ada uji historis. GHSL dan potongan NEX-GDDP per kabupaten belum diproses penuh: nilai yang belum dihitung berstatus "menunggu".

## Prioritas kartu pintu (F7)

Urutan kartu: (kelas naik, urgensi naik, nama naik). Fase aktif suatu wilayah bisa lebih dari satu: tanggap bila ada kejadian tanggap atau transisi, pascabencana bila ada kejadian pemulihan atau R3P draf sampai berjalan, kesiapsiagaan bila ada renkon aktif, dan pengurangan risiko selalu. Kelas dan urutan adalah asumsi kebijakan.

## Usulan Status Lifeline

Sumber isyarat: laporan warga (Lapor Warga) kategori listrik, sinyal, bbm, elpiji, akses, dan sehat; kendala dan kebutuhan Logbook; kerusakan meja dampak (unit listrik, telekomunikasi, air, SPBU, jalan dan jembatan, faskes); dan catatan meja pengungsi (kebutuhan air dan pangan serta kesegaran data titik). Jendela isyarat 24 jam terakhir, hanya untuk kabupaten kejadian dan sesudah tanggal mulai. Mesin hanya mengusulkan, status resmi ditetapkan staf, dan semua ambang berikut berlabel hipotesis.

| Layanan | Merah | Kuning | Hijau |
| --- | --- | --- | --- |
| listrik, sinyal | lebih dari separuh pelapor melaporkan padam atau tidak ada, dan paling sedikit 5 pelapor | paling sedikit 3 pelapor gangguan, atau kendala Logbook, atau unit rusak di meja dampak | paling sedikit 3 pelapor "hidup" atau "lancar" sesudah gangguan terakhir |
| BBM | paling sedikit 5 pelapor "habis" | paling sedikit 3 pelapor "terbatas" atau "habis", atau SPBU rusak | paling sedikit 3 pelapor "tersedia" sesudah gangguan |
| jalan dan akses | paling sedikit 3 pelapor putus atau tertimbun | paling sedikit 3 pelapor putus, tertimbun, atau tergenang, atau kendala akses Logbook, atau jalan dan jembatan rusak di meja dampak (`src/lifeline_usulan.js:18` dan `67-70`) | tidak diusulkan otomatis |
| faskes | tidak diusulkan | faskes penuh dari paling sedikit 3 pelapor atau layanan faskes rusak | tidak diusulkan |
| air bersih, pangan | lebih dari separuh titik pengungsian terbuka tidak punya | paling sedikit 1 titik tidak punya, kebutuhan air di Logbook, atau unit air rusak | semua titik terbuka punya dan data titik segar |
| pengungsian | separuh atau lebih titik terbuka datanya basi lebih dari 3 hari | ada titik basi | semua titik terbuka diperbarui dalam 3 hari |

Tanpa isyarat: usulan abu. Pelapor dihitung per hash IP bergaram per layanan dengan laporan terakhirnya, sehingga banyak orang di balik satu IP (jaringan seluler atau wifi posko) dihitung satu pelapor dan usulan condong ke abu. Kuning dari Logbook atau meja dampak menang atas hijau, dan hijau dari warga menang atas kuning dari warga saja. Titik pengungsian yang datanya basi tidak pernah menghasilkan hijau. Nama wilayah yang tidak terpetakan ke kabupaten dilewati dan dihitung di catatan "isyarat tak terpetakan". Padam internet IODA dan citra lampu malam tidak dipakai (IODA hanya konteks provinsi, lampu malam menunggu uji balik). Usulan dihitung saat halaman dibuka, paling sering sekali per 15 menit per kejadian.

Uji jujur yang direncanakan: setelah 30 kejadian, bandingkan usulan dengan status resmi per layanan, yaitu persentase usulan yang sama dan persentase sel resmi merah yang usulannya abu. Hasil kalibrasi belum ada, sehingga status uji balik: belum diuji.
