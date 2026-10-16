# Paritas karhutla vs gunung api: tabel akhir

Audit 16 Okt 2026 (HEAD b84ba76 + perbaikan audit ini), `wrangler dev --local` (port 8797, migrasi D1 lokal diterapkan), Chrome headless via Playwright, 1440x900 dan 390x844, ID dan `?lang=en`. Tangkapan berdampingan (karhutla kiri, gunung api kanan) per tab di folder kerja audit. Galat konsol milik gunung api: tidak ada. Yang tersisa sama di kedua sisi: 404 favicon situs berita luar, 404 `/api/titik` dan `harian30.json` hanya di karhutla (D1 tidak ada di lokal), CSP report-only frame-src Tentang.

Keterangan: SAMA = identik atau memakai mesin bersama yang sama. D = beda yang sah karena data/bahaya (alasan tertulis). BEDA = selisih yang belum bisa ditutup.

Hasil (baris tabel di bawah; satu baris bisa memuat beberapa butir): 24 SAMA, 10 D, 4 BEDA. Status registry tidak diubah. **Belum SIAP AKTIF**: empat BEDA terbuka (Foto; isi berkala Berita; isi berkala Dampak; gambar OG khas modul), semuanya butuh pemilik lain (lihat "Perlu dari luar wilayah").

## Diperbaiki pada audit ini

| Selisih | Perbaikan |
| --- | --- |
| Kepala tanpa lonceng Peringatan Dini | `index.html`: tautan `/peringatan` seperti karhutla/banjir |
| Menu bencana memakai `data-tentang data-tanpa-segera` (tanpa "Segera", ada "Tentang kami") | dilepas; menu digambar registry persis seperti karhutla |
| Tab hanya Peta, Insight, Metode, Tentang | tambah Berita, Tren, Dampak (Foto disiapkan tapi disembunyikan, lihat BEDA); Metode disembunyikan (A24) |
| Peta dasar putih (positron) dan "Citra satelit" mati | satelit hidup bawaan seperti karhutla |
| Overlay: judul polos | `lapis-hd` gelap + tombol lipat semua grup (`mulai.js`) |
| Daftar kiri berupa kartu baris tanpa kepala | tabel standar: kepala gelap, kolom bisa diurut (Gunung, Provinsi, Radius, Status) |
| Kamera awal beda dengan karhutla (pusat lat -2,11 vs -6,28 di 1440) | padding bawah 163 (nilai terukur karhutla); sekarang pusat dan zoom identik di 1440 dan 390 |
| `bagikan.sumber` registry menyebut "Smithsonian GVP" padahal GVP menjawab 403 dan tak dipakai | `bencana.json`: "PVMBG (MAGMA Indonesia)" |
| Meta OG tanpa gambar, tanpa blok `<!-- og -->` | blok OG lengkap (og:image 1200x630, twitter large) |
| Insight: kartu Penduduk dobel dengan Dampak | pindah ke tab Dampak (Insight karhutla tak memuatnya) |
| EN: 52 kalimat Indonesia di tab baru dan popup | `i18n/en.json`: kunci baru; kutipan resmi PVMBG (rekomendasi, keterangan erupsi) diberi `translate="no"` |
| **Data**: tanggal letusan salah (daftar erupsi "120 erupsi dalam 1 jam" dan jam di masa depan) | `magma.py urai_letusan`: judul hari lama ("Kamis, 15 Oktober 2026, 1 hari yang lalu") tak terbaca sehingga semua letusan halaman 2-3 dianggap hari ini; diperbaiki + dedupe halaman tumpang tindih + urut terbaru dulu + uji. Erupsi 24 jam yang benar: 18 |

## 1. Kepala

| # | Hasil | Catatan |
| --- | --- | --- |
| K1 tab | SAMA | Peta, Insight, Berita, Tren, Dampak, Tentang; Foto dan Metode disembunyikan (A24) |
| K1b tab Simulasi | D | Pantau Bencana tidak meramal letusan dan tidak menentukan level sendiri; tak ada model untuk disimulasikan |
| K2 jarak tab, K3 menu bencana, judul tab, logo, ikon, ID/EN, bagikan, tema, burger, lonceng | SAMA | |
| K4 chip El Nino | D | chip ENSO adalah data iklim karhutla/kekeringan; tak ada padanan untuk gunung api |

## 2. Peta

