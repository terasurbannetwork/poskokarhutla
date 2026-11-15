# DESIGN-SYSTEM: Paritas Bencana

Tunduk pada `KEPUTUSAN-PARITAS.md` (K4: layar berbentuk dashboard memakai dashboard model A `/operasi` utuh; K5; D1) dan `PRD.md` (F-1 sampai F-33). Turunan dari `data/kajian-bnpb/dashboard/DESIGN-SYSTEM.md` dan `KEPUTUSAN-DASHBOARD.md` (D1 sampai D26; rujukan ke keputusan paket itu ditulis "KEPUTUSAN-DASHBOARD Dxx") serta `data/kajian-bnpb/operasi-udara/DESIGN-SYSTEM.md` bagian 7 (model A) dan 8 (tingkat wadah). Bila bertentangan, urutan menangnya: KEPUTUSAN-PARITAS, KEPUTUSAN-DASHBOARD, dokumen ini. Rujukan hidup: `http://localhost:8800/operasi` dan `http://localhost:8800/bnpb/sitrep`.

Prinsip paket ini satu: **tidak ada komponen visual baru**. Semua layar baru dirakit dari yang sudah ada di `public/inti/dasbor.css`, `public/inti/dasbor.js`, `public/inti/kartu.css`, dan pola `public/operasi_laporan.js`. Bila kebutuhan tak terpenuhi, tambahkan varian kecil di `dasbor.css` (awalan `.db-`) dan tulis alasannya di tiket; jangan membuat berkas gaya per bencana (D1).

## 1. Aturan selera yang mengikat

| Aturan | Sumber | Cara diperiksa |
| --- | --- | --- |
| Model A: panel seksi kiri bisa ditarik 200 sampai 320 px (KEPUTUSAN D12, bawaan 232 px), kepala halaman (L1) navy, isi kanan, kaki "Pembaruan data" | KEPUTUSAN-DASHBOARD D1, KEPUTUSAN-PARITAS K4 | `MODEL_A` di `tests/agen/gerbang-dasbor.test.mjs` |
| Gelap hanya L1 dan kepala tabel (navy `#0b2545`, teks putih). Kepala bagian, kartu, pop-up isi, tooltip, hover: terang | KEPUTUSAN-DASHBOARD D4, D5, D9 | tes "dasbor.css: tanpa latar gelap lain" |
| Kepala kartu = nama seksi berikon (pil kategori `.ex-ey`), tanpa kalimat kesimpulan di kepala atau baris pertama isi, tanpa kaki "Sumber:". Definisi kolom masuk `title` kepala tabel | AGENTS 3.5 pembaruan 11 Nov, KEPUTUSAN-DASHBOARD D14 | `gerbang-kartu-std`, `gerbang-tanpa-kesimpulan` |
| Tanpa huruf kapital dipaksa (`text-transform:uppercase` dilarang); nama diri dan singkatan ditulis apa adanya | memori "Tanpa kapital" | tes dasbor.css |
| Tanpa titik tengah sebagai pemisah. Pisahkan dengan koma, kalimat, label sendiri, atau baris baru; angka kunci di depan | memori "Tanpa titik tengah" | `gerbang-bahasa` bila ada, tinjau manual |
| Ikon garis (stroke, `viewBox="0 0 24 24"`, `aria-hidden`), polos tanpa kotak, tanpa latar, tanpa garis luar. Satu-satunya kotak: ikon L2 navy 28 px yang sudah ada | memori "Ikon tanpa garis luar" | tinjauan |
| Tanpa data dummy, tanpa tombol 🧪/🧹, tanpa contoh angka di layar produksi. Belum ada data = pil status "belum ada data" atau "belum dilaporkan", bukan nol dan bukan tanda strip besar | standar global 11 Nov, KEPUTUSAN-DASHBOARD D21 | `gerbang-tanpa-dummy` |
| Kartu dan bagian tidak menempel: jarak 20 px antar kartu, 12 sampai 20 px antar wadah | memori "Kartu tidak menempel" | gerbang renggang |
| Kolom berdampingan berakhir sama tinggi; tidak ada blok kosong di bawah kolom pendek | KEPUTUSAN-DASHBOARD D2 | ukur di peramban sebelum lapor selesai |
| Grid simetris: 1 sampai 5 sebaris, 6 = 3x2, 7 sampai 8 = 4x2, 9 = 3x3, 10 = 5x2 | KEPUTUSAN-DASHBOARD D3 | tinjauan |
| Paragraf rata kiri-kanan (justify); grafik dan gambar interaktif dengan tooltip terang | memori "Selera teks dan grafik" | tinjauan |
| Nama situs Centurisk97; tidak pernah "Pantau Bencana" | memori | `gerbang-nama` |
| Bahasa Indonesia lugas; label status memakai warna, ikon, dan teks sekaligus | KEPUTUSAN-DASHBOARD D15 | tinjauan |

