# DESIGN-SYSTEM: Akun BPBD dengan profil PIC

Dasarnya halaman `/instansi` yang ada (`public/instansi.html`, `public/instansi.css`) dan token `public/inti/tema.css`. Paket ini tidak membuat palet, tidak membuat gaya baru di tingkat layar, dan tidak menambah literal warna di `public/**/*.css` (gerbang `tests/agen/gerbang-token-warna.test.mjs`). Urutan bangun: token yang ada, element, blok, baru layar (`AGENTS.md` 3.9).

## 1. Berkas baru

| Berkas | Isi |
| --- | --- |
| `public/instansi_profil.css` | gaya blok profil (`.pf-*`), hanya memakai properti kustom dari `tema.css` |
| `public/instansi_profil.js` | layar L2 sampai L6, panggilan API profil, dialog PIN, pengubah ukuran foto |
| `public/admin/instansi_profil.js` | blok admin L7 (disisipkan ke `public/admin/instansi.js` lewat satu pemanggil) |

Tidak ada folder baru. `instansi.html` memuat dua berkas pertama dengan `defer` sesudah `instansi.js`.

## 2. Token yang dipakai (semua sudah ada di `tema.css:3-20`)

| Keperluan | Token |
| --- | --- |
| Latar halaman, kartu, permukaan | `--paper`, `--card`, `--surface` |
| Teks utama dan kedua, garis | `--ink`, `--ink2`, `--line` |
| Aksi utama, kepala gelap | `--brand`, `--brand2`, `--head-bg`, `--on-head` |
| Status: aktif, menunggu, ditolak atau terkunci | `--ok` dan `--ok-tx`, `--warn` dan `--warn-tx`, `--bad` dan `--bad-tx` |
| Info dan fokus | `--info`, `--info-tx` (`:focus-visible` sudah di `inti/gaya.css:6`) |
| Jarak | `--jr-1` sampai `--jr-7` (4 sampai 32 px) |
| Sudut | `--r` 16 px untuk kartu, `--r-sm` 10 px untuk bidang isian, `--r-pill` untuk pil |
| Ukuran huruf | `--fs-3` sampai `--fs-8`; huruf `--font` dan judul `--display` |
| Bayangan | `--shadow` |
| Tinggi kontrol | `--h-ctl` 40 px; area ketuk foto profil minimal 96 px |

Mode gelap sudah ditangani `tema.css:24-35`; blok profil tidak menyatakan warna sendiri, jadi ikut otomatis.

## 3. Element

| Element | Aturan |
| --- | --- |
| `.pf-foto` | lingkaran (`border-radius: var(--r-pill)`), `object-fit: cover`, sisi 96 px di kisi pilih, 56 px di kepala kerja, 40 px di daftar admin. Bila tanpa foto: lingkaran `--surface` berisi dua huruf awal nama, huruf `--display`, bukan ikon generik |
| `.pf-nama`, `.pf-jabatan` | nama `--fs-5` tebal 700, jabatan `--fs-3` `--ink2`; dipotong satu baris dengan elipsis, nama penuh di atribut `title`; teks ditulis huruf kecil kalimat biasa, tidak ada `text-transform: uppercase` |
| `.pf-pil` status | pil memakai komponen pil yang ada (`pil(...)` di layar admin); `aktif` hijau, `menunggu` kuning, `ditolak` dan `terkunci` merah, `draf` abu. Selalu ada teks di samping warna |
| Kotak PIN | enam kotak `input` satu angka (`inputmode="numeric"`, `autocomplete="one-time-code"` dilarang karena bukan kode kiriman; pakai `autocomplete="off"`), `type="password"` agar tersamar, tinggi `--h-ctl` ke atas, lebar sama, fokus pindah otomatis, tempel enam angka diterima. Sudut `--r-sm` |
| Tombol ikon | polos tanpa garis luar dan tanpa kotak (memori "ikon tanpa garis luar"): ganti profil, tampilkan PIN, kamera. Bidang ketuk minimal 44 px, `aria-label` selalu ada |
| Tombol aksi | `.lp-tombol` yang ada (`instansi.css:22`), `.utama` untuk satu aksi pokok per layar |
| Pesan galat | `#pesan.lp-pesan` yang ada, `role="status"`, kalimat plain tanpa menyalahkan (lihat bagian 6) |

## 4. Blok dan layar

Semua layar tunduk pada `AGENTS.md` 3.5: kartu `.ex.ex-std` untuk bagian laporan dan admin; kepala kartu berupa nama seksi berikon (bukan kalimat temuan); tanpa kalimat kesimpulan; kartu berjarak 20 px (`.ex+.ex`). Layar penuh ala masuk (L1 sampai L3) memakai bentuk `.in-masuk` yang sudah ada di `instansi.html:44`, bukan kartu laporan.