| # | Hasil | Catatan |
| --- | --- | --- |
| P1 dasar satelit | SAMA | |
| P2 kamera awal | SAMA | pusat (112,38; -6,28) zoom 3,32 di 1440; (118; -22,64) zoom 3 di 390, identik dengan karhutla |
| P3 panel 440, P11 kolom kanan | SAMA | |
| P4 crumb "Indonesia" di luar kartu | D | gunung api titik, tanpa tingkat wilayah untuk ditelusuri turun |
| P5 seg atas + cari | D | seg level (Semua/Siaga/Waspada/Normal) menggantikan rentang waktu; cari gunung atau provinsi |
| P6 kepala tabel gelap, P7 bisa diurut, P9 tinggi baris, P10 pil status | SAMA | |
| P8 kolom Tren sparkline | D | riwayat level baru terkumpul sejak halaman ini jalan; kolom Radius menggantikan |
| P14 Overlay berkepala gelap + lipat, P15 grup + chevron | SAMA | |
| P16 chip BMKG | D | `databaru.js` hanya mengenal karhutla/banjir; peringatan resmi gunung api = status PVMBG itu sendiri |
| P17 legenda dok | D | dua kolom khas: level resmi PVMBG dan radius rekomendasi |
| P18 legenda terlipat pil, P19 laci/pop-up rincian, P20 kartu hover, P21 lembar bawah mobile, P23 chip LEGENDA | SAMA | `inti/peta/lapis.js`, `legenda.js`; pop-up lebar |

## 3. Pop-up Situasi, Insight

| # | Hasil | Catatan |
| --- | --- | --- |
| S1 eyebrow, judul berangka, chip, daftar, kaki Sumber + Lihat peta, 1440 dan 390 | SAMA | `inti/sapa.js`; sekali sehari `pb_sapa_gunungapi` |
| Insight: anatomi kartu, pil, judul merah, grafik berangka, kaki legenda + Sumber, bagikan, tabel standar | SAMA | Status, Erupsi, Perubahan level, Daftar gunung; kartu tanpa data dibuang (Perubahan level kosong sampai ada perubahan) |

## 4. Tren

| # | Hasil | Catatan |
| --- | --- | --- |
| T1 anatomi kartu, batang berangka, pil puncak, bagikan | SAMA | |
| T2 isi | D | Per tahun = kejadian erupsi BNPB 2010-2024; Status harian dan Erupsi harian muncul sendiri setelah dua hari (`riwayat` di `gunungapi_status.json`); tidak ada seri harian dari lembaga untuk diisi mundur |

## 5. Berita

| # | Hasil | Catatan |
| --- | --- | --- |
| Volume, Peta berita, Sorotan, Topik, Daftar berpaginasi, rinci kumpulan, pil topik | SAMA | salinan mesin berita banjir; leksikon `scripts/gunungapi/berita.py` (relevansi, kiasan, luar negeri, 7 topik); lokasi dari nama gunung (kab = "kode provinsi\|gunung") karena Geo mesin hanya mengenal wilayah administratif: berlokasi 83% |
| Kartu sentimen, pantauan media, celah liputan, video | D | tidak ada label uji sentimen dan data pembanding (`sentimen_teruji: false`) |
| Isi berita | BEDA | `berita.json` dijalankan tangan (tak ada workflow gunung api; token tanpa scope workflow); `dibuat` ditampilkan di kaki. Lihat "Perlu dari luar wilayah" |

## 6. Dampak

| # | Hasil | Catatan |
| --- | --- | --- |
| Menu kiri, pita bagian, kartu Insight, bagikan | SAMA | |
| Bagian | D | Penduduk terpapar (jiwa dalam radius, WorldPop kisi 25 km: orde besar) dan Korban dan kerugian (BNPB: kejadian, mengungsi, terdampak, rumah rusak 2010-2024). Tanpa Sekolah/Kesehatan: `sekolah.json` dan `fasilitas.json` hanya mencakup provinsi prioritas karhutla (A18). "Meninggal" BNPB: sumber dayanya 404 di CKAN (16 Okt), dibuang, bukan diisi 0 |
| Isi berkala | BEDA | `dampak.json` dibuat tangan (sama dengan Berita) |

## 7. Foto

| # | Hasil | Catatan |
| --- | --- | --- |
| Galeri, saring, urut, kirim (Turnstile, EXIF/GPS, batas ukuran) | BEDA | halaman, `foto.js` (`FOTO_BENCANA = "gunungapi"`), registry (`hujan_abu, lahar, pengungsian, lainnya`) dan server (`KAT_BENCANA`) sudah siap, tetapi `public/foto.js` hanya memiliki `KAT_AWAL` dan `CONTOH_KET` untuk karhutla dan banjir: tanpa entri gunung api galeri jatuh ke kategori karhutla dan kirimannya ditolak server. Tab disembunyikan (`TAB_SEMBUNYI`, `tab_sembunyi`). Tambalan yang dibutuhkan ada di "Perlu dari luar wilayah" |