## 2. Token dan komponen yang dipakai ulang

Token memakai `public/inti/dasbor.css`: `--db-navy`, `--db-biru`, `--db-h2`, `--db-h2-garis`, `--db-isi`, `--db-merah-h2`, `--db-merah-isi`, palet status KEPUTUSAN-DASHBOARD D15 (Aman hijau, Patroli biru, Siaga kuning, Prioritas merah, Perhatian oranye). Warna bencana (`warna` di `public/bencana.json`) hanya dipakai di ikon peta dan batang bertumpuk per jenis, tidak pernah di kepala atau latar.

| Kebutuhan layar baru | Dipakai ulang dari | Catatan |
| --- | --- | --- |
| Cangkang model A | `DasborA.pasang({nama, sub, kaki})` di `public/inti/dasbor.js` (halaman statis memuat `/inti/dasbor.css` lalu `/inti/dasbor.js`); atau mode otomatis `data-oto` bila hanya perlu cermin tab | `/operasi` memakai varian sendiri (`ops-nav`, `ops-judul`, `public/operasi_laporan.js:178`); layar baru memakai `DasborA` supaya tidak menyalin |
| Ubin angka utama 3x2 berpembanding | `.ops-rk`, `.ops-cmp` | pil tanggal, angka, delta, periode lalu redup |
| Perlu tindakan | `.ops-tindak` | daftar tegak, urut paling mendesak, tone merah L2 |
| Tangga tindakan, rencana tindakan | `.ops-apm`, `.ops-apr` (matriks entitas x tenggat) | satu baris per tingkat peringatan, satu kolom per tenggat |
| Kartu entitas (operasi, wilayah, sarana) | `.ops-pb` | kepala nama + pil kode + pil sub; baris label kiri, nilai pil kanan, tinggi 34 px |
| Tabel | `.ops-tw`, `Dasbor.tabelH`, `urutTabel`, `lipatGrup` | kepala navy; urut dengan klik kepala; grup per wilayah dilipat; saringan segmen |
| Label kategori lurus | `.ops-layak` | slot tetap per kategori, slot kosong tetap ada |
| Pil | `.pill`, `.ops-lbl` | ikon 11 sampai 12 px + teks |
| Tren | `.ops-tren2`; uPlot bila butuh kursor (KEPUTUSAN-DASHBOARD D23) | legenda di bawah grafik (KEPUTUSAN-DASHBOARD D16) |
| Batang harian bertumpuk | `.ops-ks` | kategori per jenis bencana memakai warna registri |
| Peta renlap dan sarana | `.ops-peta` | laci kiri daftar entitas, laci kanan rincian titik; legenda = saklar lapisan |
| Pemilih periode | `.ops-periode` | 3 baris, ikut tergulir |
| Pop-up | `bukaDialog` (`<dialog>`) | Esc, tombol tutup, klik latar menutup; fokus kembali ke pemicu |
| Kartu standar | `.ex.ex-std` dari `public/inti/kartu.css` | semua isi layar masuk kartu ini |
| Saringan jenis bencana | segmen `.db-mode` (2 pilihan) atau deret pil saring `.ops-pilih2` | lihat bagian 4 |

Yang boleh ditambah (varian, bukan komponen): kelas `.db-jenis` untuk pil jenis bencana (ikon registri + nama), `.db-sk` untuk baris papan status darurat bila `.ops-pb` tak cukup. Keduanya wajib mengikuti token di atas dan lolos tes dasbor.css.

