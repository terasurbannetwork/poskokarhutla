# Paritas karhutla vs kekeringan: tabel akhir

Audit 16 Okt 2026 (HEAD b84ba76 + perbaikan audit ini), `wrangler dev --local` (port 8797, migrasi D1 lokal diterapkan), Chrome headless via Playwright, 1440x900 dan 390x844, ID dan `?lang=en`. Tangkapan berdampingan (karhutla kiri, kekeringan kanan) per tab di folder kerja audit. Galat konsol milik kekeringan: tidak ada. Yang tersisa sama di kedua sisi: 404 favicon situs berita luar, 404 `/api/titik` dan `harian30.json` hanya di karhutla (D1 tidak ada di lokal), CSP report-only frame-src Tentang.

Keterangan: SAMA = identik atau memakai mesin bersama yang sama. D = beda yang sah karena data/bahaya (alasan tertulis). BEDA = selisih yang belum bisa ditutup.

Hasil (baris tabel di bawah; satu baris bisa memuat beberapa butir): 25 SAMA, 9 D, 4 BEDA. Status registry tidak diubah. **Belum SIAP AKTIF**: empat BEDA terbuka (Foto; isi berkala Berita; isi berkala Dampak; gambar OG khas modul), semuanya butuh pemilik lain (lihat "Perlu dari luar wilayah").

## Diperbaiki pada audit ini

| Selisih | Perbaikan |
| --- | --- |
| Kepala tanpa lonceng Peringatan Dini | `index.html`: tautan `/peringatan` |
| Kepala tanpa chip ENSO (karhutla: "El Niño sangat kuat") | `app.js`: lencana dari `S.meta.enso`, gaya dari karhutla (`kekeringan.css`); El Niño justru paling relevan di sini |
| Menu bencana memakai `data-tentang data-tanpa-segera` | dilepas; menu digambar registry persis seperti karhutla |
| Tab: Peta, Insight, Tren, Tentang | urutan karhutla: Peta, Insight, Berita, Tren, Dampak, Tentang; Foto disiapkan tapi disembunyikan (lihat BEDA); Metode tetap disembunyikan; "informasi" dibuang dari registry (tak ada halamannya) |
| Peta dasar putih, "Citra satelit" mati | satelit hidup bawaan seperti karhutla |
| Pil "Indonesia" (crumb) di dalam kartu | `nav.crumb` di luar kartu, di atas panel, seperti karhutla/banjir |
| Overlay: judul polos | `lapis-hd` gelap + tombol lipat semua grup |
| Daftar kiri tak bisa diurut | kepala `data-s` + penanda urut (`peta.js`) |
| Kamera awal beda dengan karhutla di 1440 | padding bawah 163 (terukur dari karhutla): pusat (112,38; -6,28) zoom 3,32 identik di 1440 dan 390 |
| Meta OG tanpa gambar, tanpa blok `<!-- og -->` | blok OG lengkap (og:image 1200x630, twitter large) |
| Kartu/pop-up Situasi dan gambar bagikan menyebut sumber "BMKG, Open-Meteo" padahal status adalah deteksi Pantau Bencana (BMKG hanya menerbitkan peta gambar) | `sapa.js` dan `bagikan.sumber` registry: "Deteksi Pantau Bencana" |
| EN: 3 sisa Indonesia di Insight/Tren ("berstatus Awas di N provinsi...", "tinggal di kecamatan Awas kekeringan...", "wilayah kering pada Agu...") + tab baru | `i18n/en.json`: kunci baru |

## 1. Kepala

| # | Hasil | Catatan |
| --- | --- | --- |
| K1 tab | SAMA | Peta, Insight, Berita, Tren, Dampak, Tentang; Foto dan Metode disembunyikan (A24) |
| K1b tab Simulasi | D | tidak ada model kekeringan yang diuji balik (ambang berstatus hipotesis); Pantau Bencana tidak menampilkan prakiraan yang belum teruji |
| K2 jarak tab, K3 menu bencana, K4 chip El Nino, lonceng, judul tab, logo, ikon, ID/EN, bagikan, tema, burger | SAMA | chip ENSO memakai gaya karhutla, data `iklim.json` lewat `kekeringan_meta.json` |

## 2. Peta

