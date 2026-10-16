# Paritas karhutla vs cuaca ekstrem: tabel akhir

Audit 16 Okt 2026 (HEAD b84ba76 + perbaikan audit ini), `wrangler dev --local` dengan migrasi D1 lokal, Chrome headless via Playwright, 1440x900 dan 390x844, ID dan `?lang=en`. Karhutla dan banjir dipotret di sesi yang sama sebagai pembanding. Konsol bersih di semua tab kedua lebar; yang tersisa (404 favicon situs berita luar di tab Berita, CSP report-only `frame-src` Tentang) sama persis di karhutla dan banjir.

Keterangan: SAMA = identik atau memakai mesin bersama yang sama. D = beda yang sah karena data/bahaya (alasan tertulis). BEDA = selisih yang belum bisa ditutup (alasan dan pemilik tertulis).

Hasil: 34 SAMA, 14 D, 2 BEDA. Status registry tidak diubah. **SIAP AKTIF: BELUM** (dua BEDA, keduanya di berkas milik pengerja lain; Foto kirim memblokir pembukaan, lihat bagian "BEDA yang tersisa").

## Diperbaiki pada audit ini

| Selisih | Perbaikan |
| --- | --- |
| Tab hanya Peta, Insight, Tentang | Berita, Tren, Dampak, Foto ditambah; registry `tab` dan `src/bencana.generated.js` dibangkitkan ulang |
| Tidak ada crumb "Indonesia", tombol Rincian, laci rincian (pop-up peta memakai MapLibre Popup) | `peta.js`: crumb + laci seperti karhutla dan banjir; Popup dibuang |
| Dasar peta terang, satelit mati | Citra satelit menyala bawaan (sama dengan karhutla dan banjir) |
| Seg Hujan/Angin/Ansambel di kanan, hari di dok bawah | Seg mode pindah ke panel kiri; kartu hari di kanan atas ("Prakiraan cuaca (hari)"), dok hanya legenda |
| Overlay tanpa kepala gelap dan tombol lipat | `lapis-hd` + `#lapisLipat` |
| Panel tidak bisa ditarik, tanpa pencarian | Pegangan tarik + kolom cari peringatan |
| Tanpa lonceng Peringatan Dini dan Chat Admin | `index.html`: `/peringatan`, `pesan.js` |
| Ikon bagikan Insight melayang di luar kartu | `cuaca.css`: aturan `position:absolute` dibuang; gaya `inti/insight.css` berlaku |
| Ikon label pil membesar penuh di gambar ekspor (kartu tanpa grafik) | `width="12" height="12"` pada svg label |
| Panel kosong "Tidak ada peringatan yang berlaku" terbaca sebagai pernyataan aman | Kalimat memuat jam terbit BMKG yang dipakai (lihat bagian Data) |
| "21 provinsi dalam peringatan gelombang tinggi" menghitung kelas Sedang | `GEL` hanya Tinggi, Sangat tinggi, Ekstrem (sama dengan `peringatan.py` "kategori tinggi+"); 21 jadi 7 pada data 16 Okt 19:00 |
| Sumber bagikan hanya "BMKG" | Registry `bagikan.sumber`: BMKG, Open-Meteo, ECMWF |
| Metode tanpa riwayat, dampak, berita, dan catatan frekuensi peringatan | `metode.js` ditambah |
| EN: ±170 kalimat baru bocor Indonesia | `i18n/en.json`: kamus (kunci bernomor `{0}`) dan 4 pola |

## 1. Kepala

| # | Hasil | Catatan |
| --- | --- | --- |
| K1 tab (7 tab) | SAMA | Peta, Insight, Berita, Tren, Dampak, Foto, Tentang; Metode ada tapi disembunyikan (A24) |
| K2 tab Simulasi | D | Tak ada model skenario cuaca (hujan dan angin adalah prakiraan, bukan proses yang bisa disimulasikan pengguna) |
| K3 jarak tab, judul, logo, ikon, ID/EN, bagikan, tema, burger | SAMA | |
| K4 lonceng Peringatan Dini | SAMA | `/peringatan` |
| K5 menu bencana | SAMA | Ikut status registry (`uji`: karhutla menampilkan "Segera") |
| K6 chip El Nino | D | Chip ENSO milik `lapisan5.js` karhutla; banjir juga tak memilikinya |
| K7 chip BMKG di peta | D | Peringatan BMKG adalah isi panel kiri dan overlay halaman ini; chip ringkasan akan menggandakannya |

## 2. Peta

