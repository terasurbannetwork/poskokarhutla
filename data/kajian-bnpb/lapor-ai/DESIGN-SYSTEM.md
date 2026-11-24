# DESIGN-SYSTEM: Lapor Bencana BNPB

Aturan merek dulu, atom dulu, baru layar (AGENTS 3.9). Token hanya dari `public/inti/tema.css`; tanpa literal warna baru di CSS halaman (gerbang `gerbang-token-warna`). Kepala situs navy bersama (memori `kepala-situs-wajib`). Tanpa huruf kapital semua, tanpa titik tengah, tanpa em dash, tanpa emoji, tanpa kalimat kesimpulan di kepala kartu.

## 1. Pesan WA

Mengikuti `data/kajian-bnpb/bot-laporan/DESIGN-SYSTEM.md` (judul tebal baris 1, baris pendek, paling banyak sekitar 12 baris, menu bernomor). Templat lapor:

| Kode | Kapan | Isi |
| --- | --- | --- |
| L-SAPA | pesan pertama nomor baru | `*Lapor Bencana BNPB*`, "Sebelum melapor, kami catat data awal dulu. Data laporan dan nomor Anda dipakai BNPB untuk penanganan bencana.", `*Melapor sebagai:*` `1 Warga`, `2 Petugas BPBD` |
| L-NAMA | sesudah peran | "Nama Anda?" (BPBD: lalu "Kab/kota dan jabatan?") |
| L-KENAL | nomor dikenal, `lapor` | `*Lapor Bencana BNPB*`, "Melapor sebagai Budi (warga)?", `1 Ya`, `2 Ganti` |
| L-CERITA | identitas selesai | "Ceritakan kejadiannya: apa, di mana, kapan." |
| L-TANYA | tiap putaran | baris "Tercatat: banjir bandang, Desa X" bila ada isian baru, lalu satu pertanyaan |
| L-PILIH | jenis atau desa belum pasti | `*Pilih yang paling mirip:*`, `1 Banjir`, `2 Banjir rob`, ..., `5 Lainnya` |
| L-LOKASI | lokasi kosong | "Bagikan lokasi: ketuk ikon lampiran, pilih Lokasi. Atau tulis nama desa dan kecamatan." |
| L-FOTO | kelompok foto | "Kirim foto di chat ini (bagikan lokasi juga), atau lewat tautan ini supaya lokasi GPS perangkat terekam:" + tautan; "Ketik *lewati* bila tidak ada foto." |
| L-RINGKAS | semua tertanya | `*Ringkasan laporan*`, isian per kelompok satu baris, menu `1 Kirim, 2 Ubah, 3 Batal` (Tambah foto menyusul di LA-05) |
| L-FOTO-WA | foto masuk di chat | `*Foto diterima*`, "Waktu dan lokasi WA terekam." atau "Bagikan lokasi supaya foto bertanda lokasi." |
| L-TERKIRIM | sesudah kirim | `*Laporan terkirim*`, `_LA-191126-01_`, "Tiket dibuat. PDF menyusul.", lalu kiriman PDF berketerangan `LA-191126-01` |
| L-STATUS | tiket `ditindaklanjuti` / `selesai` | `*Laporan ditindaklanjuti*` atau `*Laporan selesai ditangani*`, `_LA-191126-01_`, satu baris catatan petugas bila ada |
| L-DARURAT | `darurat_jiwa` | "Bila ada nyawa terancam sekarang, hubungi 112 atau BPBD setempat." (teks tetap) |
| L-PEMILIK | salinan ke PEMILIK | `*Laporan baru LA-...*`, jenis, kab, waktu, persen lengkap, jumlah foto bergeotag, tautan meja |

## 2. Halaman `/lapor` (mobile-first, juga layar lebar)

Tata letak:

- Layar sempit (sampai 720 px): satu kolom penuh. Kepala situs ringkas, lalu daftar pesan yang bisa digulir, lalu baris aksi dan kotak ketik menempel di bawah (aman dari papan ketik layar: tinggi viewport dinamis `dvh` dengan fallback `vh`).
- Layar lebar (lebih dari 1024 px): dua kolom. Kiri percakapan (lebar baca paling banyak 720 px), kanan panel "Isian laporan" yang hidup: kelompok, isian, tanda terisi, nihil, atau belum didata, dan meter persen lengkap. Di layar sempit panel ini dibuka lewat tombol "Isian" sebagai lembar bawah.

Atom (semua keadaan: biasa, sorot, fokus, tekan, nonaktif, memuat, galat):

| Atom | Catatan |
| --- | --- |
| Gelembung pelapor | rata kanan, latar aksen muda dari token |
| Gelembung bot | rata kiri, latar permukaan, label kecil "Lapor Bencana BNPB" pada gelembung pertama berturut-turut |
| Penanda mengetik | tiga titik beranimasi, berhenti pada `prefers-reduced-motion` |
| Tombol pilihan | penuh lebar dibagi rata (memori `deretan-pilihan-ujung-ke-ujung`), berikon jenis bencana dari registri, sentuhan minimal 44 px |
| Chip aksi | Lokasi, Foto, Belum tahu, Tidak ada; ikon polos tanpa garis luar (memori `ikon-tanpa-garis-luar`) |
| Kartu foto | gambar mini, lencana "GPS perangkat", "EXIF cocok", "Curiga", jam ambil |
| Kartu ringkasan | per kelompok, ketuk untuk ubah; tombol Kirim utama |
| Meter lengkap | persen, warna status dari token |

Interaksi: kirim pesan menambah gelembung pelapor seketika (optimistis), balasan bot menyusul; chrome kontrol tetap urgent, render panel isian ditunda (aturan INP pemilik nomor 2). Fokus kembali ke kotak ketik sesudah kirim. Semua tombol punya label aksesibel; daftar pesan `aria-live="polite"`.

## 3. Halaman `/lapor/foto?t=...`

Satu layar: judul laporan, tombol besar Ambil foto (`<input type="file" accept="image/*" capture="environment">`) dan Pilih dari galeri, status GPS ("Mencari lokasi..." lalu "Lokasi terkunci, akurasi 12 m"), daftar foto terunggah dengan lencana. Tanpa login; token terikat satu laporan.

## 4. Monitoring dan dashboard `/lapor/meja`

- Tab Peta: tiru peta utama `public/index.html` (overlay, legenda, panel samping yang bisa ditarik; memori `sidebar-bisa-ditarik`). Warna titik dari token status tiket (baru, ditelaah, diteruskan, ditindaklanjuti, selesai, tidak valid); ikon jenis dari registri `public/bencana.json`. Pop-up: tiket, jenis, kab, waktu, pelapor, foto mini, tombol Buka.
- Tab Daftar: kartu standar `.ex.ex-std` (AGENTS 3.5), kepala = nama seksi berikon, tanpa kalimat kesimpulan, tanpa kaki sumber; tabel `.ex-tabel` kepala navy, kepala kolom rata tengah. Pil status berwarna dan berlabel Indonesia.
- Tab Foto: tiru kisi dan pop-up `public/foto.*`; lencana lokasi: "GPS perangkat" (terkuat), "EXIF cocok", "Lokasi WA", "Tanpa lokasi", "Curiga".
- Panel rincian: kartu per bagian (Pelapor, Kejadian, Dampak, Data khusus, Foto, Percakapan, Tiket), tidak menempel (jarak 20 px), kolom samping berakhir sejajar.
- Pilihan tab dan filter: deretan penuh lebar dibagi rata, berikon (memori `deretan-pilihan-ujung-ke-ujung`).

## 5. PDF laporan (`/lapor/l/<nomor>?cetak=1`)

A4 tegak, Roboto. Kop: logo BNPB kiri, KRIS kanan, judul "Laporan Kejadian Bencana", nomor tiket, waktu laporan. Bagian: Pelapor (nama, peran, instansi; nomor WA ditulis sebagian `0812****1234`), Kejadian, Lokasi dengan peta statis kecil, Dampak per kelompok (nilai, "tidak ada", atau "belum didata"), Data khusus, Foto berlencana dengan jam dan koordinat, Asal data (tabel isian ke kutipan atau sumber), QR ke halaman laporan. Kaki: "Badan Nasional Penanggulangan Bencana | Copyright 2026" dan nomor halaman. Label tingkat sumber "Laporan warga, belum terverifikasi" tampil di bawah judul untuk laporan warga dan `bpbd_klaim`.

