# Paritas karhutla vs kualitas udara: tabel akhir

Audit 16 Okt 2026 (HEAD b84ba76 + perbaikan audit ini), `wrangler dev --local` dengan migrasi D1 lokal, Chrome headless via Playwright, 1440x900 dan 390x844, ID dan `?lang=en`. Karhutla dan banjir dipotret di sesi yang sama sebagai pembanding. Konsol bersih di semua tab kedua lebar; yang tersisa (404 favicon situs berita luar di tab Berita, CSP report-only `frame-src` Tentang) sama persis di karhutla dan banjir.

Keterangan: SAMA = identik atau memakai mesin bersama yang sama. D = beda yang sah karena data/bahaya (alasan tertulis). BEDA = selisih yang belum bisa ditutup (alasan dan pemilik tertulis).

Aturan data: semua angka jiwa dan PM2,5 adalah **perkiraan model CAMS, belum dikoreksi ke alat ukur**. Pil "perkiraan model CAMS, belum dikoreksi" ada di panel peta, laci provinsi, tiap kartu Insight, Tren, dan Dampak; kaki pop-up Situasi memuat kalimat yang sama; jiwa ditulis "sekitar" dan dibulatkan.

Hasil: 35 SAMA, 13 D, 2 BEDA. Status registry tidak diubah. **SIAP AKTIF: BELUM** (dua BEDA, keduanya di berkas milik pengerja lain; Foto kirim memblokir pembukaan, lihat bagian "BEDA yang tersisa").

## Diperbaiki pada audit ini

| Selisih | Perbaikan |
| --- | --- |
| **Data: "Hari ini" menampilkan data kemarin** (`asap.json` hari pertama 15 Okt, layar 16 Okt) | `app.js`: `S.h0` = indeks hari ini menurut jam WIB; hari lampau tak ditawarkan; data lebih tua dari hari ini diberi tanggal, bukan "Hari ini". Peta, Insight, pop-up Situasi, bagikan ikut `S.h0` |
| Tab hanya Peta, Insight, Metode (Metode terlihat di menu) | Berita, Tren, Dampak, Foto, Tentang ditambah; Metode disembunyikan (A24); registry `tab` dan `src/bencana.generated.js` dibangkitkan ulang |
| Panel atas berisi tiga kotak angka (KPI), tanpa crumb | Crumb "Indonesia" + Rincian; label model sebagai pil; kotak KPI dibuang (tidak ada di karhutla, A1) |
| Klik provinsi hanya menyorot garis | Laci rincian di kanan (PM2,5 per hari, jiwa per kategori, kabupaten/kota paling terpapar) |
| Dasar peta terang, satelit mati | Citra satelit menyala bawaan |
| Kartu hari di dok bawah | Kartu hari di kanan atas ("Prakiraan udara (hari)"), dok hanya legenda |
| Overlay tanpa kepala gelap dan tombol lipat; panel tidak bisa ditarik; tanpa lonceng dan Chat Admin | `lapis-hd` + `#lapisLipat`, pegangan tarik, `/peringatan`, `pesan.js` |
| Tabel panel tidak bisa diurut, tanpa kolom Tren | Kepala kolom bisa diurut (pola `data-s` karhutla; `rows[0].parentElement` null setelah dipindah ke fragmen dihindari), kolom Tren batang 7 hari + persen dari riwayat provinsi; 390 membuang kolom Tren |
| Kartu Insight hanya berpil model (tanpa pil kategori) | pil kategori berikon + pil model, sebaris |
| Kartu "Tren" di Insight | Pindah ke tab Tren (riwayat + prakiraan) |
| Ikon label pil membesar penuh di gambar ekspor (kartu tanpa grafik) | `width="12" height="12"` pada svg label |
| Sumber bagikan dan OG "KLH (ISPU)" serta tagar `#ISPU` (ISPU KLHK tak dipakai: tak bisa dijangkau) | Registry: `bagikan.sumber` "Copernicus CAMS via Open-Meteo, NOAA METAR, WorldPop (perkiraan model)", tagar `#polusiudara`, `og.desk_templat` tanpa "kota berstatus" |
| Riwayat hanya 1 hari | `scripts/udara/isi_riwayat.py` mengisi 45 hari (1 Sep sampai 15 Okt) dari analisis CAMS dan riwayat per provinsi; `kualitas.py` menulis kolom keempat dan per provinsi |
| Metode tanpa riwayat, dampak, berita | `metode.js` ditambah |
| EN: ±170 kalimat baru bocor Indonesia | `i18n/en.json`: kamus (kunci bernomor `{0}`) dan 4 pola |

## 1. Kepala

