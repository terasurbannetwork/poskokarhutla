# Katalog fitur & sistem — berlaku di SEMUA proyek

Aturan pemilik, 29 Agustus 2026. Ini KATALOG RUJUKAN, bukan aturan yang
berlaku tiap sesi: dibaca saat merancang proyek baru, saat menambah modul
besar, dan saat menilai "apa yang belum ada" di proyek yang sudah jalan.
Sengaja TIDAK di-`@import` ke CLAUDE.md — isinya terlalu besar untuk dibaca
ulang tiap kali, dan yang wajib tiap sesi sudah ada di RTK/TEST/INP/DUMMY.

Sumbernya `mbg-kdmp` per 29 Agt 2026: 83 halaman, 176 route API, 295 tabel,
627 migrasi, 129 gerbang, 72 komponen UI bersama, 208 modul `lib/`. Yang
ditulis di sini bukan domainnya (SPPG, dapur, invoice) melainkan BENTUKNYA,
supaya bisa dipasang di proyek apa pun.

---

## 0. Aturan urutan: yang lahir belakangan selalu mahal

Yang menentukan ongkos sebuah fitur bukan ukurannya, melainkan JUMLAH HALAMAN
yang sudah lahir tanpa dia. Tiga ember, dan salah menaruh sesuatu di ember
ketiga adalah kesalahan yang paling sering dibayar berbulan-bulan.

| Ember | Isinya | Ongkos kalau ditunda |
| ----- | ------ | -------------------- |
| **Hari pertama, sebelum halaman kedua lahir** | rumah tema & warna, rumah format angka/tanggal/uang, rumah periode, rumah transisi INP, RBAC + RLS + guard API, migrasi berurut, gerbang mekanis, tombol data dummy | tiap halaman menulis polanya sendiri, dan tidak ada satu tempat pun yang bisa membenahinya sekaligus |
| **Boleh menyusul, murah** | halaman baru, kolom baru, laporan baru, tombol ekspor baru, dataset ekspor baru | kecil, memang begitu jalannya |
| **Menyusul TAPI mahal** | audit trail, cakupan data per unit, link token pihak luar, jejak dummy lewat trigger, penomoran dokumen, satu rumus uang | harus menyentuh tiap tabel/halaman yang sudah ada, dan yang terlewat gagal DIAM |

Aturan turunannya: **tiap "rumah tunggal" dibuat sebelum pemakai keduanya
lahir.** Rumah yang dibuat sesudah pemakai kelima berarti empat penulisan
ulang yang harus dicabut satu per satu, dan yang kelima biasanya tidak
ketemu.

---

## 1. Fondasi: sepuluh rumah tunggal

Tiap baris di bawah ini WAJIB satu berkas, satu ekspor, dan dipakai bersama.
Kalau dua halaman menghitung hal yang sama dari tabel yang sama dengan
saringan masing-masing, hasilnya angka berbeda untuk pertanyaan yang sama —
dan tidak satu pun dari keduanya salah menurut kodenya sendiri.

