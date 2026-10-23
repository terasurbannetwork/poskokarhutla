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

## Pendaftaran v2 (23 Okt 2026, di-commit SEBELUM dijalankan)

Alasan: v1 mengukur dampak termasuk FRP lintasan pertama, yang sudah terlihat oleh S0. Keputusan prioritas menyangkut
yang BELUM terjadi.

- **Hasil utama:** `D72 = jumlah FRP deteksi SESUDAH lintasan pertama sampai 72 jam x K_GAMBUT (3)`. Sekunder: FRP sesudah
  lintasan pertama sepanjang hidup api; label lolos.
- **Kandidat utama (satu, supaya tidak ada perbandingan berganda):** `S4 = aturan.skor x P(membesar) x paparan`
  (yang sudah terlihat + ramalan model + gambut/asap, w_jiwa 0,5). Dilaporkan juga S0, S1, S2, `S3 = aturan.skor x P`.
- **Himpunan uji:** api baru 2024-01-01 s.d. arsip terakhir 2026, peluang dari model "lolos" produksi yang dilatih
  hanya sampai 2023. Belum pernah dipakai untuk memilih skor prioritas. Dijalankan SATU kali.
- **Syarat lolos (sama dengan v1, tidak dilonggarkan):** S4 - S0 `tangkap@10` >= 10 poin persen, batas bawah selang 95%
  bootstrap blok tahun x provinsi > 0, dan tidak kalah dari S0 di provinsi mana pun dengan >= 30 hari-keputusan.
- **Bila lolos:** mode bayangan prospektif musim 2027 sebelum tampil sebagai saran. **Bila gagal:** ditulis, tidak tampil,
  dan tidak ada v3 di himpunan yang sama.

## Hasil uji v2 (23 Okt 2026, dijalankan sekali): GAGAL

`python3 scripts/sebaran/prioritas.py v2` -> kunci `v2` di `public/data/prioritas_uji.json` (v1 tidak diubah; skrip menolak
jalan kedua bila kunci `v2` sudah ada). ~6 dtk. Swauji `prioritas.py uji` mencakup D72 (FRP lintasan pertama dan sesudah 72 jam
ditolak).

Himpunan: 97.749 api baru 2024-2026 (2024: 10.675; 2025: 13.399; 2026: 73.675), 2.922 lolos, arsip terakhir 12 Okt 2026
06:37 UTC; tidak ada api yang jendela 72 jamnya terpotong. 938 hari-keputusan (K 10) dalam 21 blok tahun x provinsi.

Peluang: `p_uji` di `data/raw/sebaran/lolos_peluang.pkl`, ditulis `lolos.py akhir()` (`m = latih(cvi, ...)`, `cvi` = baris
tahun 2015-2023; Platt dan ambang dari luar-lipatan 2015-2023), bukan model ekspor peramban (dilatih ulang semua tahun). Cara
memastikan model tidak melihat 2024+: kode commit 601216df (berkas peluang ditulis 14 Okt 17:09, sesudah commit itu 17:03)
membatasi `cvi` pada `TAHUN_CV = 2015..2023`; dan AUC yang dihitung ulang dari peluang ini sama persis dengan
`lolos_hasil.json uji_lihat_kedua` (semua 0,9077; 2024 0,9504; 2025 0,9552; 2026 0,8846).

Utama (hasil D72, K_GAMBUT 3, w_jiwa 0,5, K 10):

| Skor | tangkap@10 | recall@10 |
| ---- | ---------- | --------- |
| S0 aturan.py | 0,434 [0,386; 0,485] | 0,170 [0,117; 0,263] |
| S1 p | 0,524 [0,468; 0,583] | 0,177 [0,124; 0,273] |
| S2 p x paparan | 0,520 [0,465; 0,581] | 0,178 [0,124; 0,275] |
| S3 aturan.skor x p | 0,506 [0,451; 0,568] | 0,175 [0,122; 0,271] |
| S4 aturan.skor x p x paparan | 0,513 [0,461; 0,570] | 0,177 [0,123; 0,274] |
| Orakel | 1 | 0,233 [0,155; 0,398] |
| S4 - S0 | **+0,080 [0,061; 0,102]** | +0,007 [0,002; 0,020] |

Syarat: selisih >= 10 poin **GAGAL** (7,96 poin); batas bawah > 0 lolos; tidak kalah per provinsi lolos (S4 >= S0 di semua
provinsi; provinsi >= 30 hari: 16, 53, 61, 62, 63, 64, 93; 14 dan 15 di bawah 30 hari). Vonis: GAGAL, tidak tampil,
dan tidak ada v3 di himpunan ini.

Per provinsi, tangkap@10 S0 -> S4 (hari): 14 0,739 -> 0,897 (10); 15 0,621 -> 0,635 (27); 16 0,525 -> 0,588 (92);
53 0,464 -> 0,563 (258); 61 0,362 -> 0,428 (180, selang selisih [-0,020; 0,092]); 62 0,449 -> 0,511 (96); 63 0,401 -> 0,528 (90);
64 0,430 -> 0,493 (89); 93 0,315 -> 0,387 (96). Per tahun: 2024 0,508 -> 0,593; 2025 0,366 -> 0,497; 2026 0,430 -> 0,497.
Per lahan: gambut 0,491 -> 0,544; mineral 0,452 -> 0,523; sabana 0,472 -> 0,552.

Sekunder: FRP sesudah lintasan pertama sepanjang hidup S4 - S0 = +0,085 [0,065; 0,106]; label lolos +0,045 [0,026; 0,065].

Bacaan: model menambah ~8 poin tangkap@10 atas aturan.py pada hari yang belum dilihat, konsisten di semua provinsi, tetapi di
bawah ambang 10 poin yang dibekukan. Di himpunan ini kandidat lebih sederhana S1 (p saja) memberi titik tertinggi (0,524);
itu pengamatan, bukan pilihan baru (pendaftaran memilih S4 sebagai satu-satunya kandidat). recall@10 rendah untuk semua
skor karena 10% D72 teratas jauh lebih banyak dari 10 per hari (orakel sendiri 0,233).

Batas: 2026 mendominasi (568 dari 938 hari; S-NPP saja, NOAA-21 tidak dipakai; dua tahun sepi 2024-2025); hanya 21 blok,
jadi selang bootstrap sempit secara semu untuk provinsi dengan satu-dua blok (15: satu blok); uji 2024-2026 sudah pernah
dilihat untuk model sel dan dilaporkan sekali untuk model lolos (tidak dipakai menyetel); hipotesis D72 lahir dari diagnostik
v1 pada 2015-2023, bukan dari himpunan ini; omisi awan/asap membuat D72 rendah palsu di gambut; faktor gambut ada di D72 dan
di S4 sekaligus.
