# Paritas karhutla vs gempa: tabel akhir

Audit 16 Okt 2026 (HEAD 18b0ff0 + perbaikan audit ini), `wrangler dev --local --test-scheduled` (migrasi 0013 diterapkan, cron gempa dijalankan tangan sampai gempaterkini masuk D1), Chrome via Playwright, 1440x900 dan 390x844, ID dan `?lang=en`. Tangkapan berdampingan (karhutla kiri, gempa kanan) per tab. Konsol gempa bersih; yang tersisa (404 `/api/foto/thumb/*` karena R2 tidak ada di lokal, CSP report-only frame-src Tentang) sama di sisi karhutla. Data karhutla lokal tidak lengkap (`harian30.json`, `citra.json`, `/api/titik` 404 karena `public/data` tidak dilacak); perbandingan tata letak tetap sah.

Keterangan: SAMA = identik atau memakai mesin bersama yang sama. D = beda yang sah karena data/bahaya (alasan tertulis). BEDA = selisih yang belum bisa ditutup di `public/gempa/**`.

Registry TIDAK diubah (`status: "uji"`). Hasil: 29 SAMA, 14 D, **4 BEDA** (P12 + F3 satu akar: alur kirim Foto; A3 kaki karena registry; X3 judul berita EN). **Belum "SIAP AKTIF"**: keempatnya di luar berkas yang boleh disentuh audit ini (`public/foto.js`, `public/bencana.json`, `public/data/berita_en.json`).

## Diperbaiki pada audit ini

| Selisih | Perbaikan |
| --- | --- |
| Tab Foto disembunyikan (server belum punya kategori gempa) | `gempa/foto.js` + `foto.css` (galeri ala karhutla, `GET /api/foto?bencana=gempa`), `tab.js` `TAB_SEMBUNYI` kosong, `index.html` `#foto` |
| Peta dasar awal terang, karhutla dan banjir satelit | `index.html` checkbox Citra satelit `checked` |
| Tanpa ikon lonceng Peringatan Dini di kepala | `index.html`: tautan `/peringatan` seperti karhutla dan banjir |
| Klik gempa hanya menandai titik, karhutla dan banjir membuka laci rincian | `gempa/laci.js` + `<aside id="laci">`: magnitudo, kedalaman, status tsunami resmi BMKG (0 / 1-3 / null "BMKG tidak menyebut tsunami", tak pernah "aman"), dirasakan MMI, koordinat, tautan peta guncangan BMKG |
| Blok OG/twitter/canonical/hreflang tak lengkap (Worker butuh elemennya untuk ditimpa) | `index.html`: blok `<!-- og -->` penuh seperti banjir |
| Kepala tabel daftar 390 menempel ("DIRASAKAN M TERBESAR") | `peta.js`: lebar kolom + "Terbesar" |
| Ikon KPI gambar bagikan = api karhutla di keempat ubin | `bagikan.js`: `Bagikan.IKK` gempa/rasa/ombak (tanpa menyentuh mesin bersama) |
| Kalimat bagikan dan keterangan selalu Indonesia | `bagikan.js`: cabang EN lewat `Bagikan.en()` |
| Teks wilayah BMKG ("Darat 21 km Barat Daya Kota Bogor") tertinggal Indonesia di EN | `kata.js` `wilayahPendek`: EN "21 km SW of Kota Bogor (onshore)"; daftar/pita ikut berganti saat tombol bahasa ditekan |
| EN: puluhan fragmen judul Insight/Tren/Berita/Dampak, legenda, laci, kartu bagikan, dialog bagikan | `i18n/en.json`: sekitar 150 kunci + 10 pola; sisa hanya nama media dan judul artikel |
| Data jujur: kartu 7/30 hari bisa mengaku "dalam 30 hari terakhir" padahal arsip D1 baru 16 Okt | `kata.js` `ARSIP` + `jendelaGempa`: awal data = yang lebih lama antara 16 Okt dan gempa tertua kelompok kartu; jendela yang mulai lebih awal ditulis "sejak 12 Okt" / "sejak 17 Sep" (toleransi 12 jam). Dipakai Insight, daftar peta ("Tidak ada gempa sejak 16 Okt."), kalimat bagikan |

Verifikasi data hidup: `curl` BMKG `gempaterkini.json` (15 butir M 5+, 17 Sep sampai 11 Okt) dibandingkan dengan `/api/gempa/terbaru?jam=720` sesudah cron: 15 dari 15 ada (waktu dan magnitudo sama), nol hilang. Kartu "Dirasakan" jujur menulis "sejak 12 Okt" karena daftar BMKG Dirasakan hanya 15 butir terbaru.

## 1. Kepala

