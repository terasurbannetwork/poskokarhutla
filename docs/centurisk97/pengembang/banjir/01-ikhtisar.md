# Ikhtisar banjir dan layar peta

Halaman ini meringkas modul banjir dan menjelaskan layar peta banjir serta Insight.

## Ringkasan

Modul ini adalah bagian banjir pada situs Centurisk97 (`https://centurisk97.id/banjir/`). Ia menjawab empat pertanyaan yang berbeda dan sengaja tidak dilebur menjadi satu angka:

1. Kecamatan mana yang diperkirakan berstatus Normal, Waspada, Siaga, atau Awas untuk banjir dalam empat hari ke depan (hujan, sungai, dan indeks bahaya).
2. Di pesisir, seberapa tinggi muka laut hari ini dan sepuluh hari ke depan dibanding sejarah titik itu sendiri (rob), termasuk kalender kekuatan pasang astronomis dan prediksi pasang surut BMKG.
3. Di mana radar satelit melihat air sesudah banjir (genangan satelit Copernicus GFM), dan bagaimana angka itu akan dipakai per kejadian di Kaji Cepat Siklus (paket `genangan-satelit`, baru tahap kriteria uji).
4. Seberapa cepat tanah turun di kota pesisir (penurunan tanah dari radar satelit InSAR) dan apa artinya untuk 10 dan 20 tahun ke depan bila laju bertahan (paket `penurunan-tanah`, baru tahap lab).

Ditambah mesin simulasi genangan (tab Simulasi, genangan Jakarta J1 sampai J4), bukti daerah aliran sungai hulu dengan citra satelit, kejadian banjir aktif, replay banjir Jabodetabek Maret 2025, dan paket panel pemantauan alat (sensor muka air, hujan, getaran, CCTV) yang baru dirancang (paket `ews`).

Pengguna utama:

| Pengguna | Kebutuhan |
| --- | --- |
| Warga dan publik | Status banjir dan rob per kecamatan, peluang hujan lebat, pos tinggi air sungai, kejadian yang sudah dilaporkan. Halaman `/banjir` terbuka tanpa masuk. |
| BPBD | Wilayah siaga, rantai hulu ke hilir, simulasi skenario, hasil Kaji Cepat untuk wilayahnya (peran BP). |
| Staf BNPB (Pusdalops, Koordalops) | Kejadian aktif, dampak, Kaji Cepat per kejadian, antrean pengingat dari sensor. |
| Pimpinan dan perencana | Ringkasan dampak, kalender rob, penurunan tanah, batasan metode. |
| Peneliti dan kampus mitra | Tab Metode memuat rumus, ambang, dan hasil uji balik dengan angka yang dibaca dari berkas data, bukan ditulis tangan. |

Prinsip yang berlaku di seluruh modul:

- Semua keluaran model berstatus HIPOTESIS kecuali bila uji balik atau uji prospektif meluluskannya. Halaman Metode menuliskan hasil uji apa adanya, termasuk yang buruk.
- Kosong bukan nol. Berkas yang tidak ada, sumber yang gagal, kabupaten tanpa lintasan satelit, atau sensor yang berhenti mengirim ditulis "tidak ada data", "belum terukur", atau "tidak teramati", tidak pernah 0.
- Status resmi lembaga lain (BMKG, Kementerian PU, PVMBG) ditampilkan apa adanya dengan nama pengelolanya, tidak dipetakan ulang ke tingkat kita.
- Radar satelit bukan bukti negatif: tidak adanya genangan teramati tidak berarti tidak ada banjir.

## Peta banjir (`/banjir/` atau `/banjir/peta`)

Siapa: publik.

Langkah pakai:

