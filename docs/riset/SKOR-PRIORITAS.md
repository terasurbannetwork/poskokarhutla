# Skor prioritas sumber daya: rancangan dan syarat lolos

23 Okt 2026. Dasar: `docs/riset/PREDIKSI-PRIORITAS.md` (riset literatur) dan audit `validasi-model` atas fitur tren lokasi.

## Pertanyaan yang dijawab

Hari ini ada puluhan sampai ratusan api baru per provinsi. Regu, heli, dan anggaran terbatas. **Api mana yang
didahulukan supaya kerugian terbesar tercegah?** Skor ini menyusun urutan; bukan perintah operasi.

## Keputusan pemilik (dicatat, berversi)

| Versi | Tanggal | Urutan dampak |
| ----- | ------- | ------------- |
| v1 | 23 Okt 2026 | **Gambut dan asap dulu.** Permukiman ikut dihitung tetapi tidak mutlak di atas gambut. |

Bobot ditetapkan pengambil keputusan, tidak dipelajari dari data (WFDSS/RAVAR, lihat riset bagian A3). Tiap
perubahan bobot = versi baru di tabel ini, dan uji balik dijalankan ulang.

## Bentuk skor

```
skor = P(membesar) x paparan
P(membesar) = peluang lolos terkalibrasi dari model "lolos" (scripts/sebaran/lolos.py), diketahui saat deteksi pertama
paparan     = asap x (1 + w_jiwa x jiwa)
asap        = K_GAMBUT bila di gambut, selain itu 1      (gambut membara lama dan mengeluarkan asap jauh lebih banyak)
jiwa        = log1p(penduduk per km2 di sel) dinormalisasi 0-1
```

Keterjangkauan dan biaya TIDAK masuk skor: keduanya menentukan sumber daya mana yang dikirim (regu darat vs heli),
bukan api mana yang penting (riset bagian D).

## Hasil yang diukur (target uji balik)

Proksi dampak asap per peristiwa: `D = jumlah FRP seluruh deteksi sepanjang hidup api x (K_GAMBUT bila gambut)`.
FRP terintegrasi berbanding lurus dengan biomassa terbakar dan emisi (Wooster dkk. 2005); faktor gambut memakai
asumsi berversi dan diuji sensitivitasnya (K_GAMBUT = 1, 3, 5). Hasil sekunder: label "lolos" (>= 10 sel dalam 72 jam)
dan D yang ditimbang penduduk.

## Pembanding

| Kode | Skor | Keterangan |
| ---- | ---- | ---------- |
| S0 | ukuran awal x kelas FWI | meniru logika `scripts/data/aturan.py` sekarang |
| S1 | P(membesar) saja | model tanpa paparan |
| S2 | P(membesar) x paparan | usulan |
| Orakel | D sebenarnya | batas atas |

## Ukuran dan syarat lolos (dibekukan SEBELUM melihat hasil)

- Satuan keputusan: provinsi x hari. Dari K peristiwa teratas menurut skor, berapa bagian D total yang tertangkap
  dibanding K teratas menurut orakel (`tangkap@K`, K = 5 dan 10), dan berapa dari peristiwa 10% D teratas tahun itu
  yang masuk K teratas (`recall@K`).
- Hanya prediksi luar-lipatan per tahun 2015-2023 (model tidak pernah melihat tahun yang dinilai).
- Selang 95% bootstrap blok per tahun x provinsi.
- **Lolos** bila S2 mengalahkan S0 pada `tangkap@10` minimal 10 poin persen dengan batas bawah selang > 0, dan tidak
  kalah dari S0 di provinsi mana pun yang punya >= 30 hari-keputusan.
- Gagal = tidak ditampilkan sebagai saran. Hasil gagal tetap ditulis di halaman metode.

## Sesudah lolos

1. Mode bayangan satu musim: skor dibekukan tiap pagi, dinilai 72 jam kemudian (pola `prospektif.json`).
2. Tampil sebagai saran di samping level resmi, dengan catatan tindakan yang diambil.
3. Turun otomatis ke mode bayangan bila kinerja prospektif kalah dari S0.

## Batas yang sudah diketahui

- Base rate "membesar" 3,1%: pada recall 70% presisinya 19% (4 dari 5 alarm palsu). Ditulis di layar.
- Peristiwa = api baru (deteksi pertama). Cluster yang sudah lama menyala dinilai lewat jalur lain.
- Omisi satelit karena awan dan asap: hari tanpa deteksi bukan berarti padam.
- Teks P.32/2016 dan Inpres 3/2020 belum diverifikasi; jangan klaim "sesuai regulasi" sebelum dibaca langsung.

## Hasil uji balik v1 (23 Okt 2026): GAGAL

