# KEPUTUSAN-TANGGA: Tangga Peringatan

Dokumen ini menang atas semua dokumen lain di folder ini. Keputusan pemilik dicatat apa adanya; hal yang belum diputuskan ada di bagian Q dan tidak dijawab dengan karangan.

## Keputusan pemilik (10 Nov 2026)

| No | Keputusan |
| --- | --- |
| K1 | Bangun modul Tangga Peringatan mulai sekarang. |
| K2 | Untuk tiap kabupaten/kota ada satu tangga dari skala terjauh ke terdekat: musim, bulan, dasarian, 10 hari, 3 hari, jam. Tiap anak tangga adalah pernyataan resmi BMKG atau data kita yang berlabel, supaya staf tahu kapan mulai siaga. |
| K3 | Dua ancaman berjalan bersamaan dan tampak bersamaan: kering (kekeringan, karhutla, asap) dan basah (banjir, longsor). |
| K4 | Tiap anak tangga menyimpan tingkat, teks sumber, lembaga, tanggal terbit, cakupan (nasional, provinsi, kabupaten, kecamatan). Pernyataan yang hanya sampai provinsi ditulis "tingkat provinsi", tidak diklaim kabupaten. |
| K5 | Prediksi musim memakai ZOM. Bila pemetaan ZOM ke kabupaten tidak ada, tampilkan tingkat nasional atau provinsi dan catat sebagai Q. |
| K6 | Warna peta tidak dijadikan angka. Status resmi tidak ditafsirkan ulang. Tidak pernah menulis "aman". Status kita dan BMKG terpisah. Tidak ada skor gabungan baru tanpa uji balik. |
| K7 | Sinyal lintas skala boleh dihitung dengan aturan terbuka: "menguat" dan "belum selaras", per ancaman kering dan basah. Aturannya disebut, tidak diberi kesan probabilitas. Uji balik direncanakan; hasil baru boleh diklaim sesudah arsip cukup. |
| K8 | Awan Himawari belum boleh dijadikan peringatan; tampil berlabel analisis. |

## Keputusan rancangan (agent, bisa dibatalkan pemilik)

| No | Keputusan | Alasan |
| --- | --- | --- |
| D1 | Satu anak tangga tambahan, "sepekan" (7 hari), di antara 10 hari dan 3 hari. | BMKG menerbitkan prakiraan sepekan dan factsheet karhutla per provinsi, bukan per kabupaten; menaruhnya di "10 hari" atau "3 hari" memalsukan rentangnya. Lihat Q3. |
| D2 | Sinyal "menguat" dan "belum selaras" dihitung hanya dari pernyataan BMKG. Prediksi kita (3 hari) tampil di tangga tetapi tidak ikut sinyal. | K6: status kita dan BMKG terpisah. Lihat Q4. |
| D3 | Berkas keluaran satu, `public/prediksi/data/tangga.json`, dibaca sekali oleh layar. Pernyataan nasional dan provinsi disimpan sekali, tidak disalin ke 514 kabupaten; layar yang menggabungkan. | Ukuran berkas dan kejujuran cakupan. |
| D4 | Cocok nama kabupaten lewat `dasar.pencari`, bukan kode, untuk semua berkas BMKG iklim dan awan: kode di sana indeks internal, bukan Kepmendagri (contoh: "1101" = Aceh Barat Daya di berkas iklim, Aceh Selatan di Kepmendagri). Berkas prakiraan 10 hari memakai kode Kepmendagri bertitik ("11.01") dan dicocokkan lewat id dengan pemeriksaan nama. | Ranjau salah kab diam-diam (AGENTS.md, ilmu prediksi). |
| D5 | Setiap hari satu baris ringkas tingkat per anak tangga ditambahkan ke `public/prediksi/data/tangga_arsip/YYYY-MM.jsonl`, append-only. | Syarat uji balik prospektif (K7). |
| D6 | Pernyataan yang melewati batas basi (jam: 4 jam; harian: 48 jam; iklim: 14 hari) tidak ditampilkan; berkasnya dicatat di `gagal`. | Staf tidak boleh membaca peringatan usang sebagai aktual. |
| D7 | Pengecualian tombol dummy: tab Tangga hanya membaca `tangga.json` statis dan tidak menulis ke tabel D1 mana pun, sehingga tidak ada tabel yang harus diisi dummy. Isian uji ada di fixture `tests/prediksi/tangga.test.mjs`. | DUMMY.md mewajibkan tombol bagi halaman yang menulis data. |

## Pertanyaan terbuka untuk pemilik (Q)

| Q | Pertanyaan | Keadaan sekarang |
| --- | --- | --- |
| Q1 | Dari mana pemetaan ZOM ke kabupaten? Berkas `iklim_bmkg_arsip.json` hanya memuat hitungan ZOM nasional ("185 ZOM; 24,66% luas daratan"); tidak ada tabel ZOM per kabupaten di repo. | Anak tangga musim tampil tingkat nasional, tanpa tingkat. Perlu keputusan: ambil geometri ZOM dari BMKG, atau terima nasional saja. |
| Q2 | Setujukah pemetaan peringkat 0 sampai 3 di ALGORITMA bagian 3 untuk pernyataan yang bukan Waspada/Siaga/Awas (sifat hujan, ensemble, nowcast, perhatian khusus)? | Dipakai hanya untuk sinyal; label resmi selalu tampil apa adanya. |
| Q3 | Setujukah anak tangga "sepekan" ditambahkan (D1)? | Ditambahkan. |
| Q4 | Perlukah sinyal gabungan BMKG dan prediksi kita? | Tidak, sampai ada uji balik (K6, D2). |
| Q5 | SPI per kabupaten: BMKG menerbitkannya sebagai gambar dan PDF (`catatan: isi hanya gambar`). Mau dibaca dari PDF (skrip milik cuaca-udara)? | Tidak dipakai; sifat hujan bulanan dan dasarian menggantikan sebagai ukuran kering/basah. |
| Q6 | Nowcast BMKG menyebut kecamatan; pemetaan kecamatan ke kabupaten tidak ada di berkas itu. Perlukah tabel kecamatan ke kabupaten (BIG)? | Tampil tingkat provinsi, nama kecamatan di teks. |
| Q7 | Jadwal: `prediksi.yml` jalan sekali sehari 08.50 WIB, sedangkan nowcast dan petir berubah tiap 3 jam. Pasang langkah `tangga.py` tersendiri tiap 3 jam? | Tangga dirantai di `jalan.py giliran` (harian). Usulan workflow ada di laporan, tidak disentuh. |
| Q8 | Anak tangga "jam" untuk ancaman kering (titik panas hari ini) dari sumber mana? | Kosong ("belum ada data"). |
| Q9 | Cakupan kabupaten untuk peringatan kekeringan BMKG (per kecamatan) diringkas ke tingkat tertinggi per kabupaten, dengan jumlah kecamatan di teks. Cukup? | Dipakai. |