| # | Hasil | Catatan |
| --- | --- | --- |
| P1 dasar satelit, P2 kamera awal | SAMA | |
| P3 panel 440, P11 kolom kanan | SAMA | |
| P4 crumb pil gelap di luar kartu | SAMA | Indonesia > provinsi, turun lewat klik |
| P5 seg atas + cari | D | seg Status/Hujan/Tanah/Kode DC adalah mode data kekeringan, bukan rentang waktu; cari provinsi atau kabupaten |
| P6 kepala tabel gelap, P9 tinggi baris, P10 pil status | SAMA | tabel Provinsi/SPI/Jiwa/Status |
| P7 kepala bisa diurut | SAMA | Provinsi, SPI, Jiwa, Status (data-s, tanda urut) |
| P8 kolom Tren sparkline | D | riwayat dasarian baru terkumpul sejak halaman ini jalan; kolom SPI menggantikan |
| P12 blok ringkas | D | tiga angka Awas/Siaga/Waspada kabupaten dan pil "SPI Agustus 2026" (SPI tertinggal ~6 minggu, selalu disebut bulannya) dan "Ambang belum diuji balik" (kejujuran status hipotesis; A17) |
| P14 Overlay berkepala gelap + lipat, P15 grup + chevron | SAMA | |
| P16 chip BMKG | D | `databaru.js` hanya mengenal karhutla/banjir; BMKG hanya menerbitkan peta gambar kekeringan, jadi status adalah "Deteksi Pantau Bencana" |
| P17 legenda dok | D | status wilayah, atau tangga warna SPI/tanah/DC menurut mode |
| P18 legenda terlipat pil, P19 popup rincian wilayah, P20 kartu hover, P21 lembar bawah mobile, P23 chip LEGENDA | SAMA | `inti/peta/lapis.js`, `legenda.js`; pop-up lebar |

## 3. Pop-up Situasi, Insight

| # | Hasil | Catatan |
| --- | --- | --- |
| S1 eyebrow, judul berangka, chip, daftar provinsi dan kabupaten, kaki Sumber + Lihat peta, 1440 dan 390 | SAMA | `inti/sapa.js`; sekali sehari `pb_sapa_kekeringan` |
| Insight: anatomi kartu, pil, judul merah, grafik berangka, kaki legenda + Sumber, bagikan | SAMA | Kabupaten/kota, Jiwa, El Niño, Paling kering; angka 18,9 juta jiwa Awas sama dengan Dampak |

## 4. Tren

| # | Hasil | Catatan |
| --- | --- | --- |
| T1 anatomi kartu, batang berangka, bagikan | SAMA | |
| T2 isi | D | porsi wilayah kering SPI-3 24 bulan, kode kekeringan (DC) harian, jiwa di kecamatan Awas per dasarian (muncul setelah dua dasarian); bukan titik panas |

## 5. Berita

| # | Hasil | Catatan |
| --- | --- | --- |
| Volume, Peta berita, Sorotan, Topik, Daftar berpaginasi, rinci kumpulan, pil topik | SAMA | salinan mesin berita banjir; leksikon `scripts/kekeringan/berita.py` (relevansi, kiasan "kekeringan gol", luar negeri, 7 topik); berlokasi 71% sampai kabupaten |
| Kartu sentimen, pantauan media, celah liputan, video | D | tidak ada label uji sentimen (`sentimen_teruji: false`) |
| Isi berita | BEDA | `berita.json` dijalankan tangan (tak ada workflow kekeringan; token tanpa scope workflow); `dibuat` ditampilkan di kaki |

## 6. Dampak

| # | Hasil | Catatan |
| --- | --- | --- |
| Menu kiri, pita bagian, kartu Insight, bagikan, seg Awas / Siaga atau Awas | SAMA | |
| Bagian | D | Penduduk terdampak (jiwa di kecamatan Awas atau Siaga, per provinsi) dan Korban dan kerugian (BNPB: kejadian dan terdampak per tahun; mengungsi dan rumah rusak hampir selalu 0 pada kekeringan, dibuang). Tanpa Sekolah/Kesehatan/lahan: datanya hanya provinsi prioritas karhutla atau tidak ada (A18) |
| Isi berkala | BEDA | `dampak.json` dibuat tangan (sama dengan Berita); rantai `status.py` sudah ada lewat `tanah.py` di `data.yml` tapi tidak memanggil `dampak.py` |

## 7. Foto

| # | Hasil | Catatan |
| --- | --- | --- |
| Galeri, saring, urut, kirim (Turnstile, EXIF/GPS, batas ukuran) | BEDA | halaman, `foto.js` (`FOTO_BENCANA = "kekeringan"`), registry (`sumur, sawah, antre, lainnya`) dan server (`KAT_BENCANA`) siap, tetapi `public/foto.js` hanya punya `KAT_AWAL`/`CONTOH_KET` karhutla dan banjir: tanpa entri kekeringan galeri jatuh ke kategori karhutla dan kirimannya ditolak server. Tab disembunyikan. Tambalan di "Perlu dari luar wilayah" |

