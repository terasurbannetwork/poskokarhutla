# Brief penulis katalog paradoks (Fase 1)

Kamu menulis sebagian Lampiran A "Katalog paradoks lengkap" untuk kajian BNPB "Penghitungan dan
Klasifikasi Kejadian Bencana". Pembacanya pimpinan BNPB, Pusdatinkom, Pusdalops, penyusun
peraturan; mereka bukan statistikawan.

## Baca dulu (wajib, berurutan)

1. `data/kajian-bnpb/hitung-bencana/PROMPT-KAJIAN.md` (blok kode: peran, RQ, Langkah 3, aturan
   bahasa bagian 11, aturan kejujuran bagian 12).
2. `riset/DAFTAR-PARADOKS.md`: daftar 65 paradoks dan templat bedah. Templat WAJIB diikuti persis.
3. `naskah/04-bedah-kriteria.md`: bedah kriteria yang sudah ditulis. Jangan bertentangan dengannya.
4. Bahan fakta: `riset/REGULASI.md` (kutipan regulasi), `riset/PUSTAKA.md` (praktik dunia dengan
   URL), `riset/SIM-KRITERIA.md` (uji DIBI dan logbook), `riset/SIM-KARHUTLA.md` (simulasi gabung
   api). Angka mentah di `analisis/hasil/*.json` boleh dibuka bila perlu angka tambahan; bila kamu
   menghitung angka baru, tulis skripnya di `analisis/` dengan nama `tambahan_<grup>.py` dan sebut
   skrip itu sebagai sumber.
5. `scripts/wa/panduan_resmi.json`: ringkasan panduan Logbook, Laphar, Lapjol Pusdalops (draf Juli
   2025), termasuk ambang "menonjol" per jenis dan format KIB.
6. `data/kajian-bnpb/ANTI-SLOP.md` bagian 2 (pola terlarang).

Semua path relatif ke `D:\Project\Work\BNPB\poskokarhutla\data\kajian-bnpb\hitung-bencana\` kecuali
yang diawali `data/` atau `scripts/` (relatif ke akar repo).

## Aturan keras

- Bahasa Indonesia baku EYD V, kalimat lengkap, lugas. Tanpa em dash, tanpa en dash berspasi di
  antara kata, tanpa titik tengah, tanpa tanda seru, tanpa emoji. Singkatan ditulis panjang saat
  pertama muncul di berkasmu. BNPB dan BPBD ditulis sebagai "kita".
- Tidak mengarang angka, pasal, kejadian, kutipan, atau URL. Hanya pakai fakta yang ada di berkas
  bahan atau yang kamu buka sendiri (sebut URL-nya). Yang belum bisa diverifikasi ditandai
  [BELUM TERVERIFIKASI]. Kasus rekaan ditandai [ILUSTRASI]. Lebih baik "belum ada data" daripada
  angka karangan. Kejadian nyata Indonesia (mis. Palu 2018, Cianjur 2022) boleh disebut sebagai
  pengetahuan umum hanya bila kamu bisa menyebut sumbernya; angka korbannya wajib bersumber atau
  ditandai.
- Tidak ada nama korban, petugas, pelapor, atau nomor telepon.
- Angka antarsumber tidak dijumlah. Tiap angka menyebut sumber dan periodenya.
- Tiap paradoks: butir 5 paling sedikit 2 opsi, masing-masing menyebut konsekuensi pada jumlah
  kejadian, tren, keadilan antardaerah, insentif pelapor, dan beban kerja pencatat (boleh ringkas,
  tetapi kelima aspek disebut).
- Butir 7 berakhir dengan rekomendasi sementara ATAU rujukan ke pertanyaan terbuka (Q-xx) beserta
  bawaan sementara bertanda [BAWAAN SEMENTARA].
- Isi "Bergantung pada" dan "Menentukan" dengan kode paradoks lain (bahan peta ketergantungan).
- Paradoks yang sangat mirip boleh saling merujuk, tetapi tetap ditulis lengkap.
- Panjang wajar 250 sampai 500 kata per paradoks.
- JANGAN commit. JANGAN mengubah berkas lain selain berkas keluaranmu (dan skrip `tambahan_*.py`
  bila perlu).

## Pertanyaan terbuka yang sudah ada (pakai kodenya bila cocok)

- Q-02 Salinan resmi Juklak 7/2023 dari JDIH BNPB (teks yang dibaca berasal dari PDF UNFPA).
- Q-03 Satuan "jumlah kejadian" untuk pimpinan: kejadian nasional (lintas kabupaten dihitung satu)
  atau kejadian per kabupaten. [BAWAAN SEMENTARA] dua angka disajikan dengan nama berbeda.
- Q-04 Ambang luas pengganti 1 ha (karhutla, sawah). [BAWAAN SEMENTARA] belum diganti; Fase 2
  menyimulasikan beberapa angka.
- Q-05 Kriteria e dan f menjadi penanda, bukan pemicu. [BAWAAN SEMENTARA] diusulkan menjadi penanda.
- Q-06 Aturan gabung karhutla. [BAWAAN SEMENTARA] aturan sistem kita (`scripts/data/harian.py`:
  jarak adaptif sampai 1,5 km, selisih waktu 48 jam) sampai Fase 2 memilih.
- Q-07 Versi angka yang sah. [BAWAAN SEMENTARA] ikut Petunjuk Pengisian Juklak 7/2023 (meninggal
  nominal terakhir; hilang, luka, terdampak, mengungsi nominal terbesar selama tanggap darurat;
  kerusakan nominal terakhir), angka statis dibekukan per rilis dengan nomor versi.
- Q-08 Siapa berwenang menyatakan dua laporan satu kejadian. [BAWAAN SEMENTARA] Pusdatinkom sebagai
  walidata memutuskan, BPBD mengusulkan (Juklak 7/2023 hlm. 7 Catatan c).
- Q-09 Jeda yang memisahkan kejadian berulang (banjir naik lagi, api menyala lagi). [BAWAAN
  SEMENTARA] 7 hari tanpa laporan aktif berarti kejadian baru.
- Q-10 Kejadian berantai. [BAWAAN SEMENTARA] satu kejadian induk dengan anak per bahaya; korban
  dicatat sekali pada bahaya penyebab langsung dan dijumlah sekali di induk.

Bila kamu butuh pertanyaan baru, tulis di bagian akhir berkasmu "Usulan pertanyaan terbuka" dengan
kode sementara Q-baru-<grup>-1 dan seterusnya, lengkap dengan bawaan sementara. Sesi induk akan
memberi nomor resmi.

## Keluaran

Satu berkas Markdown `naskah/lampiran-a-<grup>.md`, berisi judul "Lampiran A, kelompok <X>: <nama
kelompok>", satu paragraf pengantar kelompok (apa kesamaan paradoksnya), lalu tiap paradoks dengan
templat, urut kode. Di akhir: "Usulan pertanyaan terbuka" dan "Daftar periksa" (semua
[BELUM TERVERIFIKASI] di berkasmu).

Lapor balik ringkas (maks 300 kata): berkas, jumlah paradoks, 3 temuan paling tajam, daftar
pertanyaan baru, dan semua angka baru yang kamu hitung beserta skripnya.