---

## Lanjutan 19 Nov 2026

Aturan sama: token hanya dari `public/inti/tema.css`, tanpa kapital semua, tanpa titik tengah, tanpa em dash, tanpa emoji, tanpa kalimat kesimpulan di kepala kartu, kartu tidak menempel (jarak 20 px), deretan pilihan penuh lebar dibagi rata dan berikon. Meja mengikuti pola `/bnpb/dalops` (kelas `dl-*` sebagai rujukan, kelas `mj-*` milik meja): peta berkartu, saringan jenis berikon dengan angka, legenda dan bilah ringkasan di dalam peta, tabel di bawah, rincian di `<dialog>`.

### 3. Pesan WA baru

| Kode | Kapan | Isi |
| --- | --- | --- |
| L-VERIF-MINTA | ke kontak BPBD (F1; F0 ke PEMILIK) | `*Mohon verifikasi laporan warga*`, jenis dan desa, kecamatan, kab, waktu kejadian, dua baris kronologi, "Buka dan jawab: <tautan>", "Berlaku 48 jam." |
| L-VERIF-HASIL | ke staf peminta (F1) | `*Verifikasi LA-...*`, "BPBD <kab> menjawab: Benar" atau "Sebagian benar: <koreksi singkat>" atau "Tidak ditemukan", jam jawab |
| L-SETUJU-KABAR | sesudah laporan pertama terkirim | "Mau dikabari bila ada peringatan BMKG atau banyak laporan di sekitar lokasi ini?" `1 Ya`, `2 Tidak`; baris kecil "Ketik berhenti kabar kapan saja." |
| L-KABAR-BMKG | kabar balik BMKG | `*Peringatan BMKG*`, headline BMKG, `_wilayah_`, "Berlaku sampai 14.30 WIB", "Ikuti arahan BPBD setempat. Darurat: 112.", "Sumber: BMKG" |
| L-KABAR-GUGUS | kabar balik gugus (disetujui staf) | `*Laporan warga di sekitar Anda*`, "Ada 4 laporan warga tentang banjir dari sekitar Desa X dalam 3 jam terakhir. Laporan ini belum diperiksa petugas.", "Ikuti arahan BPBD setempat. Darurat: 112." |
| L-TANYA-JAWAB | Mode Tanya ada jawaban | judul topik tebal, label bagian, daftar paling banyak 6 butir, `_Sumber: BNPB, <judul>_` dan tautan; menu `1 Tanya lagi, 2 Lapor` |
| L-TANYA-KOSONG | tidak ada jawaban | "Belum ada panduan resmi untuk pertanyaan itu." lalu `*Topik terdekat:*` `1 ...`, `2 ...`, `3 ...` |
| L-TANYA-LOKASI | pertanyaan keadaan sekarang | "Untuk keadaan di lokasi Anda, lihat Info daerah dan Prediksi, dan ikuti peringatan BMKG." dengan tombol atau nomor ke dua menu itu |
| L-SUSULAN-TANYA | pesan sesudah terkirim | "Tambah ke LA-... atau laporan baru?" `1 Tambah`, `2 Laporan baru` |
| L-SUSULAN-RINGKAS | sebelum kirim susulan | `*Perubahan untuk LA-...*`, baris `Mengungsi: belum didata menjadi 30`, `1 Kirim`, `2 Ubah`, `3 Batal` |
| L-SUSULAN-OK | sesudah susulan | `*Laporan diperbarui*`, `_LA-... versi 2_`, "PDF versi baru menyusul." |
| L-SUARA-DENGAR | transkrip siap | "Saya dengar:", teks dalam kutipan, `1 Benar`, `2 Ulangi` |
| L-SUARA-PANJANG | durasi lebih dari 90 detik | "Pesan suara terlalu panjang. Kirim yang lebih pendek atau tulis." |
| L-FOTO-SAJA | foto tanpa teks | "Foto diterima. Ceritakan kejadiannya dan bagikan lokasi." |
| L-TUGAS | tugas ke penerima | `*Tugas laporan LA-...*`, jenis, kab, "Tenggat 14.30 WIB", tautan atau "Buka di meja" |
| L-INGAT-1, L-INGAT-2 | pengingat | "Tugas LA-... berakhir dalam 1 jam." / "Tugas LA-... lewat tenggat tanpa tindakan." |
| L-RINGKAS-HARI | ringkasan harian ke PEMILIK | teks salin A15 persis, di bawahnya tautan tab Ringkasan |