## 3. Susunan umum layar paritas

Tiap layar baru berbentuk model A. Susunan tetap:

```
+-----------------------------------------------------------------------------+
| L1 kepala halaman (navy, judul putih rata tengah berikon)                   |
+------------------+----------------------------------------------------------+
| panel kiri 232px, tarik | kepala isi: judul seksi kiri, pemilih periode/saringan   |
| Isi halaman      |   satu baris di kanan                                    |
|  grup berikon    | kartu .ex.ex-std (L2) berurutan, jarak 20px              |
|  seksi + angka   |                                                          |
| kaki:            |                                                          |
| Pembaruan data   |                                                          |
+------------------+----------------------------------------------------------+
```

Panel kiri dibangun otomatis dari kartu `.ex.ex-std` oleh `DasborA.seksi()` (nama seksi dari pil kategori). Kaki panel berisi satu baris per sumber data: titik warna kesegaran, nama sumber, waktu (`DasborA.kaki([[warna, label, nilai], ...])`). Satu tampilan satu hash (`#ringkasan`), jadi tombol kembali dan tautan bekerja. Pindah seksi hanya mengganti `hidden`, tidak render ulang.

## 4. Wireframe teks tiap layar baru

Pengerja layar: `inti-layar` untuk `public/inti/**` dan registri; modul bencana sendiri hanya menyerahkan data dan konfigurasi (D1, D11). Rute `/api/*` baru dan hak: tercantum di `DESAIN-TEKNIS.md`, tidak diulang di sini.

### 4.1 Dashboard pimpinan lintas bencana (F-18, F-19, Q2)

Rute `/bnpb/pimpinan` (berkas `public/bnpb/pimpinan.html`, `pimpinan.js`; Q13). Pola Q2: satu dashboard dengan saringan jenis.

```
L1  Dashboard pimpinan                                   [ikon perisai]
kiri:  Hari ini        | Ringkasan            3
                       | Perlu tindakan       5
       Per jenis       | Status darurat       12
                       | Operasi berjalan     4
                       | Kesiapan             8 jenis
       Rujukan         | Laporan berkala
       kaki: Pembaruan data (satu baris per jenis: titik warna, nama, jam)

kepala isi:  Ringkasan                    [Semua jenis v pil saring] [Hari|Minggu|Bulan] < 15 Nov >
-----------------------------------------------------------------------------
[kartu] Angka utama (ubin 3x2, tiap ubin: kepala ikon + nama, angka, delta lawan periode lalu)
   kejadian | korban terdampak | pengungsi | status darurat aktif | operasi berjalan | peringatan aktif
[kolom kiri 1fr]                         [kolom kanan 360px, sama tinggi]
 [kartu] Per jenis bencana                [kartu] Perlu tindakan
  tabel .ops-tw: jenis (pil), kejadian,    daftar tegak urut mendesak:
  peringatan, status darurat, operasi,     SK akan berakhir, renlap telat,
  data terbaru; klik baris = saring        peringatan tingkat tinggi tanpa tindakan
 [kartu] Tren 30 hari (batang bertumpuk warna jenis, legenda pil di bawah)
```

Saringan jenis: deret pil saring lebar penuh, dibagi rata (memori "Deretan pilihan ujung ke ujung"), berikon: Semua jenis, lalu satu pil per entri `bencana.json` berstatus aktif (urutan registri), label bahasa Indonesia. Pilihan jamak diperbolehkan (rantai pil, bukan segmen). Pilihan tersimpan di hash (`#jenis=banjir,longsor`) dan `localStorage` hanya sebagai kemudahan per penonton. Saringan mengubah atribut `hidden` baris tabel dan mengganti angka dari muatan ringkas yang sudah dimuat (F-19); tidak ada render ulang penuh dan tidak ada panggilan jaringan per klik (INP).

