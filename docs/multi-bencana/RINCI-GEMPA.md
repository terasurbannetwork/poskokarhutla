# Rincian kerja: GEMPA & TSUNAMI naik ke kelas karhutla (16 Okt 2026, hanya rencana)

Cakupan: `public/gempa/**`, `scripts/gempa/**`, `src/gempa.js`, plus berkas bersama yang harus disentuh. Rujukan bentuk: `RINCI-BANJIR.md`. Rujukan isi: `bencana/gempa.md`, `RENCANA-20-JAM.md` §1 (A1 sampai A25), `PAKET-FITUR.md`, `PETA.md`, `MODUL-PLUG-AND-PLAY.md`, `COPYWRITING.md` §5, `SUMBER-DATA.md` §1-2. Berkas "* 2.*" diabaikan.

## 0. Temuan inti (menentukan urutan)

1. **Gempa adalah bencana pertama yang hampir seluruhnya data hidup, bukan data harian.** Kejadian tiba tiap menit; tidak ada pipa Python harian yang berarti. Maka pola yang ditiru adalah `src/titik.js` (cron Worker, D1, `/api/titik`), bukan `banjir.yml`. Sebagian besar hitungan (isoseismal, penduduk per MMI, peluang susulan, kejadian aktif 72 jam, kartu Insight 30 hari) cukup dikerjakan di peramban dari katalog D1 + JSON statis kecil. Pipa Python tinggal tiga: riwayat USGS (sekali setahun), risiko riwayat, berita.
2. **Token git tidak bisa mendorong `.github/workflows/**`**, jadi `gempa.yml` (registry `workflow: "gempa.yml"`) tidak bisa lahir dari sesi ini. Keputusan rencana: **tanpa workflow gempa.** Yang butuh jadwal berjalan sebagai cron Worker (`wrangler.jsonc` BUKAN berkas workflow, boleh disunting; `tests/agen/gerbang-wrangler.test.mjs` malah menagih tiap konstanta `CRON_*` di `src/` ada di `triggers.crons`). Berita gempa menumpang `scripts/data/berita.py` yang sudah dijalankan `data.yml` (skrip diubah, bukan workflow). Butir 6 gerbang registry ("aktif non-warisan wajib punya workflow") perlu dilonggarkan satu kalimat alasan (K1).
3. **Satu pemicu cron saja:** `"* * * * *"` (konstanta `CRON_GEMPA`). Di dalamnya `scheduledTime` menit % 5 memilih pekerjaan: tiap menit `autogempa`; tiap 5 menit `gempaterkini`, `gempadirasakan`, USGS, PTWC. Total pemicu worker menjadi 3 (batas paket gratis 5). `scheduled()` di `src/worker.js` 480-481 memakai cabang `ev.cron === CRON_TITIK` lalu jatuh ke bersih-bersih; cabang gempa HARUS ditaruh sebelum jatuhan itu.
4. **Hasil uji sumber hari ini (16 Okt 2026, 05.15 UTC, dari Mac ini, `curl`):**
   - `https://data.bmkg.go.id/DataMKG/TEWS/{autogempa,gempaterkini,gempadirasakan}.json` semuanya 200 dengan UA peramban penuh. **UA `curl` pendek juga 200 hari ini** (SUMBER-DATA §0.1 mencatat 403): jangan dijadikan alasan mengirim UA pendek; Worker tetap mengirim UA penuh `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36`. **Belum teruji dari IP egress Cloudflare Workers**: G2 menutup dengan `wrangler tail` setelah deploy uji.
   - Header `autogempa.json`: `etag: W/"fe96294c2d5ddd1:0"`, `last-modified`, `cache-control: max-age=60`, di belakang CDN (`cf-cache-status: HIT`). Maka `If-None-Match` didukung dan polling 1 menit pas dengan umur cache 60 detik.
   - **`autogempa.json` BUKAN "M5+ terbaru"** (SUMBER-DATA salah): hari ini isinya M 2,5 Bogor. Itu gempa terbaru yang BMKG publikasikan, berapa pun besarnya. Satu objek, bukan larik.
   - Nama kolom nyata, `autogempa` (`Infogempa.gempa`, objek): `Tanggal` ("16 Okt 2026", singkatan bulan Indonesia), `Jam` ("10:21:55 WIB"), `DateTime` ("2026-10-16T03:21:55+00:00", **pakai ini**), `Coordinates` ("-6.69,106.63" = lat,lon bertanda, **pakai ini**), `Lintang` ("6.69 LS"), `Bujur` ("106.63 BT"), `Magnitude` ("2.5", **teks**), `Kedalaman` ("9 km", teks bersatuan), `Wilayah`, `Potensi`, `Dirasakan` ("II Kabandungan"), `Shakemap` ("20261016102155.mmi.jpg").
   - `gempaterkini` (`Infogempa.gempa`, larik 15): kolom yang sama TANPA `Dirasakan` dan `Shakemap`. `Potensi` hari ini selalu "Tidak berpotensi tsunami". `Wilayah` gaya lama: "29 km BaratLaut POHUWATO-GORONTALO" (kapital, arah tanpa spasi). Semuanya M 5,1 sampai 5,8 (jadi benar M5+).
   - `gempadirasakan` (larik 15): TANPA `Potensi` dan `Shakemap`; ada `Dirasakan`. `Wilayah` gaya baru: "Pusat gempa berada di darat 21 km Barat Daya Kota Bogor". Bentuk `Dirasakan` beragam: "III Darajat, III Pasirwangi" (daftar), "II - III Kab. Manggarai" (rentang), "II Kabandungan" (satu). Penguraian harus toleran: pisah koma, ambil angka Romawi di depan, rentang ambil nilai tertinggi.
   - **`Potensi` bukan hanya soal tsunami.** Di `autogempa` hari ini nilainya "Gempa ini dirasakan untuk diteruskan pada masyarakat" (tanpa kata tsunami). Aturan baca: berisi "tidak berpotensi tsunami" = kode 0; berisi "berpotensi tsunami" tanpa "tidak" = kode 1 sampai 3 menurut kata Waspada/Siaga/Awas bila ada, bila tidak ada tingkat = kode 1 berlabel apa adanya; selain itu = **tanpa pernyataan** (kode `null`, ditampilkan "BMKG tidak menyebut tsunami", tidak pernah diturunkan jadi "aman").
   - Tidak ada ID di BMKG. Kunci alami = `DateTime|Coordinates`. Gabung dengan USGS bila waktu selisih <= 90 detik dan jarak <= 100 km.
   - `https://static.bmkg.go.id/<Shakemap>` menjawab 301 ke `https://cdn.bmkg.go.id/<Shakemap>` (200, `image/jpeg`). Pakai `cdn.bmkg.go.id` langsung.
   - USGS FDSN, kotak Indonesia `minlatitude=-11.5&maxlatitude=6.5&minlongitude=94&maxlongitude=142&minmagnitude=4.5`: 200, 49 kejadian 1-16 Okt 2026 (±3 per hari). Kotak ini menjaring Filipina selatan, Timor Leste, PNG barat: wajib disaring ke Indonesia (butir 5). Kolom `properties`: `mag, magType, place, time` (ms epoch), `updated, url, detail, felt, cdi, mmi, alert` (PAGER, sering null), `tsunami` (0/1), `sig, net, code, ids, sources, types, nst, dmin, rms, gap, status, type, title, tz`; `geometry.coordinates = [lon, lat, kedalaman_km]`; `id` = "us6000u21y". Umpan ringkas `summary/4.5_day.geojson` juga 200 tanpa UA khusus. PTWC `https://www.tsunami.gov/events/xml/PHEBAtom.xml` 200 (isi belum diurai: G2 menulis penguraiannya dari contoh nyata).
