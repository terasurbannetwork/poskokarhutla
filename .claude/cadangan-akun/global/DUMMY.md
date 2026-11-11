# PENSIUN 11 Nov 2026: JANGAN DIPAKAI

Pemilik (11 Nov 2026): "Hilangkan ya ga ada data dummy". Aturan wajib tombol
🧪/🧹 dicabut di SEMUA proyek. Proyek baru tidak dipasangi tombol dummy, dan
tombol yang sudah ada disembunyikan. Isi di bawah disimpan hanya sebagai
riwayat; jangan dijadikan rujukan atau checklist.

---

# Standar data dummy — berlaku di SEMUA proyek

Aturan pemilik, 29 Agustus 2026. Diperluas 30 Agustus 2026 sesudah sapuan
menyeluruh pertama. Berlaku untuk proyek yang sudah ada maupun yang baru
dibangun.

## Aturannya

**Tiap website yang dibangun wajib punya tombol isi data dummy sejak awal.**
Fitur yang sudah jadi tidak bisa dievaluasi di layar kosong: pemilik tidak bisa
menilai tabel yang tak berbaris, ember status yang semuanya nol, atau grafik
bertulisan "belum ada data". Yang dibeli tombol ini adalah kemampuan menilai
fitur pada hari fiturnya selesai, bukan pada hari datanya kebetulan masuk.

Dua ikon, Super Admin saja, di tempat yang sama di tiap halaman:

| Ikon | Kerjanya |
| ---- | -------- |
| 🧪 | isi data dummy untuk HALAMAN YANG SEDANG DIBUKA |
| 🧹 | hapus SELURUH data dummy, dari halaman mana pun |

**Yang menentukan isinya adalah HALAMAN yang sedang dibuka**, bukan pilihan di
sebuah dropdown. Dropdown "mau isi modul apa" adalah pertanyaan yang jawabannya
sudah kelihatan dari layar yang sedang dilihat.

## Enam syarat yang membuatnya berguna

Tombol yang melanggar salah satu dari ini terlihat bekerja, melapor "N baris
dibuat", dan meninggalkan layar yang sama persis seperti sebelum diklik.

**1. Periodenya yang TERPAMPANG, bukan hari ini.** Layar hampir selalu menunjuk
rentang yang bukan hari ini: akhir pekan melompat ke minggu kerja berikutnya,
halaman kalender memegang bulan, halaman rekap memegang periode di URL. Yang
diisi harus rentang yang sedang dibaca orangnya. Kalau periodenya hidup di
state komponen, halaman itu WAJIB mendaftarkannya ke satu rumah yang bisa
dibaca perkakas di luar halaman.

**2. Gerbang "sudah ada" menghitung baris yang MASIH HIDUP, dan per PERIODE.**
Menghitung catatan jejak berarti satu baris yang dihapus lewat jalur lain
mengunci tombolnya selamanya, dengan pesan "sudah ada" untuk data yang sudah
tidak ada. Menghitung per modul saja berarti satu kali klik mengunci modul itu
untuk SEMUA periode berikutnya.

**3. Angkanya lahir dari rantai sungguhan, bukan konstanta.** Porsi dari data
sekolah dapurnya, bahan dari BOM resep hari itu, harga dari daftar harga
supplier, nilai invoice dari belanjanya, pool bagi hasil dari pagu dikurangi
belanja. Konstanta di tengah rantai menghasilkan layar yang berselisih dengan
layar sebelahnya, dan yang terbaca orang adalah "rumusnya rusak", bukan "data
ujinya karangan". Kejadian 29 Agt 2026: 30 penerima karangan di dapur 2.272
orang, belanja Rp300.000 di pagu Rp184.000, lalu Profit −Rp116.000 tiap hari
dilaporkan sebagai bug rumus.

**4. Tiap ember status wajib terisi minimal satu.** Layar yang semua barisnya
berstatus sama tidak bisa dipakai mencoba ember yang lain, dan tiap ember punya
tombol serta popupnya sendiri. Bagi barisnya bergiliran menurut rumus ember
yang dipakai layarnya, jangan menulis statusnya tangan.

