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