| # | Hasil | Catatan |
| --- | --- | --- |
| P1 dasar satelit | SAMA | menyala bawaan |
| P2 kamera awal | SAMA | `kiriPad` salinan banjir (padding bawah maks 160) |
| P3 panel 440, pegangan tarik | SAMA | lebar diingat per perangkat |
| P4 crumb pil gelap di luar kartu, tombol Rincian | SAMA | |
| P5 seg atas + cari | D | seg Hujan/Angin/Ansambel (mode peta) dan Nowcast/Gelombang (isi panel); tak ada chip rentang. Cari ada |
| P6 kepala tabel gelap, urut, tinggi baris | D | Panel berisi kartu peringatan (jenis, wilayah, jam berlaku), bukan tabel angka per wilayah |
| P7 kolom Tren sparkline | D | Peringatan nowcast hidup 2 sampai 3 jam: tak ada deret per wilayah |
| P8 pil tingkat | SAMA | Moderate/Severe/Extreme (kata asli CAP) dan kelas gelombang |
| P9 kolom kanan 280, kartu hari | SAMA | "Prakiraan cuaca (hari)", 4 hari |
| P10 Overlay berkepala gelap + lipat | SAMA | |
| P11 legenda dok | D | isi khas: skala hujan, embusan, peluang ansambel, tingkat nowcast, kelas gelombang |
| P12 legenda terlipat pil, chip LEGENDA mobile | SAMA | |
| P13 laci rincian | SAMA | Nowcast: tingkat, kecamatan, wilayah, jam berlaku, deskripsi BMKG; gelombang: kelas dan perairan |
| P14 kartu hover | SAMA | `inti/peta/lapis.js` `kartuTip` |
| P15 mobile lembar bawah, kartu hari | SAMA | |

## 3. Pop-up Situasi

| # | Hasil | Catatan |
| --- | --- | --- |
| S1 eyebrow, judul berangka, chip, daftar provinsi, daftar nowcast, kaki Sumber + Lihat peta, 1440 dan 390 | SAMA | `inti/sapa.js` + `sapa.js`; sekali sehari `pb_sapa_cuaca` |

## 4. Insight

| # | Hasil | Catatan |
| --- | --- | --- |
| Anatomi kartu, pil ikon, judul merah, kaki legenda + Sumber | SAMA | |
| Ikon bagikan di kepala kartu | SAMA | diperbaiki |
| Kartu tanpa isi dibuang (A18) | SAMA | nowcast/gelombang kosong tetap satu baris resmi berlabel jam terbit BMKG |

## 5. Tren

| # | Hasil | Catatan |
| --- | --- | --- |
| T1 anatomi kartu, seg rentang 14/30/90 | SAMA | seg muncul bila riwayat > 14 hari (A18) |
| T2 tabel standar (kepala gelap, urut, paginasi) | SAMA | Provinsi: hari hujan lebat dan embusan kencang |
| T3 kejadian per tahun BNPB + seg metrik | SAMA | bentuk sama dengan Dampak banjir |
| T4 riwayat | D | baru 4 hari (10 sampai 13 Okt 2026, dari `hujan.json` past_days); tumbuh satu titik per hari lewat `cuaca.py` (`cuaca_riwayat.json`, append-only). Hari lampau = analisis model, bukan alat ukur. Nowcast tak dicatat: berkasnya terbit sekali sehari |
| T5 warna El Nino/La Nina | D | tak ada padanan data |

## 6. Tentang, Berita, Dampak

| # | Hasil | Catatan |
| --- | --- | --- |
| Tentang iframe | SAMA | |
| Berita (Volume, Peta berita, Sorotan, Topik, Daftar) | SAMA | 1.500 artikel, arsip 120 hari, `scripts/cuaca/berita.py`; peta berita memakai `S.geo` provinsi |
| Berita: kartu sentimen, garis titik panas | D | `sentimen_teruji` false (tak ada label uji manusia); tak ada pembanding |
| Berita: pembaruan harian | D | tak ada workflow (token tanpa scope `workflow`); dijalankan tangan, `dibuat` tertulis di kaki kartu. Usulan job harian: `mekanik-mesin` |
| Dampak (menu kiri, pita bagian, kartu Insight, seg) | SAMA | |
| Dampak: sekolah, kesehatan | D | datanya per kecamatan, hujan per kotak prakiraan 28 km (A18) |
| Dampak: Penduduk di area hujan lebat | D | jiwa di kotak prakiraan >= 50 mm (WorldPop x Open-Meteo), berlabel prakiraan, bukan "terdampak" |

## 7. Foto

| # | Hasil | Catatan |
| --- | --- | --- |
| Fo1 galeri, saring, urut, paginasi | SAMA | `public/cuaca/foto.js` menyetel `window.FOTO_BENCANA = "cuaca"` sebelum `public/foto.js` |
| Fo2 alur kirim ("Ambil foto", Turnstile, EXIF/GPS, batas, pernyataan) | BEDA | `public/foto.js` (pemilik `warga-api`) belum punya `cuaca` di `KAT_AWAL`, `IKAT`, `CONTOH_KET`: formulir dan chip menampilkan kategori karhutla (api, asap, padam, dampak) sedangkan server hanya menerima `pohon`, `genangan`, `atap`, `lainnya` (migrasi 0013, registry `foto_kategori`); kirim selain "lainnya" ditolak 400. Tambalan di bagian "BEDA yang tersisa" |

## 8. Kaki, bagikan, jejak