Seksi lain (kartu L2, masing-masing satu seksi di panel kiri): Perlu tindakan, Status darurat (4.2), Operasi berjalan (tabel entitas per jenis), Kesiapan (kartu entitas `.ops-pb` per jenis: umur data terbaru, model lolos uji atau pil hipotesis), Laporan berkala (tautan ke `/laporan-bnpb`, tanpa mesin laporan baru, D9).

### 4.2 Papan status darurat (F-20, Q5)

Seksi di dashboard pimpinan dan layar penuh `/bnpb/siaga` (`public/bnpb/siaga.html` yang sudah ada; papan dilebur ke sana sesuai Q13, tumpang tindih ditinjau dulu di tiket PB-29; KEPUTUSAN-DASHBOARD D26 membolehkan integrasi).

```
kepala isi: Status darurat            [Semua jenis] [Siaga|Tanggap|Transisi] [Semua provinsi v]
[kartu] Ringkasan: 4 ubin sebaris (siaga, tanggap darurat, transisi pemulihan, akan berakhir 7 hari)
[kartu] Daftar status  (tabel .ops-tw, grup per provinsi dilipat, urut default "sisa hari" naik)
  kolom: wilayah | jenis (pil .db-jenis) | tingkat (pil status) | nomor SK | tanggal SK | berlaku sampai | sisa hari (pil: merah <=3, kuning <=7, hijau lain) | aksi
  baris akan berakhir diberi pil "akan berakhir" + tombol ikon "perpanjang" (staf berperan saja)
[pop-up] klik baris: kepala identitas + pil tingkat; seksi <details>: riwayat SK (append-only), operasi terkait, renlap terakhir
```

Sumber data hanya `logbook_sk` (Q5 bawaan). Belum ada SK: keadaan kosong bagian 6, bukan baris contoh.

### 4.3 Operasi dan renlap per bencana (F-1 sampai F-7)

Di `/operasi` yang sudah ada (model A, `public/operasi_laporan.js`) ditambah pemilih jenis di kepala isi dan seksi baru; di halaman tiap bencana, tab `operasi` membuka tampilan yang sama dengan jenis terkunci. Jangan membuat layar operasi kedua (D1).

```
panel kiri  Hari ini    | Ringkasan | Sarana dan armada | Peta | Renlap
            Kinerja     | Tren | Kepatuhan | Hasil tindakan
            Catatan     | Operasi non-udara (isian staf)

kepala isi: Renlap                         [jenis: terkunci pada halaman bencana, pil saring di /operasi] [periode]
[kartu] Sarana dan armada      tabel per jenis sarana (registri F-2: perahu, pompa, truk tangki, tenda, terpal, alat berat, masker);
                               kolom: sarana | jumlah siap | jumlah dipakai | lokasi base | terakhir diisi (pil)
[kartu] Renlap                 blok per wilayah (L3) berisi kartu renlap (L4): versi, masa berlaku, target, sumber daya, rute;
                               tombol ikon: PDF, KML, GPX, teks WA; versi lama bisa dibuka, tidak bisa ditimpa
[kartu] Peta renlap            .ops-peta: laci kiri daftar target, laci kanan rincian; lapisan fasilitas sasaran (F-7) sebagai saklar legenda
[kartu] Kepatuhan dan hasil    ubin persen kepatuhan + tabel target didatangi / tidak (alasan) / hasil (F-5); kru tidak disebut nama (D8)
[kartu] Isian operasi          form staf berperan dan akun instansi wilayahnya (F-4); panel hanya muncul bila hak cukup
```

Kluster api, poligon, dan angin tetap khusus karhutla: kartunya tidak dirender untuk jenis lain (bukan disembunyikan dengan CSS; tidak dibuat sama sekali). Operasi gempa, cuaca, dan udara memakai kosakata K5: SAR, evakuasi, tenda, air; distribusi terpal dan atap darurat, pembersihan jalan; distribusi masker, ruang udara bersih.

### 4.4 Tangga tindakan (F-15, F-14, F-17)

Kartu "Tangga tindakan" di tab `peringatan` per bencana dan seksi di dashboard pimpinan.

