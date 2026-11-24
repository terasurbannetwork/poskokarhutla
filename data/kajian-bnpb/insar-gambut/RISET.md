# RISET: Kedalaman gambut hilang dari InSAR

Bahan untuk PKH-34. Tidak ada angka di sini yang tampil di layar. Sumber utama: `data/kajian-bnpb/pembanding-pantaukarhutla/RISET.md` (putaran 24 Nov 2026, bagian Geoaccess) dibaca dari tangkapan layar, situsnya tidak dibuka. Kontak pribadi di bahan tidak dicatat.

## 1. Yang dilaporkan pembanding

- Geoaccess, SBAS InSAR, Palangka Raya, 1 Juli sampai 30 September 2026.
- Rumus: gambut hilang (t/ha) = α × Δh × BD × 10.000; karbon = gambut hilang × C-organik; CO2 = karbon × 44/12. Kontrol: selisih turun area terbakar dan tidak terbakar di sekitarnya.
- Angka: terbakar turun 3,31 cm, tidak terbakar 2,06 cm, tambahan api 1,26 cm, sekitar 24,7 t CO2/ha. Hitung balik konsisten: 0,0126 m × 0,1 t/m3 × 10.000 × 0,55 × 3,67 ≈ 25 (α = 1).
- Selisih dengan literatur: kedalaman bakar LiDAR 33 ± 18 cm (Ballhorn dkk. 2009) setara sekitar 600 t CO2/ha menurut IPCC; selisih sekitar 25 kali.
- Dugaan pembanding sendiri: C-band 5,6 cm salah bungkus fase pada penurunan besar, dan piksel terbakar kehilangan koherensi; yang terukur kemungkinan oksidasi pasca-api.

## 2. Yang kita punya (dibaca 24 Nov 2026)

| Bahan | Berkas | Keadaan | Dipakai |
| ----- | ------ | ------- | ------- |
| Kedalaman bakar literatur | `scripts/data/gambut_bara.py`: `D_BAWAH, D_ATAS = 15.0, 51.0` cm; `BD = (0.07, 0.10, 0.15)`; `CC = 1.0`; `FRAKSI_TERBAKAR = (0.10, 0.30, 1.00)`; skenario tengah `15 + 36 × fb` | ada; 15 = rata-rata minus SD Ballhorn, 51 = Page dkk. 2002 (belum dibaca di teks) | yang diganti, hanya bila lulus |
| Jalur kalibrasi D | `pasang_kalibrasi` di `gambut_bara.py` memakai p10 dan p90 `kedalaman_bara` isian lapangan dari `scripts/data/kalibrasi.py` bila n ≥ 10 | ada | jalur masuk bila lulus (D7) |
| Mesin InSAR | `scripts/banjir/subsiden.py`: `baca_par`, `baca_raw`, `vertikal` (dekomposisi LOS ke vertikal dari dua geometri), `kuantil`, `agregasi`, `gerbang_pola`; masukan `vel.filt.mskd` float32 LiCSBAS; `SAH_MM = 400`, `MIN_PIKSEL = 10` | ada, milik `banjir`; hanya Jakarta di paket `penurunan-tanah` | dipakai ulang, tidak diubah |
| Resep LiCSBAS | `scripts/banjir/RISET-SUBSIDEN.md`, paket `data/kajian-bnpb/penurunan-tanah/` | ada; LiCSAR publik tak punya produk laju untuk Indonesia, laju dihitung di luar repo | ya |
| Topeng terbakar | `scripts/data/luas_citra.py` (dNBR > 0,27 dan NBR pasca < 0,2, kontrol latar cincin 2 sampai 4 km) | ada; keluarannya per insiden | ya, metode sama |
| Poligon gambut | `public/data/lahan/gambut.geojson` (BBSDLP 1:250.000 lewat PRIMS, persegi umum) | ada | pemotong topeng |
| Muka air gambut | proxy PFVI di `gambut_bara.py` (`wt`) | proxy, bukan ukuran | pembaur, dicatat |
| Pembaca Sentinel-1 | `scripts/banjir/s1_genangan.py` | ada | bukan untuk lab ini |

## 3. Yang belum diketahui dan harus diukur

1. Apakah bingkai LiCSAR menutup Palangka Raya untuk musim itu dan berapa pasangan interferogram yang lolos (IG-01).
2. Berapa porsi piksel terbakar yang koheren (IG-03). Dekorelasi di lahan terbakar adalah dugaan, bukan ukuran kita.
3. Nama dan isi lapisan keluaran LiCSBAS selain `vel.filt.mskd` (koherensi, galat loop) yang tersedia untuk uji kepekaan; belum dibaca. Diperiksa di IG-01 terhadap keluaran nyata.
4. Ambang salah bungkus fase: batas dasar adalah setengah panjang gelombang pada garis pandang (±2,8 cm untuk 5,6 cm) per pasangan, tetapi yang menentukan adalah gradien antar piksel bertetangga. Angka ± 1,4 cm per 12 hari di sumber pembanding belum bisa ditelusuri; dihitung ulang di IG-04.
5. Apakah selisih tambahan terbakar-kontrol tetap bertahan bila kontrol dipilih di gambut dengan ketebalan dan drainase serupa. Peta ketebalan gambut yang dipakai kita belum ada di repo; dicatat sebagai pembaur, tidak diada-adakan.
6. L-band ALOS-2: panjang gelombang sekitar 24 cm (panjang gelombang jauh lebih besar membuat salah bungkus lebih jarang dan koherensi di vegetasi lebih baik) adalah pengetahuan umum penyusun, bukan hasil baca di repo; sumber data, lisensi, dan cara memprosesnya belum diperiksa (Q4).

## 4. Risiko

- Hasil `meremehkan` mengecewakan tetapi sah; paket tidak boleh menyetel kriteria agar lulus.
- Kontrol tidak berbeda dari terbakar hanya oleh api (kanal, drainase, muka air, tutupan lahan). Dicatat sebagai pembaur, tidak dikoreksi diam-diam.
- Penurunan musim kering gambut terjadi sendiri tanpa api (Geoaccess mencatat 2,06 cm di area tidak terbakar); kontrol harus memakai musim yang sama.