| Rumah | Isinya | Yang gagal tanpa dia |
| ----- | ------ | -------------------- |
| **Format** | angka Indonesia (titik ribuan, koma desimal), tanggal, nama hari berkoma, telepon, terbilang | tiap halaman format sendiri, angka yang sama tampil dua bentuk |
| **Uang** | daftar status yang DIAKUI per jenis transaksi, satu fungsi per pertanyaan ("sudah dibayar?", "sudah terbit?") | empat layar melapor empat angka, semua "benar" menurut kodenya |
| **Periode** | mode hari/minggu/bulan/beberapa bulan/rentang, batas rentang, label relatif, sinkron ke URL | periode hidup di `useState` lalu perkakas di luar halaman tidak bisa membacanya |
| **Tema & warna** | token warna, palet seri grafik, kelas pil status | warna "kira-kira sama" yang tidak pernah sama |
| **Transisi (INP)** | pemisah chrome urgent vs isi deferred, echo lokal, overlay terpusat | klik membekukan layar, dan obatnya tidak bisa dipasang serentak |
| **RBAC** | satu peta peran → halaman, dibaca nav DAN guard halaman | nav menyembunyikan tab yang URL-nya masih bisa dibuka |
| **Guard API** | satu `requireStaff(...)` untuk tiap route | sesi `authenticated` yang sah tapi bukan staf tetap lolos |
| **Cakupan (scope)** | unit/cabang yang sedang dilihat, dipakai query dan ekspor | ekspor membawa data unit lain tanpa ada yang sadar |
| **Nomor dokumen** | satu bentuk, satu fungsi | empat berkas memelihara array bulan romawi masing-masing |
| **Tabel** | sort, grup lipat, paginasi, cari, bar ekspor, legenda kaki | tiap tabel jadi tabel baru, dan peraturan tabel harus ditegakkan 40 kali |

---

## 2. Identitas, peran, cakupan — tiga lapis, semuanya wajib

Satu lapis saja selalu bocor, dan bocornya diam.

1. **RLS di database.** Lapis terakhir yang tidak bisa dilewati klien mana pun.
   Tiap tabel punya RLS; helper `can_read_*` / `can_write_*` jadi satu rumah
   supaya policy tidak menulis ulang logika peran.
2. **Guard di route API.** `authenticated` BUKAN sama dengan "staf": kalau
   pendaftaran terbuka atau ada portal OTP, siapa pun bisa memperoleh sesi
   yang sah tanpa pernah jadi karyawan. Tiap route lewat satu gerbang yang
   menerima daftar peran atau `ANY_STAFF`.
3. **Guard di UI.** Peta peran yang sama dipakai nav (menyembunyikan tab) dan
   guard halaman (menolak akses via URL). Satu peta, jadi tidak mungkin drift.

Ditambah:

- **Peran tak berhak tidak melihat kontrolnya sama sekali**, bukan melihatnya
  abu. Kontrol abu tetap terbaca sebagai "nanti bisa".
- **Cakupan data per unit** naik jadi kartu CAKUPAN di layar, bukan teks polos.
  Bisa juga berupa posisi/jabatan, bukan cuma unit.
- **Service role** (kunci yang melewati RLS) punya auditornya sendiri: tiap
  pemakaian harus bisa disebut alasannya.
- **Rate limit RPC** dan **kunci idempoten** untuk apa pun yang bisa
  dipanggil dua kali oleh orang yang sama (klik ganda, retry jaringan).

---

## 3. Kontrol UI baku — yang tidak pernah ditulis ulang per halaman

Halaman TIDAK menulis kontrolnya sendiri. Yang ditulis sendiri selalu jadi
kelas yang tidak pernah ditanyai siapa pun saat aturan berubah.

**Kerangka halaman**
`PageHeader` · `PageTabs` (render di tempat, rute lama jadi redirect) ·
`SectionCard` · `KategoriLipat` (tiap judul zona bisa buka-tutup) ·
`EmptyState` yang menyebut nama embernya · `Skeleton` · `Toast` ·
`ConfirmDialog` · `Modal` + overlay terpusat (muncul di tengah, panelnya yang
menggulir).

**Periode & cakupan**
`WeekNav` · `WeekPicker` · `MonthPicker` · `RentangPeriodeBar` ·
`HariPeriodeBar` · `ScopeSearchPeriodBar` · pemilih unit. Semua menulis
periodenya ke URL; yang terpaksa memegangnya di state WAJIB mendaftarkannya ke
satu rumah yang bisa dibaca perkakas di luar halaman.