```
[kartu] Tangga tindakan                 [jenis: terkunci/pil] [wilayah v]
  baris per tingkat peringatan (matriks .ops-apm): kolom = tingkat saat ini, +0, +1 jam, +6 jam, +24 jam
  isi sel: daftar periksa, tiap butir: pelaksana (pil), batas waktu (pil), status (selesai/belum, warna + ikon + teks)
  baris tingkat yang sedang berlaku diberi aksen kiri warna tingkat dan dibuka; tingkat lain terlipat
  butir selesai dicentang staf berperan; riwayat centang append-only
kaki kartu (di dalam isi, bukan kaki "Sumber:"): pil ambang dengan rujukan; ambang berpil "perlu cek" bila Q9 belum terjawab
```

Daftar periksa menyala otomatis saat tingkat berubah (entri `BENCANA` di `public/ews_tindakan.js`); ambang memakai yang sudah ada di kode sampai Q9 dijawab.

### 4.5 Pembuat dokumen (F-8 sampai F-13)

Pembuat dokumen dilebur ke layar `/bnpb/sitrep` yang sudah ada (`public/bnpb/sitrep.html`, `sitrep.js`; Q13), model A, memakai ulang pola sitrep (`sr-nav`, `sr-a`); tidak ada layar dokumen terpisah.

```
panel kiri  Susun       | Sitrep | Renops | Laporan kejadian | Deck harian
            Arsip       | Versi beku
            kaki: Pembaruan data (umur angka per sumber)

kepala isi: Sitrep                         [jenis v] [wilayah v] [periode]
[kartu] Bahan (angka dari sistem)  tabel angka bertoken: nama angka, nilai, umur data (pil), tautan sumber di title kepala kolom;
                                   angka antarsumber tidak dijumlah; angka karhutla hanya dari sistem
[kartu] Naskah                     kolom kiri: bagian-bagian (judul tetap dari kerangka); kolom kanan: pratinjau A4;
                                   kalimat kebijakan ditulis staf di kotak isian (tidak diisi mesin)
[kartu] Terbit                     tombol: simpan draf, bekukan versi, cetak A4, PDF; deck lewat mesin deck dan bot WA (F-11)
[kartu] Versi beku                 tabel versi (nomor, waktu, penyusun peran, jenis); versi beku tidak pernah ditimpa; hanya versi baru
```

Keadaan kosong: belum ada angka untuk jenis itu = baris angka berpil "belum ada data", dokumen tetap bisa dirakit dari bagian yang ada. Renops: kerangka Perka BNPB 24/2010; isi lampiran bertanda "perlu cek" sampai dibaca (F-9). Tanpa buku kejadian baru (D10): daftar kejadian menaut ke `/siklus`.

## 5. Cara tiap bencana menyalakan tab lewat `public/bencana.json`

Prinsip D1: tab dinyalakan oleh data registri, bukan oleh kode per bencana. Entri bencana sudah punya `tab` (daftar id), `tab_sembunyi`, dan `halaman` (id tab ke berkas HTML). Aturan:

1. Tab baru diberi id tetap yang sama di semua bencana: `operasi`, `renlap` (hanya bila dipisah dari operasi), `tindakan`, `dokumen`, `darurat`. Id tab yang sudah ada di karhutla (`operasi`, `dalops`) tidak diganti nama.
2. Bencana menyalakan tab dengan menambahkan id ke larik `tab`. Menghilangkan id mematikannya. Tidak ada percabangan `if (id === "longsor")` di kode layar.
3. Layar tab dimuat oleh pemuat generik di `public/inti/` (pengerja `inti-layar`) yang membaca `bencana.json`; ia memberi layar objek konfigurasi `{id, nama, warna, data, sarana, ambang, jenisSarana}` dari entri registri. Layar membaca jenis dari konfigurasi, bukan dari konstanta.
4. Kunci registri baru (semua opsional; tiap kunci wajib punya baris di gerbang registri yang sudah ada sebelum dipakai): `sarana` (daftar id jenis sarana F-2), `operasi` (daftar kosakata operasi K5), `tangga` (rujukan ke entri `BENCANA` di `public/ews_tindakan.js`), `dokumen` (jenis dokumen yang berlaku), `ringkas` (jalur muatan ringkas F-19, misalnya `/data/<id>/ringkas.json`).
5. Tab hanya muncul bila datanya ada. Tab yang dinyalakan tetapi datanya belum ada tidak disembunyikan diam-diam: ia tampil dengan keadaan kosong bagian 6 supaya celah terlihat.
6. Urutan menyalakan di F2 mengikuti D5: longsor, pesisir, udara, kekeringan, cuaca, gempa dan tsunami, gunung api, banjir. Karhutla dan banjir menyalakan lewat jalur yang sama (pembuktian D4) dan hitungan ADA mereka tidak boleh turun.
7. Longsor tetap tab di `/banjir` dengan entri registri sendiri (Q1 bawaan); layar sendiri `/longsor` dibangun hanya bila pemilik memintanya.

