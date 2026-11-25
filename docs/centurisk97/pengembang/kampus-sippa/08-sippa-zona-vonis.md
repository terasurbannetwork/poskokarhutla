# SIPPA: zona, pembanding, vonis

Bagian ini memerinci zona, saran sarana, matriks respons, pemicu, pembanding lengan uji, dan vonis pilot SIPPA.

## SIPPA: zona, saran sarana, matriks respons, dan pemicu

Zona (`hitung.js:182`), memakai pembanding ketat "<" (keputusan 51): jarak tepat 2,50 km ke air atau 5,00 km ke jalan masuk kelas jauh. Jarak `null` dianggap jauh.

![Empat zona A sampai D menurut jarak ke air (ambang 2,5 km) dan jarak ke jalan (ambang 5 km), beserta saran sarana per zona.](gambar/kampus-sippa-air-zona-pipa.svg)

```
air < 2,5 km dan jalan < 5 km -> A ; air < 2,5 dan jalan >= 5 -> B ; air >= 2,5 dan jalan < 5 -> C ; selain itu D
```

Empat versi zona: `k` konservatif (data jalan dan air lama), `u` jalan utama OSM, `o` optimistis (semua jalan OSM), `v` terverifikasi (memakai jalan OSM hanya bila cek lapangan `sippa_jalan_cek` berhasil). Layar hanya menawarkan `k`, `o`, dan `v`.

Saran sarana per kompleks (`saranSarana`, `hitung.js:280`), aturan berurutan, yang pertama cocok menang:

1. Waktu tempuh lebih dari 6 jam dan ada titik panas 24 jam: tahan front dari udara, regu darat menyusul.
2. Zona D: pencegahan dan drone termal, kit tidak dipra-posisikan.
3. Zona C: sumur bor dangkal dan pompa jinjing, mobil tangki cadangan.
4. Zona B: kit lewat perahu dan portage (paling berat 30 kg per orang).
5. Jarak air 0,5 km atau kurang: pompa jinjing, selang 500 m, dua lance.
6. Selain itu: kit relay (layflat DN100 sepanjang 0,5 sampai 1,5 km, 8 lance, probe).

Panjang trase yang disarankan ke kalkulator = jarak air x 1000 x 1,2 (faktor liku).

Matriks respons FRP x luas (`matriksRespons`, `hitung.js:305`): tingkat FRP: kurang dari 10 tingkat 1, 10 sampai 30 tingkat 2, di atas 30 sampai 100 tingkat 3, di atas 100 tingkat 4. Tingkat luas (hektare): sampai 2 tingkat 1, sampai 10 tingkat 2, sampai 50 tingkat 3, lebih dari itu tingkat 4. Tingkat akhir adalah yang lebih tinggi. Regu: 1, 2, 3 (atau 4 bila luas lebih dari 30 hektare) untuk tingkat 1 sampai 3, dan paling sedikit 5 untuk tingkat 4. Hari kerja = luas / (regu x laju bara per regu). Semua ambang berstatus asumsi-kebijakan dan belum diuji terhadap log 2026.

Pemicu pra-posisi (`tingkatPemicu`, `hitung.js:318`):

```
SIAGA      : anomali hujan <= -20 persen
PRA-POSISI : SIAGA, ansambel tidak basi, dan sedikitnya 3 hari peluang ps50 tinggi
GELAR      : PRA-POSISI, titik panas tidak basi, dan sedikitnya 1 titik panas
selain itu : NORMAL
```

![Tangga pemicu pra-posisi: NORMAL, SIAGA, PRA-POSISI, dan GELAR, tiap tingkat menambah syarat dari tingkat sebelumnya.](gambar/kampus-sippa-air-tangga-pemicu.svg)

Pipeline harian `scripts/data/sippa/pemicu.py` membaca `kelayakan_kompleks.json`, `fwi_ansambel.json`, `iklim_outlook.json`, dan `titik24.json`, lalu menulis `pemicu.json` ke R2 `sippa/` (bukan `public/data`).

## SIPPA: pembanding lengan uji (G4) dan vonis pilot

Banding rerata memakai uji Welch dengan selang kepercayaan 95 persen (tabel t kritis untuk derajat bebas di bawah 31, selain itu 1,96). Banding proporsi memakai Agresti-Caffo (`hitung.js:328` dan `:341`).

Vonis G4 (`vonisG4`, `hitung.js:358`):

- Data pilot (tanda pilot, AOI berawalan PILOT, atau tanggal perlakuan sampai 30 November 2026) tidak diberi vonis. Hasilnya berlabel "pilot, n kecil".
- Dibutuhkan paling sedikit 8 petak per lengan (`n_min_putus`). Kurang dari itu: BELUM BISA DIPUTUS.
- Bila semua selang kepercayaan memotong nol: BELUM BISA DIPUTUS.
- Efikasi lulus bila ukuran hektare dingin per hari regu, atau proporsi nyala ulang (7, 30, 90 hari), 30 persen atau lebih baik dari konvensional dengan batas bawah selang di atas nol, dan biaya per hektare dingin paling banyak 1,2 kali konvensional. Bila efikasi lulus tetapi biaya tidak bisa dihitung: BELUM BISA DIPUTUS.

Vonis pilot "dapat dipakai" (keputusan 53, `vonisPilot`, `hitung.js:205`), label asumsi-kebijakan, tujuh butir:

1. Air mengalir sampai ujung lance pada sedikitnya 2 sesi di sedikitnya 2 petak berbeda.
2. Waktu dari tiba sampai air mengalir paling lama 4 jam pada sesi terbaik, dan lima waktu (tiba, mulai gelar, air mengalir, selesai, bongkar selesai) lengkap di tiap sesi.
3. Tekanan ujung 2 bar atau lebih selama 30 menit atau lebih pada sedikitnya satu sesi.
4. Konfigurasi tiap sesi lolos gerbang hidraulika tanpa hambatan keras.
5. Data probe suhu gambut lengkap 90 persen atau lebih (tahap sebelum, sesudah, 24 jam, di kedalaman 10, 30, 50, dan 100 cm), dan tiap petak di log punya probe.
6. Nol kecelakaan kerja dan tidak ada henti karena bocor lebih dari 30 menit.
7. Komponen kembali berfungsi (kondisi baik atau rusak ringan) 95 persen atau lebih.

Hasil: semua butir terpenuhi adalah DAPAT DIPAKAI. Butir 1 atau 6 gagal adalah BELUM DAPAT DIPAKAI. Gagal pada butir lain adalah DAPAT DIPAKAI BERSYARAT. Butir yang datanya belum ada bernilai `null` dan dihitung belum terpenuhi. Vonis "lebih baik dari cara konvensional" tidak diputus dari pilot (n kurang dari 8 per lengan).

Lokasi pilot: dipindah dari Kalimantan Tengah ke Kalimantan Timur pada 28 Oktober 2026 (keputusan 62). Gambut Kalimantan Timur memakai lapisan moratorium PIPPIB dengan label "gambut indikatif moratorium (PIPPIB)", bukan peta gambut resmi 1:250.000 (keputusan 63).