5. **Wilayah laut:** `cariWilayah` di `src/titik.js` sengaja menolak titik di luar poligon provinsi yang jauh dari pusat kecamatan (8 km). Sebagian besar gempa besar Indonesia berpusat di laut. Perlu fungsi baru `wilayahTerdekat(W, lat, lon, maksKm)` di `src/gempa.js` (cincin sel 0,5° dari `W.grid`, jarak ke pusat kecamatan dari `banjir/data/pusat_kec.json`, 7.274 titik) dengan batas 300 km; di atasnya wilayah = teks `Wilayah` BMKG apa adanya. `wilayah()` dan `cariWilayah` diimpor dari `titik.js` (sudah diekspor), TIDAK dipindah (hemat satu refaktor).
6. **`SUMBER_STATUS` baris `["meta","/gempa/data/meta.json",30]` di registry akan membuat `/api/status` 503 selamanya** (tidak ada workflow yang menulis `meta.json`), dan `dibuatAset` (`worker.js` 333-343) hanya membaca berkas aset, tidak bisa membaca `/api/gempa/terbaru`. G1 membuang baris `meta`; G2 menambah cabang di `periksaStatus` yang membaca `max(diperbarui)` dari D1 untuk jalur `/api/gempa/*`. `tests/warga/registry.test.mjs` baris 39 mengunci daftar nama sumber (`["banjir","berita","dampak","titik"]`) dan akan merah begitu gempa berstatus `uji`: G1 memperbaruinya.
7. **Prasyarat dari RINCI-BANJIR yang BELUM ada:** `ls public/inti` hanya `kepala.css`, `kepala.js`. Mesin kartu (`Kartu`, `PilihCantik`, `rapikanTip`, `Tabel/paginasi`, `fmt`) masih inline di `public/index.html` (banjir L1). Gempa TIDAK boleh menyalinnya (gerbang `tanpa-salin`). Semua langkah layar (G9 ke atas) menunggu P1 = banjir L1 (+ L10 Berita inti, L13 foto per bencana, L14 mesin `Sapa.daftar`, L15 `kaki.js` berregistry, L16 bagikan). Gelombang 1 sengaja backend murni supaya tidak menunggu.
8. **Migrasi:** nomor bebas berikutnya `0009` (`ls migrations`: 0001 sampai 0008). RINCI-BANJIR L13 sudah memakai `0009` untuk `foto.bahaya`. Gempa memakai **`0010`** (katalog + status + kejadian) dan **`0011`** (perluasan `CHECK` bahaya dan jenis laporan, rebuild tabel anak). Cocokkan lagi saat digabung; jangan dua migrasi bernomor sama.
9. **Berita dan hasil Python harian harus keluar ke `public/data/`**, bukan `public/gempa/data/`: `titik.yml` dan `data.yml` menerbitkan dengan `git checkout FETCH_HEAD -- . ':!public/data' ':!public/banjir/data'` dan cache hanya memulihkan dua folder itu; folder `public/gempa/data/` baru akan ikut terbit HANYA bila isinya di-commit. Aturan rencana: berkas yang di-commit (riwayat, risiko, lapisan statis) di `public/gempa/data/`; berkas yang ditulis pipa CI (`berita_gempa.json`) di `public/data/`.

## 1. Tab target gempa (urutan pemilik, yang TAMPIL)

Daftar pemilik: **Peta, Insight, Tren, Berita, Dampak, Foto, Tentang.** Simulasi dan Dashboard dibuat di kode tetapi tersembunyi (A24; keputusan K2).

Registry target `public/bencana.json` gempa (hari ini: `tab` 12 butir, tanpa `tentang`, `status: "mati"`):
`tab: [peta, insight, tren, berita, dampak, foto, tentang, sim, posko, informasi, metode, ringkasan]`
`tab_sembunyi: [sim, posko, informasi, metode, ringkasan]`
Tab `kejadian` dihapus dari `tab` (digabung ke bawah Insight seperti karhutla 14 Okt); `/gempa/kejadian` beralias ke Insight.

| Tab | Isi | Catatan |
| --- | --- | --- |
| Peta | Gempa 24 jam/72 jam/7 hari/30 hari, isoseismal, Tingkat Pantau per kabupaten, pita tsunami | Panel kiri hanya Wilayah + daftar gempa; seg Posko disembunyikan |
| Insight | Sepuluh kartu §3 + blok `#insightKejadian` | Tanpa subjudul/unit/catatan (A1) |
| Tren | Indeks risiko riwayat 0 sampai 100 per kab/kec, gempa per tahun, gempa besar | **Tanpa kalender musim** (A16 "tidak berlaku": gempa tidak bermusim) |
| Berita | Volume, topik, peta berita, daftar | Sentimen disembunyikan sampai label uji >= 200 |
| Dampak | Penduduk per kelas MMI, sekolah, fasilitas kesehatan, jalan, kelas PAGER, korban historis | Dihitung di peramban per kejadian terpilih |
| Foto | Galeri bergeotag, kategori dari registry | Bergantung banjir L13 |
| Tentang | Iframe `/tentang.html?tertanam=1` | Seperti karhutla |
| Simulasi (sembunyi) | "Bagaimana kalau": titik + M + kedalaman | Model yang sama dengan Peta (B07) |
| Posko (sembunyi) | Sub Posko/Sarana/Keputusan | Alias `/gempa/sarana`, `/gempa/keputusan` |
| Informasi (sembunyi) | Lapor Warga, jenis `guncang`, `tsunami_amat` | `informasi.js` |
| Metode (sembunyi, WAJIB ada) | gempa.md C22 | Gerbang butir 6 |
| Ringkasan (sembunyi) | Dashboard C21 | Terakhir |

## 2. Kosakata MMI dan status tsunami

Dua kosakata terpisah. **Jangan dicampur, jangan berbagi kata "Awas/Siaga/Waspada" tanpa label sumber.** Teks final diadu ke halaman BMKG (skala SIG-BMKG) di tahap riset G6 sebelum dikunci ke `public/gempa/kata.js`.

**A. Status resmi tsunami** (pita teratas di peta dan laci; ikon gelombang; selalu bertuliskan sumber dan jam terbit)