**5. SEMUA fitur ikut terisi, bukan tabel utamanya saja.** Vonis pemilik 29
Agt 2026: "ini fiturnya harus ada semua". Tiap tab metrik, tiap kartu, tiap
matriks di layar itu wajib berangka. Satu tab yang tetap Rp 0 di antara tujuh
tab yang hidup terbaca sebagai rumusnya rusak, dan yang ditelusuri orang
berjam-jam adalah kode yang benar. Cara memeriksanya bukan melihat layar satu
per satu: panggil fungsi/endpoint yang menyuapi layar itu dan pastikan TIAP
kolomnya bukan nol.

**6. Layar wajib muat ulang PENUH sesudah isi & hapus.** Menyegarkan komponen
server saja meninggalkan halaman yang menarik datanya di klien persis seperti
semula, dan tombolnya terbaca "tidak melakukan apa-apa".

## Tiga kelas kegagalan yang tidak pernah bersuara

Sapuan menyeluruh 30 Agt 2026 atas satu proyek menemukan **113 dari 143 tabel**
yang dibaca halaman-halaman bertombol dummy tidak pernah diisi siapa pun. Dua
laporan pemilik dalam satu jam — "kenapa di pengiriman ga muncul dummy nya?"
lalu "kenapa gw klik dummy tidak ada yang muncul di PO ini?" — ternyata cuma
dua gejala dari daftar itu. Kelas ketiga lahir sehari sesudahnya, dari laporan
yang bunyinya nyaris sama persis tapi sebabnya di tempat yang lain sama sekali.

### KELAS A — tabelnya tak pernah ditulis siapa pun

Sebuah tab membaca tabel yang tak satu pun fungsi dummy menyentuhnya. Tombolnya
melapor sukses, tab sebelahnya berangka, dan tab itu kosong permanen.

Paling sering terjadi pada tabel yang **dibaca banyak halaman tapi ditulis satu
modul saja**. Tabel pengiriman cuma lahir di modul "operasional", padahal tab
Pengiriman ada di halaman Order DAN halaman PO. Dua halaman, satu tabel, nol
isian — dan tak satu pun gerbang melihatnya.

Ciri khasnya: modul yang mengisinya ADA dan berfungsi. Yang salah rutenya.

### KELAS B — dua sisinya disamakan, jadi tiap metrik selisih NOL PERSIS

Pengisi menulis `qty_terima := qty_pesan` dan `qty_confirmed := qty_order`.
Barisnya lahir semua, tabelnya penuh, dan dua tab "Selisih" — yang menyaring
tepat "yang dua sisinya berbeda" — nol berapa kali pun tombolnya diklik.

Ini kembaran persis dari ranjau "kolom harga JUAL diisi harga BELI". Nol di
SEMUA baris tidak pernah terbaca sebagai data karangan; ia terbaca sebagai
rumus rusak, dan yang ditelusuri orang adalah kode yang benar.

**Aturannya: sisi yang dibandingkan layar tidak boleh pernah sama rata.** Satu
baris kurang, satu baris lebih, sisanya pas — supaya ketiga embernya bisa
dicoba.

### KELAS C — buku langkah mencatat fungsi yang melahirkan NOL baris

31 Agt 2026, laporan pemilik: "kenapa ga bisa isi dummy untuk pengiriman?" —
gejalanya identik dengan KELAS A, dan sebabnya sama sekali bukan itu. Fungsi
pengisinya ADA, terdaftar di rantai tiga modul, dan dijalankan tangan untuk
periode yang sama ia melahirkan 5 trip + 5 stop. Yang rusak BUKUNYA.

Rantainya kebetulan jalan saat hulunya belum lengkap: menu baru ada untuk hari
pertama, jadi tiga fungsi hilir melahirkan nol baris. Ketiganya tetap tercatat
"sudah jalan" di buku langkah — dan sejak detik itu tak ada klik 🧪 yang akan
menjalankannya lagi untuk periode itu. Tiga tab kosong permanen, tombolnya
melapor sukses, dan yang ditelusuri orang adalah fungsi pengisi yang benar.