**Tabel**
`SortHeader` + hook sort · `BarisGrupTabel` / `BarisSubGrupTabel` (kepala grup
lipat, subtotal di kepalanya) · `RincianBaris` (akordeon, satu terbuka) ·
`Paginasi` · `LegendaTabel` di kaki kartu · `TabelKartu` · `AksiBarisTabel`
(kolom Aksi ikon telanjang, nol kata) · `Qty` + kolom Satuan terpisah ·
`Rupiah` / `RpCell` (Rp menempel kiri, digit rata kanan) · `SelLibur`
(tanggal merah punya kosakata sendiri) · `LabelSimpulan`.

**Input**
`Field` · `InputRupiah` · `InputTelepon` · `InputJam` · `InputBerkas`
(kompres gambar di klien) · `SearchSelect` · `PilihBanyak` (pilihan turun jadi
chip ber-✕, tidak pernah "Nama +N") · `KondisiPicker` · `StarRating` ·
`SupplierPicker`/picker entitas.

**Papan angka & ringkasan**
`KpiTile` (tile PUTIH ber-dot; kartu angka berlatar blok warna DILARANG) ·
`RingkasanCard` · `Badge` / `CategoryBadge` / pil status berlegenda ·
`ActivityLog` (selalu blok TERAKHIR halaman).

**Ekspor & cetak**
`CariExportBar` (tiap tabel punya kotak carinya sendiri) · `ExportButton` ·
`KopSurat` · `QrKode`.

---

## 4. Anatomi dashboard — apa saja yang harus ada

Pertanyaan "dashboard perlu apa aja" jawabannya sembilan blok, urut dari atas.
Dashboard yang kehilangan salah satunya selalu berakhir jadi layar yang
dilihat sekali lalu tidak dibuka lagi.

| # | Blok | Kenapa ada |
| - | ---- | ---------- |
| 1 | **Kartu CAKUPAN + kartu PERIODE** | tiap angka di bawahnya tak berarti tanpa "siapa" dan "kapan"; keduanya kartu, bukan teks polos atau input tanggal telanjang |
| 2 | **Papan angka (KPI tile)** | 4-8 angka yang menjawab "hari ini baik atau tidak"; tile putih ber-dot, tiap tile punya pembanding (periode sebelumnya atau target) |
| 3 | **Triase "Butuh Tindakan"** | daftar pendek berisi yang MACET, tiap baris bawa SEBAB + ANGKA + tombol yang mendarat langsung di record-nya (deep-link `?fokus=`), bukan di halaman daftarnya |
| 4 | **Matriks siapa-sudah** | unit × periode, tiap sel pil vonis; kolomnya ikut periode yang dipilih (minggu berarti Sen–Jum, bulan berarti tanggal) |
| 5 | **Blok TREN** | tab grafik terpisah dari matriks; total di tengah atas, sakelar bentuk di kanan atas, legenda di tengah bawah |
| 6 | **Tabel utama** | sort dari header, kotak cari sendiri, bar ekspor, grup lipat kalau panjang, legenda di kaki kartu |
| 7 | **Summary AI** | satu tujuan satu nama satu warna; tiap tabel temuan wajib punya ✓ dan ✕; aksi ✓ eksekusi langsung ke DB |
| 8 | **ActivityLog** | siapa mengubah apa, kapan; selalu paling bawah |
| 9 | **Tombol data dummy 🧪 / 🧹** | Super Admin saja; tanpa ini fitur yang baru jadi tidak bisa dinilai di layar kosong |

Aturan tambahan yang berlaku di semua dashboard:

- **Panel dipisah per irama.** Papan pantau harian, mingguan, dan bulanan
  jangan dicampur: tahap beririma panjang akan memvonis palsu yang harian.
- **Sel matriks memikul rantai penuh.** Matriks dan tabel daftar di bawahnya
  dilebur; daftarnya turun jadi rincian sel yang diklik.
- **Isi di bawah tab status wajib berganti.** Daftar tersaring naik paling
  atas, panel netral turun ke bawah.