| Kode | Layar | Susunan |
| --- | --- | --- |
| L1 | Masuk akun | formulir `#fMasuk` yang ada; tautan "Masuk dengan nomor WhatsApp" di bawahnya dihapus untuk akun pemda dan diganti kalimat "BPBD masuk dengan username dan sandi lembaga" (jenis akun lain tetap) |
| L2 | Siapa yang bekerja | judul "Pilih profil" berikon; kisi `repeat(auto-fit, minmax(140px, 1fr))` gap `--jr-5` (20 px); tiap sel: tombol besar berisi `.pf-foto` 96 px, `.pf-nama`, `.pf-jabatan`. Maksimal 4 sel. Profil terkunci: foto redup (`opacity` .55), teks "terkunci sampai 14.35" (jam WIB); sel tetap fokus dan bisa diklik untuk membaca alasannya. Tombol "Keluar" polos di sudut |
| L3 | Dialog PIN | modal `<dialog>`; kepala: `.pf-foto` 56 px dan nama; enam kotak PIN; tombol ikon "tampilkan"; pesan galat di bawah kotak; tombol "Masuk" `.lp-tombol.utama` aktif bila enam angka terisi; Esc atau tombol kembali menutup dan fokus kembali ke sel foto yang tadi diklik |
| L4 | Daftarkan PIC (akun belum aktif) | tiga sampai empat kartu profil `.ex.ex-std` dalam satu kolom (dua kolom di layar lebar, kolom tak ada yang menggantung kosong, `AGENTS` memori "tanpa ruang kosong"); tiap kartu berkepala "PIC 1" berikon, berisi foto 96 px dengan tombol kamera dan galeri, bidang nama, jabatan, NIP, email, no. HP, dan satu tombol "Atur PIN" bila PIN belum ada. Pil kelengkapan "lengkap" atau "kurang foto, PIN". Di bawahnya kartu "Dokumen" (surat tugas, kartu pegawai) memakai blok unggah yang ada, lalu tombol "Kirim untuk disetujui" |
| L5 | Menunggu persetujuan | satu kartu bernama "Status pengajuan" dengan pil `menunggu` atau `ditolak` dan alasan penolakan bila ada |
| L6 | Kepala kerja | di kepala `/instansi` (sudah ada), `.pf-foto` 40 px, nama dan jabatan profil, tombol ikon "Ganti profil" dan "Keluar". Menu "Log" membuka kartu "Log lembaga" (tabel `.ex-tabel`: waktu, siapa, tindakan) |
| L7 | Admin (`/admin/instansi`) | di kartu rincian akun yang ada, seksi "Profil PIC" berikon: baris per profil dengan foto 40 px, nama, jabatan, NIP, email, HP (HP dan email tersamar sampai tombol "Tampilkan", `AGENTS` pola lapor-meja), pil status, dan tombol ikon polos: setuju, cabut, atur ulang PIN, buka kunci. Seksi "Log profil" tabel berhalaman. Penggantian teks undangan dan CSV di `public/admin/instansi.js:112-114` |

## 5. Interaksi dan INP

`~/.claude/INP.md` berlaku: klik foto profil dan Masuk PIN tidak boleh membekukan layar. Chrome (nonaktifkan tombol, `aria-busy`, "Memeriksa…") diterapkan urgent; panggilan jaringan dan render kisi memakai `sesudahCat` seperti `sibukAkun` di `public/admin/instansi.js:97`. Pengubah ukuran foto memakai `createImageBitmap` dan `canvas.toBlob` (Baseline Widely available; cek ulang lewat skill `modern-web-guidance` saat tiket PF-03 dikerjakan, wajib sebelum menulis pola UI apa pun) dan tidak berjalan di utas klik. Dialog memakai elemen `<dialog>` bawaan dengan `showModal()`; tidak ada pustaka.

## 6. Bahasa

Semua teks lewat skill `bahasa-indonesia-plain`, dinilai RASA sebelum selesai. Contoh dasar:

| Situasi | Teks |
| --- | --- |
| PIN salah | "PIN belum cocok. Coba lagi." (bukan "Autentikasi gagal") |
| Terkunci 15 menit | "Profil ini dikunci sementara. Bisa dicoba lagi pukul 14.35." |
| Terkunci admin | "Profil ini dikunci. Hubungi admin BNPB untuk membukanya." |
| Profil belum ber-PIN | "Buat PIN 6 angka untuk profil ini. PIN hanya kamu yang tahu." |
| Sandi lembaga baru | "Sandi ini dipakai bersama oleh semua PIC. Simpan di pengelola sandi bersama; tidak akan tampil lagi." |
| Belum 3 PIC | "Daftarkan 3 PIC sebelum mengirim. Baru ada 2." |
| Menunggu | "Pengajuan sedang diperiksa admin BNPB." |

Tanpa titik tengah sebagai pemisah, tanpa teks semua huruf kapital, tanpa kata "Pantau Bencana" (pakai Centurisk97 bila perlu menyebut nama sistem), sapaan "kamu" untuk PIC.

## 7. Aksesibilitas

Kisi profil adalah daftar tombol dengan nama aksesibel "Pilih profil Budi Santoso, Kepala Pusdalops". Dialog PIN menahan fokus, pesan galat `role="status"` dibacakan, foto berisi `alt=""` karena nama sudah di teks. Kontras memakai pasangan `--ink` di atas `--card`. Tidak ada informasi hanya lewat warna (pil selalu bertulisan). Target ketuk minimal 44 px.

## 8. Wireframe L2 dan L3

```
+--------------------------------------------------+
|  [logo]  Centurisk97          BPBD Prov. Sumbar  |
+--------------------------------------------------+
|  Pilih profil                                    |
|                                                  |
|   (foto)        (foto)        (foto)   (foto)    |
|   Rina Putri    Budi S.       Andi M.  Sari D.   |
|   Kepala Bid.   Operator      Analis   Staf      |
|                                                  |
|                                       [Keluar]   |
+--------------------------------------------------+

+------------------------------+
|  (foto 56)  Rina Putri       |
|             Kepala Bidang    |
|                              |
|   [ ][ ][ ][ ][ ][ ]   (mata)|
|   PIN belum cocok. Coba lagi.|
|   [          Masuk         ] |
+------------------------------+
```