Sapuan "ikat bukunya ke jejak" tidak menangkapnya, dan itu bagian yang paling
sunyi: sapuan itu bekerja per PERIODE, jadi satu order yang berhasil lahir
membuat periodenya punya jejak — dan baris buku milik fungsi yang gagal diam
ikut selamat di bawah payungnya.

**Aturannya: langkah yang melapor nol baris DICABUT lagi dari buku.** Ia jalan
sebelum hulunya ada, bukan selesai. Klik berikutnya mencobanya lagi, dan begitu
hulunya lahir ia berhasil. Ongkos salahnya tidak simetris: fungsi yang memang
tak punya kerja cuma membayar satu pemindaian yang langsung `continue`,
sedangkan fungsi yang salah dicatat membayar dengan layar kosong selamanya.

## Arsitektur: rantai modul, bukan cabang if

Halaman berbagi tabel. Halaman Invoice, Pembayaran, Persetujuan, dan Akuntansi
keempatnya membaca rantai uang yang sama. Kalau tiap halaman memanggil satu
fungsi pengisi, tiga di antaranya akan selalu setengah kosong.

**Rutenya harus tabel keputusan yang bisa dibaca mesin, bukan rantai `elsif`.**

```
dummy_rantai(modul) -> text[]      -- daftar FUNGSI pengisi, hulu ke hilir
dummy_isi(modul, ...)              -- satu loop atas rantai itu, nol cabang
```

Yang dibeli bentuk ini:

- Menambah isian baru = menambah **satu nama fungsi di satu array**. Bentuk
  `elsif` menuntut penyunting mengingat tiga tempat sekaligus (daftar nama
  modul yang sah, cabangnya, dan peta halaman di sisi aplikasi), dan yang lupa
  salah satunya tidak pernah dapat error.
- Gerbangnya membaca array yang sama. Daftar modul yang sah hidup di SATU
  tempat, dan peta halaman di sisi aplikasi diadu ke sana.
- Urutan rantai memaksa hulu-ke-hilir kelihatan: kalender melahirkan menu, menu
  melahirkan order, order melahirkan PO, PO melahirkan penerimaan dan retur.

**Konsekuensinya wajib ditangani: satu fungsi kini disebut banyak halaman.**
Yang pertama menulis barisnya; yang berikutnya menabrak kunci uniknya dan
MEMBATALKAN seluruh pengisian — termasuk semua modul yang sudah lahir
sebelumnya di rantai yang sama.

Menambal tiap fungsi dengan `on conflict` bukan jawabannya: kunci uniknya
beda-beda, sebagian tidak punya, dan yang lupa ditambal gagal diam di halaman
yang jarang dibuka. **Catat langkahnya, satu tempat:**

```
dummy_langkah(fungsi, cakupan_id, periode_kunci)   -- primary key ketiganya
```

Sebelum menjalankan sebuah fungsi, catat langkahnya; kalau catatannya sudah
ada, lewati. **Dan cabut lagi catatannya kalau fungsinya melapor NOL baris** —
lihat KELAS C di atas: langkah yang jalan sebelum hulunya ada bukan langkah
yang selesai, dan buku yang menganggapnya selesai mengunci layarnya selamanya.

Dan **ikat bukunya ke jejak**: begitu tak ada satu pun jejak tersisa untuk
sebuah periode, langkahnya ikut dilupakan. Buku yang tidak pernah lupa akan
mengunci tombol selamanya untuk data yang sudah tidak ada — persis pelanggaran
syarat #2 di atas. Ikatan ini bekerja per PERIODE, jadi ia TIDAK menggantikan
aturan nol-baris di atas: satu baris yang berhasil lahir memayungi seluruh
catatan langkah periode itu, termasuk milik fungsi yang gagal diam.

Tombol hapus wajib mengosongkan buku langkah. Kalau tidak, klik 🧹 lalu 🧪 di
periode yang sama akan MELEWATI seluruh rantainya: datanya sudah tidak ada,
bukunya masih bilang sudah pernah jalan, tombolnya melapor sukses, dan sebabnya
tak kelihatan di mana pun.