| # | Hasil | Catatan |
| --- | --- | --- |
| Ka1 kaki Teras Urban di semua tab | SAMA | |
| Ka2 dialog bagikan + templat Grafik Insight berpratinjau, Feed/Story/Kotak | SAMA | diuji dari Insight dan Tren |
| Ka3 Chat Admin, jejak (`data-halaman="cuaca"`) | SAMA | |
| Ka4 label gambar ekspor | BEDA | `public/bagikan.js:98` menulis "Insight karhutla / Dampak karhutla / Tren karhutla" mati untuk semua bencana (sama di banjir). Pemilik `layar-peta`; usulan: pakai `Bagikan.K.nama` |
| Ka5 pratinjau OG | D | Worker menurunkan judul dan deskripsi dari registry (`src/og_meta.js`); gambar OG khusus cuaca belum ada, jatuh ke `ringkasan.png` (generator `scripts/og/buat.py`, `layar-peta`) |

## 9. Mobile 390

Tidak ada scroll horizontal di semua tab; semua tab dibandingkan berdampingan dengan karhutla dan banjir. Grafik Tren menggulir ke samping di dalam kartu, huruf tidak mengecil.

## 10. Teks, bahasa, galat, INP

| # | Hasil | Catatan |
| --- | --- | --- |
| X1 koma desimal, ribuan titik, tanpa em dash, "kamu" | SAMA | |
| X2 sisa Indonesia di EN | SAMA | seluruh tab, laci, pop-up Situasi diperiksa dengan `window.T.hilang`; sisa hanya nama peristiwa resmi BMKG ("Hujan Lebat dan Petir"), judul artikel berita, nama tempat |
| X3 404 data | SAMA | tak ada |
| X4 konsol | SAMA | lihat paragraf pembuka |
| X5 INP | SAMA | klik tab/mode/hari/seg 5 sampai 50 ms sampai dua frame (`nanti()`) |

## Data: apa yang dicek

| Cek | Hasil |
| --- | --- |
| BMKG nowcast LIVE (`curl https://www.bmkg.go.id/alerts/nowcast/id`, 16 Okt 18:59 WIB, UA peramban; UA `Mozilla/5.0` polos ditolak 403) vs layar | RSS memuat 10 item; 9 CAP unik terunduh dan aktif. Dengan berkas itu layar menampilkan "Nowcast · 9 wilayah", Insight "115 kecamatan di 9 provinsi" (2+1+2+6+3+8+52+25+16 kecamatan), tepat sama. Gelombang: 23 baris `warnings.json`, 7 provinsi berkelas tinggi atau lebih, layar 7 |
| Kesegaran `peringatan.json` di repo | Terbit 13 Okt 02:44 WIB (3 nowcast, semua sudah lewat): layar hari ini menampilkan 0 wilayah padahal BMKG punya 9. Penyebab: dibuat `peringatan.py` di dalam `banjir.yml` yang jalan sekali sehari (07:20 WIB), sedangkan nowcast berlaku 2 sampai 3 jam: di produksi daftar hanya terisi beberapa jam sesudah job. Layar kini menulis "Tidak ada peringatan nowcast yang berlaku pada data BMKG terbit {jam}" dan Insight/laci memuat jam terbit |
| Hujan, embusan, ansambel | `cuaca_prakiraan.json` dibangkitkan dari `hujan.json`; hari ini = jam WIB peramban (`?sekarang=` untuk uji), data basi tidak menyamar |
| Kelas gelombang | Hanya tinggi, sangat tinggi, ekstrem yang dihitung "peringatan" |
| Dampak, Tren | Angka dari `cuaca_dampak.json` dan `cuaca_riwayat.json` (WorldPop, Open-Meteo, BNPB/DIBI); uji `python3 scripts/cuaca/*.py uji` hijau |

## BEDA yang tersisa

| # | Berkas | Pemilik | Tambalan |
| --- | --- | --- | --- |
| Fo2 Foto kirim | `public/foto.js` | `warga-api` | `KAT_AWAL`: `cuaca: {pohon: ["Pohon tumbang", "#3d9461"], genangan: ["Genangan", "#3f7fb8"], atap: ["Atap rusak", "#9a7448"], lainnya: ["Lainnya", "#3d9461"]}`; `IKAT`: ikon `pohon` dan `atap`; `CONTOH_KET.cuaca`: "Apa yang terlihat? Mis. pohon tumbang menutup jalan, atap terbang"; lalu uji kirim dari `/cuaca/` |
| Ka4 label ekspor | `public/bagikan.js:98` | `layar-peta` | ganti tiga string "karhutla" dengan nama bencana halaman |

Usulan di luar paritas (bukan BEDA): job per jam untuk `peringatan.py` (`mekanik-mesin`, butuh scope workflow) supaya panel nowcast terisi sepanjang hari; job harian `scripts/cuaca/berita.py`; satu `inti/berita.js` untuk tiga salinan `berita.js` (karhutla inline, banjir, cuaca/udara/gempa).

## Bukti

Uji: `python3 scripts/cuaca/cuaca.py uji`, `dampak_cuaca.py uji`, `berita.py uji`; `npm run uji:agen` (19/19), `npm run uji:warga`, `npm run bencana:cek` hijau; tangkapan berdampingan per tab; EN dan 390 per tab; INP diukur klik-ke-dua-frame.
