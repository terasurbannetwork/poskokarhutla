# Kaji cepat gempa, banjir, uji balik

Halaman ini merinci metode kaji cepat gempa, banjir, karhutla, dan gunung api serta uji baliknya.

## Kaji cepat gempa (F3.1, F3.2)

Sumber: ShakeMap USGS (kontur MMI) bila terbit, atau prakiraan guncangan sendiri (hubungan atenuasi BSSA14, Zhao 2006, dan konversi Worden 2012, Vs30 400 m/s) bila belum. Pada kasus kedua statusnya `menunggu_data` dan korban null. Penduduk dari WorldPop per kecamatan. Dihitung tiap 3 jam untuk kejadian yang hidup.

```
k = min(10, int(MMI + 0,5)), dihitung bila k >= 4 (MMI < 3,5 tidak dihitung)
PAGER (koefisien Indonesia): theta = 13,248768; beta = 0,150846
  v_P(k) = Phi( ln(k / theta) / beta );   K_P = jumlah_k per[k] x v_P(k)
ITB: v_I(k) = 10^(0,62275231 x k - 8,03314466);   K_I = jumlah_k per[k] x v_I(k)
rentang: bawah = min( K_P / 4 , K_I );  atas = maks( K_P x 4 , K_I )
kelas siaga dari K_P: hijau < 1, kuning 1 sampai 99, oranye 100 sampai 999, merah >= 1000
```

Pita 4 adalah asumsi kebijakan. Model dasar mana yang dipakai belum diputuskan (U13), sehingga keduanya tampil berdampingan. Galat kalibrasi model kerapuhan (kalib 3,0586, faktor 5,341) ditulis di layar tetapi tidak dipakai melebarkan rentang, dan angka itu bukan galat PAGER atau ITB. Tsunami dan likuefaksi tidak dihitung (kasus Palu 2018: PAGER 86 lawan 4.140). Rumah rusak gempa berstatus menunggu karena tidak ada kurva kerapuhan resmi.

![Empat kelas siaga kaji cepat gempa dari perkiraan korban jiwa model PAGER. Sumber ambang: bagian Metode berkas ini.](gambar/siklus-tangga-kelas-siaga.svg)

Contoh uji: per[6] = 1.000.000, per[7] = 500.000, per[8] = 200.000 menghasilkan K_P sekitar 88,4, K_I sekitar 334,2, rentang sekitar [22,1; 353,8], kelas kuning.

## Kaji cepat banjir, karhutla, gunung api (F3.3, F3.4)

Tahap pertama banjir: poligon kejadian aktif dikali paparan F2 dan data dampak.

```
bangunan_terpapar = jumlah n sel halus yang pusatnya di poligon
jiwa_terpapar     = jumlah_K P_K x (n_terpapar_K / n_K)    (tiga sumber berdampingan)
batas_atas_jam1   = jumlah jiwa WorldPop seluruh kecamatan berlevel Siaga atau Awas
                    (diangkat ke sumber jiwa terbesar bila hasil jumlah itu lebih kecil)
rentang           = [jiwa_terpapar terkecil dari tiga sumber, batas_atas_jam1]
```

Bila kedalaman d (meter) tersedia, kerusakan hunian dihitung dengan kurva JRC Asia dengan interpolasi linear:

```
(d; f) = (0;0) (0,5;0,33) (1;0,49) (1,5;0,62) (2;0,72) (3;0,87) (4;0,93) (5;0,98) (6;1)
kerusakan = f(d) x D_maks x luas_m2     D_maks hunian 111 euro per m2 (harga 2010)
```

Kurs dan faktor harga belum bernilai, sehingga rupiah berstatus menunggu dan hanya euro 2010 yang tampil. Nilai D_maks niaga 138 dan industri 114 euro per m2 sudah ada di konstanta, tetapi hanya kurva f(d) hunian yang tertulis, sehingga kerusakan hanya dihitung untuk hunian (`scripts/siklus/konst.py:15-16`, `scripts/siklus/kaji_banjir.py:7` dan `44-52`). Poligon bukan genangan terukur, jadi hasilnya paparan, bukan dampak. Contoh: d 0,75 m menghasilkan f = 0,41, dan 50 m2 hunian bernilai 2.275,5 euro.

Karhutla memakai radius 1, 3, 5 km kumulatif dengan titik panas dan luas hanya dari sistem Centurisk97. Gunung api memakai KRB I, II, III. Keduanya hanya paparan.

## Uji balik kaji cepat (F3.5)

```
g_i      = ln( m_i / o_i )    hanya bila m_i > 0 dan o_i > 0, selain itu "tak_dihitung"
bias     = rerata g_i
faktor   = exp( akar( rerata g_i^2 ) )
cakupan  = jumlah i dengan bawah_i <= o_i <= atas_i, dibagi n
```

Setiap sumber pengamatan (meninggal DIBI, rumah rusak) diuji terpisah. Status: ambang lulus belum ada (U18), sehingga label tetap `estimasi-model`. Angka kalibrasi yang ada berasal dari 8 gempa dengan pengamatan yang ditulis dari ingatan dan disetel pada gempa yang sama (in-sample), jadi bukan uji balik yang sebenarnya.