| Kode | Label tampil | Sumber / kondisi baca | Warna registry |
| --- | --- | --- | --- |
| `null` | BMKG tidak menyebut tsunami | `Potensi` tanpa kata tsunami (mis. "Gempa ini dirasakan...") | netral (abu terang) |
| 0 | Tidak berpotensi tsunami | `Potensi` memuat "tidak berpotensi tsunami" | `#9aa4b2` |
| 1 | Tsunami Waspada | BMKG/InaTEWS tingkat Waspada, atau "Berpotensi tsunami" tanpa tingkat | `#e0b400` |
| 2 | Tsunami Siaga | tingkat Siaga | `#e8743b` |
| 3 | Tsunami Awas | tingkat Awas | `#d64545` |
| PTWC | PTWC: {kalimat asli yang diringkas}, mis. "PTWC: tidak ada ancaman tsunami" | Atom PTWC disaring Indonesia; [BV] sampai contoh nyata ada | label sumber, tanpa warna tingkat |
| USGS | USGS: ada pesan tsunami | `properties.tsunami = 1` | pil kecil |

Aturan: kata tingkat diambil dari teks BMKG apa adanya, tidak diturunkan oleh kode kita; bila teks tak terurai, tampil teks aslinya. Pita hilang bila tidak ada gempa 24 jam; pita merah memakai tautan "Lihat peringatan resmi BMKG".

**B. Tingkat Pantau Bencana** (pelengkap kita, per kabupaten, 72 jam; label selalu "Tingkat Pantau Bencana", beda dari pita tsunami)
Normal · Waspada · Siaga · Awas (aturan `gempa.md` §4: ambang hipotesis, ditetapkan ulang dari uji balik G7). Bahasa tindakan dari `kata.tindakan`: Pemantauan, Kaji cepat, Siaga evakuasi, Tanggap darurat (disembunyikan di laci, A24).

**C. Kelas MMI** (kolom `Dirasakan` BMKG dan keluaran model; angka Romawi I sampai XII; di layar pil kecil dengan kata)

| MMI | Pil | Sebutan awam (usulan) |
| --- | --- | --- |
| I | I | Tidak terasa |
| II sampai III | II / III | Terasa lemah di dalam rumah |
| IV | IV | Terasa banyak orang, perabot bergetar |
| V | V | Terasa hampir semua orang, tidur terbangun |
| VI | VI | Kerusakan ringan |
| VII | VII | Kerusakan sedang |
| VIII | VIII | Kerusakan berat |
| IX sampai XII | IX+ | Kerusakan parah sampai total |

Warna pil: deret berurutan satu rona (kuning pucat sampai merah tua), bukan pelangi. Ambang pelaporan dampak: MMI >= VI (laci bagian 4, Dampak, Siaga).

**D. Kelas lain**
- Kedalaman (kelas BMKG): dangkal < 60 km, menengah 60 sampai 300 km, dalam > 300 km. Warna lingkaran: dangkal merah, menengah oranye, dalam biru (PETA.md §3).
- Besaran pil: ringan 4,0 sampai 4,9 · sedang 5,0 sampai 5,9 · kuat 6,0 sampai 6,9 · besar >= 7,0 (usulan; adu ke BMKG).
- PAGER USGS: hijau / kuning / oranye / merah, label "USGS PAGER".
- Format: "M 5,7" (koma desimal, `fmt`), "kedalaman 10 km", waktu "12 Okt 04.34 WIB" (gempa di WITA/WIT tetap WIB di judul; laci menambah jam setempat). "pusat gempa", bukan "episentrum"; "susulan", bukan "aftershock" (A15). Tagar `#gempa #infogempa #tsunami`.

## 3. Kartu Insight: pola judul satu kalimat

Pola tetap `COPYWRITING.md` §2: **angka + satuan + kata kerja + tempat + jendela waktu**, angka disorot `hl`, tanpa subjudul/unit/catatan, pil kategori, kaki legenda + "Sumber:", tombol bagikan ikon, "–" untuk angka kosong, cacah kecil di awal kalimat dieja ("Tidak ada", "Satu"). Kosong = kartu dibuang (A18) kecuali yang punya kalimat "Tidak ada ...".

| # | Pil (`LABEL`) | Judul (templat tepat) | Kontrol / isi | Data | Sumber di kaki |
| --- | --- | --- | --- | --- | --- |
| I1 | Gempa terkini | **{N} gempa** M >= 5 mengguncang **{N} provinsi** dalam {24 jam / 72 jam / 7 hari / 30 hari} terakhir. Kosong: "Tidak ada gempa M >= 5 di Indonesia dalam {rentang} terakhir." | PilihCantik rentang; bar per provinsi, pil M maks di ujung | D1 `/api/gempa/terbaru` | BMKG, USGS |
| I2 | Tren harian | **{N} gempa** M >= 4,5 terjadi di Indonesia dalam 30 hari terakhir, terbanyak **{n}** pada {tgl}. | Batang bertumpuk per hari menurut kelas M; total di atas batang (A8) | D1 | USGS, BMKG |
| I3 | Dirasakan | **{N} gempa** dirasakan warga di **{N} provinsi** dalam 7 hari terakhir, terkuat MMI **{V}** di {tempat}. | Bar per provinsi, pil MMI maks; bila arsip belum penuh jendela ditulis "sejak {tgl}" | D1 (`dirasakan`) | BMKG |
| I4 | Status tsunami | **{Satu / N} gempa** dinyatakan BMKG berpotensi tsunami dalam 30 hari terakhir, terakhir di {Wilayah} pada {tgl} WIB. Kosong: "Tidak ada gempa yang dinyatakan BMKG berpotensi tsunami dalam 30 hari terakhir." | Daftar kecil berpil status §2A | D1 `potensi` | BMKG, PTWC |
| I5 | Per provinsi | **{N} gempa** M >= 4,5 mengguncang {Provinsi} sejak 1 Jan {tahun}, **{x}x** rata-rata tahunan 2000 sampai 2025. | `selProvMulti` (A9); batang tahun ini vs garis rata-rata (pil navy) | D1 + `riwayat_prov.json` | USGS, BMKG |
| I6 | Besaran | **{N} kali** per tahun gempa M >= 6 mengguncang {wilayah}, rata-rata sejak 2000. | Kurva kekerapan-besaran; nilai b sebagai pil; pemilih wilayah | `riwayat_prov.json` | USGS |
| I7 | Kedalaman | **{N}%** gempa M >= 4,5 dalam 30 hari terakhir berpusat dangkal (< 60 km) di {wilayah}. | Sebar M vs kedalaman, warna kelas | D1 | USGS, BMKG |
| I8 | Susulan | **{N}%** peluang susulan M >= 5 dalam 7 hari setelah M {x} di {Wilayah} pada {tgl}. | Hanya bila ada kejadian G aktif; pil selang "{lo} sampai {hi}%" (A17: angka langsung, tanpa kalimat peluang-bukan-kepastian); peluang 1/3/7 hari | model Reasenberg-Jones (G6) | USGS, BMKG |
| I9 | Kejadian | **{N} kejadian** gempa aktif dalam 72 jam terakhir, terbesar M {x} di {Wilayah}. | Blok `#insightKejadian`: tabel A10 (Kode, M, Wilayah, Waktu, Susulan, MMI maks, Tingkat), urut, paginasi, tautan ke peta/laci | D1 `gempa_kejadian` | BMKG, USGS |
| I10 | Kinerja model (SEMBUNYI seperti kartu uji karhutla) | **{N}%** perkiraan MMI tepat dalam +-1 kelas dari **{n}** laporan dirasakan BMKG sejak {tgl}. | Diagram reliabilitas, bias, RMSE | `validasi.json` (G7) | BMKG, USGS |