1. Buka `/banjir/`. Peta menampilkan status per kecamatan untuk hari ini dan tiga hari ke depan. Pilih hari dan jenis (banjir atau longsor) pada pemilih di atas peta.
2. Nyalakan atau matikan lapisan pada panel lapisan. Lapisan yang ada: Status wilayah, Pos tinggi air, Titik sungai (GloFAS), Wilayah Siaga (prakiraan), Sudah banjir (laporan), Rekomendasi posko (disembunyikan), Citra satelit, Genangan historis, Sedang hujan (nowcast BMKG), Hujan harian, Hujan 3 hari (puncak), serta Pos hujan dan Peluang hujan lebat (keduanya disembunyikan bawaan) (`public/banjir/index.html:109-125`). Lapisan tambahan dari `public/banjir/lapis_ekstra.js`: pompa dan pintu air Jakarta, riwayat genangan satelit Jakarta, listrik padam, dan penurunan tanah di bawah rob.
3. Klik kecamatan atau titik untuk membuka kartu rincian. Tabel wilayah di panel memuat per provinsi (dapat dibuka ke kabupaten/kota) kolom Status, WS (gugus wilayah Siaga prakiraan), H3 (hujan 3 hari, mm), Tren, dan Terdampak (jumlah kab/kota yang sudah dilaporkan banjir; ini kejadian yang sudah terjadi, bukan prakiraan, dan hanya kejadian dalam jendela `TDm.AMBANG` hari terakhir; tanda "–" berarti tidak ada laporan, bukan nol). Kolom RB (titik rob) sudah tidak ada di tabel dan hanya tersisa di komentar kepala berkas (`public/banjir/wilayah.js:3`, `:186-187`).
4. Pilih periode lebih dari satu hari pada tabel wilayah bila perlu. Jumlah kejadian aktif dihitung sebagai gabungan kode unik, penduduk terpapar dan hujan 3 hari diambil puncaknya, status diambil yang tertinggi, supaya angka yang sama tidak dijumlah berkali-kali.

Arti label dan warna:

| Label | Arti |
| --- | --- |
| Normal, Waspada, Siaga, Awas | Tingkat status dari aturan di bagian Metode 5. Warna registri: abu `#9aa4b2`, kuning `#e0b400`, jingga `#e8743b`, merah `#d64545` (`public/bencana.json`). |
| Pos tinggi air: Biasa, Naik di atas biasa, Tertinggi, Data lama, Macet, Bukan tinggi air, Riwayat kurang, Pantauan terbatas, Data bolong | Status pos sungai SIHKA Kementerian PU yang dihitung Worker dari riwayat pos itu sendiri (Metode 19). |
| Normal, Siaga 3, Siaga 2, Siaga 1 pada pos | Status resmi pengelola pos. Bila ada, ia menang atas status persentil, kecuali data lama atau macet (`public/banjir/pos_air.js`). Siaga 1 adalah yang tertinggi di sistem pengelola. |
| Pil "perkiraan" atau "hipotesis" | Keluaran model yang belum lulus uji balik. |
| "Sudah banjir (laporan)" | Kejadian yang sudah terjadi per kabupaten/kota dari laporan harian: Belum surut, Sudah surut, atau Belum diketahui. Tanpa kabar lanjutan lebih dari 14 hari, "Belum surut" menjadi "Belum diketahui". |

Hal yang sering disalahpahami:

- Status adalah prakiraan berbasis hujan model dan sungai model, bukan pengamatan genangan. Hanya lapisan "Sudah banjir (laporan)" dan pos tinggi air yang berasal dari pengamatan atau laporan.
- Status Siaga di satu kecamatan tidak berarti seluruh kabupaten banjir. Status kabupaten adalah kecamatan tertinggi di dalamnya.
- Uji balik menunjukkan alarm palsu yang tinggi (Metode 6). Status adalah penanda untuk bersiaga, bukan prakiraan kejadian.

## Insight (`/banjir/insight`)

Siapa: publik. Kumpulan kartu ringkas: kabupaten dengan peluang hujan lebat tertinggi besok, lusa, dan H+3 (urut peluang hujan 50 mm atau lebih per hari), kemajuan uji prospektif menuju vonis, peringatan resmi BMKG per dasarian, dan kartu data lain yang ditambahkan lewat berkas terpisah (`public/banjir/dini.js`, `public/banjir/resmi_bmkg.js`, `public/banjir/insight.js`). Pemilih di kanan judul kartu mengubah provinsi atau cakrawala.

Arti angka:

- Peluang hujan lebat adalah peluang HUJAN dari ansambel ECMWF (51 anggota), bukan peluang banjir, dan belum terkalibrasi. Peluang kabupaten adalah maksimum titik 1 derajat terdekat, sehingga bukan peluang "di mana saja di kabupaten" (`scripts/banjir/peluang_banjir.py`).
- Peringatan Dini Curah Hujan Tinggi BMKG tampil sebagai gambar resmi apa adanya (peta WMS milik BMKG per dasarian). Warna tidak diubah menjadi angka. Dasarian yang belum terbit tampil sebagai peta kosong, bukan galat.