| # | Hasil | Catatan |
| --- | --- | --- |
| K1 tab (Peta, Insight, Tren, Berita, Dampak, Foto, Tentang) | SAMA | urutan dan ikon sama; Simulasi, Posko, Informasi, Metode, Ringkasan disembunyikan (A24) |
| K2 simulasi | D | tak ada simulasi gempa (RINCI-GEMPA); tab tidak ada |
| K3 lonceng Peringatan Dini, tema, bagikan, ID/EN, burger, logo | SAMA | |
| K4 chip El Nino | D | chip ENSO milik `lapisan5.js` karhutla; gempa tak bermusim |
| K5 menu bencana | SAMA | Gempa tampil aktif, Karhutla tertaut |
| K6 `noindex` | D | sengaja selama registry `uji`; dibuang bersama flip ke `aktif` |

## 2. Peta + dok legenda

| # | Hasil | Catatan |
| --- | --- | --- |
| P1 dasar satelit | SAMA | setelah perbaikan |
| P2 panel kiri 440, crumb pil gelap, kepala tabel gelap, bisa diurut, baris 30px | SAMA | |
| P3 seg Real Time / Riwayat / Kompleks | D | tak ada unit "kompleks"; mode riwayat = overlay Sejak 1900 |
| P4 kolom Tren sparkline dan Status | D | gempa tak punya seri status harian; kolom Gempa/Dirasakan/Terbesar |
| P5 kartu rentang di kolom kanan | SAMA | 24 jam / 72 jam / 7 hari; kartu Prakiraan Cuaca D (tak ada padanan) |
| P6 Overlay berkepala gelap, grup lipat, ubin ikon | SAMA | |
| P7 dok legenda terlipat + chip LEGENDA | SAMA | |
| P8 isi legenda | D | kekuatan, kedalaman, gempa per provinsi, batas lempeng; baris Angin/Citra satelit milik karhutla |
| P9 laci rincian | SAMA | baru: `laci.js`; status tsunami BMKG tampil apa adanya, terpisah |
| P10 kartu hover titik/provinsi | SAMA | `inti/peta/lapis.js` `kartuTip` |
| P11 mobile lembar bawah, kartu rentang, LEGENDA | SAMA | |
| P12 lapis "Foto" di Overlay | **BEDA** | satu paket dengan Foto kirim (bagian 8) |

## 3. Pop-up Situasi

| # | Hasil | Catatan |
| --- | --- | --- |
| S1 eyebrow, judul berangka, chip, daftar provinsi, daftar gempa, kartu perhatian, kaki Sumber + Lihat peta, sekali sehari (`pb_sapa_gempa`), 1440 dan 390, ID dan EN | SAMA | `inti/sapa.js` + `gempa/sapa.js` |

## 4. Insight

| # | Hasil | Catatan |
| --- | --- | --- |
| I1 anatomi kartu (pil, judul merah, grafik berangka, kaki legenda + Sumber, bagikan, seg di kepala) | SAMA | |
| I2 jendela waktu jujur | SAMA | "sejak <tanggal>" bila arsip lebih pendek dari jendela; tak pernah "tidak ada gempa 30 hari" tanpa dasar |
| I3 mobile seg melebar, tanpa scroll horizontal | SAMA | |
| I4 isi kartu | D | gempa terkini, dirasakan, provinsi, riwayat, status tsunami BMKG (khas bahaya; status resmi tampil apa adanya) |

## 5. Tren

| # | Hasil | Catatan |
| --- | --- | --- |
| T1 seg sumber MODIS/VIIRS di puncak | D | satu sumber (USGS); seg ada di dalam kartu |
| T2 kalender musim / El Nino | D | gempa tak bermusim (A16 tak berlaku) |
| T3 kartu, bagikan, tabel standar | SAMA | |

## 6. Berita

| # | Hasil | Catatan |
| --- | --- | --- |
| B1 Volume, Sorotan, Topik, Daftar, jarak kartu 18px | SAMA | |
| B2 kartu sentimen (nada memburuk/netral/membaik), garis titik panas | D | `sentimen_teruji` masih false (belum ada label uji manusia); tak ada data pembanding |
| B3 Pantauan media (papan isu, stakeholder) | D | leksikon karhutla (lembaga pemadam); gempa belum punya |

## 7. Dampak

| # | Hasil | Catatan |
| --- | --- | --- |
| D1 banner, kartu Insight, seg | SAMA | |
| D2 menu kiri 10 bagian | D | satu bagian "Penduduk terpapar" (InaRISK x WorldPop); bagian tanpa data dibuang (A18) |

## 8. Foto