Pindah tab (bukan Insight): "Gempa merusak" ke Dampak: **{N} jiwa** meninggal akibat gempa merusak di {wilayah} sejak 2000, terbanyak pada {tahun}. · Tren: **{N} kabupaten** berindeks risiko riwayat gempa >= 70 dari 100 di {wilayah}. · Tren: **{N} gempa** M >= 6 mengguncang radius 100 km dari {kabupaten} sejak 1900, terbesar M {x} pada {tahun}. · Dampak: **{N} juta jiwa** tinggal di zona MMI >= VI perkiraan untuk M {x} di {Wilayah} pada {tgl}.

## 4. Langkah berurutan

Format: **G#** judul · ukuran (S < 2 jam, M 2 sampai 4, L > 4) · pemilik. Lalu Ubah/Mengapa · Berkas+fungsi · Pakai ulang / tulis baru · Data · Cek terima (1440 / 390). Semua kata tampil: "kamu", tanpa em dash (A25). Tidak ada dependensi npm/pip baru.

### Gelombang 1: fondasi data (G1, G2, G4, G5, G6 paralel; berkas berbeda, tidak butuh `inti/`)

**G1. Registry, rute bersih, status sumber · M · warga-api**
- Ubah/Mengapa: rute `/gempa/*` hidup tanpa workflow; tab target §1; membuang baris `meta.json` yang akan membuat `/api/status` 503 (temuan 6).
- Berkas: `public/bencana.json` (entri gempa: `tab`, `tab_sembunyi`, `alias` kejadian/prioritas ke insight dan sarana/keputusan ke posko, `sumber_status` = `[["gempa_terbaru","/api/gempa/terbaru",0.5]]`, `workflow: null` + `cron_worker: [{"tugas":"gempa","selang_detik":60}]`, `foto_kategori`, `lapor_bahaya`, `kata` + `peringatan_relevan` tetap), `scripts/umum/bencana.py` (`npm run bencana:js`), `src/og_meta.js` (`LABEL` tambah tren/foto/tentang/sim bila belum), `public/jejak.js` regex 77-78 dan `src/statistik.js` (turun dari registry sudah, cek), `tests/agen/gerbang-bencana.test.mjs` (butir 6: `workflow` boleh null bila `cron_worker` tidak kosong), `tests/warga/registry.test.mjs` (daftar nama sumber).
- Pakai ulang: seluruh mesin registry (`src/bencana.js` `ruteBencana`, `tabRute` untuk non-warisan sudah mengembalikan `b.tab`, `jalurKejadian` untuk `k/G\d+`). Tulis baru: hanya baris registry dan perubahan gerbang.
- Data: tidak ada. Status tetap `mati` sampai G3 menaruh `public/gempa/index.html`; baru lalu `uji` (rute hidup, `noindex`). `aktif` hanya atas kata pemilik.
- Cek: `npm run bencana:cek`, `npm run uji:agen`, `npm run uji:warga` hijau; `curl /gempa/insight` 200 HTML (pita versi uji); `/api/status` tetap 200.

**G2. Pengarsip katalog gempa: cron Worker, D1, API · L · warga-api**
- Ubah/Mengapa: satu-satunya sumber data hidup. Mulai SECEPATNYA karena uji balik (G7) butuh arsip `Dirasakan` yang BMKG hanya simpan 15 butir terakhir; tiap hari tertunda = data uji hilang selamanya.
- Berkas:
  - baru `migrations/0010_gempa.sql`: `gempa` (`id TEXT PK` = "b:"+DateTime+"|"+Coordinates atau "u:"+id USGS; `t INTEGER` ms; `lat, lon REAL` dengan CHECK bbox seperti `foto`; `m REAL`; `mtipe`; `dalam REAL`; `wilayah TEXT`; `prov TEXT(2)`, `kab TEXT`; `sumber` bmkg|usgs|gabung; `potensi INTEGER NULL` (§2A); `potensi_teks`; `dirasakan TEXT`; `mmi_maks REAL`; `shakemap TEXT`; `pager TEXT`; `usgs_id`; `kej TEXT NULL`; `diperbarui INTEGER`), indeks `(t DESC)`, `(m, t)`; `gempa_kejadian` (`kode PK`, `utama_id`, `mulai`, `akhir`, `m`, `nama`, `aktif_hingga`); `gempa_sumber` (`kunci PK`, `etag`, `isi`, `dibuat`) untuk ETag dan PTWC terakhir.
  - baru `src/gempa.js`: `uraiBMKG(obj|larik)`, `uraiDirasakan(teks)` (daftar dan rentang), `uraiPotensi(teks)`, `uraiUSGS(fc)` (saring Indonesia, butir 5 temuan), `gabung()` (selisih <= 90 detik dan <= 100 km), `wilayahTerdekat()`, `perbaruiGempa(env, ev)`, `gempaTerbaru(env, url)`, `gempaStatus(env)`. Pola `titik.js`: hasil satu putaran semua gagal = data lama dipertahankan; baris rusak dihitung dan dibuang; kembalikan `{baru, rusak, galat}` untuk `console.log`.
  - `src/worker.js`: `const CRON_GEMPA = "* * * * *"`, cabang di `scheduled()` SEBELUM jatuhan bersih-bersih; rute `GET /api/gempa/terbaru` (`?jam=` 24/72/168/720, `cacheTepi` 60 detik), `GET /api/gempa/status`, `GET /api/gempa/kejadian`; `periksaStatus` baca `max(diperbarui)` untuk jalur `/api/gempa/*`; `bersihkan` buang M < 4 yang lebih tua dari 90 hari (M >= 4 disimpan).
  - `wrangler.jsonc`: tambah `"* * * * *"` ke `triggers.crons`.
  - baru `tests/warga/gempa.test.mjs` (Miniflare, pola `tests/warga/api.test.mjs`) dengan fixture hasil `curl` hari ini di `tests/warga/fixtures/` (autogempa, gempaterkini, gempadirasakan, USGS 2 fitur): urai, gabung duplikat, `Potensi` tanpa kata tsunami = `null`, rentang `Dirasakan`, laut = wilayah terdekat, ETag 304 tidak menulis, semua sumber gagal = data lama.