## Bisa dibatalkan, dan itu syarat hidupnya

Baris dummy mendarat di DB PRODUKSI yang sama seperti data asli. Itu memang
tujuannya. Konsekuensinya kelengkapan penghapusan bukan penyempurnaan:

- **Jejak lewat TRIGGER, bukan label teks.** Baris yang lahir dari trigger lain
  (invoice draft dari order, stock dari penerimaan) tidak akan pernah tercatat
  kalau pencatatannya ditulis tangan per INSERT. Label `[DUMMY]` tetap dipasang,
  tapi tugasnya cuma memberi tahu manusia yang melihat layar.
- **Tabel tanpa kolom `id` TIDAK BISA berjejak.** Pencatat jejak menyimpan
  `(tabel, id baris)`, dan penghapus menghapus lewat `where id = ...`. Tabel
  berkunci gabungan — arsip jawaban, tabel ringkasan — luput dari dua-duanya
  tanpa satu pun error. Ia harus disebut SENDIRI di tombol hapus, dengan ruang
  lingkup yang dipatok ke induk dummy-nya supaya baris sungguhan tidak ikut
  tercabut.
- **Trigger yang menulis saat DELETE menulis ulang apa yang baru dicabut.**
  Arsip "jawaban pihak luar" biasanya diisi dari dua arah: saat jawabannya
  lahir, DAN saat barisnya dihapus. Kembalikan dulu keadaannya ke netral
  (mis. resolusi ke `pending`) supaya trigger itu pulang lebih awal, baru
  hapus barisnya.
- **Yang DIUBAH, bukan dilahirkan, disimpan nilai lamanya.** Dummy kadang harus
  menaikkan status milik orang lain supaya layarnya hidup. Itu boleh HANYA
  kalau keadaan lamanya ikut dicatat dan dikembalikan tombol hapusnya.
- **Yang sudah terpakai DILEWATI, bukan menggagalkan seluruh pengisian.**
  Tanggal yang sudah berisi data asli dibiarkan utuh; satu bentrok yang
  membatalkan seluruh RPC membuat tombolnya cuma bisa dipakai di kandang
  kosong, persis kebalikan dari gunanya.

## Ember yang dijaga aturan bisnis dicapai lewat PINTUNYA

Sebagian ember status tidak bisa ditulis langsung, dan itu benar: empat mata
(bukti tidak boleh divalidasi oleh yang mengunggahnya), dokumen yang menuntut
lima tanda tangan sebelum bisa dikunci, status yang dipaksa trigger jadi
"menunggu" tiap kali barisnya lahir.

**Jangan pernah mencapai ember dengan mematikan gerbangnya.** Kalau begitu
caranya, yang diuji orang bukan lagi alur yang sebenarnya, dan gerbang yang
dilemahkan untuk data uji akan tetap lemah untuk data sungguhan.

Tiga jalan yang sah:

1. **Sebut pelaku yang berbeda.** Empat mata lolos kalau pengunggahnya bukan
   pemvalidasinya — dummy cukup menyebut pengguna lain yang memang ada.
2. **Lewati prasyaratnya dulu.** Dokumen yang butuh lima tanda tangan: buat
   lima tanda tangannya, baru kunci. Sekalian mengisi fitur tanda tangan.
3. **Ember lewat UPDATE, bukan INSERT.** Status yang dipaksa trigger saat baris
   lahir memang seharusnya begitu; ember lainnya dicapai lewat pintu yang sama
   dengan tombol di layarnya, yaitu perubahan status sesudahnya.

Kalau ketiganya tidak mungkin — misalnya tak ada pengguna kedua di basis data —
**turunkan embernya, jangan gerbangnya**, dan catat itu sebagai utang.

## Gerbangnya

**Aturan tanpa gerbang mekanis dianggap belum jadi.** Tiga lapis, semuanya
wajib:

**1. Pemindai sumber tanpa DB.** Daftar modul di sisi aplikasi sama persis
dengan rantai di DB; tiap fungsi yang disebut rantai benar-benar ada; tiap
modul menyebut fungsi pengisinya sendiri di rantainya; tiap modul punya minimal
satu halaman yang memetakannya; tiap tabel yang ditulis punya trigger pencatat
jejaknya; tiap fungsi digerbang peran dan tidak lahir terbuka untuk anon; dan
tombol hapus benar-benar mengosongkan buku langkah.

**2. Registri cakupan LAYAR — inilah gerbang untuk KELAS A.** Pemindai membaca
tiap halaman yang punya tombol dummy, menelusuri impornya beberapa tingkat,
mengumpulkan tabel yang dibacanya, lalu menuntut tiap tabel itu punya salah
satu dari empat vonis yang ditulis orang:

| Vonis | Artinya |
| ----- | ------- |
| `induk` | data master/referensi. Sudah ada di produksi, HARAM dilahirkan dummy |
| `jejak` | log/flag. Lahir sendiri dari trigger, atau tidak menyuapi layar |
| `luar`  | lahir saat manusia menekan tombol link/unggah ke pihak luar |
| `antre` | UTANG: transaksional, menyuapi layar, belum dilahirkan dummy |

Tabel baru yang dibaca layar dan tak divonis membuat gerbangnya merah, jadi
pertanyaannya — "ini master, log, atau isian yang hilang?" — ditanyakan pada
hari fiturnya lahir, bukan sesudah pemilik melihat layar kosong. `antre` boleh
MENYUSUT, tidak boleh tumbuh; menaikkan batasnya bukan jawaban.

**3. Uji integrasi isi → hapus → hitung.** Tiap tabel kembali ke jumlah baris
SEMULA sesudah dihapus. Selisih positif berarti kotoran dummy tertinggal di
produksi; selisih negatif berarti data ASLI ikut terhapus, dan itu jauh lebih
buruk. Uji ini WAJIB menyapu data dummy lama dulu sebelum mengambil potret
"sebelum", kalau tidak ia akan menuduh kehilangan data padahal yang terhapus
semuanya baris dummy — dan uji yang menuduh salah lebih cepat ditinggalkan
orang daripada uji yang tidak ada.

Uji yang sama juga menegakkan KELAS B: **minimal satu baris kurang DAN satu
baris lebih** di tiap sumbu selisih yang punya tabnya sendiri.

Dan KELAS C, dua asersi yang harus berpasangan: jalankan satu langkah hilir di
periode yang hulunya SENGAJA belum ada, lalu tuntut (a) ia melapor nol baris
DAN tidak tercatat di buku langkah, (b) sesudah rantai penuhnya jalan, langkah
yang sama melahirkan barisnya DAN tercatat. Yang pertama saja bisa dilewatkan
dengan tidak pernah mencatat apa pun; yang kedua saja adalah keadaan hari ini.

## Cara memasangnya di repo baru

Rujukannya `mbg-kdmp`:

| Berkas | Isinya |
| ------ | ------ |
| `components/DataDummyTombol.tsx` | dua ikon, gerbang peran, muat ulang penuh |
| `lib/dummy-modul.ts` | peta halaman → modul, diekspor supaya bisa digerbang |
| `lib/periode-layar.ts` | periode terpampang untuk perkakas di luar halaman |
| migrasi `dummy_jejak` + `dummy_catat` | pencatat jejak lewat trigger |
| migrasi `dummy_rantai` + `dummy_langkah` | rantai modul & buku langkah |
| `tests/unit/gerbang-dummy.test.ts` | pemindai sumber |
| `tests/unit/gerbang-dummy-layar.test.ts` | gerbang cakupan layar |
| `tests/e2e/cakupan-dummy.json` | registri vonis per tabel |
| `tests/e2e/05-dummy-jejak.sql` | uji isi → hapus → hitung |

Salin polanya, jangan rancang ulang.

## Ranjau yang berulang

**Induk yang NONAKTIF.** Pengisian yang memilih "baris pertama menurut id"
gampang mendarat di entitas yang arsip/nonaktif, dan layar yang benar memang
membuangnya. Datanya lahir, jumlah barisnya dilaporkan, dan tak satu pun layar
memperlihatkannya. Pilih induk yang AKTIF dan yang punya data pendukungnya.