### 4. Halaman `/lapor/v/<token>` (BPBD)

Satu kolom, mobile-first, tanpa kepala situs penuh (kepala ringkas navy). Kartu "Laporan warga" (jenis, lokasi, waktu kejadian, kronologi tersaring, foto bila ada, label "belum terverifikasi"). Kartu "Jawaban Anda": tiga tombol penuh lebar dibagi rata berikon (Benar, Sebagian benar, Tidak ditemukan); Sebagian benar membuka kotak "Apa yang perlu dikoreksi" (wajib); nama dan jabatan; tombol Kirim jawaban. Sesudah kirim: kartu "Jawaban terkirim, bisa diganti sampai <jam>". Untuk tautan tugas: daftar tugas paket (tiket, jenis, desa, tenggat) dengan tombol Diterima, Sedang ditangani, Selesai per tugas dan kotak catatan. Tautan kedaluwarsa: "Tautan sudah tidak berlaku. Hubungi petugas BNPB untuk tautan baru." Tanpa nama dan nomor pelapor di halaman.

### 5. Layar `/lapor` tambahan

- Tab Tanya: kotak ketik, daftar topik sebagai kartu bergambar (ikon bencana dari registri), jawaban sebagai kartu: judul topik, butir, baris sumber bertautan, nilai 1 sampai 5. Pesan "Belum ada panduan resmi" memakai kartu terpisah dengan tiga topik terdekat sebagai tombol.
- Tombol "Tambah kabar" di halaman laporan terkirim selama jendela susulan; membuka chat dengan konteks tiket dan kartu "Perubahan" sebelum kirim.
- Pilihan "Dikabari bila ada peringatan" (Ya, Tidak) sebagai dua tombol penuh lebar dibagi rata di kartu sesudah laporan terkirim; pengaturan bisa diubah di Bantuan.
- Mode luring: pita atas "Tidak ada sinyal. Laporan disimpan di HP dan dikirim otomatis." (token status peringatan); formulir Laporan cepat satu kartu dengan lima isian (jenis berikon, waktu, lokasi, kronologi, foto) dan tombol Simpan di HP; pita antre.js "belum terkirim" dan daftarnya memakai gaya `.antre-pita` yang sudah ada. Sesudah terkirim: kartu "Terkirim, tiket LA-...".
- Tombol mikrofon dari K21 tetap; ia memakai pengenalan ucapan peramban di web dan tidak melewati jalur suara WA.

### 6. Meja: komponen baru

