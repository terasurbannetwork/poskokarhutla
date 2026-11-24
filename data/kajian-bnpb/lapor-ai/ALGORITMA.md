# ALGORITMA: Lapor Bencana BNPB

## A0. Spek isian (`lapor_spek`)

Dibangkitkan oleh `scripts/lapor/spek.py` dari Lampiran I dan III Rancangan Juklak Standar Data menjadi `src/lapor_spek.generated.js` (pola `bencana.generated.js`). Tiap isian:

```
{kode: "4.1", nama: "meninggal", label: "Meninggal", kelompok: "korban", tipe: "angka|pilihan|teks|waktu|lokasi|foto",
 satuan: "orang", wajib_awal: bool, jenis: null | ["banjir", ...], pilihan: [...], tanya: "Ada warga yang meninggal?"}
```

- `wajib_awal`: jenis dan subjenis (1.3), waktu kejadian (2.1, 2.2), wilayah (3.1), koordinat (3.2), ketelitian lokasi (3.3), kronologi singkat (3.4).
- `jenis`: isian data khusus hanya berlaku bila jenis laporan cocok.
- `tanya`: kalimat templat, dipakai bila AI tidak tersedia dan sebagai contoh gaya untuk AI.
- Isian yang diisi sistem (KIB, nomor induk kejadian, waktu laporan, titik panas) tidak pernah ditanyakan.

## A1. Satu putaran

Masukan: sesi (isian, riwayat ringkas, isian yang terakhir ditanyakan), pesan baru (teks, lokasi, atau foto).

1. **Perintah dulu, tanpa AI.** `batal`, `ulang`, `kirim`, `belum tahu`, `tidak ada`, angka menu atau angka pilihan, lokasi, foto, `update LA-...` ditangani kode.
2. **Uraian (AI).** Teks pelapor yang sudah disamarkan, daftar isian yang masih kosong dan berlaku, dan isian yang terakhir ditanyakan dikirim ke model dengan skema JSON keluaran:
   ```
   {isian: [{nama, nilai, kutipan}], jenis_tebak: [{jenis, subjenis, yakin}], darurat_jiwa: bool, tanya: "<kalimat untuk isian X>"}
   ```
3. **Validasi kode.** Nama isian harus ada di spek dan berlaku; nilai lolos tipe dan rentang (angka bulat 0 sampai batas wajar per isian, waktu tidak di masa depan dan tidak lebih dari 30 hari lalu; kode awal masih menyimpan waktu sebagai teks, penguraian tanggal di LA-02); angka wajib punya `kutipan` yang ditemukan di teks pelapor setelah normalisasi (huruf kecil, spasi tunggal; angka tertulis "dua belas" dikenali lewat kamus bilangan). Yang gagal dibuang diam-diam dan isiannya tetap kosong.
4. **Gabung.** Isian baru menimpa isian lama hanya bila pelapor menyebut isian itu lagi; asal tiap isian dicatat `{sumber: "pesan"|"pilihan"|"gps"|"wa"|"exif"|"sistem", pesan_id, kutipan, waktu}`.
5. **Pilih isian berikutnya (kode, A2).**
6. **Rumuskan balasan.** Tanggapan AI (satu kalimat, paling banyak 160 huruf, tanpa angka, tanpa kata "aman"; dibuang bila melanggar) + pertanyaan templat spek untuk isian yang dipilih kode di langkah 5.
7. Bila `darurat_jiwa`, balasan didahului templat darurat (PRD Larangan).

## A2. Isian berikutnya

```
berlaku = isian spek yang jenis-nya null atau memuat jenis laporan
kosong  = berlaku yang belum bernilai, belum "nihil", belum "belum didata", dan belum ditanyakan 2 kali
urutan  : wajib_awal (urutan spek), lalu kelompok: korban, pengungsian, rumah, fasilitas dan jalan,
          layanan dasar, lahan dan ekonomi, kebutuhan dan penanganan, data khusus, foto
isian berikutnya = kosong pertama
```

- Jenis belum pasti: tanya jenis dulu dengan pilihan dari `jenis_tebak` (paling banyak 4, urut yakin) + "Lainnya".
- Kelompok bisa ditanyakan sekaligus ("Ada korban jiwa atau luka?") lalu dirinci hanya bila jawabannya ya; "tidak ada" mengisi `nihil` untuk seluruh kelompok (aturan nihil `kelengkapan.js`).
- Isian yang sudah ditanyakan 2 kali tanpa jawaban jadi "belum didata" dan tidak ditanyakan lagi.
- `ringkasan` saat `kosong` habis dan semua `wajib_awal` bernilai. `kirim` sebelum itu dijawab daftar wajib yang masih kurang.

## A3. Lokasi

1. GPS perangkat (web) dengan akurasi 1 km atau lebih baik: koordinat, ketelitian "titik GPS".
2. Bagikan lokasi WA: koordinat, ketelitian "lokasi dibagikan lewat WA".
3. Nama tempat diketik: dicari di `desa_cari.json` (nama desa + kecamatan + kab); satu cocok = kode wilayah dan koordinat pusat desa, ketelitian "perkiraan tingkat desa"; beberapa cocok = pilihan bernomor; tidak cocok = minta lokasi dibagikan.
4. Koordinat ke kode wilayah lewat `cariWilayah`. Koordinat di luar Indonesia ditolak.

## A4. Foto (K5, D11, D16)

Pemeriksaan dipakai ulang dari unggah foto warga. Langkahnya dipindah dari rute `src/foto.js` ke fungsi bersama `periksaFotoLokasi({gps, exif, kini, cf})` tanpa mengubah perilaku rute lama (uji foto lama tetap lulus):