- **Sebut yang BELUM, bukan yang sudah.** Kolom "Oleh" jadi Keterangan merah
  berisi siapa yang belum — dan itu menuntut adanya daftar wajib di DB.

---

## 5. Alur dokumen & status

Hampir tiap aplikasi bisnis adalah rantai status yang sama, dengan nama
berbeda. Bentuk yang terbukti:

```
draft → diajukan → diperiksa → disetujui → terbit → selesai/lunas
                        ↓
                     ditolak (dengan SEBAB, bukan cuma flag)
```

Yang wajib ikut lahir bersama rantainya:

- **Tiap perpindahan status punya jejak**: siapa, kapan, dari apa ke apa,
  alasan kalau mundur. Tabel `*_log` per domain, bukan kolom `updated_by`.
- **Mundurkan alur** adalah fitur, bukan kecelakaan. Harus ada jalurnya, ber-
  gerbang peran, dan mencatat keadaan lamanya.
- **Vonis hanya sesudah melihat dokumennya.** Tombol ✓/✕ tidak pernah di
  kolom Aksi tabel; harus buka popup yang menampilkan datanya dulu.
- **Layar konfirmasi menampilkan tabel penuh per langkah**, bukan kesimpulan
  sebaris.
- **Tenggat & pengingat**: tiap status yang bisa menggantung punya tenggatnya,
  dan pengingatnya berjalan dari cron, bukan dari ingatan orang.
- **Persetujuan bertingkat + tanda tangan**: link tanda tangan per orang,
  hasilnya tersimpan sebagai gambar/hash, bukan checkbox.
- **Segel dokumen**: hash isi saat diterbitkan, supaya yang sudah dicetak
  tidak bisa berubah diam-diam. Dicek ulang saat dibaca.

---

## 6. Pintu untuk pihak luar — link token

Kelas fitur yang paling sering dilupakan saat merancang, dan paling sering
dibutuhkan: **orang di luar organisasi harus mengisi sesuatu, tanpa akun.**

Bentuknya selalu sama: satu tabel `*_links` berisi token acak, sasaran, masa
berlaku, dan jejak pemakaian; satu halaman publik `/<sesuatu>/[token]`; satu
route API yang memvalidasi token lalu menulis.

Yang WAJIB ikut, dan tiga-tiganya lahir dari insiden nyata:

1. **Token itu alamat, bukan bukti diri.** Link yang beredar lewat WhatsApp
   diteruskan persis seperti pesan lain — dilempar ke grup, di-forward, dibuka
   di HP pinjaman. Untuk apa pun yang menyangkut identitas atau uang atas nama
   orang, WAJIB dua lapis: token DAN sesi/password milik orang itu sendiri.
   Nol dropdown "siapa Anda".
2. **Cakupan token dikunci di token itu**, bukan di parameter yang dikirim
   halaman. Kalau tidak, mengganti satu angka di request membuka data unit
   lain.
3. **Jawaban dari luar wajib DICETAK di layar dalam.** Kolom yang diisi pihak
   luar tapi tidak pernah ditampilkan ke orang dalam sama saja dengan tidak
   pernah diisi.

Ditambah: masa berlaku, sekali-pakai kalau perlu, halaman "link kedaluwarsa"
yang menyebut ke siapa harus minta link baru, dan versi luring/offline untuk
pengisi di jaringan buruk.

---

## 7. Ekspor: Word, Excel, PDF, dan cetak

Empat jalur keluar, empat mesin berbeda, SATU aturan kertas.

### 7.1 Aturan yang tidak pernah berubah

- **Semua yang keluar untuk dicetak WAJIB A4.** Arah kertas (portrait /
  landscape) boleh dipilih per dokumen; UKURANNYA tidak pernah boleh dipilih.
  Ini butuh gerbang mekanis karena ketiga jalur cetak punya kertas bawaan yang
  BUKAN A4 dan ketiganya gagal DIAM: file terbuka normal di layar, salahnya
  baru kelihatan sesudah kertas keluar dari printer, terpotong di kanan atau
  bawah. Sheet ExcelJS baru lahir dengan `paperSize: undefined` lalu memakai
  kertas baku SISTEM (Letter di mesin ber-locale AS).
