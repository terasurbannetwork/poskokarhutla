Toko supplier telur · ayam · susu

# Buku Pegangan Gemah Ripah

Semua selera dan keputusan pemilik yang berlaku di app Gemah Ripah, di satu tempat. Yang baru diputus masuk ke Riwayat, lalu ke bagian aturannya.

Disegarkan 4 Okt 2026\
commit 05afcc2

[Riwayat perubahan](#riwayat) [Keputusan pemilik](#keputusan) [Merek & warna](#merek) [Susunan menu](#menu) [Standar tabel](#tabel) [Selera tampilan](#tampilan) [Pola data & uang](#pola) [Gerbang penjaga](#gerbang) [Cara halaman ini diperbarui](#pembaruan)

Terbaru di atas

## Riwayat perubahan

Vonis dan perubahan selera per tanggal. Kutipan miring adalah kata-kata pemilik saat menegur.

1. 4 Okt 2026
   - **SO #389 diputus**: Warung Gianyar digabung ke SPPG Gianyar, Sapat Ubud digabung ke Tegalalang. Daftar "Belum diputus" kini kosong.
   - Invoice: penanda tangan admin tanpa jabatan; rekening BCA 2060730001.
2. 3 Okt 2026
   - **Nol label berbentuk tulisan** "Gw gamau ada label yang bentuknya tulisan. Agar semua pakai icon". 41 chip teks di registri ikon (UMKM, jenis akun, peran, jenis driver, aktivasi pemasok, sakelar) kini berikon sendiri. "Baru" = 🆕. Kategori yang berulang per baris lebih baik jadi sub-grup lipat.
   - **Rp kiri angka kanan berlaku juga di kertas** "Lu catet lah". Dokumen cetak lewat `NilaiDok`: tabel, baris total, BlokTotal, DaftarInfo.
   - Dokumen cetak: kepala tabel rata tengah, tabel bersudut bulat, qty dua kolom Jumlah | Satuan, alamat berikon 📍, telepon berlogo WA tanpa kata "Telp/WA", nomor SO tidak patah baris, nomor halaman PKS kanan bawah.
   - **Isian bertipe angka hanya menerima angka**: NPWP, no. rekening, NIK. Daftar baku (bank) = dropdown `PilihBank`, bukan ketik bebas.
3. 1 Okt 2026
   - **Urutan blok halaman baku**: Ringkasan, lalu Periode, lalu bar cari "Ringkasan di atas period picker".
   - Legenda tidak mengulang status yang sudah dinamai chip di strip saringan "ngapain ada di legenda?". Legenda juga tidak memuat entri cara pakai seperti klik baris.
   - Tanda minus di sel angka kembali di slot tetap tepi kiri sel, digit tetap rata kanan.
   - Legenda yang tak muat turun baris, tidak pernah terpotong.
   - Tabel di modal dan kartu bersudut bawah membulat.
   - Tombol buat draf PO di baris grup jadi ikon aksi bergaris, bukan tombol tambah.
   - Ikon distandarkan formal ulang: robot, pesta, cuaca, dan orang dibuang.
   - **Tempo per segmen dicabut**. Tempo diatur per pelanggan dengan tiga model: n hari, tanggal bulanan (boleh beberapa), atau mingguan. Beli tepat di hari bayar ikut siklus berikutnya.
   - **Stok awal sekali pakai**, diketik owner per barang; saldo lama ditutup dan dibekukan. Barang lewat (tanpa stok) tidak diperiksa stok cukup.
   - Harga pasar dicabut utuh dari PO (tab, kolom banding, tabel DB).
4. 29 Sep 2026
   - **Kata "faktur" dihapus dari semua teks yang terlihat**, cukup "invoice" "Intinya ga akan ada faktur lagi. Cukup invoice." "Faktur Pajak" tetap, itu dokumen pajak yang lain.
   - **Nol tombol salin untuk link**. Link langsung dibuka "Kalo dia link ya langsung buka." Pengecualian cuma kredensial akun baru di Admin › Pengguna.
   - **Pemasok keluar dari PO Supplier jadi menu sendiri**, membawa Katalog. Nav kembali 5 + 5 "ga simetris".
   - **Nol status "sebagian"**. Invoice cuma Belum atau Lunas; PO wajib diterima lengkap, kiriman kurang = ubah qty PO dulu. Keduanya dikunci di database.
   - Retur dipecah ke rumah tiap jenis: PO › Retur (ke supplier), Order › Retur (dari pelanggan), Stok › Barang Rusak.
   - Bar cari di tab bertabel wajib lengkap: kotak cari + Excel + PDF, nol tombol berteks.
   - Tile Ringkasan: ikon dan label sebaris di kepala, angka rata tengah, persen naik/turun sebaris angka. Tile berpembanding tampil dua kolom berlabel (periode kini | periode lalu).
   - Invoice di Dashboard berkelompok kategori › wilayah › pelanggan.
   - Menu **Pengantaran dicabut**. Driver dan Peta Live jadi mini tab di Order.
   - **Ikon wajib formal**. Nol ikon pesta, minuman, makhluk imut, dan semua gestur tangan. "masa gelas wine gitu". Ikon peran dan pekerjaan tetap boleh.
   - Status pelanggan jadi kotak warna, bukan kiasan cuaca atau alam. Gaji pakai 💰, bukan dompet.
   - **Nol slider di deret tile popup**. Kalau tile tidak muat, popup-nya yang dilebarkan (max-w-5xl).
   - Legenda tidak mengulang label yang sudah tertulis di baris grup.
   - Admin › Dokumen jadi tab sendiri, tidak lagi mini tab di Tampilan.
   - Invoice memakai tab tahap proses ala pangantara (tunggakan, daftar, terbit, verifikasi, lunas) dengan periode mingguan.
   - Dialog konfirmasi bersama dirapikan: teks rata kiri, subjek tebal, poin akibat.
5. 28 Sep 2026
   - **Warna solid, bukan gradien**. Kepala dan kaki tabel, tombol utama, tab aktif, kepala modal: satu warna hijau hutan.
   - **Nol tab "Semua"** di strip status. Urutan tab = urutan proses; bawaan = tahap paling awal yang berisi.
   - Order berproses: draf › setujui › proses › kirim › dikirim › selesai, statusnya di-set trigger.
   - Persetujuan bayar keluar meniru pangantara: diajukan, disetujui, jumlah beku saat diajukan.
   - Admin › Master Data dicabut. Barang ke Stok, vendor ke PO › Pemasok.
   - Kolom tren mini di tabel dashboard pindah ke popup lewat ikon di kolom Aksi.
6. 27 Sep 2026
   - **Semua tabel disamakan ke tabel Top Produk** "banyak tabel ga standar". Lahir `docs/STANDAR-TABEL.md` dan gerbangnya.
   - **Semua terlihat dalam satu tampilan** di layar 1280px. Maksimal 12 kolom tampak; kolom sekunder ke rincian atau ekspor.
   - Susunan menu baru disetujui: urut alur usaha, Pembayaran dikelompokkan per tujuan bayar, piutang ke Invoice, mutasi bank ke Akuntansi.
   - **Nol filter Aktif/Arsip** di halaman mana pun. Arsip cuma di Admin › Arsip.
   - Tiap ikon di tabel wajib masuk legenda, termasuk ikon kolom Aksi. Tiap opsi tab dan sakelar wajib berikon.
   - Tile KPI sebaris mengisi penuh lebar, tanpa ruang kosong. Tile tanpa data dihapus.
   - Pemilik minta repo cuma punya branch `main`. Worktree dan branch agent dihapus sesudah push.
7. 26 Sep 2026
   - Sepuluh bentrok selera GR lawan pangantara diputus **"Ikut GR"**, dan berlaku juga di pangantara.
   - HPP = rata-rata tertimbang bulanan harga beli aktual. Metode sheet dan FIFO ditolak.
   - xlsx pemilik jadi keluaran, bukan sumber. Transaksi sesudah tanggal potong cuma lahir di sistem.
   - Nilai nol di sel uang tampil redup.
8. 25 Sep 2026
   - Tanda minus di slot tetap sesudah "Rp", sebaris lurus ke bawah. Nol tidak pernah tercetak "-0".
   - Persen selalu satu desimal.
9. 24 Sep 2026
   - Merek diputus: hijau hutan dan emas, logo Agrapana.
   - Checklist tabel pertama: nol teks terpotong, status = ikon polos + legenda satu baris, Rp kiri angka kanan, Ringkasan putih satu warna.
   - Grafik pakai palet pastel terang, bukan hijau-emas redup "tua banget".

CLAUDE.md

## Keputusan pemilik

Yang sudah diputus tidak dibuka lagi tanpa pemilik. Yang belum diputus jangan ditebak.

Diputus

**Merek**

Hijau hutan + emas, logo Agrapana (`public/lambang-agrapana.svg`).

Diputus

**Peran**

owner · admin · gudang · finance. Super admin = owner berjabatan `super_admin`.

Diputus

**Penjualan bersih**

Rumah Tangga = B2C. Cashback dipotong dari penjualan bersih, penyebut semua persen margin. SO RETUR ITEM bukan penjualan.

Diputus

**HPP**

Rata-rata tertimbang bulanan harga beli aktual (26 Sep 2026).

Diputus

**Nol "sebagian"**

Invoice cuma Belum atau Lunas. PO diterima lengkap, kiriman kurang = ubah qty PO dulu (29 Sep 2026).

Diputus

**Invoice, bukan faktur**

Kata "faktur" tidak muncul di layar, cetak, WA, atau portal. "Faktur Pajak" tetap (29 Sep 2026).

Diputus

**Tempo per pelanggan**

Model n hari, tanggal bulanan, atau mingguan; tempo per segmen dicabut (1 Okt 2026).

Diputus

**Stok awal**

Sekali pakai, diketik owner per barang, tanpa jurnal dan harga. Barang lewat ditandai tanpa stok (1 Okt 2026).

Diputus

**Pelanggan ganda**

SO #389: Warung Gianyar digabung ke SPPG Gianyar, Sapat Ubud ke Tegalalang (4 Okt 2026). Belum diputus: kosong.

app/globals.css

## Merek & warna

Palet navy pangantara tidak berlaku di sini, dan hijau-emas ini tidak dibawa ke pangantara.

Hijau hutan#34471f · identitas

Hijau daun#587436

Emas logo#c9a04a · aksen

Baris grup#e4ecd8

Latar gelap#1f251b

lib/nav-menu.ts

## Susunan menu

Urutan mengikuti alur usaha: jual di atas, beli dan uang di bawah.

1. Dashboard
2. Pelanggan
3. Order
4. Invoice
5. PO Supplier
6. Pemasok
7. Pembayaran
8. Akuntansi
9. Stok
10. Admin

- Pembayaran dikelompokkan menurut **tujuan bayar** (supplier, driver/gaji, biaya lain), meniru pangantara.
- Piutang di Invoice. Mutasi bank, cocokkan, dan rekonsiliasi di Akuntansi.
- Pengantaran bukan menu lagi. Driver dan Peta Live jadi mini tab di Order (29 Sep 2026).
- Harga khusus dan diskon volume di Order. Barang dan kategori di Stok. Pemasok jadi menu sendiri bersama Katalog; baris atas sisi jual, baris bawah sisi beli dan uang, 5 + 5 (29 Sep 2026).
- Retur tinggal di rumah jenisnya: PO › Retur, Order › Retur, Stok › Barang Rusak.
- Semua yang diarsip cuma terlihat di Admin › Arsip, dengan tombol pulihkan.
- Tab Admin: Pengguna · Tampilan · Dokumen · Pengaturan · Link Eksternal · Sistem · Arsip.
- Maksimal sekitar 8 tab per menu. Tautan lama tetap mengarah ke tempat baru.

docs/STANDAR-TABEL.md

## Standar tabel

Acuannya tabel Top Produk di Dashboard. Tiap tabel `.table-app` wajib memenuhi dua belas baris ini.

| No | Aturan | Caranya |
| --- | --- | --- |
| 1 | Kolom No paling kiri, rata tengah | `sel-nomor` |
| 2 | Semua kolom bisa di-sort | `SortTh` |
| 3 | Uang: "Rp" kiri, angka kanan, minus di slot tetap, nol redup | `RpTd` / `RpCell` |
| 4 | Persen satu desimal, tanda di slot tetap | `PersenSel` |
| 5 | Tanggal di slot tetap, lurus vertikal, tanpa koma | `TanggalSel` |
| 6 | Desimal seragam per kolom | `fmtAngkaTetap` / `Qty` |
| 7 | Status = ikon polos + satu legenda satu baris | `IkonStatus` + `LegendaTabel` |
| 8 | Baris grup: latar muda, seluruh baris diklik, subtotal per kolom, nol hitungan | `BarisGrupTabel` |
| 9 | Baris total di kaki tabel | `BarisTotalTabel` |
| 10 | Rapat 12px, satu baris per sel, nol "…" | `.table-app`, teks panjang `sel-bungkus` |
| 11 | Muat satu tampilan di 1280px, maksimal 12 kolom tampak | kolom sekunder ke rincian |
| 12 | Kode dalam pil, nama tidak tebal | `KodePil` |

Memori selera-tabel-ui

## Selera tampilan

Hal-hal yang ditegur berulang. Jadikan checklist sebelum menyerahkan tampilan apa pun.

### Ikon & legenda

- Satu registri konsep › ikon. Satu ikon tidak pernah dua arti.
- Ikon formal: simbol netral atau benda harfiah. Nol gestur tangan, pesta, makhluk imut.
- Tiap ikon di tabel masuk legenda, termasuk Aksi. Semua legenda satu baris.
- Tiap opsi tab, sakelar, dan mini tab berikon.
- Nol label berbentuk tulisan; tiap chip berikon sendiri.
- Legenda tidak mengulang chip saringan, tidak memuat cara pakai, turun baris bila tak muat.
- Tempo tunai = 💵 berlegenda, tidak pernah kata "Tunai".

### Toolbar & saringan

- Toolbar = search + ikon (folder, Excel, PDF, tambah) saja.
- Tiap tab bertabel punya search + Excel + PDF sebaris. Excel selalu berpasangan PDF. Nol bar cari tanpa ikon.
- Link langsung dibuka, nol tombol salin.
- Filter yang cuma menyaring tabel yang sama ditolak. Cukup search + ikon kolom berlegenda.
- Dropdown filter di grid 4 kolom BarFilter, placeholder "Semua \<label>".
- Nol tab "Semua"; urutan tab = urutan proses.
- Urutan blok: Ringkasan, Periode, bar cari, sub-tab, isi.

### Ringkasan & KPI

- Tiap halaman daftar punya satu Ringkasan lipat, bawaan tertutup.
- Ringkasan putih satu warna, tanpa pastel, tanpa tombol ekspor.
- Tile sebaris mengisi penuh lebar. Tile tanpa data dihapus, bukan "—".
- Kepala tile ikon + label sebaris, angka rata tengah, persen sebaris angka.
- Nol lencana hitungan di kepala kartu ("11 barang"). Hitungan cuma boleh di tab.

### Tabel & grup

- Satu tabel per tampilan; kelompok = baris grup lipat di dalamnya.
- Grup tanggal per minggu, label "14–20 Sep 2026" tanpa "Minggu 38".
- Data berbaris = tabel, bukan grid kartu.
- Satuan dan nomor lama jadi kolom sendiri.
- Alamat yang cuma nama wilayah dianggap kosong, tampil "—" redup.

### Form & popup

- Label di atas input, tinggi input seragam, tanpa "(opsional)".
- Entri massal (opname) = lembar hitung berbentuk tabel.
- Popup profil: ikon status sebaris nama, isi jadi kartu lipat.
- Nol gulir samping di popup; lebarkan popup-nya.
- Isian angka (NPWP, rekening, NIK) hanya menerima angka. Daftar baku = dropdown.
- Dokumen cetak: Rp kiri angka kanan, kepala tabel rata tengah, qty Jumlah | Satuan, alamat 📍, telepon logo WA.

### Warna & grafik

- Warna solid, nol gradien. Kolom sticky persis sewarna kepala.
- Latar netral terang, input putih ber-ring. Nol krem di atas krem.
- Grafik pastel terang (biru, pink, toska, oranye). Kontrol seri sebaris di kanan.

docs/ARSITEKTUR.md

## Pola data & uang

Penjagaan hidup di database, bukan di tampilan.

- Nomor dokumen `JENIS-YYMM-NNNN` dari satu lajur `nomor_urut`.
- Jurnal otomatis per dokumen sumber. Jurnal tidak seimbang ditolak, bukan dibulatkan.
- Satu rumus harga `harga_untuk()`: kontrak › harga khusus › tingkat volume.
- Stok tidak boleh minus. Pengecualian cuma lewat izin yang diset owner.
- Dokumen yang uangnya sudah bergerak terkunci. Pembayaran tidak boleh melebihi sisa tagihan.
- Tutup buku bulanan menolak jurnal bulan tertutup. Buka lagi = owner + alasan + audit.
- Cocok mutasi bank otomatis hanya kalau kandidatnya tunggal; yang ambigu diserahkan manusia.
- Data dummy terpisah (`is_dummy`), tidak pernah bercampur dengan stok, HPP, dan nomor asli.
- Keputusan data pemilik dicatat sebagai migrasi berkomentar alasan, bukan update diam.

tests/unit/gerbang-\*.test.ts

## Gerbang penjaga

Aturan tanpa gerbang mekanis dianggap belum jadi. Gerbang ini menolak commit yang melanggar.

`standar-tabel``selera``kolom-tabel``tanpa-gradien``strip-tanpa-semua``ikon-literal``istilah-invoice``salin``ikon-strip``ikon-formal``legenda-tanpa-chip``urutan-blok``isian-angka``kpi-tile``periode-dua-baris``rumah-ekspor``batas-klien``inp-transisi``dummy``dummy-layar``test-integrasi``penjaga-definisi``fokus-triase``cron-katalog``ai-kuota``analytics-token``noindex``pwa``deploy``berkas-kosong``model-agent``ilmu-agent`

docs/BUKU-PEGANGAN/ROUTINE.md

## Cara halaman ini diperbarui

Routine `pembaru-buku-pegangan-gr` jalan tiap malam pukul 21.27 WIB di Mac mini. Ia memeriksa apakah sumber selera berubah sejak stempel di kop: memori `selera-tabel-ui`, `CLAUDE.md`, `docs/STANDAR-TABEL.md`, `lib/nav-menu.ts`, dan gerbang. Kalau ada, ia menambah entri Riwayat, menyesuaikan bagian aturannya, lalu menerbitkan ulang ke alamat yang sama. Hari tanpa perubahan dilewati tanpa menulis apa pun.

Sumber halaman: `docs/BUKU-PEGANGAN/buku-pegangan-gr.html` di repo gemah-ripah. Kanon selera lengkap tetap di `.claude/skills/selera-pinka/`, dipakai bersama pangantara.