**Kolom harga JUAL diisi harga BELI.** Dua sisi harga yang disamakan membuat
tiap metrik selisih (profit, margin, profit per kelompok) NOL PERSIS di semua
baris — pola yang terbaca sebagai rumus rusak, bukan data karangan. Sama
persisnya dengan KELAS B di atas: pisahkan kedua sisi sejak awal.

**Satu baris di hari TERAKHIR periode.** Pengisi yang menulis satu baris di
`tanggal[terakhir]` meninggalkan layar hari pertama kosong — dan picker hari
hampir selalu mendarat di hari PERTAMA periode yang dibuka. Isi per hari.

**Tanggal turunan yang jatuh di luar periode.** Pembayaran bertanggal
"order + 2 hari" untuk order hari Kamis dan Jumat mendarat di akhir pekan, di
luar minggu yang sedang dilihat. Barisnya ada, metriknya nol. Tanggal turunan
harus dijepit ke dalam periode yang diisi.

**Kolom generated ditulisi.** Satu kolom turunan yang ikut di-INSERT
membatalkan SELURUH RPC, termasuk semua modul yang sudah lahir sebelumnya.

**Kunci unik hafalan.** Id sumber yang dipatok mati (`-101`, `-102`) tidak
pernah bentrok selama gerbangnya cuma mengizinkan satu kali pengisian. Begitu
pengisian kedua boleh lahir, ia menabrak, dan yang gagal bukan modulnya saja
melainkan seluruh rantainya. Turunkan dari id induknya.

**Prasyarat rantai dilewati.** Order berdiri di atas menu hari itu, PO berdiri
di atas order, faktur berdiri di atas PO. Modul yang diisi tanpa hulunya
melahirkan layar yang tetap kosong sambil tombolnya melapor sukses.

**Pemindaian yang diulang per hari.** Pertanyaan yang jawabannya tidak berubah
sepanjang pengisian ("resep mana yang biayanya paling dekat ke pagu") dihitung
SEKALI, bukan lima kali per hari. Sebulan penuh berarti ratusan pemindaian, dan
peran aplikasi dipatok `statement_timeout` beberapa detik: yang muncul di layar
"canceling statement due to statement timeout", dan karena timeout membatalkan
seluruh transaksi, tidak ada satu pun baris tertinggal untuk diperiksa.

**Timeout-nya TIDAK BISA dinaikkan dari dalam fungsinya.** Baris yang selama
ini dipakai sebagai obat —

```sql
perform set_config('statement_timeout', '180s', true);
```

— tidak berpengaruh apa-apa. Postgres memasang timer `statement_timeout` SATU
KALI, saat statement-nya dimulai; mengubah GUC-nya di tengah jalan tidak
me-reset timer yang sudah berjalan. Buktinya sebaris:

```sql
set statement_timeout = '2s';
do $x$ begin
  perform set_config('statement_timeout','120s',true);
  perform pg_sleep(5);
end $x$;
-- ERROR: 57014: canceling statement due to statement timeout
```

Karena baris itu terlihat seperti obat, rantai yang kepanjangan bisa hidup
berbulan-bulan tanpa ada yang mencurigainya: di mbg-kdmp enam belas migrasi
memakainya, dan yang pertama meledak adalah halaman dengan rantai TERPANJANG
(Dashboard, 16 fungsi), bukan yang paling awal ditulis.

Yang benar memecah kerjanya jadi BEBERAPA statement — satu permintaan HTTP per
fungsi, masing-masing dapat anggarannya sendiri — dan buku langkah membuat yang
sudah jalan dilewati kalau ada yang putus di tengah. Rujukannya `mbg-kdmp`:
`dummy_isi_mulai` + `dummy_isi_langkah` (migrasi `20260830210000`).

Konsekuensinya gerbang "sudah-ada" wajib pindah sumber: ia menghitung LANGKAH
yang sudah jalan, bukan ada tidaknya jejak. Gerbang berbasis jejak akan menolak
melanjutkan rantai yang putus di fungsi ke-9, selamanya, dengan pesan "sudah
ada" untuk layar yang separuhnya masih kosong.