- **Excel dan Cetak PDF selalu SEBARIS, dua ikon telanjang, tanpa teks.**
  Excel tidak pernah berdiri sendiri tanpa Cetak. Dua gerbang terpisah:
  "tidak pernah berteks" dan "Excel tidak pernah tanpa Cetak".
- **Bar ekspor turun ke bar di ATAS kartu**, bareng kotak cari — bukan di baki
  header kartunya. Baki header hanya untuk aksi terhadap isi kartu.
- **Angka Indonesia**: di Excel ditulis sebagai NUMBER dengan format sel
  `#.##0,00`, bukan sebagai string yang sudah diformat. String membuat kolom
  itu tidak bisa dijumlahkan oleh penerimanya, dan itu keluhan pertama yang
  selalu datang.

### 7.2 Excel — dua bentuk, jangan dicampur

| Bentuk | Kapan dipakai | Caranya |
| ------ | ------------- | ------- |
| **Dataset** (tabel mentah) | orang mau mengolah sendiri | registri dataset bersama: `key`, `label`, grup (Master/Harian/Keuangan/Kontrol), sumber (tabel atau RPC), definisi kolom, apakah butuh rentang tanggal, kolom unit untuk cakupan. Satu tombol Export di tiap halaman membaca registri yang sama — JANGAN halaman `/exports` terpisah, itu selalu jadi basi |
| **Template resmi** | formulir milik pihak lain (pemerintah, klien, auditor) | file `.xlsx` asli disimpan apa adanya di `public/templates/`; sistem MEMUAT template utuh dan hanya MENULIS NILAI ke sel. Layout, format, dan rumusnya tidak disentuh |

Tema Excel jadi satu rumah: lebar kolom, warna kepala, freeze pane, filter,
dan `printSetup` A4. Tiap sheet baru lewat rumah itu, bukan diatur tangan.

### 7.3 Word — template diisi, tidak pernah digambar ulang

- Template `.docx` asli disimpan di `public/templates/` dengan merge-field
  `{tag}`; pengisi (docxtemplater) hanya menaruh nilai. Layout, style, header,
  dan tabelnya dipertahankan persis.
- Simpan DUA berkas: `nama-src.docx` (asli, sebelum ditandai) dan `nama.docx`
  (yang sudah ber-`{tag}`). Tanpa `-src`, tidak ada yang bisa memastikan
  penandaan tidak merusak apa pun.
- Menggambar ulang dokumen resmi dengan kode adalah kesalahan mahal: yang
  memeriksanya di ujung sana membandingkannya dengan formulir yang mereka
  kenal, dan perbedaan sekecil apa pun jadi revisi.
- MIME dan nama berkas keluar lewat satu helper, jangan ditulis per route.

### 7.4 PDF — tiga jalur, pilih menurut asalnya

| Jalur | Kapan | Catatan |
| ----- | ----- | ------- |
| **Mesin PDF (react-pdf / kit)** | dokumen resmi: kwitansi, invoice, berita acara, surat | kop surat, logo, tanda tangan, QR, penomoran; fontnya ditanam, jangan dari host luar |
| **`window.print()` atas HTML** | yang sudah tampil di layar dan bentuk cetaknya sama | satu kelas `.print-area`, `@page { size: A4 }`, dan REGISTRI lembar cetak: lembar baru yang lahir tanpa terdaftar ditolak hook, karena kelas warna abu-abu yang tidak dicek selalu ikut terbawa |
| **PDF minimal tanpa dependency** | halaman publik bertoken yang butuh unduhan ringkas | jangan menyeret bundel PDF berat ke halaman yang dibuka orang luar dari HP kelas bawah |

