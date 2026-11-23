# GLOSARIUM: Bangunan di lereng terjal

| Istilah | Arti di modul ini |
| --- | --- |
| Lereng persen | 100 kali tangen sudut kemiringan; 40 persen sama dengan 21,8 derajat. Bukan derajat. |
| Lereng terjal | Lereng sebesar ambang (40 persen, Q1) atau lebih, pada bunyi `>=`. |
| DEMNAS | Model tinggi nasional BIG, sekitar 8 m. Model permukaan (DSM), bukan tanah gundul. |
| GLO-30 | Copernicus DEM, 1 detik busur (sekitar 30 m). Model permukaan (DSM). |
| FABDEM | GLO-30 yang pohon dan bangunannya dibuang; CC BY-NC-SA; hanya audit internal. |
| DSM, DTM | DSM memuat atap dan kanopi; DTM tanah saja. Keduanya DEM di sini adalah DSM. |
| Horn | Rumus lereng dari delapan tetangga piksel. |
| Dua peta sepakat | Lereng bangunan dari DEMNAS dan dari GLO-30 sama-sama mencapai ambang (kelas S). |
| S, D, G, L, T | Sepakat terjal, hanya DEMNAS, hanya GLO-30, landai di keduanya, tak dinilai. |
| Rentang | Dari n_S (batas bawah) sampai n_S + n_D + n_G (batas atas). |
| Jejak | Poligon bangunan. |
| Cincin | Pita 0 sampai 15 m di luar jejak, tanpa jejak bangunan lain, tempat lereng tanah diukur. |
| Cara titik | Lereng diambil dari satu piksel di titik tengah bangunan karena tak ada piksel di jejak atau cincin. |
| Kerapatan | n_S dibagi luas darat wilayah dalam km2. |
| Fraksi | n_S dibagi bangunan yang dinilai. |
| Cakupan DEMNAS | Bagian bangunan wilayah yang punya lereng DEMNAS. Di bawah ambang (Q9): "belum ada DEMNAS". |
| Belum ada DEMNAS | Wilayah tanpa angka karena cakupan kurang; bukan nol. |
| Belum dihitung | Kotak yang belum dikerjakan; bukan nol. |
| Paling sedikit | Penanda bahwa hitungan bangunan adalah batas bawah karena kelengkapan peta. |
| Kelengkapan | Rasio bangunan Overture terhadap pembanding (Open Buildings atau OSM) dan kelasnya. |
| Overture | Overture Maps Foundation: gabungan OSM, Microsoft ML Buildings, Google Open Buildings; ODbL. |
| ODbL | Lisensi basis data terbuka dengan atribusi dan berbagi sama untuk turunan. |
| Desa longsor | Desa pada daftar kejadian 2025 sampai 2026 (Q7), bertanggal dan bersumber. |
| AUC dalam strata | Peluang desa longsor berskor lebih tinggi daripada desa lain di kab/kota yang sama. |
| Kasus perintis | Cisarua dan Pasirlangu, Januari 2026: alasan hipotesis ini ada, dilaporkan terpisah. |
| Hipotesis | Label angka dan peringkat sebelum uji lulus. |
| LOLOS awal | Vonis uji desa bila kriteria beku terpenuhi; selalu berlabel awal dengan 21 positif. |
| dNDVI | Selisih NDVI Sentinel-2 sebelum dan sesudah kejadian. |
| Perkiraan dari citra | Label untuk perubahan tutupan dari citra; bukan batas longsor resmi. |
| Potongan melintang | Profil tinggi dan lereng sepanjang satu garis. |
| Pengganda vertikal | Perbesaran sumbu tinggi pada potongan, tertulis di gambar. |
| F2 | Peta Paparan per Bangunan program Siklus; mesin paparan satu-satunya (D3). |
| Sel 110 m | Sel halus paparan dari Open Buildings, hanya sesi staf. |
