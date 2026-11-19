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