Yang menempel pada dokumen resmi:

- **Kop surat satu rumah**, dipakai bersama oleh HTML cetak dan mesin PDF.
- **Tema dokumen per jenis** (slug), supaya satu app bisa menerbitkan dokumen
  atas nama beberapa entitas tanpa cabang kode.
- **Nomor dokumen kanonik** — satu fungsi, tanggal satu blok tanpa pemisah.
- **Terbilang** (angka → huruf) untuk kwitansi dan berita acara.
- **QR + halaman verifikasi publik** `/verifikasi/[kode]`, supaya lembar yang
  sudah dicetak bisa dicek keasliannya tanpa akun.
- **Antrian render** untuk PDF berat: kerjakan di luar request, jangan
  membuat orang menunggu di tombol.
- **Lampiran & catatan** turun ke bawah tanda tangan, bukan jadi kolom tabel.

### 7.5 Impor — kebalikannya, dan sama pentingnya

Sekali sebuah app mengeluarkan Excel, orang akan mengirimkannya balik. Yang
dibutuhkan: parser `.xlsx` per bentuk dokumen, pengisi `.docx` terbalik
(baca), pembaca PDF, OCR untuk foto nota, dan yang paling penting —
**halaman pratinjau sebelum tersimpan**: baris mana yang cocok, mana yang
baru, mana yang bentrok, dan tombol per baris. Impor yang langsung menulis
selalu jadi pembersihan manual seminggu kemudian.

Ditambah: normalisasi nama/item (satu barang ditulis lima cara), cache
pencocokan, dan slot impor supaya berkas yang sama tidak masuk dua kali.

---

## 8. Uang

Bagian yang paling tidak boleh "kira-kira".

- **Satu rumus, satu rumah.** Daftar status yang DIAKUI ditulis sekali:
  mana yang dihitung sebagai terbayar, mana yang terbit, mana yang keluar kas.
  Empat halaman menghitung uang yang sama dari tabel yang sama; tanpa rumah
  bersama, keempatnya benar menurut kodenya sendiri dan berbeda di layar.
- **Nama metriknya jujur.** Selisih terhadap pagu bukan profit. Profit =
  jual − beli. Yang salah nama akan ditelusuri sebagai bug rumus berjam-jam.
- **Dua sisi harga dipisah sejak awal** (beli vs jual). Kalau disamakan, tiap
  metrik selisih jadi NOL PERSIS di semua baris — pola yang terbaca sebagai
  rumus rusak.
- **Siapa melihat sisi harga yang mana** adalah aturan peran, bukan selera.
- **Jurnal & kode akun** (COA), aturan posting, dan penerbitan otomatis dari
  transaksi operasional ke buku besar lewat TRIGGER, bukan tulisan tangan per
  layar.
- **Rekonsiliasi & tutup buku per bulan**, dengan kunci periode: bulan yang
  sudah ditutup tidak bisa disisipi.
- **Kas kecil masuk buku besar.** Penarikan yang tidak terbit jadi baris
  mutasi adalah selisih yang ditemukan tiga bulan kemudian.
- **Layar yang MELAPOR uang dipisah dari layar yang MEMBAYAR.** Satu tempat
  membayar, sisanya melaporkan.
- **Pajak, potongan, dan tarif** jadi master data bertanggal berlaku, bukan
  konstanta di kode.

---

## 9. Pesan keluar & notifikasi

| Kanal | Yang wajib ikut |
| ----- | --------------- |
| **WhatsApp** | mesin routing (siapa menerima apa), template pesan satu rumah, log tiap kirim, log pengingat, pemantau kesehatan gateway, dan jalur manual (salin pesan) sebagai cadangan saat gateway mati |
| **Push (PWA)** | service worker, tabel langganan per pengguna, opt-in yang tidak berlapis, dan pengiriman dari cron |
| **Email** | untuk yang butuh lampiran resmi |
| **Di dalam app** | halaman notifikasi + badge, karena kanal luar selalu ada yang tidak sampai |