| # | Hasil | Catatan |
| --- | --- | --- |
| K1 tab (7 tab) | SAMA | Peta, Insight, Berita, Tren, Dampak, Foto, Tentang; Metode ada tapi disembunyikan (A24) |
| K2 tab Simulasi | D | Tak ada skenario yang bisa disimulasikan pengguna (prakiraan CAMS satu arah) |
| K3 jarak tab, judul, logo, ikon, ID/EN, bagikan, tema, burger | SAMA | |
| K4 lonceng Peringatan Dini | SAMA | `/peringatan` |
| K5 menu bencana | SAMA | Ikut status registry (`uji`) |
| K6 chip El Nino | D | Chip ENSO milik `lapisan5.js` karhutla; banjir juga tak memilikinya |
| K7 chip BMKG di peta | D | BMKG tak menerbitkan peringatan asap atau kabut sebagai jenis tersendiri: tak ada baris relevan di `peringatan.json`, jadi dibuang (A18) |

## 2. Peta

| # | Hasil | Catatan |
| --- | --- | --- |
| P1 dasar satelit | SAMA | menyala bawaan |
| P2 kamera awal | SAMA | `kiriPad` salinan banjir |
| P3 panel 440, pegangan tarik | SAMA | |
| P4 crumb pil gelap di luar kartu, Rincian | SAMA | |
| P5 seg atas + cari | D | satu mode peta (PM2,5), tak ada seg dan chip rentang. Cari ada |
| P6 kepala tabel gelap, tinggi baris | SAMA | |
| P7 kepala bisa diurut | SAMA | diperbaiki |
| P8 kolom Tren sparkline | SAMA | batang 7 hari + panah + persen, dari `udara_kualitas_riwayat.json`; 390 membuangnya agar nama provinsi terbaca (karhutla/banjir juga menyembunyikan sparkline di layar sempit) |
| P9 pil kategori | SAMA | |
| P10 kolom kanan 280, kartu hari | SAMA | "Prakiraan udara (hari)", hari ini dan sesudahnya |
| P11 Overlay berkepala gelap + lipat | SAMA | |
| P12 legenda dok | D | isi khas: kelas PM2,5 24 jam, jarak pandang bandara |
| P13 legenda terlipat pil, chip LEGENDA mobile | SAMA | |
| P14 laci rincian provinsi | SAMA | |
| P15 kartu hover sel dan bandara | SAMA | `inti/peta/lapis.js` `kartuTip` |
| P16 mobile lembar bawah, kartu hari | SAMA | |
| P17 label model di panel | D | hanya udara: pil "perkiraan model CAMS, belum dikoreksi" di atas pencarian |

## 3. Pop-up Situasi

| # | Hasil | Catatan |
| --- | --- | --- |
| S1 eyebrow, judul berangka, chip, daftar provinsi dan kabupaten, kaki Sumber + Lihat peta, 1440 dan 390 | SAMA | `inti/sapa.js` + `sapa.js`; sekali sehari `pb_sapa_udara`; angka "sekitar", kaki memuat "perkiraan model CAMS, belum dikoreksi, bukan ISPU resmi" |

## 4. Insight

| # | Hasil | Catatan |
| --- | --- | --- |
| Anatomi kartu, pil kategori + model, judul merah, seg hari di kepala, kaki legenda + Sumber, bagikan | SAMA | |
| Jarak pandang bandara (METAR) | D | khas udara; dibuang bila tak ada laporan segar (A18) |

## 5. Tren

| # | Hasil | Catatan |
| --- | --- | --- |
| T1 anatomi kartu, seg rentang 14/30/45 | SAMA | |
| T2 batang jiwa tidak sehat per hari + prakiraan pudar | SAMA | |
| T3 tabel standar Provinsi (hari tidak sehat, PM2,5, jiwa) | SAMA | baris membuka provinsi di peta |
| T4 riwayat | D | 45 hari: hari lampau dari analisis CAMS (`isi_riwayat.py`), sesudahnya satu titik per hari dari prakiraan pagi; tidak ada alat ukur (OpenAQ butuh kunci) |
| T5 kalender musim, El Nino | D | tak ada padanan data |

## 6. Tentang, Berita, Dampak

| # | Hasil | Catatan |
| --- | --- | --- |
| Tentang iframe | SAMA | |
| Berita (Volume, Peta berita, Sorotan, Topik, Daftar) | SAMA | 1.500 artikel, arsip 120 hari, `scripts/udara/berita.py` |
| Berita: kartu sentimen | D | `sentimen_teruji` false |
| Berita: pembaruan harian | D | tak ada workflow; dijalankan tangan, `dibuat` tertulis di kaki. Usulan job harian: `mekanik-mesin` |
| Dampak (menu kiri, pita bagian, kartu Insight, seg hari) | SAMA | Penduduk, Sekolah, Kesehatan |
| Dampak: korban dan kerugian historis | D | BNPB tak mencatat kualitas udara sebagai jenis bencana (kabut asap karhutla ada di Dampak karhutla), A18 |

## 7. Foto

