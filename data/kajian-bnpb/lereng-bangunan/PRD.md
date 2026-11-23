# PRD: Bangunan di lereng terjal

Status 23 Nov 2026. Lingkup mengikuti KEPUTUSAN-LERENG K1 dan K2; hal yang belum dijawab pemilik memakai bawaan sementara di Q.

## 1. Tujuan

Menjawab dengan angka yang bisa diperiksa: berapa bangunan berdiri di lereng lebih dari 40 persen menurut dua peta ketinggian yang sepakat, di desa dan kecamatan mana, seberapa lengkap datanya, dan apakah desa yang pernah longsor memang punya lebih banyak bangunan di lereng daripada desa tetangganya.

## 2. Pengguna

| Peran | Kebutuhan |
| --- | --- |
| Staf BNPB dan analis | Peringkat kecamatan dan desa menurut jumlah dan kerapatan bangunan di lereng terjal, dengan kelengkapan data dan kepastian dua peta di barisnya. |
| BPBD dan akun instansi | Angka untuk kab/kota dan kecamatan sendiri, dengan daftar desa. |
| Pimpinan | Ringkasan satu layar per wilayah, tanpa kalimat kesimpulan dan tanpa kata aman. |
| Pengerja longsor | Keluaran yang dapat diuji ulang, hasil uji, dan batas yang tertulis. |

Publik umum: mengikuti Q14; bawaan sementara belum publik.

## 3. Fitur

| ID | Fitur | Keterangan |
| --- | --- | --- |
| F-1 | Hitungan bangunan di lereng terjal | Per desa dan kecamatan: bangunan total (Overture), sepakat terjal (S), hanya DEMNAS (D), hanya GLO-30 (G), landai (L), tak dinilai (T). Angka utama S, dengan rentang S sampai S+D+G. |
| F-2 | Cakupan dan "belum ada DEMNAS" | Wilayah di bawah ambang cakupan (Q9) tampil "belum ada DEMNAS", tanpa angka. |
| F-3 | Kelengkapan data bangunan | Kelas kelengkapan Overture per kab dan catatan "paling sedikit"; wilayah tanpa pembanding "tidak diketahui". |
| F-4 | Peringkat | Lima kecamatan teratas menurut jumlah S dan menurut kerapatan (S per km2 luas darat), dua daftar terpisah, tidak dilebur. |
| F-5 | Kolom 3D per kecamatan | Tinggi kolom = jumlah S atau kerapatan (pilihan), dengan legenda ukuran dan tooltip angka. |
| F-6 | Peta sebelum dan sesudah | Untuk kejadian terpilih: Sentinel-2 sebelum dan sesudah, hillshade dan garis lereng 40 persen dari DEMNAS di bawahnya, berlabel "perkiraan dari citra". |
| F-7 | Potongan melintang cekungan | Profil tinggi dari DEMNAS dan GLO-30 sepanjang garis terpilih, lereng per ruas, tanda ambang 40 persen, pengganda vertikal tertulis. |
| F-8 | Uji kecocokan desa longsor | 21 desa 2025 sampai 2026 lawan desa lain di wilayah sama; hasil dengan label "awal", pembanding, dan batas. |
| F-9 | Metode dan batas | Tab Metode: sumber, ambang, definisi dua peta sepakat, risiko DSM, kelengkapan, hasil uji, hal yang tidak diklaim. |
| F-10 | Ekspor tabel | Tabel desa dan kecamatan (CSV) dengan kolom cakupan dan kelengkapan; tanpa koordinat bangunan. |
| F-11 | Perluasan bertahap | Bandung Raya, Jawa Barat, Jawa, nasional (D14); tiap kotak tercatat "dihitung" atau "belum dihitung". |
| F-12 | Sambungan ke Peta Paparan | Lapisan bahaya "lereng terjal" yang dapat dibaca F2 (Q5). |
| F-13 | Prospektif | Kejadian baru dibandingkan dengan lapisan yang dibekukan sebelumnya; append-only. |

## 4. Bukan tujuan

- Bukan peringatan dan bukan prakiraan longsor; bukan bagian nowcast.
- Tidak memberi kelas rawan pada desa atau kecamatan, tidak menulis "aman".
- Tidak menghitung korban atau penduduk terpapar di fase 1 (jiwa terpapar ada di F2; angka tidak dijumlah dengan ini).
- Tidak menunjukkan lokasi bangunan tunggal di layar publik.
- Tidak menyetel ambang agar cocok dengan video.
- Tidak menghitung stabilitas lereng (faktor keamanan, tanah, air tanah); hanya geometri lereng.

## 5. Kriteria jadi

1. Bandung Raya dihitung penuh untuk empat kab/kota dengan keluaran agregat dan cakupan tertulis.
2. Hitungan dapat diulang dari perintah yang sama dan menghasilkan angka sama (rilis Overture dan lembar DEM terkunci di catatan).
3. Selisih terhadap angka video dilaporkan dengan sebab (D13).
4. Uji desa jalan dengan kriteria yang dibekukan lebih dulu, vonis tertulis apa adanya.
5. Layar lolos gerbang: tanpa kata aman, kosong bukan nol, label hipotesis selama uji belum lulus, tanpa kalimat kesimpulan di kepala kartu.
6. Tiap tab layar diperiksa di `http://localhost:8800/longsor/lereng` (Q13).

## 6. Fase

Fase 1: Bandung Raya, angka dan uji desa, layar staf (LT-02 sampai LT-22). Fase 2: Jawa Barat dan Jawa, sambungan F2 (LT-23, LT-24). Fase 3: uji kecamatan nasional dan prospektif (LT-25, LT-26). Fase lanjut: sel halus untuk staf (LT-27).