## 8. Tentang, kaki, bagikan, jejak, OG

| # | Hasil | Catatan |
| --- | --- | --- |
| Tentang iframe | SAMA | |
| F1 kaki Teras Urban (kolom Pantau dari registry minus tab_sembunyi) | SAMA | |
| F2 dialog bagikan + templat berpratinjau, Feed/Story/Kotak, QR | SAMA | diuji 1440 dan 390 |
| Chat Admin, jejak | SAMA | |
| OG: blok `<!-- og -->`, canonical, hreflang, twitter large | SAMA | worker menimpa per rute dari registry bila `meta.json` ada |
| OG: gambar 1200x630 khas modul | BEDA | memakai `data/og/ringkasan.png`; `scripts/og/buat.py` belum membuat `kekeringan.png` (di luar wilayah) |

## 9. Mobile 390

Tidak ada scroll horizontal di semua tab; peta, Insight, Berita (peta berita), Tren, Dampak diperiksa berdampingan.

## 10. Teks, bahasa, galat

| # | Hasil | Catatan |
| --- | --- | --- |
| X1 `toFixed` titik desimal di teks tampil | SAMA | `F2` lewat `toLocaleString`, ditukar i18n di EN |
| X2/X3 sisa Indonesia di EN | SAMA | seluruh tab, pop-up Situasi, popup wilayah, dialog bagikan diperiksa `?lang=en` (`T.hilang`); sisa hanya judul artikel berita dan nama media |
| X5 em dash, "Anda", ISO mentah | SAMA | 0 |
| X6 subjudul/penjelas (A1) | SAMA | catatan Dampak ("semua penghuni kecamatan...") adalah batas data, bukan subjudul |
| X7 404 data | SAMA | tak ada |
| INP | SAMA | klik tab 6-41 ms sampai dua frame (`nanti()`), 1440 dan 390 |

## Verifikasi data (16 Okt 2026)

Dihitung ulang tanpa memakai `status.py`: tingkat tiap sel dari kolom mentahnya (`spi3`, `pct0/pct1`, `spi6`), lalu penduduk per kecamatan (`penduduk.json`) ke sel terdekat (`pusat_kec.json`), tingkat kabupaten = tingkat tertinggi yang dialami >= 30% penduduk.

| Kabupaten | Tingkat hitung ulang | Jiwa >= waspada / siaga / awas | SPI-3 rata-rata | Cocok dengan `kekeringan_wilayah.json` |
| --- | --- | --- | --- | --- |
| Aceh Barat Daya (11) | 3 Awas | 161.537 / 161.537 / 161.537 | -3,40 | ya |
| Pandeglang (36) | 2 Siaga | 1.367.727 / 1.367.727 / 0 | -1,69 | ya |
| Pidie Jaya (11) | 1 Waspada | 159.101 / 0 / 0 | -1,49 | ya |

Seluruh 611 sel: tingkat tersimpan sama dengan hitung ulang (0 beda). Hujan 3 bulan sel Aceh Barat Daya (3,75; 96,75): 202 mm di berkas, 202 mm dari NASA POWER langsung (Jun 3,39 + Jul 0,94 + Agu 2,29 mm/hari). Tak ada cacat data ditemukan. Batas yang dicatat: SPI-3 bulan terakhir = Agustus 2026 (tertinggal ~6 minggu, selalu disebut di layar), persentil tanah baru di 12 dari 611 sel (Awas butuh penguat tanah atau SPI-6).

## Perlu dari luar wilayah

| Kebutuhan | Pemilik |
| --- | --- |
| `public/foto.js`: tambah ke `KAT_AWAL` `kekeringan: {sumur: ["Sumur kering", "#c9a24b"], sawah: ["Sawah puso", "#8a6d4e"], antre: ["Antre air", "#4f8fc4"], lainnya: ["Lainnya", "#3d9461"]}` dan `CONTOH_KET.kekeringan`; ikon di `IKAT`. Lalu buang `"foto"` dari `TAB_SEMBUNYI` (`kekeringan/app.js`) dan `tab_sembunyi` registry | `layar-peta` (foto.js), `bencana.json` |
| Rantai `python3 scripts/kekeringan/berita.py` dan `dampak.py` di akhir `status.py` (dipanggil `tanah.py` di `data.yml`), tambah `data/raw/berita/kekeringan` ke cache arsip dan `public/kekeringan/data` ke publikasi | `mekanik-mesin`, `pipa-data` |
| `scripts/og/buat.py`: render `kekeringan.png` | `mekanik-mesin` / pemilik og |
