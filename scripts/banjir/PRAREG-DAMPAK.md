# Prapendaftaran: model banjir bertingkat hujan -> kejadian -> tinggi/lama -> KK terdampak

Dibuat 30 Oktober 2026, SEBELUM model apa pun dilatih atau dinilai pada label dampak. Pemilik minta: "hujan 120 mm di
Aceh Tenggara -> tinggi xx -> kena berapa KK; ke depan kalau 200 mm kemungkinan bla bla", dengan faktor kapasitas tampung,
topografi, air kiriman, tutupan lahan, belajar dari histori 20 tahun dan logbook, koefisien boleh beda per daerah.

## 1. Bentuk model (fisik dulu, lalu dikoreksi data)

Untuk kabupaten k pada hari t:

1. **Hujan efektif** P = hujan 3 hari lokal (mm). Kelembapan awal dari API (indeks hujan anteseden) menggeser Curve Number
   ke kondisi kering/normal/basah (AMC I/II/III, rumus Chow 1988: CN_I = CN/(2,281-0,01281 CN), CN_III = CN/(0,427+0,00573 CN)).
2. **Limpasan** SCS-CN: S = 25400/CN - 254, Q = (P - 0,2S)^2 / (P + 0,8S) bila P > 0,2S, selain itu 0. CN per kab dari tutupan
   lahan x kelompok tanah (TR-55; asumsi, belum dikalibrasi Indonesia).
3. **Kelebihan atas kapasitas tampung** E = max(0, Q - C_k). C_k = limpasan dari hujan rencana kala ulang 2 tahun (kota besar 5 tahun)
   kab itu sendiri (Permen PU 12/PRT/M/2014): drainase dirancang menampung hujan sebesar itu.
4. **Air kiriman** D = persentil debit GloFAS di sungai utama kab terhadap klimatologinya, dan hujan hulu DAS.
5. **Peluang kejadian** logit p = a_k + b1 log1p(E) + b2 D + b3 log1p(hujan hulu) + b4 musim.
   a_k = konstanta daerah (kerentanan bawaan), ditarik ke rata-rata provinsi lalu nasional (partial pooling empiris Bayes,
   bobot n_k/(n_k + m)). b dipakai bersama; varian b per pulau diuji sebagai ablasi.
6. **Besaran bila terjadi** (model hurdle): log1p(KK) = c_k + d1 log1p(E) + d2 D + d3 log(paparan_k) + galat. paparan_k = rumah/KK di
   lahan rendah (HAND < 2 m). Tinggi air dan lama banjir dimodelkan sama, tetapi hanya dari logbook 2026 dan berita (sedikit),
   jadi dilaporkan sebagai sebaran empiris per kab bersyarat kelas hujan, bukan regresi, kecuali n cukup (>= 150 kejadian bertinggi air).
7. **Skenario** "hujan X mm di kab k": keluarkan p, dan kuantil 10/50/90 KK (dan tinggi/lama bila ada) dengan simulasi dari galat
   residual kab itu. Selalu dengan label "berdasarkan N kejadian".

Konstanta dibedakan dari variabel:
- **Konstanta per daerah** (tidak berubah harian): CN_k, C_k, luas hulu, porsi lahan rendah, paparan, a_k, c_k.
- **Koefisien bersama** (sama di semua daerah, dari data): b1..b4, d1..d3.
- **Variabel harian**: hujan lokal, API, hujan hulu, debit.

## 2. Label

Satu katalog dari `scripts/banjir/label_banjir.py`: DIBI (banjir + bandang, dengan menderita/mengungsi/rumah terendam),
logbook Pusdalops 2026 (tinggi cm, lama, KK, rumah), Google Groundsource (berita, 2000+). KK = DIBI `menderita`/3,5 bila KK
tidak ada (rasio jiwa per KK BPS; dicatat sebagai asumsi) atau logbook `kk`.

## 3. Pembagian waktu

| Bagian | Periode | Dipakai |
| --- | --- | --- |
| Latih | awal data s.d. 2021-12-31 | koefisien, konstanta daerah, pooling |
| Validasi | 2022-01-01 s.d. 2023-12-31 | pilih m (kekuatan pooling), ablasi |
| Uji | 2024-01-01 s.d. 2026-09-30 | dibuka SEKALI; logbook 2026 ikut di sini |

Catatan jujur: 2024-2025 sudah dibuka untuk model PELUANG kab-hari (RISET-MODEL-KAB.md §10). Untuk bagian peluang, uji di sini
bukan uji bersih; vonis peluang hanya dari 2026 (logbook + DIBI Jan-Sep 2026). Bagian BESARAN (KK, tinggi, lama) belum pernah
diuji siapa pun, jadi 2024-2026 bersih untuknya.

## 4. Pembanding dan kriteria (dibekukan)

Besaran (log1p KK pada hari kejadian):
- B0 rata-rata historis kab (median latih kab, ditarik ke provinsi) — "biasanya segini di sini".
- B1 model penuh.
LULUS bila batas bawah CI95 (bootstrap blok kab x tahun, 1.000 ulangan, biji 11) dari skill MAE B1 vs B0 > 0 di uji.
Ditambah: cakupan selang 80% di antara 70% dan 90% (kalibrasi kuantil).

Peluang (hanya 2026): ETS pada jumlah alarm sama dengan status.py Waspada, dan Brier skill vs klimatologi kab-bulan;
LULUS bila batas bawah CI95 dETS(model - status.py) > 0 dan BSS > 0.

Tidak lulus: model tidak tayang sebagai prediksi; yang tayang hanya sebaran empiris historis per kab dengan label
"berdasarkan N kejadian" (itu jujur tanpa model).

## 5. Larangan

Tidak ada ambang status.py yang diubah. Tidak ada fitur atau kriteria yang ditambah sesudah melihat uji. Uji dibuka sekali,
penandanya ditulis sebelum metrik pertama dihitung.