| # | Hasil | Catatan |
| --- | --- | --- |
| Fo1 galeri, saring, urut, paginasi | SAMA | `public/udara/foto.js` menyetel `window.FOTO_BENCANA = "udara"` |
| Fo2 alur kirim | BEDA | `public/foto.js` (pemilik `warga-api`) belum punya `udara` di `KAT_AWAL`, `IKAT`, `CONTOH_KET`: formulir menampilkan kategori karhutla sedangkan server hanya menerima `asap`, `jarak_pandang`, `lainnya`. Tambalan di bawah |

## 8. Kaki, bagikan, jejak

| # | Hasil | Catatan |
| --- | --- | --- |
| Ka1 kaki Teras Urban di semua tab | SAMA | |
| Ka2 dialog bagikan + templat Grafik Insight, Feed/Story/Kotak | SAMA | diuji dari Insight dan Tren |
| Ka3 Chat Admin, jejak (`data-halaman="udara"`) | SAMA | |
| Ka4 label gambar ekspor | BEDA | `public/bagikan.js:98` menulis "... karhutla" mati ("Tren karhutla" muncul di ekspor Tren udara). Pemilik `layar-peta` |
| Ka5 pratinjau OG | D | Worker menurunkan judul dan deskripsi dari registry; gambar OG khusus belum ada (`ringkasan.png`) |

## 9. Mobile 390

Tidak ada scroll horizontal di semua tab; semua tab dibandingkan berdampingan; kolom Tren panel dibuang di layar sempit.

## 10. Teks, bahasa, galat, INP

| # | Hasil | Catatan |
| --- | --- | --- |
| X1 koma desimal, ribuan titik, tanpa em dash, "kamu" | SAMA | |
| X2 sisa Indonesia di EN | SAMA | seluruh tab, laci, pop-up Situasi, Metode diperiksa dengan `window.T.hilang`; sisa hanya judul artikel berita dan nama tempat |
| X3 404 data | SAMA | tak ada |
| X4 konsol | SAMA | lihat paragraf pembuka |
| X5 INP | SAMA | klik tab/baris/hari/seg 5 sampai 50 ms sampai dua frame (`nanti()`) |

## Data: apa yang dicek

| Cek | Hasil |
| --- | --- |
| Hari ini | `asap.json` (terbit 15 Okt 15:26) berisi 15 sampai 18 Okt. Layar 16 Okt kini "Hari ini" = 16 Okt: Insight 100,5 juta jiwa tidak sehat (kisi 0,25 derajat, ditulis "sekitar 101 juta"), Dampak 101,03 juta (per kecamatan) |
| Konsistensi | Dampak (per kecamatan) vs `udara_kualitas.json` (per kisi): 15 Okt 120,04 vs 119,92 juta; 16 Okt 101,03 vs 100,54; 17 Okt 86,21 vs 85,57; selisih 0,1 sampai 0,8 persen |
| Label model | Ada di panel, laci, Insight, Tren, Dampak, pop-up Situasi, dan ekspor bagikan ("Perkiraan model CAMS") |
| Sumber | ISPU KLHK tak dijangkau dari CI: tak ada di layar, registry, tagar, OG. OpenAQ v3 butuh kunci (401): koreksi bias tak ada, `status_validasi: belum_divalidasi` |
| Nilai ekstrem | CAMS 40 km membaca Palangkaraya 981 µg/m³ (rata-rata 24 jam, prakiraan 16 Okt) dan Jakarta 157; tidak dikoreksi, hanya dilabeli. Perlu validasi stasiun sebelum dipublikasikan sebagai ISPU |
| Riwayat | 45 hari dari analisis CAMS; Oct 15: 131,6 juta tidak sehat (analisis) vs 119,9 juta (prakiraan pagi); keduanya CAMS |
| Pipeline | `kualitas.py`, `dampak_udara.py`, `isi_riwayat.py`, `berita.py`: `python3 <skrip> uji` hijau; `kualitas.py` menulis `udara_dampak.json` di akhir `main` (dirantai dari `metar.py`, tanpa workflow baru) |

## BEDA yang tersisa

| # | Berkas | Pemilik | Tambalan |
| --- | --- | --- | --- |
| Fo2 Foto kirim | `public/foto.js` | `warga-api` | `KAT_AWAL`: `udara: {asap: ["Asap atau kabut", "#6b7489"], jarak_pandang: ["Jarak pandang", "#2b8c86"], lainnya: ["Lainnya", "#3d9461"]}`; `IKAT`: ikon `jarak_pandang`; `CONTOH_KET.udara`: "Apa yang terlihat? Mis. kabut asap tebal, jarak pandang kurang dari 1 km"; lalu uji kirim dari `/udara/` |
| Ka4 label ekspor | `public/bagikan.js:98` | `layar-peta` | ganti tiga string "karhutla" dengan nama bencana halaman |

## Bukti

Uji: `python3 scripts/udara/kualitas.py uji`, `dampak_udara.py uji`, `isi_riwayat.py uji`, `berita.py uji`; `npm run uji:agen` (19/19), `npm run uji:warga`, `npm run bencana:cek` hijau; tangkapan berdampingan per tab; EN dan 390 per tab; INP diukur klik-ke-dua-frame.