Pindah sumber itu memindahkan bebannya, bukan menghapusnya: buku langkah kini
satu-satunya yang tahu apa yang sudah jadi, jadi satu catatan palsu di dalamnya
sama mahalnya dengan gerbang yang salah. Itulah KELAS C, dan itulah kenapa
langkah nol-baris wajib dicabut lagi.

Sisanya tetap: satu fungsi yang SENDIRIAN tidak muat di anggarannya tidak
tertolong pemecahan. Yang menolongnya cuma mengurangi kerjanya — dan pemindaian
per hari itulah yang pertama diperiksa.

**Potongan hari yang lupa membawa offset rotasinya.** Fungsi yang terlalu
berat untuk satu statement dipotong per hari, satu permintaan per potongan.
Tapi rotasi ember hampir selalu menghitung URUTAN HARI di dalam satu panggilan
(`v_i % 4` untuk status invoice, `% 5` untuk status pengiriman, `% 3` untuk
surat jalan). Dipotong tanpa mengoper offsetnya, tiap potongan mulai dari satu
lagi: seluruh layar berstatus sama, dan tiga dari empat embernya tidak pernah
lahir. Yang menyatakan sebuah fungsi SANGGUP dipotong sebaiknya tanda tangannya
sendiri — argumen `p_urut_awal` — supaya tidak ada daftar kedua yang harus
diingat penyunting, dan fungsi yang dipanggil dari dalam fungsi lain (pengiriman,
surat jalan) ikut menerima offset yang sama.

**Gerbang "sudah terpakai" yang mengadu kolom yang BEDA dari triggernya.**
Trigger anti-duplikat membandingkan tanggal ITEM (hari kirim); gerbang yang
ditulis belakangan melihat tanggal KEPALA dokumen. Dokumen asli rutin
bertanggal kepala H-1 dari hari kirimnya, jadi gerbangnya melewatkan persis
kasus yang menabrak — dan tabrakannya tetap membatalkan seluruh rantai.
Salin kunci perbandingan triggernya, jangan mengarang kunci yang "kira-kira
sama".

**Kolom taut ke hulu ditinggal kosong.** Baris hilir yang bertanggal benar tapi
tidak menyebut induknya di kolom relasinya tidak akan pernah sampai ke layar:
layar menjangkar ke RELASI, bukan ke tanggal. PO dummy 29 Agt 2026 lahir lengkap
— 5 PO, 4 faktur, 3 transfer, 107 rincian, semuanya di periode yang sedang
dilihat — dengan kolom tautnya kosong, dan tiga layar diam bersamaan sambil
tombolnya melapor sukses. Isi kolom tautnya di INSERT-nya, jangan ditambal
UPDATE belakangan, dan periksa dengan MEMBACA saringan yang dipakai layarnya,
bukan dengan melihat tabelnya penuh.

**Kunci turunan yang tidak sama persis dengan kunci layarnya.** Baris vonis
yang menaut lewat `nama|satuan` harus memakai normalisasi yang SAMA PERSIS
dengan layarnya (trim, huruf kecil, urutan). Kunci yang meleset melahirkan
baris yatim: ia ada di tabelnya, dan tak satu pun baris di layar menyebut
dirinya sudah divonis.

**Rantai yang tidak pernah dilahirkan.** Tabel yang tak satu pun fungsi dummy
menyentuhnya membuat beberapa layar diam BERSAMAAN, dan tak ada yang menyadari
keterkaitannya sampai ketiganya dilaporkan satu per satu. Inilah yang dijaga
registri cakupan layar.

## Yang TIDAK berubah

Data dummy tidak pernah menimpa data sungguhan, tidak pernah lahir di luar
peran Super Admin, tidak pernah melemahkan gerbang bisnis demi mengisi ember,
dan tidak pernah dipakai sebagai bukti bahwa fiturnya benar. Ia cuma membuat
fiturnya bisa DILIHAT; yang membuktikannya tetap uji.
