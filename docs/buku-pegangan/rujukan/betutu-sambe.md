Ayam betutu Bali · dapur pusat dan outlet

# Buku Pegangan Betutu Sambe

Semua selera dan keputusan pemilik yang berlaku di app Betutu Sambe, di satu tempat. Yang baru diputus masuk ke Riwayat, lalu ke bagian aturannya.

Disegarkan 8 Okt 2026\
commit 1a15fa3

[Riwayat perubahan](#riwayat) [Keputusan pemilik](#keputusan) [Merek & warna](#merek) [Susunan menu](#menu) [Standar tabel](#tabel) [Selera tampilan](#tampilan) [Pola data & uang](#pola) [Gerbang penjaga](#gerbang) [Cara halaman ini diperbarui](#pembaruan)

Terbaru di atas

## Riwayat perubahan

Vonis dan perubahan selera per tanggal. Kutipan miring adalah kata-kata pemilik saat menegur.

1. 8 Okt 2026
   - **Pesan WA ke pelanggan ramah dan berikon**, seperti siaran PO: sapaan nama, item, hari PO, link lacak dengan kalimat penjelas, ajakan ulasan, penutup IG dan TikTok. Aturan ikon formal berlaku untuk tampilan app, bukan isi teks `wa.me` (pengecualian tercatat di gerbang `ikon-formal`).
2. 5 Okt 2026
   - **Matah in jar** = 6 porsi sambal matah + toples 200 ml + stiker. HPP-nya dihitung dari susunan itu.
   - **Extra ayam suwir** = 1/7 ekor ayam, bumbu seperti paket, tanpa kemasan. Tidak lagi disamakan dengan potongan ayam Rp 8.874.
   - **Sambe 4 dan Sambe 5 dapat sambal matah.** Sumber HPP: `HPP Betutu Sambe (1).xlsx`.
3. 4 Okt 2026
   - **Semua pesanan online diantar**: "ambil sendiri" dihapus dan aturan antar mulai 30 porsi gugur. Alamat wajib, titik GPS opsional, ongkir dikonfirmasi admin (spec §17).
   - **Bayar online hanya transfer bank atau tunai saat diterima.** QRIS statis keluar dari jalur online, kasir tetap boleh memakainya.
   - **Kode promo dihapus dari checkout publik**; promo tetap ada di kasir dan back-office.
   - **`/pesan` jadi empat langkah**: hari dan data pemesan, pilih menu, alamat antar, konfirmasi dan bayar. PO dibuka tiap Selasa dan Jumat, batas H-1 pukul 15.00 WIB.
4. 3 Okt 2026 (sore)
   - **Paritas layar dengan Gemah Ripah**: tiap layar BS dipasangkan dengan layar GR, kekurangannya wajib dibereskan sebelum pemilik menemukannya sendiri (spec §20). Grup Bulan › Minggu dan kelompok kategori dipasang di Pesanan, Mutasi, Pembayaran, Invoice, Kas kecil, dan PO.
   - **Baris daftar diklik membuka rincian** di semua tabel daftar (`barisKlik`).
   - **Kolom jumlah barang dipecah dua**: Jumlah dan Satuan.
   - **Nol kapital penuh ikut berlaku di dokumen cetak**, tanpa pengecualian kop. Dijaga gerbang baru `caps-layar`.
   - **Ikon promo dan ikon hadiah loyalitas dipisah**: satu ikon tidak pernah dua arti.
   - **Halaman `/lacak` dan `/absen`** masuk daftar halaman publik yang dijaga tetap ringan.
5. 3 Okt 2026
   - **Zona waktu WIB** (`Asia/Jakarta`), bukan WITA walau usahanya di Bali.
   - **Supabase paket Free** (proyek "Betutu-Sambe"). Cadangan harian lewat modul cadangan sendiri.
   - **Super Admin hanya Dewa Made Agung.** Pande Andhi tidak ikut, beda dengan Gemah Ripah.
   - **WA Fonnte dan Anthropic tidak dipakai.** AI jalan lewat Groq dan Gemini. Pesan WA dikirim manual lewat tautan `wa.me`.
   - **Empat jalur jual**: kasir outlet, ojol, link pesan online, katering. **Dapur pusat + outlet**, tiap transaksi membawa `lokasi_id` sejak hari pertama.
   - **Resep dua tingkat**: menu terdiri dari komponen, komponen terdiri dari bahan. **HPP mengikuti sheet** (angka tetap bertanggal per komponen) sampai rincian bahan diisi.
   - **Lima fitur kritikal diterima**: kuota ayam dan batas jam, rekonsiliasi ojol, piutang korporat dan katering, WA sekali klik, situs publik. **Yield dan susut ditolak, frozen batch dan kedaluwarsa ditolak.**
   - **Situs publik dan `/pesan` tiga langkah** menggantikan Google Form pre-order. Batas pesan H-1 pukul 15.00 WIB. Antar mulai 30 porsi.
   - **Login meniru pangantara**: label dalam kotak isian.
   - **Warna kokpit marun tua #8A1C1F**, bukan merah logo yang menyala. Merah logo #D41217 hanya di logo dan situs publik.
   - **Menu & Resep di depan Pesanan** menu dan harga adalah hulu semua pesanan.
   - **Dashboard sepadat Gemah Ripah**: KPI bisa diklik, pembanding periode, kartu lipat, tab sebaris.
   - **Laporan dikelompokkan per minggu dan per bulan.**
   - **Daftar item tanpa titik jadi sel ringkas + popup rincian.**
   - **Tabel kosong tetap tergambar**: kepala kolom plus satu baris "Belum ada …".
   - **Paritas dengan "Dashboard Penjualan" xlsx pemilik**: tiap bagian sheet dipetakan ke BS, yang belum ada wajib dibangun (spec §18).
   - **Fitur gelombang 2 digas** "oke gas semua": notifikasi pesanan baru, ulasan, langganan kantor, kode promo, loyalitas, absensi dan gaji staf dapur.

CLAUDE.md

## Keputusan pemilik

Yang sudah diputus tidak dibuka lagi tanpa pemilik. Yang belum diputus jangan ditebak.

Diputus

**Merek**

Kokpit marun tua #8A1C1F solid, krem #F7EBDC aksen, latar netral terang. Merah logo #D41217 hanya logo dan situs publik (3 Okt 2026).

Diputus

**Peran**

owner · admin (pesanan dan kasir) · dapur (produksi dan stok) · finance. Super Admin = owner berjabatan `super_admin`, satu orang: Dewa Made Agung.

Diputus

**Zona dan infrastruktur**

WIB. Supabase Free. WA otomatis dan Anthropic tidak dipakai, AI lewat Groq dan Gemini.

Diputus

**Satu repo per usaha**

Branch cuma `main`. Fondasi disalin dari Gemah Ripah; domain toko supplier dan konsep MBG tidak ikut.

Diputus

**Empat jalur jual**

Kasir outlet, ojol, link pesan online, katering. Katering = total paket ≥ 10 box.

Diputus

**HPP dan food cost**

HPP dibekukan per item saat jual. HPP menu dihitung dari komponennya. Food cost = HPP / penjualan bersih, target 35%.

Diputus

**Komisi ojol**

Biaya terpisah, persen per platform dari Pengaturan. Bukan pemotong omzet.

Diputus

**Cetak dan bayar**

Sticker per box di lembar A4, struk thermal tidak di v1. Pembayaran QRIS statis tanpa gateway di kasir, jalur online transfer atau tunai; katering boleh DP.

Diputus

**Akuntansi ikut v1**

Jurnal otomatis, PPh final UMKM. Buku Pegangan ini artifact BS sendiri, bukan milik Gemah Ripah.

Diputus

**Ditolak pemilik**

Yield dan susut ayam, frozen batch dan kedaluwarsa (3 Okt 2026). Jangan dibangun.

Diputus

**Pesan online**

`/pesan` empat langkah, PO tiap Selasa dan Jumat, batas H-1 15.00 WIB. Semua diantar, bayar transfer atau tunai saat diterima, tanpa kode promo (4 Okt 2026). Harga selalu dari tabel `menu`, bukan dari klien.

Diputus

**Susunan add-on dan HPP**

Matah in jar = 6 porsi matah + toples 200 ml + stiker. Extra ayam suwir = 1/7 ekor, bumbu seperti paket, tanpa kemasan. Sambe 4/5 dapat sambal matah. Sumber `HPP Betutu Sambe (1).xlsx` (5 Okt 2026).

Belum diputus

**Komisi tiap platform ojol**

Diisi pemilik di Pengaturan.

Belum diputus

**Status data impor xlsx**

Pesanan "Baru" bertanggal lewat diimpor sebagai selesai tanpa bayar supaya piutang terlihat. Pemilik belum memeriksanya.

app/globals.css

## Merek & warna

Navy pangantara dan hijau-emas Gemah Ripah tidak berlaku di sini. Merah logo dipakai sebagai identitas; kokpit memakai marun supaya tidak menyala.

Marun kokpit#8A1C1F · chrome back-office

Merah logo#D41217 · logo dan situs publik

Krem aksen#F7EBDC

Marun lebih tua#6E1518 · fokus, hover

Latar terang#F5F5F4

Latar gelap#181515

lib/nav-menu.ts

## Susunan menu

Sepuluh menu, dipecah 5 + 5. Menu & Resep di depan Pesanan karena menu dan harga adalah hulu semua pesanan.

1. Dashboard
2. Menu & Resep
3. Pesanan
4. Dapur
5. Pengantaran
6. Pelanggan
7. Stok & Pembelian
8. Uang
9. Laporan
10. Admin

- Baris atas: Dashboard, Menu & Resep, Pesanan, Dapur, Pengantaran. Baris bawah: Pelanggan, Stok & Pembelian, Uang, Laporan, Admin.
- Ikon menu dibaca dari registri konsep `lib/ikon-status.ts`. Ikon nav sebuah modul sama dengan ikon tab dan legendanya.
- `/admin` tidak boleh disembunyikan (`NAV_WAJIB`), supaya pemilik tidak terkunci di luar.
- Admin: Pengguna, Tampilan, Pengaturan, System Health, Audit Log, Cadangan, impor xlsx.
- Situs publik `/` dan `/pesan` berada di luar menu. Staf yang sudah masuk tetap melihat situs publik; kokpit ada di `/dashboard`.
- Link bertoken tanpa login: `/pesan/<token>`, `/lacak/<token>`, `/kurir/<token>`.

docs/STANDAR-TABEL.md

## Standar tabel

Standar disalin dari Gemah Ripah (vonis 27 Sep 2026). Tiap tabel `.table-app` wajib memenuhi dua belas baris ini, ditambah dua vonis BS di bawahnya. Kepala tabel merah marun solid (`--color-primary`).

| No | Aturan | Caranya |
| --- | --- | --- |
| 1 | Kolom No paling kiri, rata tengah | `sel-nomor` |
| 2 | Semua kolom bisa di-sort | `SortTh` |
| 3 | Uang: "Rp" kiri, angka kanan, minus di slot tetap, nol redup | `RpTd` / `RpCell` |
| 4 | Persen satu desimal, tanda di slot tetap | `PersenSel` |
| 5 | Tanggal di slot tetap, lurus vertikal | `TanggalSel` |
| 6 | Desimal seragam per kolom | `fmtAngkaTetap` / `Qty` |
| 7 | Status = ikon polos + satu legenda satu baris | `IkonStatus` + `LegendaTabel` |
| 8 | Baris grup: latar muda, seluruh baris diklik, subtotal per kolom, nol hitungan | `BarisGrupTabel` |
| 9 | Baris total di kaki tabel | `BarisTotalTabel` |
| 10 | Rapat 12px, satu baris per sel, nol "…" | `.table-app`, teks panjang `sel-bungkus` |
| 11 | Muat satu tampilan di 1280px, maksimal 12 kolom tampak | kolom sekunder ke rincian |
| 12 | Kode dalam pil, nama tidak tebal | `KodePil` |
| 13 | Tabel kosong tetap tergambar: kepala kolom + satu baris "Belum ada …" | `TabelKosong` / `BarisKosong` |
| 14 | Daftar item tanpa titik jadi sel ringkas + popup rincian | `SelDaftarPopup` |

Memori selera-tabel-ui

## Selera tampilan

Hal-hal yang ditegur berulang di Gemah Ripah dan dibawa ke sini. Jadikan checklist sebelum menyerahkan tampilan apa pun.

### Ikon & legenda

- Satu registri konsep › ikon. Satu ikon tidak pernah dua arti.
- Ikon formal: simbol netral atau benda harfiah. Nol gestur tangan, pesta, makhluk imut. Berlaku untuk tampilan app; isi pesan WA ke pelanggan boleh ramah berikon.
- Tiap ikon di tabel masuk legenda, termasuk Aksi. Semua legenda satu baris.
- Tiap opsi tab, sakelar, dan mini tab berikon.
- Tempo tunai = ikon berlegenda, tidak pernah kata "Tunai".

### Teks

- **Nol teks kapital penuh** di layar maupun kertas, kecuali logo. Sudah empat kali divonis di Gemah Ripah. Kop dokumen cetak tidak dikecualikan.
- Nama menu dari xlsx dan PDF wajib dirapikan jadi Title Case. Jangan pakai CSS `uppercase`.
- Singkatan resmi tetap boleh kapital.
- Satu masakan satu nama. Label, bahan, dan lauk tidak menempel di nama menu.

### Toolbar & saringan

- Toolbar = search + ikon (folder, Excel, PDF, tambah) saja.
- Tiap tab bertabel punya search + Excel + PDF sebaris. Excel selalu berpasangan PDF.
- Link langsung dibuka, nol tombol salin.
- Filter yang cuma menyaring tabel yang sama ditolak. Cukup search + ikon kolom berlegenda.
- Nol tab "Semua"; urutan tab = urutan proses.

### Dashboard & KPI

- Sepadat Gemah Ripah: KPI bisa diklik ke rincian, pembanding periode, kartu lipat, tab sebaris.
- Ringkasan putih satu warna, tanpa pastel, tanpa tombol ekspor.
- Tile sebaris mengisi penuh lebar. Tile tanpa data dihapus, bukan "—".
- Nol lencana hitungan di kepala kartu. Hitungan cuma boleh di tab.
- Angka dibaca dari satu sumber (`v_pesanan_angka`), tidak dihitung ulang per tab.

### Tabel & grup

- Satu tabel per tampilan; kelompok = baris grup lipat di dalamnya.
- Grup tanggal per minggu, label "14–20 Sep 2026" tanpa "Minggu 38". Laporan juga per minggu dan per bulan.
- Data berbaris = tabel, bukan grid kartu.
- Tabel kosong tetap tergambar, bukan EmptyState besar.
- Daftar item tanpa titik dirangkum jadi satu sel, rincian di popup.
- Baris daftar diklik membuka rincian.
- Jumlah barang dua kolom: Jumlah dan Satuan.

### Login, form & popup

- Login meniru pangantara: label dalam kotak, ring fokus netral, warna merek solid.
- Label di atas input, tinggi input seragam, tanpa "(opsional)".
- Nol gulir samping di popup; lebarkan popup-nya.
- `/pesan`: hari dan data pemesan dulu, lalu menu, empat langkah (4 Okt 2026), jempol-first, target sentuh minimal 44 px, harga dan total selalu tampak.

### Warna

- Warna solid, nol gradien. Kolom sticky persis sewarna kepala.
- Latar kokpit netral terang, bukan krem di atas krem. Terang dan gelap sama-sama dijaga.
- Marun untuk kokpit, merah logo hanya logo dan situs publik.

docs/ARSITEKTUR.md · spec.md

## Pola data & uang

Penjagaan hidup di database, bukan di tampilan.

- Tiga lapis penjagaan: `middleware.ts` mengarahkan, `requireStaff()` di tiap route, RLS dan trigger di DB.
- Satu peta peran `PAGE_ACCESS` dibaca nav dan guard. Halaman baru wajib didaftarkan, bawaannya ditolak.
- Tiap transaksi membawa `lokasi_id`. Admin dan dapur hanya melihat lokasinya; owner dan finance melihat semua.
- Harga dan HPP dibekukan di `pesanan_item` saat insert. Mengubah harga menu tidak mengubah item lama.
- Status pesanan hanya maju lewat RPC `ubah_status_pesanan`: baru, diproses, siap, terkirim, selesai, ditambah batal. Status bayar diset trigger dari jumlah pembayaran.
- Penjualan bersih = Σ(qty × harga) − diskon. Komisi ojol dan ongkir ditanggung adalah biaya, bukan pemotong omzet. Satu rumus: `angka_pesanan`.
- Pembayaran tidak boleh melebihi tagihan. Pesanan berbayar tidak bisa dihapus atau dibatalkan. Invoice `BS-YYMMDD-NN` mengunci item.
- Stok tidak boleh minus dan turun lewat trigger. PostgREST memotong di 1000 baris tanpa error, jadi `ambilSemua()`.
- Pesan online ditolak DB bila melewati kuota ayam atau batas jam. Staf boleh menimpa dengan alasan tercatat.
- Data dummy terpisah (`is_dummy`), tombol isi data dummy sejak awal, Super Admin saja.
- Keputusan data pemilik dicatat sebagai migrasi berkomentar alasan, bukan update diam.

tests/unit/gerbang-\*.test.ts

## Gerbang penjaga

Aturan tanpa gerbang mekanis dianggap belum jadi. Gerbang ini menolak commit yang melanggar.

`standar-tabel``selera``kolom-tabel``tanpa-gradien``strip-tanpa-semua``ikon-literal``ikon-formal``ikon-peran``ikon-strip``istilah-invoice``salin``kpi-tile``periode-dua-baris``legenda-tanpa-chip``sel-tanpa-titik``tabel-kosong``caps-layar``urutan-blok``isian-angka``rumah-ekspor``batas-klien``inp-transisi``dummy``dummy-layar``test-integrasi``penjaga-definisi``cron-katalog``analytics-token``noindex``deploy``berkas-kosong``model-agent``ilmu-agent`

docs/BUKU-PEGANGAN/ROUTINE.md

## Cara halaman ini diperbarui

Routine `pembaru-buku-pegangan-bs` jalan tiap malam pukul 21.43 WIB di Mac mini. Ia memeriksa apakah sumber selera berubah sejak stempel di kop: memori pemilik, `CLAUDE.md`, `docs/STANDAR-TABEL.md`, `docs/usulan/betutu-sambe-v1/spec.md`, `lib/nav-menu.ts`, dan gerbang. Kalau ada, ia menambah entri Riwayat, menyesuaikan bagian aturannya, lalu menerbitkan ulang ke alamat yang sama. Hari tanpa perubahan dilewati tanpa menulis apa pun.

Sumber halaman: `docs/BUKU-PEGANGAN/buku-pegangan-bs.html` di repo Betutu Sambe. Kanon selera lengkap tetap di `.claude/skills/selera-pinka/`, dipakai bersama pangantara.