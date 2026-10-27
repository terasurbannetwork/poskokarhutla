
## Keterbatasan yang jujur

- Bukan validasi lawan pengukuran: tanpa pos duga air BBWS atau neraca Pola PSDA (keputusan pemilik 8). GloFAS v4 adalah model hidrologi global 0,05 derajat; BPS 2020 juga angka model. Lolos di sini = konsisten dengan dua model lain, bukan terbukti benar.
- Sel GloFAS dipilih sebagai sel sungai (debit rerata terbesar dalam kisi sekitar muara perkiraan); satu sel meleset bisa mengubah rasio. Muara model = sub-DAS HydroBASINS level 09 yang bermuara di laut; luasnya (lihat topologi.json) tidak persis sama dengan DAS GloFAS.
- Air tanah tidak dimodelkan selain tampungan linear dasar (alpha, k); pengambilan air tanah, PDAM, dan impor air antar-DAS selain Tarum Barat tidak ada.
- Waduk disederhanakan: 6 waduk, pelepasan target = rerata aliran masuk jangka panjang, tampungan dari tabel sekunder kecuali Kedung Ombo; operasi nyata (PLTA, irigasi, banjir) tidak ditiru. Debit muara Citarum, Solo, Serayu dan Brantas paling terpengaruh.
- Hujan CHIRPS dan ET0 POWER: ET0 memakai rerata bulanan kisi 0,5 derajat (G=0), lebih kasar dari ERA5-Land; di DIY +8,9%. Efeknya pada limpasan belum dipisahkan.
- Kebutuhan: irigasi gaya KP-01 dengan asumsi efisiensi, pola tanam, dan intensitas (asumsi-kebijakan, RANCANGAN §1.4); industri hanya industri besar-sedang di 4 provinsi (DIY, Jatim null); ternak tanpa ayam ras dan kuda.
- Skala spasial: sub-DAS rerata 248 km2, kab kecil/kota (di hilir) membaca aliran masuk sungai, bukan pasokan nyata PDAM.