- GPS perangkat wajib, akurasi 1 km atau lebih baik, dibaca paling lama 10 menit sebelum unggah.
- EXIF ada GPS: jarak ke GPS perangkat lebih dari 5 km = tolak. EXIF ada waktu ambil: lebih dari 48 jam lalu = tolak.
- `nilaiGps` menolak yang pasti janggal dan menandai yang curiga.
- Simpan: `bersihMedia`, R2 `lapor/<laporan>/<foto>`; catatan foto `{lat, lon, akurasi, waktu_ambil, waktu_unggah, lencana: "gps"|"exif"|"wa"|"tanpa", curiga: bool}` (sama dengan enum D1 `lapor_foto`)`.
- Jarak foto ke lokasi kejadian lebih dari 10 km: foto tetap disimpan dengan tanda "jauh dari lokasi kejadian" (pelapor bisa memotret dari tempat lain sesudah menjauh).

## A5. Tingkat sumber dan kelengkapan

- `tingkat_sumber`: `bpbd` bila nomor dikonfirmasi BPBD di `lapor_izin` (D19), `bpbd_klaim` bila pelapor memilih Petugas BPBD tetapi belum dikonfirmasi, selain itu `warga`.
- Persen lengkap memakai `kelengkapan()` (kode awal masih menghitung sendiri di `lengkap()`; dialihkan di LA-01 saat spek bangkitan memuat kolom meja) dari `public/inti/kelengkapan.js` atas kolom spek yang berlaku: angka 0 terjawab, kosong belum didata, nihil menjawab satu kelompok.

## A6. Nomor laporan

`LA-DDMMYY-NN`, NN urut per tanggal WIB dari D1 (`INSERT` dengan indeks unik, ulang sekali bila bentrok). Bukan KIB; KIB tetap diterbitkan Logbook saat diterima (F1).

## A7. Identitas di awal (D18, D19)

Dijalankan kode sebelum A1, tanpa AI:

1. Cari `lapor_pelapor` dari nomor. Tidak ada: status `identitas`, tanya peran (1 Warga, 2 Petugas BPBD), lalu nama (2 sampai 80 huruf, disaring `teksBersih`), lalu untuk BPBD kab/kota (dicocokkan ke daftar kab, pilihan bernomor bila lebih dari satu) dan jabatan.
2. Ada: konfirmasi "Melapor sebagai <nama> (<peran>)? 1 Ya, 2 Ganti".
3. Teks pesan pertama yang lebih dari 30 huruf dan bukan jawaban identitas disimpan sebagai cerita tertunda dan menjadi masukan A1 pertama sesudah identitas selesai.
4. Peran `bpbd` hanya dari konfirmasi `lapor_izin`; pilihan pelapor sendiri menghasilkan `bpbd_klaim`.

## A8. Tiket dan PDF (D20, D21)

- Kirim laporan (status `terkirim`) dalam satu `batch` D1: tulis `lapor_versi` v1, terbitkan nomor (A6), tulis `lapor_tiket` status `baru`, tulis `lapor_tiket_riwayat` baris pertama, tulis `lapor_pdf` status `antre`. Gagal satu = gagal semua; pelapor dibalas "coba kirim lagi".
- Pindah status yang sah: `baru` ke `ditelaah` atau `tidak_valid`; `ditelaah` ke `diteruskan`, `ditindaklanjuti`, atau `tidak_valid`; `diteruskan` ke `ditindaklanjuti`; `ditindaklanjuti` ke `selesai`; `tidak_valid` dan `selesai` bisa dibuka kembali ke `ditelaah` dengan catatan wajib. Pindahan lain ditolak 409.
- Riwayat tiket append-only: `{tiket, dari, ke, catatan, pelaku, waktu}`; catatan disaring `teksBersih`.
- PDF: antrean `lapor_pdf` diambil mesin bot dengan klaim atomik (`UPDATE ... WHERE status='antre' RETURNING`); gagal cetak 3 kali = status `gagal` dan PEMILIK dikabari. Laporan tetap sah tanpa PDF.

---

## Lanjutan 19 Nov 2026

Semua ambang di bagian ini tanpa sumber resmi di repo, jadi ditandai HIPOTESIS dan ditulis sebagai konstanta bernama yang disetel dari data F0 (aturan: angka tanpa sumber tidak dikodekan sebagai fakta). Fungsi murni semuanya, diuji tanpa jaringan.

## A9. Gugus laporan (D27 sampai D30)

Tabel keluarga jenis (konstanta `GUGUS_ATURAN`, HIPOTESIS, Q18):

| Jenis (`lapor_spek`) | Mode | Radius | Jendela waktu kejadian |
| --- | --- | --- | --- |
| banjir, longsor, kebakaran_gedung | lokal | 3 km | 6 jam |
| cuaca | lokal | 5 km | 6 jam |
| karhutla | lokal | 5 km | 12 jam |
| gempa, erupsi, tsunami | luas (kab sama) | tidak berlaku | 12 jam |
| kekeringan, abrasi | tidak dihitung | | berlangsung berhari, jendela jam tidak bermakna sampai Q18 dijawab |

Masukan: laporan baru L (jenis, `lat`, `lon`, ketelitian, waktu kejadian `t`, nomor pelapor, kab) yang sudah terkirim dan bukan `tidak_valid`.

1. Ambil aturan jenis L. Mode tidak dihitung: selesai tanpa gugus.
2. Kandidat anggota = laporan terkirim lain dengan jenis sama yang selisih `t` paling lama jendela dan, untuk mode lokal, jarak haversine paling jauh radius (laporan berketelitian "perkiraan tingkat desa" juga cocok bila kode desanya sama), atau untuk mode luas kab sama. Pengambilan memakai indeks `(jenis, waktu_kejadian)` dengan batas jendela, jadi bukan pemindaian penuh.
3. Himpun gugus yang menaungi kandidat. Tidak ada kandidat: selesai (L tunggal). Satu gugus: L bergabung. Beberapa gugus: semuanya digabung ke yang tertua; yang lain menyimpan `digabung_ke`.
4. Kandidat yang belum bergugus: gugus baru didirikan hanya bila L dan kandidat berasal dari paling sedikit dua nomor pelapor berbeda. Dua laporan dari satu nomor tidak mendirikan gugus.
5. Hitung ulang: `n_laporan`, `n_pelapor` (nomor berbeda), `pusat` (median `lat` dan median `lon` anggota), `radius` (jarak anggota terjauh ke pusat, paling kecil 300 m), `mulai` dan `akhir` (waktu kejadian terawal dan terakhir), `foto_berlencana` (anggota dengan lencana `gps`, `exif`, atau luring).
6. Label: `gugus` bila `n_pelapor` paling sedikit 2; `gugus kuat` bila `n_pelapor` paling sedikit 3 atau paling sedikit dua pelapor berbeda punya foto berlencana. Kata "terverifikasi" tidak dipakai. Laporan tingkat `bpbd` tetap dihitung sebagai satu nomor.
7. Gugus ditutup bila tidak menerima anggota baru selama dua kali jendela (dihitung malas saat dibaca).
8. Dampak: untuk tiap isian angka, tampilkan nilai tiap laporan anggota dan rentang (terkecil sampai terbesar). Tidak dijumlah, tidak dipilih (D28).

Nomor gugus `GL-DDMMYY-NN` urut per tanggal WIB (tanggal `mulai`), indeks unik, ulang sekali bila bentrok (pola A6).

Rekaman ke Buku Besar (F1, D29): `{sumber: "lapor_ai", kode: <GL-...>, jenis, kab: [kab4 pusat], tgl: <tanggal mulai>, dampak: kosong}`. Perubahan di `scripts/siklus/pasang.py`: `lapor_ai` ditambahkan ke ujung `PRIORITAS_MASUK` dan `SUMBER_MODUL` (baris 17 dan 345, setelah `lapsus`); di `bertahap` cabang `elif not cand` (sekitar baris 290) untuk sumber `lapor_ai` menghasilkan `aksi="tanpa_pasangan"` dan tidak pernah `baru`; kolom dampak tidak dipetakan di `KOLOM`. Uji di blok uji `pasang.py` (baris 496 sampai 513 sebagai pola): rekaman `lapor_ai` menempel ke kembarnya, dan tanpa kembar tidak mendirikan KJ-.

## A10. Pemicu kabar balik (D31 sampai D33)

Peringatan BMKG (feed nowcast, bentuk `nowcast[]` di `peringatan.json`: `id`, `event`, `severity`, `urgency`, `certainty`, `mulai`, `selesai`, `aktif`, `wilayah`, `headline`, `deskripsi`, `prov[]`, `polygon`):

1. Layak bila `aktif`, `severity` salah satu Moderate, Severe, Extreme, `urgency` salah satu Immediate atau Expected, `certainty` salah satu Observed atau Likely, dan `selesai` belum lewat lebih dari 3 jam (HIPOTESIS, Q21 dan Q27). Kosakata mengikuti standar CAP 1.2.
2. Pencocokan langganan `s` (titik dibulatkan 0,01 derajat, kode kab, nama kecamatan):
   a. `polygon` ada: titik `s` di dalam salah satu poligon (uji sinar; poligon `[[lon, lat], ...]`).
   b. `polygon` kosong: provinsi `s` ada di `prov[]` dan nama kecamatan `s` (huruf kecil, tanpa tanda baca) ada sebagai salah satu butir daftar `wilayah` (dipisah koma). Nama kecamatan yang sama dipakai lebih dari satu kab dalam provinsi itu tidak dicocokkan (hindari salah kab; paket `tangga` Q6 mencatat bahwa BMKG tidak memberi kab). Hasil lebih baik kekurangan kabar daripada salah alamat.
3. Penerima = langganan setuju yang cocok dan belum menerima `id` peringatan itu (kunci unik `(id, wa)`), belum menerima kabar dalam 6 jam, dan belum 3 kabar hari ini (WIB).
4. Teks (templat L-KABAR-BMKG): judul `headline` BMKG apa adanya, `wilayah`, jam mulai dan selesai WIB, "Ikuti arahan BPBD setempat. Darurat: 112. Sumber: BMKG." Tidak ada kalimat buatan, tidak ada kata "aman".
5. Pemicu gugus: gugus layak bila `n_pelapor` paling sedikit 3 (Q22), belum ada kabar gugus dalam 6 jam; penerima = langganan setuju dengan kode desa sama dengan pusat atau jarak ke pusat paling jauh radius ditambah 1 km, dikurangi nomor anggota gugus, paling banyak 200 nomor. Staf menyetujui sebelum kirim. Teks L-KABAR-GUGUS: "Ada {n} laporan warga tentang {jenis} dari sekitar {desa} dalam {jam} jam terakhir. Laporan ini belum diperiksa petugas. Ikuti arahan BPBD setempat. Darurat: 112."
6. Pengiriman lewat limiter gateway sebagai kiriman bukan balasan, jeda antar nomor mengikuti limiter; kegagalan dicatat dan tidak diulang lebih dari dua kali.

## A11. Mode Tanya (D34, D35)

1. **Indeks.** Dari `public/lapor/edukasi.json` dibentuk butir `{id: "<topik>.<bagian>.<i>", topik, bagian, teks}` untuk bagian `ringkas`, `tanda`, `sebelum`, `saat`, `sesudah`. Sumber (lembaga, judul, url) melekat pada topik, bukan butir; jawaban selalu menyebut sumber topik.
2. **Normalisasi.** Huruf kecil, buang tanda baca dan stop word Indonesia pendek (daftar tulis tangan), peta sinonim kecil (misalnya "tsunami" dan "gelombang pasang" tidak disamakan; "tas siaga" dan "tas darurat" disamakan).
3. **Skor.** BM25 (k1 1,2; b 0,75; konstanta bernama) atas butir; kata di judul dan id topik berbobot dua kali. Topik terpilih = topik butir teratas; topik kedua ikut hanya bila skornya paling sedikit 0,8 kali yang teratas (supaya "siapkan apa kalau banjir" memuat juga `tas-siaga`).
4. **Bagian.** Kata "siapkan", "persiapan", "sebelum" memilih bagian `sebelum`; "saat", "ketika", "sedang" memilih `saat`; "sesudah", "setelah", "pulih" memilih `sesudah`; "tanda", "ciri", "gejala" memilih `tanda`. Tanpa petunjuk: `ringkas` lalu `sebelum`, `saat`, `sesudah`.
5. **Ambang.** Skor teratas paling kecil `S_MIN` (HIPOTESIS, disetel dengan 30 pertanyaan tulisan tangan di RENCANA-UJI bagian 8) dan paling sedikit satu kata isi cocok dengan topik. Di bawah itu: tidak ada jawaban.
6. **AI opsional.** Bila tersedia, model menerima pertanyaan tersamar dan daftar kandidat (id dan teks, paling banyak 8) dan mengembalikan `{pilih: [id], topik}`. Id di luar kandidat dibuang; jika kosong atau gagal, kode memakai urutan langkah 4. Model tidak menulis kalimat jawaban.
7. **Rakit.** Judul topik, label bagian, paling banyak 6 butir sebagai daftar, lalu satu baris "Sumber:" berisi lembaga dan judul dokumen sumber topik dengan tautannya. Panjang total paling banyak 1.200 huruf di WA.
8. **Pengalihan (kode, sebelum langkah 3).** Darurat jiwa memakai templat darurat. Kata keadaan sekarang atau lokasi ("hari ini", "besok", "sekarang", "tadi", "akan terjadi", "prediksi", "daerah saya", "desa saya") mengarah ke Info daerah dan Prediksi. Kata medis dan obat ("dosis", "obat apa") dijawab hanya dari topik `kesehatan-pengungsian` bila cocok, selain itu diarahkan ke layanan kesehatan dan 112. Kata hukum atau ganti rugi diarahkan ke BPBD setempat. Pertanyaan tentang laporan sendiri diarahkan ke Laporan.
9. **Catat.** Hanya topik, skor dibulatkan, ada atau tidak ada jawaban, dan nilai 1 sampai 5 (Q24).

## A12. Susulan (D36, D37)

1. **Pemicu.** Pesan nomor yang sama sesudah `terkirim` dalam jendela susulan (72 jam sejak terkirim, tiket bukan `selesai` atau `tidak_valid`, kurang dari 10 versi; Q26): bila menyebut nomor tiket, langsung susulan; bila hanya tampak berisi kabar kejadian (uraian AI mengembalikan isian atau `jenis_tebak`, atau perintah `tambah`), ditanyakan 1 Tambah, 2 Laporan baru. Tanpa AI: pesan yang berisi angka atau kata dampak ditanyakan sama.
2. **Isian terkunci.** Jenis dan subjenis, wilayah dan koordinat, dan waktu kejadian tidak berubah lewat susulan. Bila uraian menyebut jenis lain dengan keyakinan tinggi atau desa yang bukan desa laporan dan bukan satu kecamatan, bot menawarkan laporan baru.
3. **Gabung.** Jalankan A1 langkah 2 sampai 4 atas isian yang tidak terkunci. Isian yang disebut lagi dengan kutipan menimpa nilai lama pada versi baru (nilai lama tetap di versi lama). Angka boleh turun bila kutipannya jelas (koreksi). "Tidak ada" bisa mengubah nilai menjadi nihil.
4. **Selisih.** `{isian, dari, ke, kutipan}` per perubahan. Tanpa perubahan: bot menjawab "Tidak ada yang berubah" dan tidak membuat versi.
5. **Simpan (satu batch D1).** `lapor_versi` (sesi, versi+1), `lapor_susulan` (selisih, pintu, pelaku), `lapor_tiket_riwayat` (`dari` dan `ke` sama dengan status sekarang, catatan "susulan v{n}", pelaku "pelapor"), `lapor_pdf` antre untuk versi baru. Kunci utama `(sesi, versi)` menolak dua susulan serentak; yang kalah mengulang sekali.
6. **Penanda.** "Ada susulan" di meja menyala sampai ada baris riwayat tiket oleh staf sesudah susulan itu (tanpa kolom baru).
7. **Efek lanjutan.** Hitung ulang gugus (A9), foto susulan menempel ke laporan (paling banyak 20), penugasan terbuka dihitung punya tindakan bila pelaku staf; susulan pelapor tidak dianggap tindakan petugas (D53).

## A13. Penerimaan laporan luring (D41 sampai D45)

Badan `POST /api/lapor/luring`: `klien_id`, `waktu_klien`, `jenis`, `subjenis?`, `waktu_kejadian`, `lokasi {lat, lon, akurasi, waktu_gps}`, `kronologi`, `foto[]` (id media dua tahap antre.js, tiap foto membawa `lat`, `lon`, `akurasi`, `waktu_ambil`).

1. Idempotensi: `klien_id` sudah ada di `lapor_luring` = jawab 200 dengan nomor yang sama.
2. Validasi: `waktu_klien` tidak lebih dari 5 menit di masa depan dan tidak lebih dari 14 hari lalu; `waktu_kejadian` tidak setelah `waktu_klien` dan tidak lebih dari 30 hari sebelumnya; koordinat di Indonesia (`cariWilayah`); `jenis` ada di spek; `kronologi` 10 sampai 1.000 huruf disaring `teksBersih`.
3. Identitas: nomor sesi harus punya `lapor_pelapor`; bila tidak, jawab 409 berkeadaan `identitas` (antre.js menandai "berubah", halaman membuka alur identitas, butir tidak dikirim ulang otomatis).
4. Batas laju Q9 dihitung pada waktu terima; kelebihan dijawab 429 (antre.js mundur dan mencoba lagi).
5. Uraian: satu putaran A1 langkah 2 sampai 4 atas `kronologi` (tanpa AI = penguraian sederhana); isian wajib awal diisi dari form dengan asal `luring`.
6. Foto: `periksaFotoLokasi` dengan aturan EXIF D11 dan GPS dari butir; lencana ditulis di `lapor_foto_luring` (D44).
7. Satu batch D1: sesi baru langsung `terkirim` (tidak melewati indeks `lapor_sesi_hidup`), `lapor_versi` v1 (isi memuat `waktu_klien` dan `waktu_terima`), nomor A6, `lapor_tiket` `baru`, riwayat, `lapor_pdf` antre, `lapor_luring`.
8. Hitung gugus (A9) memakai `waktu_kejadian`. Bot mengirim pesan terkirim dan menawarkan susulan untuk sisa isian.

## A14. Penilaian foto (D46 sampai D49)

Dijalankan `scripts/wa/lapor_foto_nilai.mjs` di Mac mini.

1. Ambil satu baris `lapor_foto_nilai_antre` (klaim atomik), unduh foto dari rute foto berkunci `WA_MESIN`.
2. `ffmpeg` menurunkan foto menjadi 9 kali 8 piksel abu-abu (untuk dHash) dan 128 kali 128 piksel abu-abu (untuk ketajaman). dHash: untuk tiap baris, bit 1 bila piksel kiri lebih terang dari kanan; 64 bit ditulis heksadesimal 16 karakter.
3. `skor_buram` = ragam hasil kernel Laplacian 3 kali 3 pada piksel dalam citra 128 kali 128. `buram` = `skor_buram` di bawah `T_BURAM`. Selama belum ada paling sedikit 30 foto F0 yang ditinjau staf, `T_BURAM` dinyatakan "belum disetel": skor disimpan dan tampil di rincian staf, lencana Buram tidak ditampilkan.
4. `lama` = waktu ambil EXIF ada dan `waktu_terima - waktu_ambil` lebih dari 6 jam (HIPOTESIS). Foto tanpa EXIF: umur "tidak diketahui", tidak ditandai.
5. `sama`: bandingkan dHash dengan hash foto sesi lain di salinan lokal (berkas hash di Mac mini yang diperbarui bertahap dari `GET /api/lapor/foto-nilai/hash?sejak=<waktu>`, tanpa pemindaian D1). Jarak Hamming paling besar 10 dari 64 bit (HIPOTESIS) = `sama` dengan daftar `foto_id` yang mirip. Foto dari sesi yang sama dan susulan sesi yang sama dikecualikan; foto dari satu gugus yang sama tetap ditandai (bisa jadi dua orang meneruskan foto yang sama).
6. Tulis `lapor_foto_nilai` (`skor_buram`, `buram`, `lama_jam`, `hash`, `mirip`, `versi_aturan`). `versi_aturan` naik bila konstanta berubah; penilaian ulang tidak menimpa, baris baru.
7. (Q29 ya) Relevansi: foto dikirim ke model penglihatan dengan skema `{relevan: ya|tidak|tidak_jelas, alasan}`; `tidak` memberi lencana "Kurang sesuai jenis". Kode tidak pernah mengubah jenis laporan dari hasil ini.

`ponytail: pembandingan hash linier O(n) per foto di Mac mini; cukup sampai sekitar 100.000 foto, naik ke indeks BK-tree bila terukur lambat.`

## A15. Ringkasan harian (D50, D51)

Masukan: tanggal `T` dan cut off `C` (bawaan 06.00 WIB, Q30). Jendela = `[C - 24 jam, C)` pada `waktu_terima` versi 1 laporan terkirim.

1. Satu kueri: laporan terkirim dalam jendela, dengan kolom ringkas (jenis, kode kab, provinsi, status tiket, nomor pelapor, persen lengkap, isian dampak tertentu, jumlah foto berlencana, hasil verifikasi terbaru, gugus). Tanpa pemindaian penuh (indeks `lapor_sesi_waktu`).
2. Kelompok `(provinsi, jenis)`; laporan tanpa wilayah masuk "Tanpa wilayah". Laporan `tidak_valid` dikeluarkan dari hitungan dan disebut terpisah dalam satu baris.
3. Per kelompok: `n_laporan`, `n_pelapor`, `n_gugus` (gugus punya anggota di kelompok itu), `n_foto_berlencana`, `n_verifikasi` per hasil, dan rentang terkecil sampai terbesar untuk tiap isian dampak (meninggal, hilang, luka, mengungsi, rumah rusak berat) hanya dari laporan yang mengisinya (kosong tidak jadi nol).
4. Teks salin per provinsi, format id-ID, tanpa kapital semua dan tanpa kalimat kesimpulan. Contoh bentuk:
   ```
   Laporan warga 24 jam terakhir (sampai 20 November 2026 pukul 06.00 WIB), belum terverifikasi.
   Jawa Barat: banjir 7 laporan dari 5 pelapor, 1 gugus, 4 laporan berfoto lokasi. Mengungsi dilaporkan 30 sampai 120 jiwa (tiap laporan, tidak dijumlah).
   ```
5. Versi: `(tanggal, versi)` append-only; teks dan tabel JSON disimpan bersama `waktu_dibuat` dan `jendela`.

## A16. Penugasan, tenggat, merah (D52 sampai D54)

1. Buat tugas: pembuat berperan Q12; penerima staf harus punya nomor WA di register `orang` (jika tidak: "penerima belum punya nomor WA"); penerima BPBD harus kontak terdaftar kab laporan (Q16). Tenggat paling cepat 10 menit dan paling lama 30 hari dari sekarang. Batas 120 tugas baru per jam per staf.
2. Status: `terbuka`, lalu `selesai`, `dibatalkan`, atau `dialihkan` (membuat tugas baru ke penerima lain dan menutup yang lama). Tiap perubahan dan tiap penanda penerima masuk `lapor_tugas_riwayat` (append-only).
3. Tindakan (D53): baris riwayat tiket oleh staf, catatan staf pada tiket, jawaban verifikasi, atau penanda Diterima, Sedang ditangani, Selesai dari penerima, dengan waktu sesudah `dibuat`. `tindakan_pertama` = waktu terawal tindakan.
4. Merah (dihitung di klien dan di rute meja dari kolom `tenggat`, `tindakan_pertama`, status): status `terbuka`, `tenggat` sudah lewat, dan tidak ada tindakan sebelum `tenggat`. Tindakan yang datang sesudah tenggat menghapus merah dan menulis baris riwayat "tindakan sesudah tenggat".
5. Pengingat: `ingat1` pada `tenggat - 1 jam` (dilewati bila tenggat kurang dari 2 jam dari `dibuat`), `ingat2` saat `tenggat` bila belum ada tindakan. Ditulis sekali lewat `UPDATE ... WHERE ingat1 IS NULL RETURNING`; penerima dan pembuat menerimanya. Tanpa tindakan sesudah `ingat2`, tidak ada pengingat tambahan dan tidak ada eskalasi.

## A17. Sinyal awal peta utama (D55)

`GET /api/lapor/meja/sinyal?kotak=<barat,selatan,timur,utara>&sejak=<jam>`: gugus (pusat, radius, `n_pelapor`, jenis, label) dan laporan terkirim bukan `tidak_valid` dalam 48 jam (titik, jenis, waktu kejadian, tingkat sumber, persen lengkap, nomor tiket), paling banyak 1.000 baris, tanpa nama dan nomor pelapor. Hak: staf atau admin (Q12). Lapisan dirender sesudah kontrol (ditunda), diperbarui tiap 60 detik hanya saat lapisan nyala dan tab terlihat.

## A18. Rapor jujur untuk lapisan sinyal

Peta dan meja tidak menghitung skor apa pun dari gugus; label hanya `gugus` dan `gugus kuat` (A9). Warna titik di peta utama memakai token status tiket yang sama dengan meja.

## A19. Pembanding laporan warga lawan prediksi (D56)

1. Satuan: pasangan `(kab, tanggal, jenis)`. Jenis dibandingkan hanya bila ada padanan kolom arsip prediksi: banjir ke kolom banjir, longsor ke longsor, karhutla ke titik panas, banjir rob ke rob (pemetaan awal HIPOTESIS; kode kolom dibaca dari `P.kode` di paket `prediksi-besok` DESAIN-TEKNIS saat LA-43). Jenis lain tidak dibandingkan.
2. `dilaporkan(kab, tanggal, jenis)` = ada laporan terkirim bukan `tidak_valid` dengan tanggal kejadian itu. `diprediksi` = arsip prediksi yang dibekukan sebelum tanggal itu (tenggang +1) memberi level paling sedikit 1.
3. Tiga sel tabel: dilaporkan dan diprediksi (A), dilaporkan tidak diprediksi (B), diprediksi tidak dilaporkan (C). Sel "tidak dilaporkan dan tidak diprediksi" tidak ditampilkan karena penyebutnya tidak diketahui.
4. Bila `A + B + C` kurang dari `N_MIN` (30, HIPOTESIS, Q32): tampilkan hitungan dan tulis "terlalu sedikit untuk dinilai"; tidak ada persentase. Sesudah itu pun hanya hitungan; tidak ada skor gabungan sebelum uji balik yang direncanakan paket `tangga` K7 selesai.
5. Catatan wajib di layar: "C bukan berarti prediksi keliru: tidak ada pelapor di kab itu tidak berarti tidak ada kejadian. Laporan warga hanya datang dari tempat yang berpenghuni dan berpengguna."
6. Hasil tidak ditulis ke berkas di `public/` dan tidak mengubah vonis uji prediksi, kolom "teruji", atau tangga.

## A20. Pemetaan kebutuhan ke nama barang LogPal (D57, D58)

Pemetaan opsi isian `kebutuhan` (`src/lapor_spek.js`) ke `item_standar` LogPal (nilai yang dipakai `klasifikasi()` di `public/logpal/logpal.js` dan kolom `logpal_barang.item_standar`). Konstanta `PETA_LOGPAL` (HIPOTESIS, ditinjau staf LogPal, Q33):

| Opsi kebutuhan laporan | Nama barang di draf |
| --- | --- |
| Makanan siap saji | Paket makanan siap saji |
| Paket sandang | Paket sandang |
| Matras, kasur lipat, atau tikar | Matras dan kasur lipat |
| Family kit | Paket perlengkapan keluarga |
| Kidsware | Paket perlengkapan balita |
| Perahu karet untuk evakuasi | Perahu evakuasi |
| Pompa air | Pompa banjir |
| Mesin dan selang pemadam | Pompa pemadam |
| Gergaji mesin | Chainsaw |
| Tandon atau mobil tangki air | pilihan staf: Tandon air, Mobil tangki air |
| Tenda atau terpal | pilihan staf: Terpal, Tenda pengungsi |
| Genset dan lampu penerangan | pilihan staf: Genset, Light tower portable |
| Air bersih atau air minum, Paket pangan atau sembako, Obat dan layanan kesehatan, Masker, Karung atau bronjong, Alat berat, Bahan atap | tidak ada `item_standar` padanan; ditulis "perlu dipilih" dengan kategori terdekat (Pangan, Obat, Pelindung diri, Geobag, Alat berat) |
| Lainnya, Belum ada kebutuhan mendesak | tidak masuk draf |

Aturan:

1. Draf memuat satu baris per kebutuhan terpilih (paling banyak 40, batas `items` LogPal), dengan `{barang, jumlah: kosong, satuan: kosong}`; jumlah dan satuan diisi BPBD. Tidak ada rumus jumlah (rumus standar masih terbuka di KEPUTUSAN-LOGPAL Q4 dan Q13).
2. `jiwa` usulan = nilai isian "mengungsi" laporan itu bila ada, ditandai "dari laporan, ubah bila berbeda"; kosong bila belum didata (tidak pernah 0).
3. `kab`, `provinsi`, `bpbd` dari kode wilayah laporan; `jenis` permintaan LogPal, `status_darurat`, `sk`, `rekomendasi`, `trc` dibiarkan kosong untuk BPBD.
4. Syarat sumber (D58): tingkat `bpbd` atau hasil verifikasi terbaru Benar atau Sebagian benar. Satu laporan paling banyak satu draf aktif; draf baru menutup yang lama (`dibuang`).
5. Kedaluwarsa draf: 14 hari tanpa dipakai (hitung malas).

## A21. Penanda perhatian dan urutan (D64, K47)

Penanda (konstanta `PENANDA_PERHATIAN`; tiap penanda 0 atau 1, bobot bawaan 1 semuanya, Q34):

| Penanda | Menyala bila |
| --- | --- |
| Korban | isian meninggal atau hilang bernilai lebih dari 0 (nilai dengan kutipan; kosong atau "belum didata" tidak menyalakan) |
| Foto sah | ada foto berlencana `gps` atau `exif` (atau luring) tanpa tanda `curiga` |
| GPS | ketelitian lokasi "titik GPS" |
| Lama belum dibuka | status masih `baru` dan tidak ada penanda dilihat, dan `sekarang - waktu_terima` melebihi `J_BELUM_DIBUKA` (6 jam, HIPOTESIS) |
| Gugus kuat | anggota gugus berlabel `gugus kuat` (A9) |
| Dari BPBD atau terverifikasi | tingkat `bpbd` atau hasil verifikasi terbaru Benar atau Sebagian benar |
| Ada susulan | penanda "ada susulan" menyala (A12) |

`skor_perhatian = jumlah penanda yang menyala` (0 sampai 7). Urutan: `skor_perhatian` menurun, lalu `waktu_terima` menaik. Lokasi WA dan perkiraan desa tidak menyalakan penanda GPS. Penanda dihitung di klien dari kolom rute daftar; tidak ada kolom skor di D1 (skor mudah usang dan bobotnya bisa berubah). Tiap penanda punya teks `title` yang menjelaskan sebab menyala.

## A22. Kelompok titik, lapisan, dan tanda prediksi (D59 sampai D61)

1. Sumber GeoJSON `laporan` dengan properti `nomor`, `status`, `rank` (angka urutan mendesak: baru 0, dilihat 1, ditelaah 2, diteruskan 3, ditindaklanjuti 4, selesai 5, tidak_valid 6), `jenis`. `clusterProperties: {rank: ["min", ["get", "rank"]], n: ["+", 1]}`; warna lingkaran dari `rank` minimum (paling mendesak). Jari-jari lingkaran tumbuh dengan `n` dalam tiga langkah; angka di tengah `point_count`.
2. Lapisan konteks dimuat malas saat pil dinyalakan dan dibuang dari peta saat dimatikan. Batas kab dimuat per provinsi yang sedang terlihat.
3. Tanda prediksi: bila jenis laporan punya padanan kolom (A19) dan tanggal kejadian laporan ada dalam `P.kode.HJN.hari`, `lv = Besok.levelKode(kab, KOL, indeksHari, kolom)`. `lv` paling sedikit 1: "Sejalan dengan prediksi"; `lv` 0: "Di luar prediksi"; selain itu tanpa tanda. Tanda hanya penanda di pop-up dan cincin; tidak masuk skor_perhatian.

## A23. Linimasa (D62)

`t_min` dan `t_maks` = `waktu_terima` terawal dan terakhir di baris tersaring, dibulatkan ke jam; jumlah langkah paling banyak 336 (14 hari). Keadaan jam `t`: laporan dengan `waktu_terima <= t` tampil, yang `> t - 1 jam` bergetar sekali. Putar maju satu langkah per `1000 / kecepatan` ms memakai `requestAnimationFrame` dan berhenti saat tab tersembunyi. Mengubah saringan mengatur ulang penggeser ke `t_maks`.

## A24. Kab terbanyak (D63)

`hitung[kab] = jumlah baris tersaring berkab itu` (laporan ganda tidak dihitung, D67); 10 teratas menurun, seri diurut nama. Ketuk: `kabAktif = kab`; bidang peta: batas kab bila dimuat, selain itu kotak min-maks titik laporan kab itu dengan bantalan 10 persen; `terbang` memakai durasi 800 ms (0 bila `prefers-reduced-motion`). Saringan kab menggantikan saringan kab dropdown.

## A25. Tindakan massal (D65 sampai D67)

`POST /api/lapor/meja/massal` badan `{aksi: "status"|"teruskan"|"ganda", nomor: [..], ke?, catatan?, induk?}`; paling banyak 50 nomor.

1. `status`: tiap nomor lewat aturan A8 (pasangan sah) terhadap status tiketnya sendiri; yang tidak sah dikembalikan `{ok:false, galat}`; yang lain jalan. Catatan wajib untuk pembukaan kembali (A8).
2. `teruskan` (F1): semua nomor harus satu `kab4`, selain itu 400; kontak BPBD kab harus terdaftar (Q16); membuat satu `paket`, satu tugas per laporan (A16) ke kontak itu, dan satu pesan WA berisi daftar nomor tiket dan satu tautan.
3. `ganda`: `induk` wajib, satu nomor yang bukan salah satu dari yang ditandai dan bukan ganda; menulis `lapor_ganda` per nomor (`ganda_dari`, pelaku, waktu); pembatalan menulis baris baru dengan `batal = 1`. Laporan dengan tugas terbuka tidak bisa ditandai ganda (tutup tugasnya dulu).
4. Hasil: `{hasil: [{nomor, ok, galat?}]}`; batas laju staf dihitung per laporan.

## A26. Waktu tanggap (D68)

- `dilihat_pada` = waktu baris riwayat "dilihat" pertama oleh staf (Q39: penanda, bukan status); bila laporan dibuka lewat rincian meja, rute rincian menulisnya sekali (idempoten).
- `lama_dibuka = dilihat_pada - waktu_terima`; `lama_tindak = waktu pertama status ditindaklanjuti - waktu_terima`. Belum terjadi: kosong, ditulis "belum", tidak 0.
- Panel: median `lama_dibuka` dan `lama_tindak` atas laporan tersaring yang sudah punya nilai, ditambah jumlah yang belum. Tanpa peringkat dan tanpa warna baik atau buruk. Warna merah hanya dari A16.
- Format: "12 menit", "3 jam 5 menit", "2 hari" (id-ID, tanpa pecahan palsu).

## A27. Layar besar (D69)

Tampilan ringan dari data yang sama: `angka = {masuk24, baru_belum_dibuka, lewat_tenggat, gugus_kuat}` dihitung di klien; sepuluh teratas urutan Perhatian; peta tanpa panel. Jajak tiap 30 detik bila `document.visibilityState === "visible"`; galat jaringan menaikkan penanda basi (merah bila lebih dari 5 menit); 401 menghentikan jajak dan menampilkan pita sesi berakhir. Nama dan nomor pelapor tidak dirender. Fullscreen dan Wake Lock diminta dari klik pengguna dengan deteksi fitur (sesuai panduan `modern-web-guidance` saat tiket).

## A28. Ekspor (D70)

1. Baris = hasil saringan aktif (data, bukan DOM) sampai 1.000, urut seperti tampilan.
2. Excel: lembar "Laporan" (kolom D70) dan lembar "Saringan" (kondisi aktif, waktu unduh, pengunduh); `DalopsHitung.xlsx(lembar)`.
3. CSV: UTF-8 dengan BOM, pemisah koma, sel diawali `=`, `+`, `-`, `@`, tab, atau CR diberi awalan tanda kutip tunggal.
4. PDF: jsPDF A4 mendatar, kepala (judul, saringan, waktu cetak, "laporan warga, belum terverifikasi"), baris ringkasan (jumlah laporan, per status, per jenis), tabel paling banyak 200 baris, kaki "Hal n dari m". Kepala tabel rata tengah (aturan ekspor PDF pemilik).
5. Format angka dan tanggal id-ID; zona WIB.

## Lanjutan 23 Nov 2026

## A29. Darurat sekali ketuk (D122 sampai D125)

1. Klien: `getCurrentPosition` dengan `enableHighAccuracy: true`, `timeout: 15000`, `maximumAge: 60000`; bila `watchPosition` memberi akurasi lebih baik dalam 15 detik, pakai yang terbaik. Akurasi dikirim apa adanya; di atas 1.000 m meja menulis "lokasi kasar".
2. Server: tolak bila perangkat sudah membuat sekali ketuk dalam 30 menit atau IP sudah 3 kali dalam satu jam (balas 429 dengan tombol telepon tetap di layar). Titik di luar kotak batas Indonesia dibuang (laporan tetap dibuat, tanpa titik).
3. Wilayah dari titik lewat `src/lapor_wilayah.js`; kab/kota menentukan meja BPBD penerima dan nomor BPBD (K88).
4. Sesi dibuat di mesin K68 dengan isian `jenis = belum_diketahui`, `korban = belum_tahu`, `cara = sekali_ketuk`. Isian berikutnya mengikuti alur K68 biasa.

## A30. Kabar selamat dan orang dicari (D126 sampai D130)

1. Bukti nomor: `minta kode` dan `periksa kode` dari `src/masuk.js` dengan tujuan `selamat`; batas laju kode mengikuti mesin itu.
2. Tanda: satu tanda aktif per nomor; tanda baru menggantikan yang lama (yang lama tetap di riwayat). Token tautan dibuat saat tanda dibuat; mencabut tanda mencabut token.
3. Pencocokan: nomor dinormalkan ke `62…` (aturan yang sama dengan `/masuk`). Orang dicari dengan nomor N cocok dengan tanda selamat aktif dari nomor N. Tanpa nomor orang dicari, tidak ada pencocokan.
4. Kedaluwarsa: tanda selamat dihapus 30 hari sesudah dibuat (Q67), oleh cron bersih-bersih menit 17 yang ada.

## A31. Poster desa (D131 sampai D133)

1. `d` sah bila 10 angka dan ada di `desa_cari.json`; selain itu diabaikan.
2. GPS dianggap bertentangan bila titik jatuh di poligon desa lain (`public/geo/desa/<kab>.json`); titik tanpa poligon dianggap tidak bertentangan.
3. Hitungan meja: jumlah laporan berlencana poster per desa dalam rentang yang dipilih; desa tanpa laporan tidak ditulis 0, cukup tidak tampil.