- Pakai ulang: `wilayah()` dan `cariWilayah` dari `src/titik.js`, `cacheTepi`, `json`, `gagal`, pola `INSERT ... ON CONFLICT`/`batch` dari `perbaruiTitik`. Tulis baru: semua uraian.
- Data: BMKG `autogempa` tiap menit dengan `If-None-Match`; menit % 5: `gempaterkini`, `gempadirasakan`, USGS FDSN `starttime=` 3 hari terakhir (isi ulang selisih bila Worker mati), PTWC Atom. UA penuh di semua `fetch` BMKG. Satu putaran menulis hanya baris berubah.
- Cek: `npm run uji:warga` hijau; setelah deploy uji `wrangler tail` menunjukkan `gempa {"baru":...}` dan tidak ada 403; `curl /api/gempa/terbaru?jam=72` memuat M >= 5 yang sama dengan `gempaterkini` hari itu; baris D1 bertambah hanya saat ada kejadian baru.

**G4. Riwayat USGS sejak 1900 dan indeks risiko · M · gempa/data**
- Ubah/Mengapa: bahan Tren, Insight I5/I6, laci "riwayat gempa besar di sekitar", uji balik. Statis, di-commit, dijalankan manual sekali setahun (tanpa workflow).
- Berkas: baru `scripts/gempa/umum.py` (ambil dengan jeda dan UA penuh, simpan), `scripts/gempa/riwayat.py` (FDSN per dekade/tahun karena batas 20.000 baris per kueri; M >= 5 sejak 1900, M >= 4,5 sejak 2000 = 26.004 menurut SUMBER-DATA) -> `public/gempa/data/riwayat_m5.json` (tabel `{kolom, baris}`, M >= 5), `riwayat_prov.json` (per provinsi per tahun: jumlah per kelas M, nilai b, M maks; provinsi dari `scripts/data/wilayah.py` `Wilayah.cari` + provinsi terdekat <= 200 km untuk laut), `riwayat_grid.json` (kekerapan 0,1°), `risiko.json` (indeks 0 sampai 100 per kabupaten dan kecamatan: 50% kekerapan M >= 5, 30% besaran maks, 20% tren, rumus A15 seperti `scripts/banjir/riwayat.py`), `meta.json` ditulis `dibuat` pertama. Tiap skrip punya `uji` dengan contoh tersimpan.
- Pakai ulang: pola `scripts/banjir/umum.py` (`ambil`, `simpan`), `scripts/banjir/riwayat.py` (rumus peringkat), `scripts/data/wilayah.py`. Tulis baru: pengambil USGS.
- Data: USGS FDSN. Plafon ukuran per berkas ditulis di `uji` (riwayat_m5 <= 1,2 MB, grid <= 400 KB).
- Cek: `python3 scripts/gempa/riwayat.py uji`; hitungan M >= 4,5 sejak 2000 sama dengan `count` USGS pada hari yang sama; berkas di plafon.

**G5. Lapisan bahaya statis · M · gempa/data**
- Berkas: baru `scripts/gempa/bahaya.py` -> `public/gempa/data/inarisk_gempa.json`, `inarisk_tsunami.json` (pola `scripts/data/bnpb_gis.py`, `gis.bnpb.go.id` folder `inarisk` dan `TSUNAMI_DAN_GELOMBANG_TINGGI`, id lapisan [BV]: ambil sekali, catat), `batas_lempeng.geojson` (batas lempeng/subduksi dari data terbuka, [BV] sumber), `sesar.geojson` (Pusgen 2017, [BV] lisensi: tanya pemilik, K3).
- Aturan A18: lapisan yang tidak bisa diakses DIBUANG, bukan kosong; catat di `fitur-disembunyikan.md`.
- Cek: tiap berkas valid GeoJSON, di bawah plafon `gerbang-geo` (< 700 KB per berkas wilayah).

**G6. Model inti: guncangan, susulan, kejadian, tingkat · L · gempa/model**
- Ubah/Mengapa: jantung A09/A13/B01. Satu sumber kebenaran di JS ESM yang dipakai peramban DAN Worker; kembaran Python untuk uji balik (B07).
- Berkas: baru `docs/multi-bencana/bencana/RISET-GMPE.md`, `RISET-SUSULAN.md` (B10; pilih GMPE subduksi/kerak/in-slab yang dipublikasikan, GMICE Worden 2012 atau Wald 1999, parameter Reasenberg-Jones generik a = -1,67, b = 0,91, p = 1,08, c = 0,05 lalu kalibrasi Indonesia dari katalog USGS 2000 sampai 2022; jendela Gardner-Knopoff dengan rumus diadu ke makalah). Kode: `public/gempa/model.js` (`export`: `mmiPerkiraan(m, jarakKm, dalamKm, jenis)`, `susulan(mUtama, tHari, mMin)`, `jendelaGK(m)`, `masukJendela(utama, g)`, `tingkatPantau(mmiKab, pSusulan, tsunamiAktif)`), `public/gempa/model_global.js` (modul yang memasang `window.GempaModel`), `scripts/gempa/model.py` (kembaran + `uji` terhadap contoh literatur), `tests/agen/gempa-model.test.mjs` (kesetaraan Python dan JS: sama pada 20 kasus).
- Pakai ulang: tidak ada; Worker mengimpor `../public/gempa/model.js` (esbuild `wrangler@3` menggabungkannya; paket `"type":"module"`; uji Node jalan). Peringatan: bila bundler menolak impor di luar `src/`, pindahkan berkas ke `src/gempa_model.js` dan muat dari peramban lewat rute aset; JANGAN menyalin.
- Data: `public/gempa/data/riwayat_prov.json` (G4) untuk kalibrasi; `public/banjir/data/pusat_kec.json` (7.274 pusat kecamatan) dan `public/data/penduduk.json` kolom `kec` untuk hitungan per kecamatan.
- Cek: `python3 scripts/gempa/model.py uji`; `node --test tests/agen/gempa-model.test.mjs`; contoh hitung gempa hari ini tercetak untuk halaman Metode (G19).

**G8. Kejadian G di Worker · M · warga-api (SERIAL dengan G2: satu agen, satu berkas `src/gempa.js`)**
- Butuh G2 dan G6. Setelah baris baru masuk: bila M >= 5 dan masuk `masukJendela` kejadian aktif -> `kej` = kode itu (susulan); bila tidak -> kejadian baru `G` + nomor urut (`G0001`), kunci alami = id gempa utama, tidak pernah berubah antar putaran; aktif 72 jam sejak gempa terakhir di kelompok, 7 hari bila M utama >= 6,5. `GET /api/gempa/kejadian` dan `/api/gempa/kejadian/G0001` (atribut A05; poligon isoseismal dihitung di klien dari `model.js`).
- Cek: uji Miniflare: dua gempa M 5,7 dan 5,2 dalam jendela = satu G, kode tetap pada putaran ulang; kejadian kedaluwarsa tepat waktu.

### Gelombang 2: kerangka dan layar inti (butuh P1 = banjir L1; G3 boleh mulai dulu dengan stub)