Aturan bersama: **tiap pesan keluar punya barisnya di log**, dengan sasaran,
isi, status kirim, dan galatnya. Tanpa log, "katanya tidak menerima" tidak
bisa dijawab.

---

## 10. AI / LLM

Kalau app memakai model, tujuh hal ini lahir bersamanya — bukan sesudahnya:

1. **Antrian** — permintaan berat tidak dijalankan di request pengguna.
2. **Cache hasil** — pertanyaan yang jawabannya tidak berubah tidak dihitung
   ulang.
3. **Log percobaan** — prompt, model, token, biaya, lama, hasil.
4. **Batas data** — apa yang BOLEH dikirim ke model, digerbangi mekanis.
5. **Validasi keluaran** — parser yang menolak bentuk yang salah, plus log
   validasi supaya bisa dilihat seberapa sering modelnya meleset.
6. **Judge / eval** — set uji yang dijalankan terjadwal, bukan dinilai dengan
   perasaan.
7. **Bentuk Summary AI yang baku** — satu tujuan satu nama satu warna, tiap
   tabel temuan wajib ✓ dan ✕, ✓ mengeksekusi langsung ke DB, rincian membuka
   ke bawah. Teksnya telegrafis: angka lalu daftar nama, klausa penjelas
   dibuang.

---

## 11. Jejak, audit, dan kesehatan sistem

- **ActivityLog per record** — siapa mengubah apa; blok terakhir halaman.
- **`ops_log` / log domain** — kejadian operasional, bukan cuma perubahan
  baris.
- **Error klien dilaporkan ke DB** — error yang cuma muncul di console orang
  lain tidak pernah sampai ke siapa pun.
- **Snapshot kesehatan sistem** terjadwal: jumlah baris kunci, antrian yang
  menumpuk, cron yang tidak jalan, gateway yang mati.
- **Katalog cron** satu berkas: tiap tugas terjadwal punya slug, jadwal,
  pemilik, dan sakelar mati. Cron yang tidak terdaftar tidak pernah
  dipertanyakan saat berhenti.
- **Arsip & backup** ke penyimpanan luar, terjadwal, dengan jejaknya.
- **Kunci git & antrian push** kalau ada beberapa agen/orang menulis repo yang
  sama: tabrakan diselesaikan dengan MENGANTRE, bukan dengan menolak.

---

## 12. Data dummy

Rinciannya di `~/.claude/DUMMY.md`. Ringkas: dua ikon Super Admin (🧪 isi
modul halaman yang sedang dibuka, 🧹 hapus seluruh data dummy), periodenya
yang TERPAMPANG, gerbang "sudah ada" per periode, angka lahir dari rantai
sungguhan, tiap ember status terisi minimal satu, semua fitur di layar itu
ikut berangka, layar muat ulang penuh sesudahnya, dan penghapusannya lengkap
karena jejaknya dicatat lewat TRIGGER.

Yang paling sering ditanyakan: **"butuh kolom dummy?"** Jawabannya bukan
kolom penanda di tiap tabel, melainkan **satu tabel jejak** (`dummy_jejak`)
yang diisi trigger: tabel, id baris, modul, dan — untuk baris yang DIUBAH
bukan dilahirkan — nilai lamanya. Label `[[DUMMY]]` di teks tetap dipasang,
tapi tugasnya cuma memberi tahu manusia yang melihat layar; yang menghapus
adalah jejaknya.

---

## 13. Gerbang — aturan tanpa gerbang dianggap belum jadi

Rinciannya di `~/.claude/TEST.md` (lapisan uji) dan `~/.claude/INP.md`
(klik tidak boleh membekukan). Katalog kelas gerbang yang terbukti berguna:

| Kelas | Yang ditolaknya |
| ----- | --------------- |
| **Selera / UI** | pil berteks di kolom Aksi, em dash penghubung, kartu angka berlatar warna, header tabel tidak center, sel yang menumpuk, kolom tanpa colgroup |
| **Struktur** | halaman tanpa bingkai nav, berkas yang terlalu besar, impor hilang, sintaks rusak sebelum commit |
| **Keamanan** | RLS terbuka, RPC `SECURITY DEFINER` telanjang untuk `authenticated`, route tanpa guard, `anon` yang bisa menulis |
| **Data** | kolom query yang tidak ada, argumen RPC yang tidak cocok, trigger yatim tanpa berkas migrasi, FK pengguna |
| **Uang** | satu rumus uang, sisi harga, profit vs selisih pagu |
| **Cetak** | A4, lembar cetak tak terdaftar, kop surat |
| **Kinerja** | transisi INP, RLS initplan, fan-in graf |
| **Proses** | git bersih, push tertunda, dokumen basi, buku pegangan basi |

Dua bentuk penegakan, dan keduanya perlu:

- **Hook** (menolak SEBELUM tersimpan) — murah, cepat, tapi cuma melihat
  berkas yang sedang disunting.
- **Gerbang uji** (menolak sebelum push) — melihat seluruh repo.

**Ranjau gerbang yang berulang:** gerbang yang mendaftar PER BERKAS bukan per
handler membuat semua handler lain di berkas itu ikut lolos tanpa pernah
diperiksa, dan berkasnya terlihat "sudah terdaftar". Kegagalan paling sunyi
dari semuanya.

---

## 14. Otomasi repo

- **Skill** untuk alur kerja berulang (sapuan INP, beresin gagal deploy, audit
  teknis, selera).
- **Agent peninjau** per sumbu (RLS, RBAC, keamanan, kinerja, migrasi
  idempoten, celah uji, tipografi, warna, tabel, angka). Mereka KONSUMEN
  aturan, bukan sumbernya.
- **Hook** per jenis berkas, bukan bacaan wajib di depan: paket aturan yang
  lebih besar daripada jendela konteks tidak pernah dibaca.
- **Routine terjadwal** yang memantau berkas aturan dan menyegarkan buku
  pegangan tim saat aturannya berubah. Pantauannya PATHSPEC berwildcard,
  supaya gerbang yang lahir besok ikut terpantau tanpa didaftarkan.

---

## 15. Ranjau yang berulang di proyek baru

- **Dua sumber kebenaran.** Salinan kedua selalu yang basi duluan, dan
  basinya diam. Kalau harus ada salinan, sinkronkan lewat skrip dan gerbangi
  kesamaannya.
- **Bacaan wajib yang lebih besar dari jendela konteks.** Sembilan berkas
  berlabel wajib, 1.642 baris, nol pembaca. Yang bekerja: kanon sekali,
  suntikan hook per jenis berkas, sisanya gerbang mekanis.
- **Halaman tanpa login diperlakukan seperti halaman dalam.** Dibuka orang
  luar dari HP kelas menengah-bawah di jaringan seluler; anggaran kinerjanya
  paling ketat justru di tempat yang paling jarang dilihat pemilik.
- **Master data tanpa aktif/nonaktif.** Begitu ada, semua layar harus
  menghormatinya — termasuk layar uang, yang tidak boleh menagih entitas
  nonaktif.
- **Tanggal turunan yang jatuh di luar periode** (order + 2 hari mendarat di
  akhir pekan). Barisnya ada, metriknya nol.
- **Konstanta yang seharusnya master data**: tarif, pagu, hari libur, jam
  operasional. Semuanya berubah, dan semuanya berubah mendadak.
- **Hari libur nasional** bukan hiasan kalender: kalau ada hari yang tidak
  boleh diisi, yang menolaknya trigger DB, dan kolomnya punya kosakata
  sendiri di layar.