| Komponen | Keadaan dan catatan |
| --- | --- |
| Kelompok titik | lingkaran berisi angka, warna token status paling mendesak, ukuran tiga langkah; fokus, tekan, nonaktif; legenda memuat "Kelompok titik: angka = jumlah laporan" |
| Pil lapisan | deretan penuh lebar dibagi rata berikon: Peringatan BMKG, Titik panas, Prediksi besok, Batas kab/kota; keadaan nyala memakai token aksen; memuat (putar) dan galat (ikon peringatan dengan `title`) |
| Tanda prediksi | cincin kecil di titik laporan; teks pop-up netral; tanpa warna baik atau buruk |
| Penggeser linimasa | di dasar peta di atas legenda; tombol Putar dan Jeda, pilihan kecepatan sebagai tiga pil, label jam "20 Nov 2026, 14.00"; fokus keyboard, panah menggeser satu jam |
| Panel kab terbanyak | kartu dengan sepuluh baris (nama, angka, bilah kecil) dan chip saringan Kab |
| Chip penanda perhatian | Korban, Foto sah, GPS, Lama belum dibuka, Gugus kuat, Dari BPBD atau terverifikasi, Ada susulan; ikon polos tanpa garis luar; `title` berisi sebab |
| Kolom waktu | Lama dibuka, Lama tindak (format "3 jam 5 menit", "belum"), Tenggat (merah bila lewat tanpa tindakan memakai token bahaya, ditambah ikon dan teks "Lewat tenggat" supaya tidak bergantung warna) |
| Bilah aksi massal | muncul di atas tabel saat ada yang dicentang: jumlah terpilih, Pindah status, Teruskan ke BPBD (nonaktif sebelum F1), Tandai ganda, Batal pilih; hasil per laporan di dialog |
| Kartu gugus | baris di Daftar dan lingkaran di peta: nomor `GL-...`, jenis, desa, jumlah laporan dan pelapor, label "gugus" atau "gugus kuat", tombol Kabari sekitar bila memenuhi ambang (F1) |
| Tab Ringkasan | kartu per provinsi, baris per jenis, tombol Salin teks dan Unduh tabel, penanda versi dan jam dibuat |
| Tab Tugas | tabel tugas saya (tiket, tenggat, status), tombol Selesai |
| Bilah ekspor | gaya `data-ekspor` dalops: Excel, CSV, PDF; ikon unduh |
| Mode layar besar | latar terang, empat angka besar (paling kecil 64 px pada 1920 px, HIPOTESIS), peta penuh, daftar sepuluh teratas dengan jenis, kab, penanda; tanpa nama dan nomor pelapor; kepala berisi jam pembaruan dan tombol Tutup; sesi berakhir memunculkan pita |

Gaya warna status tiket dan bahaya hanya dari token (`--info`, `--accent`, `--warn`, `--brand2`, `--brand-accent`, `--ok`, tanda bahaya dari `tema.css`); tidak ada literal warna baru (gerbang token warna).

### 7. PDF laporan: tambahan

Bagian Verifikasi (hasil terbaru, penjawab, waktu, koreksi), bagian Susulan (daftar versi dengan selisih, tiap angka berlabel versi), kolom Asal bertambah nilai `suara`, `luring`, `susulan`; bagian Foto menampilkan lencana tambahan (Buram, Lama, Mirip foto di LA-...) hanya pada PDF versi staf, bukan PDF yang dikirim ke pelapor.

## Lanjutan 23 Nov 2026 (K90-K92)

### 8. Komponen baru

| Komponen | Tempat | Isi |
| --- | --- | --- |
| Tombol Darurat sekali ketuk | hero `/lapor`, sebaris dengan tombol K77 | Ikon lokasi bersinyal, label "Darurat sekali ketuk", warna `--bad`; ketuk sekali, tanpa dialog konfirmasi |
| Layar sesudah ketuk | layar penuh | Tiga tombol `tel:` besar bertumpuk (112, 117, BPBD), status kirim di atasnya, tombol "Lengkapi laporan" di bawah |
| Kartu Kabar selamat | menu dan beranda (Q68) | Dua pilihan besar "Selamat" dan "Selamat, butuh bantuan"; langkah kode sekali pakai seperti `/masuk` |
| Halaman tautan selamat | `/lapor/s/<token>` | Nama panggilan besar, status berikon, waktu, kab/kota; tanpa peta |
| Chip meja | `/lapor/meja` | "Sekali ketuk", "Pelapor belum dikenal", "Orang dicari", "Ada kabar selamat dari nomor ini", "Lokasi dari poster desa" |
| Poster desa | cetak A4 | Kepala navy dengan logo BNPB dan KRIS, judul desa, QR besar di tengah, alamat tautan utuh di bawah QR, tiga langkah berikon, nomor 112, 117, dan BPBD; token dari `public/inti/tema.css` |

Teks lewat skill `bahasa-indonesia-plain`. Tanpa huruf kapital semua, tanpa kata "aman".