**G3. Kerangka halaman `/gempa/` · M · gempa/layar**
- Berkas: baru `public/gempa/index.html` (kepala dengan burger, tab ikon dari registry, `TAB_SEMBUNYI`, URL bersih `history.replaceState` ke `/gempa/<tab>`, `<section id="p-peta|p-insight|p-tren|p-berita|p-dampak|p-foto|p-tentang|p-sim|p-posko|p-informasi|p-metode|p-ringkasan">`, semua tag `<script src>` ke modul stub; TIDAK ada skrip inline besar), `public/gempa/{gaya,peta,insight,tren,dampak,berita,foto}.css`, stub `peta.js, insight.js, tren.js, dampak.js, berita.js, sim.js, posko.js, metode.js, sapa_gempa.js`, `public/gempa/kata.js` (kosakata §2 dari `kata` registry).
- Pakai ulang: `public/inti/kepala.js` menu bencana (ikon `gempa` sudah ada), pola kepala/nav banjir L5, `i18n.js`, `persetujuan.js`, `jejak.js`, `pesan.js`. Semua stub terpasang sekarang supaya langkah lain tidak menyentuh `index.html` lagi (titik serial tunggal).
- Cek 1440: tujuh tab berikon sebaris, Insight aktif bergaris; 390: burger, tanpa tombol tema dan pilihan bencana, tanpa scroll horizontal. Setelah lolos, G1 membalik `status` ke `uji`.

**G9. Peta gempa · L · layar-peta**
- Ubah/Mengapa: `PETA.md` §3 kolom Gempa. Tiru modelnya, jangan satu detail.
- Berkas: `public/gempa/peta.js`, `peta.css`. Isi: lingkaran gempa (radius log M, warna kedalaman, memudar menurut umur 24/72 jam), susulan titik kecil, klaster MapLibre gempa >= M5 72 jam (Sulawesi/Maluku padat), choropleth Tingkat Pantau per kabupaten (`match lv`), isoseismal bertingkat kejadian terpilih (`GempaModel` di klien, `image`/poligon), kisi perkiraan MMI, pita status tsunami (§2A) di atas peta, rentang 24 jam/72 jam/7 hari/30 hari (`localStorage`), panel kiri: mode Sekarang/Riwayat/Kejadian dengan daftar urut waktu, kartu hover `kartuTip` (M, kedalaman, wilayah, MMI), Overlay ubin Windy (penduduk, sekolah, fasilitas, jalan, sesar, InaRISK gempa/tsunami, batas lempeng), legenda terukur, `fitBounds` berpadding terukur dan `maxZoom`, `nanti()` untuk kerja berat. Klik berprioritas: klaster, gempa, isoseismal, wilayah.
- Pakai ulang: `public/inti/peta/*` bila banjir L8 sudah memungutnya (`dasar`, `lapis`, `kartu`, `gelembung`, `legenda`, `klik`); BUKAN salinan `Peta` karhutla atau banjir. Tulis baru: adaptor data gempa dan lapis gempa.
- Data: `/api/gempa/terbaru`, `/api/gempa/kejadian`, `riwayat_grid.json`, lapisan G5, `public/data/{penduduk,sekolah,fasilitas}.json`, `public/data/jalan.geojson`.
- Cek 1440: Overlay satu baris ubin ikon, hover kartu angka, pita tsunami hilang bila tak ada gempa; 390: panel bawah, tidak meluber; zoom keluar naik tingkat.

**G10. Laci kejadian · M · layar-peta (setelah G9, berkas yang sama `peta.js`)**
- Sebelas bagian `gempa.md` §7 C12, disaring ke yang punya data (A18): pita tsunami, gempa saat ini (M, kedalaman, jam WIB/WITA/WIT, wilayah, MMI resmi), peta guncangan BMKG (`https://cdn.bmkg.go.id/<Shakemap>`; tampil hanya bila ada dan 200), dirasakan di (tempat + pil MMI), perkiraan guncangan per kabupaten (tabel kelas MMI, penduduk), susulan (hitungan + peluang 1/3/7 hari), penjelasan tingkat dengan angka hari ini, bahaya InaRISK, riwayat sekitar sejak 1900, bagikan `/gempa/k/G0001` + Google Maps. **"Tindakan yang disarankan" dan "Respons terdekat" dibuat tetapi `hidden` (A24).**
- Cek: klik gempa membuka laci lebar, `fitBounds` terukur; 390 jadi dialog; `/gempa/k/G0001` membuka laci langsung.

**G11. Insight bergaya kartu · L · gempa/layar**
- Berkas: `public/gempa/insight.js`, `insight.css`. Kartu I1 sampai I10 §3 lewat `Kartu.ex` (inti), `PilihCantik`, `Tabel`/`paginasi`, pil `Kartu.pil` untuk angka di ujung batang, tooltip `rapikanTip` (kepala + kolom, tanpa ISO). Blok `#insightKejadian` I9. Kartu I10 `hidden`.
- Data: `/api/gempa/terbaru?jam=720`, `riwayat_prov.json`, `/api/gempa/kejadian`, `validasi.json` (G7).
- Cek 1440: kartu satu kolom lebar penuh, pil terisi, angka total di batang, judul persis pola §3, tanpa subjudul/unit/catatan; 390: pemilih tidak terpotong. Grep: `toFixed(`, em dash, "Anda", `title="` = nol.

**G12. Tren · M · gempa/layar**
- Berkas: `public/gempa/tren.js`. Kartu: gempa per tahun (M >= 5, 1900 sampai kini), tabel indeks risiko 0 sampai 100 kab/kec (`risiko.json`, tabel A10), gempa besar sejak 1900 (tabel + peta mini), tanpa kalender musim. Data: G4. Cek: seperti G11; tabel kepala gelap, urut, satu kotak.

**G13. Berita gempa · M · pipa-data + gempa/layar**
- Berkas: baru `scripts/berita/gempa.py` (kueri "gempa", "gempa susulan", "tsunami", "BMKG gempa", "likuifaksi", "pengungsi gempa"; topik: kerusakan, korban, bantuan, susulan, hoaks gempa; leksikon registry `berita.leksikon`), `scripts/data/berita.py` (baca registry, tulis `public/data/berita_gempa.json`; keluaran karhutla harus identik: bandingkan `berita.json` pada masukan sama), `public/gempa/berita.js` memanggil `Berita` inti (banjir L10). Sentimen disembunyikan sampai label uji >= 200 (K4). `data.yml` TIDAK diubah (sudah menjalankan `berita.py` "boleh gagal"); `SUMBER_STATUS` tambah `["berita_gempa","/data/berita_gempa.json",30]` hanya setelah berkas ada.
- Cek 1440/390: volume harian, topik pil, peta berita, daftar berpaginasi (judul = tautan).