`python3 scripts/sebaran/prioritas.py` -> `public/data/prioritas_uji.json` (angka di bawah disalin dari berkas itu; ~20 dtk
dengan cache `data/raw/sebaran/prioritas_cache.pkl`). Swauji: `python3 scripts/sebaran/prioritas.py uji`.

Himpunan: 340.468 titik api baru 2015-2023 (9 provinsi, Jul-Nov, ada cuaca), 9.514 lolos; peluang luar-lipatan dari
konfigurasi produksi (`B: A + konteks titik sekitar`, dalam 5, 150 pohon; `lolos_peluang.pkl`). 4.079 hari-keputusan
dengan >= 11 api (K = 10). Selang = bootstrap blok tahun x provinsi (59 blok berisi hari-keputusan, 1.000 ulangan, benih 23).

Keputusan cara hitung yang dibiarkan terbuka oleh rancangan, ditetapkan sebelum angka dilihat: `tangkap@K` = rata-rata
per hari-keputusan (tiap hari sama bobot); seri skor di batas K dibagi rata (harapan urutan acak); "10% D teratas" =
persentil 90 D dari semua api tahun itu; S0 = level status `harian.py` (keparahan x kelas FWI, naik ke 3 bila
`prioritas()`) lalu `aturan.skor(px24 = sel lintasan 1, frp24 = jumlah FRP lintasan 1, hari 1, ISI, DC hanya di gambut,
jarak Daops 0)`; risiko riwayat kecamatan dan jarak Daops tidak ada di arsip.

Utama (K_GAMBUT 3, w_jiwa 0,5, K 10):

| Skor | tangkap@10 | recall@10 |
| ---- | ---------- | --------- |
| S0 aturan.py | 0,770 [0,743; 0,796] | 0,356 [0,298; 0,441] |
| S1 p | 0,748 [0,723; 0,773] | 0,352 [0,293; 0,436] |
| S2 p x paparan | 0,755 [0,729; 0,781] | 0,353 [0,292; 0,439] |
| Orakel | 1 | 0,509 [0,425; 0,626] |
| S2 - S0 | **-0,015 [-0,028; -0,003]** | -0,004 [-0,010; 0,003] |

Syarat: selisih >= 10 poin GAGAL, batas bawah > 0 GAGAL, tidak kalah per provinsi GAGAL (kalah di 15, 16, 53, 61, 62, 64;
terbesar NTT 53: 0,762 vs 0,833, 944 hari). Menang di 14, 63, 93. Kepekaan: K_GAMBUT 5 -> S2 - S0 = +0,018 [-0,001; 0,034];
K_GAMBUT 1 -> -0,070. w_jiwa 0 / 1 mengubah paling banyak 0,3 poin. K 5 sama arahnya. Per lahan, S0 unggul di gambut, mineral, dan sabana.

Komponen yang gagal: **P(membesar) bukan peramal D.** Model dilatih untuk label lolos (>= 10 sel / 72 jam), dan di label
itu ia memang mengalahkan S0 (hasil sekunder: tangkap@10 0,741 vs 0,665; S2 - S0 +0,065 [0,047; 0,085]). D = FRP
terintegrasi didominasi api yang sudah panas dan besar di lintasan pertama, dan FRP lintasan pertama itu masuk ke S0 dan ke D
sekaligus. Diagnostik sesudah melihat hasil (TIDAK mengubah vonis): bila D dihitung tanpa FRP lintasan pertama, S2 - S0 =
+0,110 [0,094; 0,127] (S0 0,458, S2 0,568). Artinya model menambah informasi tentang yang AKAN terbakar, tetapi rancangan v1
mengukur juga yang sudah terlihat.

Yang dibutuhkan sebelum mencoba lagi (versi baru, dibekukan dulu): (a) hasil = D sesudah lintasan pertama atau D 72 jam ke
depan, ditetapkan sebelum diuji; (b) karena 2015-2023 sudah dilihat, v2 harus dinilai di himpunan yang belum dipakai untuk
memilih: mode bayangan prospektif (uji 2024-26 sudah "lihat kedua" untuk model lolos); (c) model P yang dilatih untuk D atau
gabungan "S0 x peluang" sebagai kandidat yang dideklarasikan terlebih dulu. Bobot tidak disetel agar lolos.

Batas: base rate lolos 2,8%; omisi awan/asap membuat D rendah palsu di gambut; perubahan sensor tidak dikendalikan
(S-NPP saja di sini, NOAA-20 dari 2018 tidak dipakai model B); 2020-2022 sedikit karena cakupan cuaca (50-132 hari);
faktor gambut ada di D dan di S2 sekaligus (sirkular, karena itu K_GAMBUT 1 dilaporkan); Platt dipasang pada gabungan
luar-lipatan 2015-2023 (monoton, urutan S1 tidak berubah, perkalian S2 sedikit terpengaruh).