| # | Hasil | Catatan |
| --- | --- | --- |
| F1 galeri: kartu `fg-k`, urutan, saring provinsi dan kategori (lima kategori gempa dari registry), paginasi 24, rincian | SAMA | `gempa/foto.js` meniru `banjir/foto.js`; `GET /api/foto?bencana=gempa` |
| F2 keadaan kosong | SAMA | tanpa kalimat ajakan sampai tombol kirim ada |
| **F3 tombol "Ambil foto", ajakan "Jadilah yang pertama", alur kirim, tautan `/f/<id>`** | **BEDA** | alur kirim ada di `public/foto.js` (IIFE, `BEN = "karhutla"` tetap). Tidak boleh disunting audit ini; sesi induk menyatukan semuanya ke `public/foto.js` berparameter bencana, lalu `gempa/foto.js` dan `banjir/foto.js` dihapus. Pemilik: `layar-peta` (berkas bersama) |

## 9. Tentang, kaki, jejak, OG

| # | Hasil | Catatan |
| --- | --- | --- |
| A1 Tentang (iframe `tentang.html?tertanam=1`) | SAMA | |
| A2 kaki Teras Urban: logo, alamat, sosial, Tentang, Hubungi | SAMA | |
| **A3 kolom "Pantau" di kaki** | **BEDA** | hanya "Peta": kolom dibangun `kaki.js` dari `tab` minus `tab_sembunyi` di `public/bencana.json`, dan registry gempa masih menyembunyikan insight/berita/tren/dampak/foto. Perbaikan = `tab_sembunyi` gempa menjadi `ringkasan, kejadian, posko, metode, sim, informasi` saat registry dibalik. Pemilik: registry (`warga-api`) |
| A4 jejak (`jejak.js data-halaman="gempa"`) | SAMA | `HAL` server memuat id bencana registry |
| A5 OG, twitter, canonical, hreflang | SAMA | blok `<!-- og -->` penuh; Worker menimpa dari registry (`og.judul`, sumber) bila modul hidup |
| A6 deep link `/gempa/<tab>` | D | saat `uji` Worker mengalihkan 307 ke `/gempa/` (juga membuang `?lang=`), sama dengan banjir; berlaku normal sesudah aktif |

## 10. Bagikan + ekspor gambar

| # | Hasil | Catatan |
| --- | --- | --- |
| G1 dialog Bagikan (Gambar/Link, templat Ringkasan harian + Grafik Insight, Feed/Story/Kotak), ikon di tiap kartu | SAMA | `bagikan.js` mesin bersama + adapter gempa |
| G2 PNG diekspor (dicoba: Feed 4:5, ID dan EN) | SAMA | ikon KPI gempa/dirasakan/tsunami, kalimat EN lengkap |
| G3 kata "terkuat/dirasakan/status BMKG" di ubin | D | KPI khas bahaya |

## 11. Bahasa EN (`?lang=en`)

| # | Hasil | Catatan |
| --- | --- | --- |
| X1 tab Peta, Insight, Tren, Berita, Dampak, Foto, laci, pop-up Situasi, dialog Bagikan | SAMA | diperiksa dengan `T.hilang`; tak ada kata Indonesia selain nama tempat dan nama media |
| X2 teks wilayah BMKG | SAMA | "21 km SW of Kota Bogor (onshore)"; nama tempat tetap |
| **X3 judul artikel berita** | **BEDA** | karhutla memakai `data/berita_en.json` (terjemahan mesin per judul, ditulis `scripts/data/berita.py`); judul berita gempa belum ada di berkas itu. Pemilik: `pipa-data` (berkas itu) dan `gempa` (`scripts/gempa/berita.py`) |
| X4 em dash, "Anda", `toFixed` titik desimal di teks tampil, subjudul/penjelas | SAMA | 0 |

## 12. Mobile 390

Tidak ada scroll horizontal di tujuh tab (`scrollWidth` 390), laci jadi lembar bawah, kepala tabel daftar tidak menempel lagi, seg Insight/Dampak/Tren membungkus.

## 13. INP (klik sampai dua frame, headless)

| Aksi | ms |
| --- | --- |
| pindah tab (7 tab) | 2 sampai 47 |
| rentang 24 jam / 7 hari | 26 / 30 |
| baris provinsi / baris gempa (terbang + laci) | 31 / 91 |
| overlay satelit / lempeng / riwayat | 32 / 29 / 16 |
| seg Insight, urut dan kategori Foto | 4 sampai 29 |

Semua di bawah 100 ms: SAMA.

## Bukti

`npm run uji:agen` 19/19, `npm run uji:warga` hijau semua berkas, konsol bersih per tab (ID dan EN, 1440 dan 390), `curl` BMKG vs D1 15/15.