## 8. Tentang, kaki, bagikan, jejak, OG

| # | Hasil | Catatan |
| --- | --- | --- |
| Tentang iframe | SAMA | |
| F1 kaki Teras Urban (kolom Pantau dari registry minus tab_sembunyi) | SAMA | |
| F2 dialog bagikan + templat Ringkasan/Grafik Insight berpratinjau, Feed/Story/Kotak, QR | SAMA | diuji: pratinjau "Grafik Insight" tergambar dengan angka PVMBG |
| Chat Admin, jejak (`jejak.js data-halaman`) | SAMA | |
| OG: blok `<!-- og -->`, canonical, hreflang, twitter large | SAMA | worker menimpa per rute dari registry (`og_meta.js`) bila `meta.json` ada |
| OG: gambar 1200x630 khas modul | BEDA | memakai `data/og/ringkasan.png`; `scripts/og/buat.py` belum membuat `gunungapi.png` (di luar wilayah) |

## 9. Mobile 390

Tidak ada scroll horizontal di semua tab; daftar kiri, seg level, Insight, Berita (peta berita), Dampak diperiksa berdampingan. Kolom Status daftar dilebarkan (92px) supaya pil "Waspada" tidak terpotong.

## 10. Teks, bahasa, galat

| # | Hasil | Catatan |
| --- | --- | --- |
| X1 `toFixed` titik desimal di teks tampil | SAMA | format `fmt` Indonesia |
| X2/X3 sisa Indonesia di EN | SAMA | seluruh tab, pop-up Situasi, popup gunung, dialog bagikan diperiksa `?lang=en` (`T.hilang`); sisa hanya judul artikel berita, nama media, dan kutipan resmi PVMBG (`translate="no"`, isi lembaga) |
| X5 em dash, "Anda", ISO mentah | SAMA | 0 |
| X6 subjudul/penjelas (A1) | SAMA | catatan Dampak ("kisi 25 km...") adalah pernyataan batas data, bukan subjudul |
| X7 404 data | SAMA | tak ada |
| INP | SAMA | klik tab 5-41 ms sampai dua frame (`nanti()`), 1440 dan 390 |

## Verifikasi data (16 Okt 2026, MAGMA live)

| Gunung | Level di JSON | Level live | Radius JSON | Radius di laporan live |
| --- | --- | --- | --- | --- |
| Semeru | III Siaga | III Siaga | 5 km | "radius 5 Km" |
| Ibu | II Waspada | II Waspada | 2 km | "radius 2 Km" |
| Merapi | III Siaga | III Siaga | 3 km | "radius 3 Km" |

Jumlah per level juga cocok: 0 Awas, 4 Siaga, 23 Waspada, 42 Normal (halaman Tingkat Aktivitas). Satu cacat ditemukan dan diperbaiki: tanggal letusan (lihat tabel perbaikan). Letusan dibandingkan ulang dengan `informasi-letusan` live: Ibu 20:44 WIT = 18:44 WIB, Semeru 18:52 WIB muncul di daftar.

## Perlu dari luar wilayah

| Kebutuhan | Pemilik |
| --- | --- |
| `public/foto.js`: tambah ke `KAT_AWAL` `gunungapi: {hujan_abu: ["Hujan abu", "#7d8795"], lahar: ["Lahar", "#9a7448"], pengungsian: ["Pengungsian", "#e58a45"], lainnya: ["Lainnya", "#3d9461"]}` dan `CONTOH_KET.gunungapi`; ikon di `IKAT` (jatuh ke `lainnya` bila kosong). Lalu buang `"foto"` dari `TAB_SEMBUNYI` (`gunungapi/app.js`) dan `tab_sembunyi` registry | `layar-peta` (foto.js), `bencana.json` |
| Workflow: rantai `python3 scripts/gunungapi/berita.py` dan `dampak.py` di akhir langkah yang sudah jalan harian (`banjir.yml` lewat `posko.py` memanggil `magma.py`), dan tambah `public/gunungapi/data` ke `git add` / cache | `mekanik-mesin` |
| `scripts/og/buat.py`: render `gunungapi.png` | `mekanik-mesin` / pemilik og |
| Geocoder mesin berita (`scripts/umum/berita.py`): "puncak" (puncak gunung) dikira Kabupaten Puncak; tambahkan ke `KAB_LEMAH`. Sementara ditangani di `scripts/gunungapi/berita.py` | `pipa-data` |
| Kamera awal banjir: pusat (112,38; -2,11) vs karhutla (-6,28); padding bawah 163 menyamakan | `banjir` |