## 6. Keadaan layar

Semua layar baru mengimplementasikan lima keadaan. Tidak ada keadaan yang diisi angka contoh.

| Keadaan | Tampilan | Aturan |
| --- | --- | --- |
| Memuat | rangka kartu (kepala nama seksi nyata, isi garis abu muda berdenyut halus, tanpa putar) | kepala dan panel kiri langsung ada; hanya isi yang menunggu; hormati `prefers-reduced-motion` |
| Kosong | satu baris di tengah isi kartu: ikon garis + kalimat lugas ("Belum ada operasi untuk jenis ini") + tombol ikon aksi bila peran berhak ("Buka operasi") | tanpa ilustrasi besar; bukan nol; pil "belum ada data" di ubin angka |
| Galat | pil merah berikon + kalimat penyebab + tombol "Coba lagi" yang hanya memuat ulang kartu itu | galat satu kartu tidak merobohkan kartu lain; 401 mengarah ke masuk, 403 menampilkan "peran tidak cukup"; pesan tidak memuat teks galat mentah server |
| Luring | pita tipis di atas isi, pil "luring, menampilkan data tersimpan" dengan waktu data terakhir; isian staf masuk antrean luring (pola `public/petugas/**`) dan ditandai "belum terkirim" | data tersimpan dari muatan terakhir; tombol terbit dan bekukan dinonaktifkan sampai daring |
| Basi | titik kaki panel kiri berubah kuning lalu merah menurut batas basi sumber; ubin angka memberi pil umur | batas basi per sumber dari registri atau skrip kesegaran yang ada (F-30); tidak pernah menyembunyikan angka basi, hanya menandainya |

Hak akses tidak disembunyikan dengan CSS: bagian yang butuh peran tidak dirender untuk peran yang tidak berhak, dan server tetap menolak (`src/hak.js`, `stafPeran`).

## 7. HP lebar 375 px

- Di bawah 900 px panel kiri jadi deret seksi yang bisa digeser di atas isi (`dasbor.css` baris 85: `.db-a` satu kolom, `.db-nav-isi` baris); kolom kanan turun ke bawah; kepala L1 tidak ikut tergulir.
- Tidak ada gulir horizontal halaman. Tabel lebar dibungkus pembungkus gulir sendiri dengan kolom pertama menempel; angka tetap rata kanan.
- Grid simetris (KEPUTUSAN-DASHBOARD D3) turun: 3x2 menjadi 2x3, 4x2 menjadi 2x4; ubin tidak pernah satu sendirian di baris.
- Saringan jenis menjadi deret pil yang bisa digeser, tinggi sentuh minimal 44 px; segmen dua pilihan tetap lebar penuh.
- Pop-up `<dialog>` memenuhi lebar layar dengan tepi 8 px; tombol tutup di kanan atas.
- Peta renlap: laci jadi lembar bawah; legenda = saklar tetap bisa dijangkau.
- Diuji di emulasi 375 px dan di `http://localhost:8800/<jalur>` sebelum tiket ditutup (AGENTS 3.8).

## 8. Kinerja dan INP

Aturan `~/.claude/INP.md` berlaku. Ringkasannya untuk layar paritas:

- Klik, tab, saring, lipat, dan pindah seksi tidak membekukan layar. Chrome kontrol (segmen, pil saring, tab, tombol) berubah urgent pada klik yang sama; subtree berat (tabel panjang, peta, grafik) ditunda lewat `startTransition` atau `requestIdleCallback`. Membungkus seluruh pembaruan dalam transition bukan obatnya.
- Saringan jenis, urut tabel, dan lipat grup hanya mengubah atribut `hidden` dan urutan simpul yang sudah dirender, bukan membangun ulang dari data.
- Muatan ringkas per jenis dimuat sekali per kunjungan, paralel; satu berkas ringkas per jenis dengan batas ukuran tertulis di DESAIN-TEKNIS; tidak ada permintaan per klik.
- Tabel lebih dari 200 baris dirender bertahap per grup wilayah (grup terlipat tidak dirender sampai dibuka).
- Tanpa gaya inline selain variabel warna (CSP), tanpa render ulang saat pindah seksi.
- Tiap tiket layar menjalankan `inp-reviewer` sebelum selesai; layar yang menambah handler klik baru wajib melewati `gerbang-inp-transisi`.

## 9. Gerbang yang wajib diperbarui

Layar baru tanpa gerbang dianggap belum jadi. Tiap tiket layar menambah barisnya dalam commit yang sama.

| Gerbang | Berkas | Yang ditambah |
| --- | --- | --- |
| `tests/agen/gerbang-dasbor.test.mjs` | `LAYAR` | `public/bnpb/pimpinan.html`, `public/bnpb/sitrep.html` (pembuat dokumen), `public/bnpb/siaga.html` (papan status darurat), halaman bencana yang memuat tab baru bila berupa HTML sendiri |
| `tests/agen/gerbang-dasbor.test.mjs` | `MODEL_A` | `"public/bnpb/pimpinan.js": ["db-nav-isi", "db-l1"]` atau tanda `DasborA?.pasang` seperti `public/bnpb/silang.js`; `public/bnpb/sitrep.js` dan `public/bnpb/siaga.js` memakai tanda yang sudah ada di entri `MODEL_A` masing-masing (ditambah bila belum); layar `/operasi` sudah ada (`ops-nav`, `ops-judul`) dan tidak berubah |
| `tests/agen/gerbang-kartu-std.test.mjs` | `LAYAR` (skrip + html) | `{skrip: 'public/bnpb/pimpinan.js', html: 'public/bnpb/pimpinan.html', lama: []}`, begitu pula `sitrep` dan `siaga` bila belum terdaftar; skrip tab yang membangun kartu lewat `kartu()` dari `inti.js` ditambahkan ke daftar skrip yang tak boleh membuat kepala bagian sendiri |
| `tests/agen/gerbang-tanpa-kesimpulan.test.mjs` | daftar layar | layar baru di atas (kepala nama seksi, tanpa kalimat temuan) |
| `tests/agen/gerbang-tinjau-lokal.test.mjs` | daftar jalur | jalur baru agar tautan `http://localhost:8800/<jalur>` ikut diperiksa |
| Gerbang registri bencana | uji registri `public/bencana.json` | kunci baru (`sarana`, `operasi`, `tangga`, `dokumen`, `ringkas`) beserta jenis nilainya |
| `gerbang-test-integrasi` dan `tests/warga/cakupan.json` (KEPUTUSAN-PARITAS D14) | registri cakupan | rute, trigger, dan alur lintas tabel baru (hak, renlap versi, SK) wajib punya uji integrasi yang menjalankannya, bukan mock |

Bila `gerbang-dasbor` belum punya tes untuk keadaan kosong, tambahkan satu: tiap layar baru memuat kalimat keadaan kosong tertulis dan tidak memuat angka literal contoh.

## 10. Pertanyaan untuk KEPUTUSAN

> Catatan orkestrator 15 Nov 2026: pertanyaan di bagian ini sudah dipindah ke KEPUTUSAN-PARITAS.md (Q1 sampai Q37) dan dinomori ulang di sana. Bila isi atau bawaan berbeda, KEPUTUSAN yang berlaku. Untuk rute layar baru berlaku Q13 (papan status darurat dilebur ke `siaga.html`, pembuat dokumen di `/bnpb/sitrep`, dashboard pimpinan `/bnpb/pimpinan`); panel kiri berlaku D12.