**G14. Dampak gempa · L · gempa/layar**
- Berkas: `public/gempa/dampak.js` (modul baru). Bagian: penduduk per kelas MMI, sekolah dan fasilitas kesehatan di MMI >= VI, jalan dan jembatan, kelas PAGER (kerugian kelas, bukan rupiah), korban dan kerusakan historis (DIBI gempa, `scripts/gempa/dibi.py` -> `public/gempa/data/dibi_gempa.json`, sumber [BV]; banjir `riwayat.py` sudah membaca DIBI, tiru), pemilih kejadian (`PilihCantik`). Bangunan rentan, pengungsi BNPB, kerugian ekonomi tanpa asumsi bernama: DIBUANG sampai ada data terbuka (A18). Perhitungan: `GempaModel.mmiPerkiraan` per 7.274 pusat kecamatan dijumlahkan dengan `penduduk.json` `kec`, di dalam `nanti()`.
- Cek 1440/390: judul berangka pola §3, angka langsung (A17).

**G15. Foto lapangan gempa · S · warga-api (server) + gempa/layar**
- Bergantung banjir L13 (`foto.bahaya`, `KATEGORI` dari registry, `GET /api/foto?bencana=`). Gempa hanya: kategori registry (`guncangan, retakan, pengungsian, tsunami, lainnya`), `p-foto` dan lapis "Foto lapangan warga" di Overlay (mulai mati, tidak disimpan). Foto contoh 100 Wikimedia (K3) bukan syarat; tanpa itu keadaan kosong "Belum ada foto" + "Ambil foto". Cek 1440: galeri bergeotag dengan ikon dan waktu di dalam foto; 390 satu kolom.

**G16. Lapor Warga: jenis guncang dan tsunami_amat · M · warga-api**
- Berkas: baru `migrations/0011_laporan_gempa.sql` (rebuild aman `laporan` dan anak: `CHECK bahaya` tambah 'gempa', 'tsunami'; `jenis:bahaya` tambah `guncang:gempa`, `tsunami_amat:tsunami`; ARSITEKTUR §6.1), `public/informasi_jenis.js` (`guncang`: terasa, kuat, barang jatuh, retak dinding, roboh dengan isian MMI bergambar; `tsunami_amat`: air surut, air naik, genangan), `src/worker.js` (lencana "cocok dengan gempa BMKG" bila laporan guncang dalam <= 15 menit dan radius dari gempa di tabel `gempa`), `tests/warga/skema.test.mjs`. Tab Informasi tetap tersembunyi. Cek: `npm run uji:warga`; laporan uji mendapat lencana.

**G17. Pop-up Situasi hari ini · M · inti-layar (mesin, banjir L14) + gempa/layar (adaptor)**
- `public/gempa/sapa_gempa.js` lewat `Sapa.daftar("gempa", {...})`: eyebrow "Situasi gempa hari ini", judul **{N} gempa terasa di {provinsi / Indonesia} dalam 24 jam terakhir** + selisih kemarin (▲/▼, dari D1 per hari), chip status tsunami §2A, seksi: terkuat, kejadian aktif, peringatan BMKG relevan (`gempa|tsunami`), kaki "Sumber: BMKG, USGS" + "Lihat peta". Lokasi kasar hanya bila diizinkan. Sekali per hari WIB. Cek 1440: dialog 560 px, satu angka besar; 390 penuh; kata "kamu".

### Gelombang 3: pelengkap (sebagian tersembunyi)

**G18. Tentang, kaki, bagikan, OG · M · gempa/layar + warga-api**
- Tentang: iframe, kartu gempa di `tentang.html` dari registry. Kaki: `kaki.js` berregistry (banjir L15). Bagikan: `Bagikan.tema.gempa` (kanvas isoseismal + angka), tombol ikon di tiap kartu, teks "temuan -> konteks -> Data per {tgl}, diolah dari BMKG dan USGS -> tagar", tanpa emoji. OG: `/gempa/k/G0001` TIDAK bisa memakai `meta.json` statis (kejadian lahir tiap saat): `src/og_meta.js` mendapat cabang gempa yang membaca D1 (judul "Gempa M 5,7 Gorontalo · G0012 · Pantau Bencana", gambar OG umum gempa). Cek: pratinjau tautan benar; ikon bagikan di setiap kartu.

**G19. Metode (tersembunyi, wajib) · M · gempa/model**
- `public/gempa/metode.js`: pola "Singkatnya, Alurnya, Contoh dengan data hari ini, Rincian teknis terlipat, Batasan" untuk magnitudo/MMI, jendela susulan, GMPE + GMICE (contoh hitung gempa terakhir dari `model.js`), Reasenberg-Jones, aturan tingkat, uji balik, **"tidak ada yang bisa meramal gempa utama, termasuk situs ini"**, batasan (tanpa koreksi tapak, katalog tidak lengkap M < 5 sebelum 2008, `Dirasakan` hanya 15 terakhir sebelum arsip G2). Cek: `/gempa/metode` hidup.

**G7. Uji balik dan catatan prospektif · M · gempa/model (mulai setelah G2 mengumpulkan >= 60 hari DAN G6)**
- `scripts/gempa/uji_balik.py` -> `public/gempa/data/validasi.json` (bias, RMSE per kelas, % tepat +-1 kelas MMI terhadap `Dirasakan` BMKG dan USGS DYFI `cdi`; kalibrasi susulan; POD/FAR/CSI Tingkat Pantau terhadap DIBI; pembagian latih 2008-2019 / validasi 2020-2022 / uji 2023-2026 dibuka sekali). B03 prospektif: tabel `gempa_prospektif` (append-only, ditulis G2 saat M >= 5 baru masuk: prakiraan susulan saat itu, dinilai 7 hari kemudian). Ambang §4 `gempa.md` DITETAPKAN ULANG dari sini. Angka di layar = angka di JSON. Kartu I10 dibuka hanya atas kata pemilik.

**G20. Simulasi "Bagaimana kalau" (tersembunyi) · M · gempa/layar**
- `public/gempa/sim.js`: peta kedua `#simPeta`, titik + M + kedalaman, isoseismal + penduduk terpapar dari `GempaModel` (kesetaraan Python/JS sudah dijaga G6). Tanpa cuaca (A31 "tidak berlaku"). Cek 1440/390.

**G21. Posko, sarana, keputusan (tersembunyi) · L · pipa-data + gempa/layar**
- `scripts/gempa/posko.py` (greedy coverage penduduk MMI >= VI, pola `scripts/data/posko.py`), kebutuhan tenda/air bersih/tim SAR/alat berat per 1.000 pengungsi (koefisien bersumber Sphere/Perka BNPB; Python-JS setara), Keputusan lo/mid/hi Monte Carlo. Keluaran `public/data/gempa_posko.json` (pipa) atau layar-sisi (hitung di klien dari kejadian). Boleh menyusul sesudah publik; tetap harus ada di kode (A24).

**G22. Dashboard Ringkasan (tersembunyi) · M · gempa/layar** · enam bagian C21; terakhir.

### Gelombang 4: sapuan akhir (serial)

