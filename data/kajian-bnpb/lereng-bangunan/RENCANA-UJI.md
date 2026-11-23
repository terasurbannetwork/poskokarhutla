# RENCANA-UJI: Bangunan di lereng terjal

Perintah bukti memakai yang sudah ada di modul longsor: `python3 scripts/longsor/<skrip>.py uji` untuk self-check, `node --test tests/longsor/lereng.test.mjs` untuk bentuk keluaran dan layar, `node --test tests/agen/gerbang-lereng-bangunan.test.mjs` untuk gerbang. Tidak ada Worker atau D1 di fase 1, jadi uji integrasi Miniflare baru dibutuhkan di LT-27 (`~/.claude/TEST.md`, daftar `tests/warga/cakupan.json`). Pemeriksa kerja model: `validasi-model`; layar: `selera-angka` dan `inp-reviewer`.

## 1. Uji murni (`lereng_dem.py uji`, `lereng_bangunan.py uji`)

| ID | Kasus | Harapan |
| --- | --- | --- |
| U1 | bidang miring 40 persen tepat pada kisi 8 m dan 30 m | lereng 40,0 persen pada keduanya, dalam toleransi pembulatan |
| U2 | bidang datar | 0 persen; tidak ada piksel bernilai negatif |
| U3 | puncak runcing satu piksel | lereng GLO-30 lebih rendah daripada DEMNAS pada resolusi lebih halus |
| U4 | piksel bertetangga nodata | tanpa lereng, bukan 0 |
| U5 | persen dan derajat | 40 persen sama dengan 21,8 derajat dalam toleransi; kode menolak kolom tanpa akhiran `_persen` |
| U6 | bangunan di bidang 45 persen pada dua DEM | kelas S |
| U7 | bangunan 45 persen di DEMNAS, 30 persen di GLO-30 | kelas D, bukan S |
| U8 | bangunan 30 persen di DEMNAS, 45 persen di GLO-30 | kelas G |
| U9 | bangunan berlereng persis 40 persen | kelas S (bunyi `>=`); uji mengikat bunyi ambang |
| U10 | bangunan tanpa lereng di salah satu DEM | kelas T, bukan L |
| U11 | cincin 15 m dengan bangunan tetangga | piksel tetangga dikeluarkan dari cincin |
| U12 | bangunan kecil tanpa piksel GLO-30 di jejak dan cincin | memakai piksel titik, `cara = "titik"` tercatat |
| U13 | wilayah dengan cakupan DEMNAS 0,90 (di bawah 0,95) | `angka` "belum ada DEMNAS", semua `n_*` null |
| U14 | wilayah tanpa satu pun bangunan Overture | `n_total` null atau "paling sedikit 0" dengan kelengkapan "tidak diketahui"; 0 polos dilarang; tidak ada pembagian nol |
| U15 | kerapatan wilayah di bawah syarat peringkat | tampil di tabel tanpa peringkat |
| U16 | agregat | n_S + n_D + n_G + n_L + n_T sama dengan n_total di tiap wilayah |
| U17 | peringkat dua daftar | tidak ada skor gabungan; pengikat sama jumlah urut nama |
| U18 | sidik parameter diubah tanpa bendera versi | skrip menolak jalan |

## 2. Uji bentuk keluaran (`tests/longsor/lereng.test.mjs`)

| ID | Kasus | Harapan |
| --- | --- | --- |
| B1 | `indeks.json` | memuat ambang, bunyi, rilis Overture, dan status tiap kotak yang sah |
| B2 | `<kab4>.json` | tidak ada kunci koordinat, `id`, atau `geometry`; semua `n_*` bilangan bulat atau null |
| B3 | wilayah `angka` bukan "ada" | semua ukuran null, bukan 0 |
| B4 | desa dengan bangunan dinilai di bawah `n_min_rincian` (bawaan teknis 20, di `lereng_param.json`) | tanpa rincian kelas |
| B5 | jumlah kelas | sama dengan `n_total` untuk tiap wilayah |
| B6 | `uji.json` | memuat sidik kriteria, label "awal", jumlah desa dikeluarkan, vonis cocok dengan angka (gerbang konsistensi vonis seperti `uji_balik.json`) |
| B7 | `kejadian/*.json` | memuat dua tanggal citra, pengganda vertikal, label "perkiraan dari citra" |
| B8 | ukuran berkas | di bawah anggaran DESAIN-TEKNIS 7 |

## 3. Uji layar dan gerbang

| ID | Kasus | Harapan |
| --- | --- | --- |
| L1 | teks layar dan Metode | tanpa kata aman, tanpa "rumah warga", tanpa "prediksi", tanpa titik tengah pemisah, tanpa huruf kapital semua |
| L2 | wilayah belum dihitung dan belum ada DEMNAS | pil dan kartu abu, tidak ada angka 0 |
| L3 | label hipotesis | tampil selama `uji.json` belum LOLOS; berubah hanya mengikuti vonis |
| L4 | kepala kartu | nama seksi berikon, tanpa kalimat temuan (`gerbang-tanpa-kesimpulan`, `gerbang-kartu-std`) |
| L5 | warna | tanpa literal warna baru di luar `tema.css` (`gerbang-token-warna`) |
| L6 | kolom 3D | wilayah belum ada DEMNAS tidak punya kolom; skala dan satuan di legenda |
| L7 | klik pilihan kab/kota | `inp-reviewer`: kartu ringkas digambar lebih dulu, peta dan tabel menyusul |
| L8 | ekspor | tanpa koordinat dan tanpa kolom id bangunan |
| L9 | tanpa hak (Q14) | sumber halaman tanpa angka |
| L10 | tinjau di `http://localhost:8800/longsor/lereng` | diperiksa pemilik per tiket layar |

## 4. Uji model (desa longsor)

Dilaporkan oleh `scripts/longsor/lereng_uji.py` dan diperiksa `validasi-model`.

| ID | Kasus | Harapan |
| --- | --- | --- |
| M1 | daftar dan kriteria dibekukan sebelum agregat dan label | commit `data_kejadian_desa.json` dan sidik lebih tua daripada commit agregat Bandung Raya (LT-09) dan hasil uji; `uji.json` memuat `gagal_cocok` dengan alasan; jumlah positif tidak dipaksa 21 |
| M2 | AUC dalam strata kab | terhitung dari pasangan dalam kab yang sama; kab tanpa positif tidak ikut |
| M3 | pembanding | p75 lereng desa, n_total bangunan, acak (sekitar 0,5), skor DEMNAS saja (n_D+n_S), dan skor GLO-30 saja (n_G+n_S) dilaporkan berdampingan; pembanding terbaik dihitung dari kelimanya |
| M4 | selang | bootstrap atas positif dan permutasi dalam kab; B tertulis |
| M5 | dengan dan tanpa kasus perintis | dua hasil dilaporkan |
| M6 | kepekaan | hitungan utama 40 persen; ambang 30, 45, 60 persen; varian jejak saja, cincin saja tanpa jejak, titik, maksimum, skala sama, DEMNAS dihaluskan ke sekitar 24 m (porsi S yang bertahan dilaporkan), buang desa bertetangga langsung dengan positif, rilis Overture lebih awal bila ada; tidak ada yang dipilih sesudah melihat hasil |
| M7 | desa tanpa cakupan | dikeluarkan dan dihitung, bukan negatif |
| M8 | vonis | LOLOS atau GAGAL sesuai kriteria, dengan label "awal"; kata terbukti tidak muncul |
| M9 | pembanding angka video | tabel selisih dengan penjelasan; tidak ada parameter diubah (D13) |
| M10 | audit DSM | persen kelas S yang berubah pada sampel FABDEM dilaporkan sebagai batas, bukan koreksi |
| M11 | selang dan vonis | selang bootstrap berpasangan atas selisih skor utama dan pembanding terbaik; vonis LOLOS awal hanya bila batas bawahnya di atas 0, "awal, tak terbedakan" bila memuat 0; bobot strata per pasangan dan n positif per kab dilaporkan |

## 5. Kriteria terima per fase

Fase 1 diterima bila U1 sampai U18, B1 sampai B8, L1 sampai L10, dan M1 sampai M11 lulus atau hasilnya dilaporkan apa adanya (GAGAL tetap boleh diterima sebagai temuan, asal tertulis dan label layar mengikutinya).

## 6. Bukti yang dilaporkan pengerja

Perintah, hasil, jumlah bangunan dan kotak yang dihitung, waktu hitung, rilis dan lembar yang dipakai, sidik parameter, serta pemeriksa yang harus dipanggil.