**G23. i18n EN · M · gempa/layar** · `scripts/i18n/kumpul.mjs` crawl `/gempa/*`; glosarium: magnitudo, MMI, pusat gempa (epicenter), kedalaman, susulan, InaTEWS; "Tidak berpotensi tsunami" = "No tsunami potential"; hreflang trio. Cek `?lang=en` nol kebocoran 1440/390.
**G24. Sapuan tabel, tooltip, copy, mobile, INP · M · gempa/layar + inp-reviewer** · semua tabel `Tabel` standar; grep `toFixed(`, `title="`, `cursor:help`, em dash, "Anda", "Coming Soon", "episentrum" = nol; tanpa scroll horizontal 390; target sentuh >= 44 px; handler lewat `nanti()`.
**G25. Verifier + catatan · S · agen baru berkonteks bersih** · `npm run uji:warga`, `uji:agen`, `python3 scripts/gempa/*.py uji`, tangkapan 1440/390 per tab, karhutla dan banjir sebelum/sesudah identik. Isi daftar periksa `bencana/gempa.md` §9 (R/A/T → ada). Catat penyembunyian di `fitur-disembunyikan.md`: tab sim/posko/informasi/metode/ringkasan gempa, kartu I10, laci "Tindakan" dan "Respons terdekat", sentimen berita. Push/deploy dan `status: aktif` menunggu kata pemilik.

## 5. Peta paralel (berkas yang disentuh)

| Gelombang | Boleh jalan bersamaan | Berkas utama (tidak bentrok) |
| --- | --- | --- |
| 1 | G1, G2 (+G8 serial), G4, G5, G6 | G1: `public/bencana.json`, `src/bencana.generated.js`, `src/og_meta.js`, `tests/agen/*`, `tests/warga/registry.test.mjs` · G2/G8: `migrations/0010`, `src/gempa.js`, `src/worker.js`, `wrangler.jsonc`, `tests/warga/gempa.test.mjs` · G4/G5: `scripts/gempa/*.py`, `public/gempa/data/*` · G6: `public/gempa/model*.js`, `scripts/gempa/model.py`, `tests/agen/gempa-model.test.mjs`, docs RISET |
| 2 | G3 dulu (kerangka), lalu G9->G10, G11, G12, G13, G14 | G3: `public/gempa/index.html`, `*.css`, stub · G9/G10: `peta.js,.css` · G11: `insight.js,.css` · G12: `tren.js` · G13: `scripts/berita/gempa.py`, `scripts/data/berita.py`, `berita.js` · G14: `dampak.js`, `scripts/gempa/dibi.py` |
| 3 | G15, G16, G17, G18, G19, G20, G21, G22 (G7 menunggu data) | G15: foto (server milik banjir L13) · G16: `migrations/0011`, `informasi_jenis.js`, `src/worker.js` · G17: `sapa_gempa.js` · G18: `tentang.html`, `bagikan.js`, `src/og_meta.js` · G19: `metode.js` · G20: `sim.js` · G21: `posko.js`, `scripts/gempa/posko.py` · G22: `ringkasan` |
| 4 | Serial | G23 `en.json`; G24 sapuan; G25 verifier |

Titik serialisasi:
- `src/worker.js`: G2 -> G8 -> G16 (satu agen warga-api berurutan; banjir L13 dan L2 juga menyentuhnya: koordinasi lewat urutan commit, jangan paralel).
- `src/gempa.js`: G2, G8 (satu agen).
- `public/bencana.json`: hanya G1.
- `public/gempa/index.html`: hanya G3 (semua tag stub terpasang di situ).
- `migrations/`: 0009 milik banjir L13, 0010 dan 0011 milik gempa; cek ulang nomor sebelum tiap commit.
- Prasyarat luar P1 (banjir L1 dan L10, L13, L14, L15, L16): gelombang 2 dan 3 layar tidak dimulai sebelum `public/inti/kartu.js` ada. Bila P1 tertunda, pindahkan agen ke G2 dan G4 sampai selesai.

## 6. Keputusan terbuka untuk pemilik

K1. Longgarkan gerbang registry butir 6 (workflow wajib) untuk gempa dengan alasan "cron Worker, tidak ada pekerjaan harian"? Default: ya. Atau pemilik menaruh `gempa.yml` sendiri nanti (token ini tidak bisa).
K2. Simulasi gempa tersembunyi (default, sesuai daftar tujuh tab pemilik) atau tampil seperti karhutla?
K3. Lisensi: Pusgen 2017 (sesar aktif) dan foto contoh Wikimedia (100 foto).
K4. Sentimen berita gempa sebelum label uji >= 200: sembunyikan (default).
K5. Citra sebelum/sesudah (A32, hanya M >= 6,5) dan video (A34): ditandai "tidak berlaku sementara" dengan alasan di `bencana/gempa.md`, bukan dibuat.
K6. Frekuensi 1 menit ke BMKG dengan UA peramban penuh: sesuai SUMBER-DATA §0.1 (ETag, 1 menit hanya `autogempa`); bila Worker mendapat 403, hubungi BMKG untuk akses resmi, jangan mencari cara menembus.

## 7. Ringkasan 250 kata

Gempa adalah bencana data-hidup: tidak butuh workflow harian. Token git tidak bisa mendorong `.github/workflows`, jadi satu cron Worker `"* * * * *"` (disunting di `wrangler.jsonc`, ditagih `gerbang-wrangler`) memanggil BMKG `autogempa` tiap menit dan `gempaterkini`, `gempadirasakan`, USGS, PTWC tiap lima menit, menulis katalog ke D1 (migrasi `0010`) dengan pola `src/titik.js`, dan menyajikan `/api/gempa/*`. BMKG diuji hidup hari ini: ketiga berkas 200, ETag ada, kolom `Dirasakan` hanya di dua berkas, `Potensi` kadang bukan pernyataan tsunami (diberi kode `null`, tidak pernah ditafsir "aman"); `autogempa` ternyata gempa terbaru berapa pun besarnya, bukan M5+. USGS Indonesia 200, 49 kejadian dalam 16 hari, perlu disaring dari Filipina dan PNG.

Arsip dimulai paling awal karena `Dirasakan` hanya 15 butir terakhir dan dibutuhkan uji balik. Model guncangan, susulan, jendela kejadian, dan Tingkat Pantau ditulis sekali di `public/gempa/model.js` (dipakai peramban dan Worker), dengan kembaran Python. Dampak, isoseismal, dan kartu Insight dihitung di peramban.

Tab tampil: Peta, Insight, Tren, Berita, Dampak, Foto, Tentang. Sepuluh kartu Insight berjudul pola angka, satuan, kata kerja, tempat, waktu. Dua kosakata terpisah: status tsunami resmi dan Tingkat Pantau.

Empat gelombang, G1 sampai G25. Layar menunggu mesin kartu `public/inti/` dari banjir L1; gelombang 1 backend murni supaya tidak menunggu. Titik serial: `src/worker.js`, `src/gempa.js`, `bencana.json`, `public/gempa/index.html`, nomor migrasi. Enam keputusan terbuka tersisa.
