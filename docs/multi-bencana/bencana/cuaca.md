# Cuaca ekstrem (angin kencang, puting beliung, hujan es, petir, siklon, gelombang tinggi)

Pengerja: agen `cuaca-udara` (satu agen untuk cuaca dan udara). Urutan: 3. Gelombang tinggi dilebur sebagai lapisan dan bagian status
(ARSITEKTUR "Keputusan" butir 2). Ringkasan paritas: `PARITAS-CUACA.md`.

**Audit 15 Nov 2026, HEAD `f3ab401e2`** (kode dibaca ulang baris demi baris; data live dari `centurisk97.id`, hanya GET; self-check dan uji dijalankan hari ini). Hitungan 113 komponen `PAKET-FITUR.md` (A01-F04): **ADA 69** (dibuat 58, diadaptasi 11), **SEBAGIAN 27**, **BELUM 11**, **TIDAK BERLAKU 6**. Banding audit 19 Okt malam: ADA 68 / SEBAGIAN 25 / BELUM 15 / TIDAK BERLAKU 5. Komponen baru G01-G11 (di bawah tabel): ADA 5, SEBAGIAN 1, BELUM 1, TIDAK BERLAKU 4.

Temuan utama 15 Nov: kejadian C live (35 baris), peringatan dini tersambung ke EWS dan CAP, tugas lapangan tugas_cuaca.json terbit, prakiraan dinilai di /prediksi, IBTrACS dan klimatologi stasiun masuk `statis.yml`. Tetap lemah: uji balik hujan >=50 mm POD 6,5% (ambang hipotesis), prospektif n=0, peringatan BMKG vs DIBI belum dinilai (`dinilai_sampai` 2026-09-28), tidak ada Dashboard, cerita, tren jangka panjang, rupiah, atau dokumen riset.

Catatan kebijakan: `PAKET-FITUR.md` melarang status `aktif` selama ada baris "belum". Registry sudah `aktif` lewat tahap buka bertahap (`tests/agen/gerbang-bencana.test.mjs`, tabel TAHAP) dan tidak ada gerbang yang membaca tabel ini, jadi baris sebagian dan belum di bawah ditulis apa adanya dan keputusan membukanya tetap milik pemilik.

## 1. Identitas registry (keadaan sebenarnya)

| Kunci | Nilai |
| --- | --- |
| `id` / `rute` | `cuaca` / `/cuaca/` (halaman tambahan `/cuaca/simulasi.html`, `/cuaca/laporan.html`) |
| `kejadian.awalan` | `C` (registry: "Peringatan dini cuaca") |
| `cron_worker` | satu tugas: nowcast CAP BMKG tiap 600 dtk (registry blok cuaca, `src/nowcast.js`); arsip CAP permanen di D1 `cuaca_arsip` (migrasi 0021) |
| Pipeline | `lintas.yml` harian 02:10 UTC: `cuaca.py` (8 langkah: sarana, gelombang, prakiraan_kec, dampak, medan, siklon, verifikasi, laporan), `peluang_cuaca.py`, berita, dampak, kejadian C. Registry kini `workflow: "lintas.yml"`; data mentah BMKG diarsipkan `arsip-bmkg.yml` tiap 3 jam, `cuaca.py` + `peluang_cuaca.py` + `bmkg_kab10.py` di `lintas.yml` |
| Tab | peta, insight, berita, tren, kejadian, dampak, simulasi, foto, tentang, posko; `informasi`, `metode`, `posko` tersembunyi (`tab_sembunyi`). Kejadian punya data live sejak berkas `kejadian_cuaca_*` terbit |
| `sumber_status` | cuaca (30 jam), cuaca_nowcast (2 jam), berita_cuaca (30 jam) |

## 2. Status dan aturan tingkat

| Lapis | Sumber | Tampil sebagai |
| --- | --- | --- |
| Peringatan dini resmi | BMKG nowcast CAP | Poligon dan baris panel dengan kata/warna asli BMKG (Minor, Moderate, Severe, Extreme); tidak dipetakan ke tingkat Pantau Bencana |
| Gelombang resmi | BMKG Maritim, hanya kelas Tinggi, Sangat tinggi, Ekstrem | Provinsi berwarna di peta dan panel |
| Siklon | JTWC (cadangan GDACS), bukan IBTrACS | Lintasan dan pil di peta; live: Champi |
| Tingkat Pantau Bencana | `scripts/cuaca/dasar.py:27`, per kecamatan, 3 hari | Normal/Waspada/Siaga/Awas = maksimum dari hujan harian, embusan, Hs, peluang ansambel |

Ambang: hujan 50/100/150 mm per hari (kelas BMKG); embusan 54/72/90 km/jam (15/20/25 m/s, **hipotesis**); Hs 2,5/4/6 m (kelas BMKG Maritim);
ansambel hipotesis (p50 >=40% Waspada, p100 >=40% Siaga, >=70% Awas, titik <=80 km). Badai guntur (CAPE, LI) tidak ditampilkan: indeks angkat tidak ada di sumber.

## 3. Kejadian

Dua jenis berawalan `C` di `scripts/umum/kejadian.py:309`: satu peringatan CAP = satu kejadian, dan gugus kecamatan bersebelahan berstatus Siaga/Awas dari prakiraan model
(deteksi Centurisk97, bukan pernyataan resmi). Masa aktif 1 hari. Siklon bukan kejadian (kartu Insight terpisah). `kejadian_cuaca_awal.json`, `_geo.json`, `_nomor.json` terbit live (15 Nov: 35 baris di `_awal`, dibuat 14 Nov 16.58 WIB); tugas lapangan turunannya `tugas_cuaca.json`.

## 4. Model dan uji balik

- Tidak ada model dilatih: aturan ambang di atas prakiraan Open-Meteo dan ansambel ECMWF IFS 51 anggota.
- Uji balik (`scripts/cuaca/verifikasi.py`, `cuaca_verifikasi.json`): prakiraan hujan >=50 mm vs kejadian DIBI, 349 titik, 346 hari; prakiraan 1 hari sebelumnya POD 6,5%, FAR 59%, CSI 6,0%.
  Hasilnya tidak layak, ambang tetap berlabel hipotesis. Embusan, gelombang, dan ansambel belum diuji. Peringatan BMKG vs DIBI: n=0 (`dinilai_sampai` 2026-09-28, arsip mulai 12 Okt).
- Prospektif (live 15 Nov): `kita.prospektif` n=0 di tiga lead; arsip prospektif bulanan dikomit `lintas.yml`; peringatan BMKG vs DIBI n=0 (`dinilai_sampai` 2026-09-28). Prakiraan cuaca juga dinilai di `/prediksi` (kode CEX). Arsip D1 `cuaca_arsip` belum disambung ke `verifikasi.py`.
- Ekspektasi jujur: sel 0,25 derajat lebih luas dari puting beliung dan sel badai, jadi POD rendah ditampilkan apa adanya.

## 5. Layar, warga, dan media (keadaan sebenarnya)

- Peta (15 Nov): nowcast CAP, gelombang, status 72 jam per kecamatan, sarana, siklon, hujan/angin/ansambel, GIBS IMERG dan suhu, lapisan konteks registry.
- Insight 17 kartu; Tren 9 kartu (termasuk logbook, kalender musim dan ENSO); Dampak 7 bagian; Berita 5 kartu; Simulasi 3D 72 jam dengan skenario siklon; Laporan harian; Foto bersama.
- Warga: jenis laporan `pohon_tumbang`, `atap_rusak`, `puting_beliung`, `hujan_es` ada di server dan katalog, tetapi tab Informasi tidak dipasang di halaman bencana.
- Foto: pohon, genangan, atap, lainnya (foto dummy dipensiunkan pemilik 11 Nov). Berita: Google News RSS, 1.500 artikel/120 hari, diperbarui harian oleh `lintas.yml`.

## 6. Tabel 113 baris

Status: `dibuat` dan `diadaptasi` = ADA (diadaptasi = bentuk berbeda karena domain, alasan tertulis); `sebagian` = ada tetapi tidak memenuhi gerbang atau belum tayang; `belum` = tidak ada; `tidak berlaku` = alasan satu kalimat. Paritas diukur terhadap karhutla yang TAMPIL (tab Dashboard, Posko, Informasi, Kompleks, Metode karhutla tersembunyi, dan kartu uji/galat model di Insight).

| Kode | Komponen | Status | Bukti atau alasan |
| --- | --- | --- | --- |
| A01 | Sumber pengamatan utama | dibuat | CAP nowcast BMKG lewat Worker (`src/nowcast.js:41` `uraiCAP`), gelombang dan maritim BMKG, hujan dan embusan Open-Meteo (`public/banjir/data/cuaca_prakiraan.json`), ditambah pengamatan BMKG: SYNOP, METAR, petir, bandara (`scripts/cuaca/synop.py`, `metar.py`, `petir.py`, `bandara_bmkg.py`; arsip tiap 3 jam di `.github/workflows/arsip-bmkg.yml`). 15 Nov: `python3 scripts/cuaca/<skrip>.py uji` hijau untuk 35 skrip. |
| A02 | Varian keluaran bertingkat | sebagian | Tidak ada tiga potongan 24/72/semua. Penggantinya: nowcast hidup (`/api/cuaca/nowcast`), arsip rentang bebas maks 62 hari (`/api/cuaca/arsip`, `src/nowcast.js:129`; angka live 19 Okt tidak diukur ulang) dan status 72 jam `cuaca_kec.json` (hanya kecamatan tingkat 1 ke atas). |
| A03 | Pengamatan hampir-waktu-nyata | dibuat | Cron Worker 600 dtk (`public/bencana.json` (blok registry)), D1 `cuaca_nowcast` (migrasi 0014), `/api/cuaca/nowcast`. Live: `/api/status` cuaca_nowcast umur 0,1 jam (ambang 2). Uji Miniflare `tests/warga/cuaca_nowcast.test.mjs`. |
| A04 | Entitas kejadian aktif | dibuat | Kode C#### dari `scripts/umum/kejadian.py:309` (`adaptor_cuaca`: satu CAP = satu kejadian, plus gugus kecamatan Siaga/Awas), masa aktif 1 hari (`:32`). Live 15 Nov: `banjir/data/kejadian_cuaca_awal.json` 200 (35 baris, dibuat 14 Nov 16.58 WIB), `_geo.json` 200, `_nomor.json` 200, `banjir/data/kejadian/index-cuaca.json` 200 (sebelumnya 404). Dirantai di `lintas.yml` langkah "Kejadian berkode lintas bencana". |
| A05 | Atribut kejadian | sebagian | Atribut kejadian: nama, tempat, prov/kab, jenis CAP, besaran (severity), jiwa, pusat, mulai/terakhir/aktif (contoh C0122 live). Tidak ada fasilitas terdekat, InaRISK, skor, atau riwayat sejenis per kejadian. |
| A06 | Geometri dampak | dibuat | Poligon CAP tampil sebagai overlay BMKG (`public/cuaca/peta.js:51`), tersimpan sederhana di D1 `cuaca_arsip.poligon` (migrasi 0021). Poligon kejadian `kejadian_cuaca_geo.json` live 200, 343 KB, dimuat malas (`public/cuaca/kejadian.js`). |
| A07 | Pemecahan muatan | dibuat | Pemisahan `_awal` (15 KB) dan `_geo` (343 KB) kini terbit live; plafon muat /cuaca/ 690 KB dijaga `tests/beban/ukur_muat.mjs:51` (terukur 597 KB, `:49`). |
| A08 | Cuaca pendukung | dibuat | Open-Meteo kisi 0,25 derajat dari modul banjir (`hujan.json`, `scripts/cuaca/cuaca.py:1-25`), medan 1,5 derajat (`medan.py`), gelombang Marine (`gelombang.py`). Kuota tertulis di `.github/workflows/lintas.yml:76-77` (±1.085/hari). |
| A09 | Indeks bahaya harian | diadaptasi | `dasar.tingkat_kec` (`scripts/cuaca/dasar.py:27`) mengambil maksimum dari hujan harian kelas BMKG 50/100/150 mm, embusan 54/72/90 km/jam, Hs 2,5/4/6 m, dan peluang ansambel. Hanya kelas hujan dan gelombang yang bersumber lembaga; embusan dan ansambel hipotesis (`dasar.py:19-24`). CAPE/LI tidak ada. Tidak ada contoh literatur untuk dicocokkan. |
| A10 | Prakiraan ansambel | dibuat | ECMWF IFS 51 anggota via Open-Meteo: peluang hujan >=50 dan >=100 mm (`hujan_ansambel.json`), peluang per kab/provinsi 8 hari (`scripts/cuaca/peluang_cuaca.py`, `cuaca_peluang.json`, 253 KB). Tidak ada p150; P10/P90 sengaja kosong (`peluang_cuaca.py:5`). |
| A11 | Kondisi latar | tidak berlaku | Ambang cuaca ekstrem absolut (kelas BMKG), bukan anomali terhadap klimatologi; tidak ada klimatologi 2015-2025 yang dihitung. |
| A12 | Indeks khusus tambahan | tidak berlaku | Tidak ada indeks riset tambahan; tidak ada kandidat yang punya uji balik. |
| A13 | Aturan status 4 tingkat | dibuat | Normal/Waspada/Siaga/Awas per kecamatan 72 jam (`dasar.py:27`, `prakiraan_kec.py`, `cuaca_kec.json`). Peringatan BMKG tidak dipetakan ke tingkat; tampil dengan kata dan warna asli (`public/cuaca/cuaca.js:26`, `peta.js:15`). |
| A14 | Prioritas | belum | `prioritas: []` (`public/bencana.json` (blok registry)). Tidak ada ambang prioritas bertangkapan/presisi; Sapa hanya mengurutkan provinsi menurut hujan. |
| A15 | Risiko riwayat 0–100 | sebagian | Tidak ada risiko riwayat 0-100 sendiri. Yang tampil indeks risiko BNPB (IRBI) per kab 2015-2025 (`cuaca_risiko_bnpb.json`, bagian "Risiko menurut BNPB", `dampak.js:10`); skala 2025 tidak sebanding dengan 2015-2024. |
| A16 | Kalender musim | sebagian | `scripts/cuaca/musim.py` dijadwalkan di `.github/workflows/data.yml`; `cuaca_musim.json` live 200 tetapi hanya 1 KB tanpa cap waktu `dibuat`: kalender per bulan nasional dari satu tahun DIBI (2025) dan ENSO per tahun, bukan per dasarian per provinsi. Kartu kalender dan ENSO di Tren (`public/cuaca/tren.js:154` memuat `musim`, `enso`). |
| A17 | Iklim | dibuat | ONI/IOD dari `public/data/iklim.json` dipakai bersama; klimatologi stasiun BMKG `public/data/iklim_stasiun.json` (`scripts/cuaca/iklim_stasiun.py`, dijadwalkan `statis.yml`) dan `scripts/cuaca/iklim_bmkg.py` (`arsip-bmkg.yml`). Tampil di kartu ENSO Tren. |
| A18 | Riwayat grid dan sejarah | sebagian | DIBI cuaca+gelombang nasional 2010-2023 (`kejadian.json`); arsip CAP BMKG bulanan (`public/banjir/data/cuaca_bmkg_arsip_2026-11.json`, `cuaca_arsip_bmkg.json`) dan D1 `cuaca_arsip`; arsip SYNOP, petir, factsheet, siklon. IBTrACS siklon sejak 1980 kini ada (`public/cuaca/data/ibtracs.json`, 65 KB, `scripts/cuaca/ibtracs.py` di `statis.yml`). Riwayat model harian masih pendek (`cuaca_riwayat.json`, 7 KB); tidak ada arsip grid hujan multi-tahun. |
| A19 | Statistik per provinsi | dibuat | `cuaca_kec.json` `prov` (tingkat maks, jumlah kecamatan W/S/A), `cuaca_laporan.json` 38 provinsi x 30 hari, `cuaca_dampak.json` per provinsi. |
| A20 | Data lembaga | dibuat | CAP BMKG apa adanya (label BMKG), peringatan gelombang BMKG Maritim, siklon JTWC/GDACS (`cuaca_siklon.json`; live: Champi), BNPB DIBI dan InaRISK. Kontak BPBD `bpbd.json` ada tetapi disembunyikan (A40). |
| A21 | Posko | sebagian | Kode ada: `scripts/cuaca/posko.py` (dirantai `cuaca.py`), `public/cuaca/posko.js`, `public/banjir/data/cuaca_posko.json` (live 200, berlabel "Deteksi Centurisk97"), tetapi isinya kosong hari ini (`nasional` kab 0, posko 0) dan tab `posko` disembunyikan di registry (`tab_sembunyi`), sama seperti karhutla. |
| A22 | Operasi | belum | Keputusan pemilik 15 Nov 2026: berlaku (distribusi atap darurat dan terpal per rumah rusak, pembersihan pohon tumbang). Belum ada kode. Sebelumnya dinilai tidak berlaku: Tidak ada kebutuhan atap darurat/terpal per rumah rusak dan tidak ada koefisien bersumber. |
| A23 | Aset udara | tidak berlaku | Respons cuaca ekstrem tidak memakai aset udara (heli, OMC) yang menjadi dasar A23 karhutla. |
| A24 | Keputusan ekonomi | belum | Tidak ada biaya respons vs kerugian dihindari; rupiah sengaja tidak ditampilkan karena belum ada asumsi bernama bersumber (`public/cuaca/dampak.js:6-7`). |
| A25 | Preventif | belum | Tidak ada profil atau rencana pencegahan (pemangkasan pohon, penguatan atap). |
| A26 | Penanggung jawab lahan | tidak berlaku | Kejadian cuaca tidak punya pemilik atau pengelola lahan yang bisa dinamai. |
| A27 | Dampak | dibuat | `scripts/cuaca/dampak_cuaca.py` -> `cuaca_dampak.json`: penduduk di sel hujan >=50 mm (WorldPop), zona kecamatan tingkat 2+ (jiwa, sekolah, faskes), pelabuhan/bandara, pesisir Hs >=2,5 m, korban dan rumah rusak tahunan DIBI. Tanpa rupiah; semua berlabel prakiraan. |
| A28 | Paparan penduduk | dibuat | WorldPop x sel hujan >=50 mm (`cuaca_dampak.json` `terpapar`), penduduk per kecamatan tingkat 2+ dan pesisir; bukan jiwa yang sudah terdampak. |
| A29 | Sekolah dan fasilitas | dibuat | Sekolah dan faskes di zona tingkat 2+ (`dampak_cuaca.py` `zona`, hanya yang tercatat) dan lapisan konteks "Sekolah & faskes" (`public/inti/peta/konteks.js:15`, registry `lapisan`, `public/bencana.json` (blok registry)). |
| A30 | Muatan Dashboard | belum | Tidak ada tab Dashboard/`ringkasan.json`. Karhutla menyembunyikan tab itu (`TAB_SEMBUNYI`, `public/index.html:1658`). |
| A31 | Cuaca per jam untuk simulasi | dibuat | `scripts/cuaca/medan.py` -> `cuaca_medan.json` (angin u/v, hujan, embusan; kisi 1,5 derajat, 72 jam, 303 KB, batas 600 KB) dan `gelombang.py` 72 jam, dipakai Simulasi. |
| A32 | Citra satelit | diadaptasi | Sentinel-2 sebelum/sesudah tidak berlaku (awan menutup, kejadian singkat). Gantinya GIBS GPM IMERG hujan dan suhu AIRS (`public/inti/peta/nasa.js:11,13`, dipasang di `Peta.init`) plus dasar satelit. |
| A33 | Berita | sebagian | `scripts/cuaca/berita.py` -> `berita_cuaca.json` (1.500 artikel, 120 hari, 312 kab; live dibuat 14 Nov 09.55 UTC (`/api/status` umur 20,9 jam, ambang 30) lewat langkah berita di `lintas.yml`). Sentimen tidak teruji (`sentimen_teruji: false`), tidak ada label uji >=200, tidak ada EN. |
| A34 | Video | belum | Tidak ada video; dibuang dengan alasan data belum ada (`public/cuaca/berita.js:6`). |
| A35 | Data sektor | dibuat | Pelabuhan (OSM) dan bandara (OurAirports) di `cuaca_sarana.json` (`sarana.py`), status sarana tingkat 1+ di Dampak dan kartu Insight "Pelabuhan dan bandara terancam". |
| A36 | Kurasi tangan | sebagian | Berkas data kurasi/sumber lembaga bersumber dan bertanggal: `public/cuaca/data/jaringan_peringatan.json` (BNPB ArcGIS, `diambil` 2026-10-29), `evakuasi_tsunami.json`, `gerakan_tanah_pu.json` (`scripts/cuaca/gerakan_tanah_pu.py`), `nama_siklon_tcwc.json`. Tidak ada `factsheet_cuaca.json` kurasi tangan seperti karhutla; `cuaca_factsheet.json` adalah urai PDF BMKG otomatis. |
| A37 | Meta | dibuat | `cuaca_meta.json` (`dibuat`, ambang, hari) dibaca `/api/status`; live cuaca umur 4,2 jam (ambang 30). |
| A38 | Data statis bulanan | sebagian | `ibtracs.json` dan `public/data/iklim_stasiun.json` kini dijadwalkan di `.github/workflows/statis.yml:147,163`. `cuaca_sarana.json` (`sarana.py --bangun`) dan `cuaca_risiko_bnpb.json` (`risiko_bnpb.py --bangun`) masih dibangun tangan, tidak di `statis.yml`. |
| A39 | Seri jangka pendek bergulir | dibuat | `cuaca_riwayat.json` bergulir tiap hari (hari lampau = analisis model), `cuaca_laporan.json` 30 hari (kontrak LAPORAN-HARIAN, `scripts/cuaca/laporan_cuaca.py`), halaman `/cuaca/laporan.html`. |
| A40 | Data respons dan kontak | sebagian | Kontak BPBD terdekat dari `bpbd.json` dibuat di laci kejadian tetapi disembunyikan karena data kantor lama (`public/cuaca/kejadian.js:7,84`). Tidak ada unit respons BMKG/Basarnas. |
| B01 | Model prakiraan | diadaptasi | Tidak ada model dilatih: aturan ambang di atas prakiraan Open-Meteo/ECMWF (`dasar.py`), sesuai rencana awal. Jejak `validasi-model` memuat 6 entri cuaca/udara. |
| B02 | Uji balik aturan status | sebagian | `scripts/cuaca/verifikasi.py` -> `cuaca_verifikasi.json`: prakiraan hujan >=50 mm vs DIBI, n 1.577 pasangan lead 1: POD 6,5%, FAR 59%, CSI 6,0% (live 15 Nov); lead 2: POD 6,0%; lead 3: POD 5,1%. Tidak layak, ambang tetap hipotesis. Embusan, gelombang, ansambel belum diuji. Ada juga `cuaca_verif_synop.json` dan `cuaca_uji_logbook.json` (`scripts/cuaca/uji_logbook.py`, dirantai `data.yml`). |
| B03 | Prospektif | sebagian | `cuaca_verifikasi.json` (live, dibuat 14 Nov 16.23 WIB): `kita.prospektif` n=0 di ketiga lead, `bmkg.dinilai_sampai` masih 2026-09-28 sehingga peringatan BMKG (592 sejak 12 Okt) belum dinilai terhadap DIBI. Arsip prospektif bulanan tersimpan (`cuaca_prospektif_2026-11.json`, dikomit `lintas.yml` langkah "Commit arsip prospektif cuaca"). |
| B04 | Kasus historis | belum | Tidak ada galeri kejadian besar masa lalu. |
| B05 | Galat dan pendorong | sebagian | Galat per provinsi di `kita.prov` (kartu "Ketepatan prakiraan"). Tidak ada analisis pendorong. |
| B06 | Tren jangka panjang | belum | Tidak ada Theil-Sen/Mann-Kendall; kartu ENSO dan kalender hanya menampilkan deret, tidak menguji tren. |
| B07 | Kesetaraan Python↔JS | sebagian | `public/cuaca/sim_data.js` membawa ambang dan uji sendiri; `tests/cuaca/sim_dampak.test.mjs` ada (lulus 15 Nov) tetapi tidak ada uji silang dengan `scripts/cuaca/dasar.py`. Tingkat kecamatan dihitung sekali di Python. |
| B08 | Selang ketidakpastian | sebagian | Peluang ansambel ada; P10/P50/P90 sengaja kosong karena anggota per hari tidak disimpan (`peluang_cuaca.py:5`). Tanpa CQR. |
| B09 | Kinerja tercatat | dibuat | Kinerja ditampilkan apa adanya: kalimat "menangkap X dari N provinsi-hari" (`cuaca.js:50-52`), kartu Insight "Ketepatan peringatan BMKG" dan "Ketepatan prakiraan", bab Verifikasi di Metode, pil "Ambang masih hipotesis" (`cuaca.js:49`). |
| B10 | Dokumen riset | belum | Tidak ada `scripts/cuaca/RISET-*.md` (rencana menyebut `RISET-AMBANG.md`); alasan ambang hanya di docstring `dasar.py` dan `cuaca.py`. |
| C01 | Kepala + menu bencana | dibuat | `details.bencana` di `public/cuaca/index.html` + `public/inti/kepala.js`; menu dari registry (`gerbang-bencana` hijau). |
| C02 | Tab dan URL bersih | dibuat | `/cuaca/<tab>` dan `/cuaca/k/C0001` (`public/cuaca/mulai.js:11-14`), tab sembunyi `informasi`, `metode`, `posko` (registry `tab_sembunyi`). Tab Kejadian kini punya data live (A04). Simulasi dibuka dari ikon kepala ke `/cuaca/simulasi.html`. |
| C03 | Tema terang/gelap | dibuat | `#tema`, kunci `pb-tema`, `peta.setStyle` (`cuaca.js:82`). |
| C04 | Waktu data | dibuat | `#upd` dari `cuaca_meta.json` (live 15 Nov: `dibuat` 2026-11-14T14:15+07:00). |
| C05 | Panel kiri | diadaptasi | Crumb + seg "Nowcast / Gelombang / Status 72 jam" + cari + daftar (`public/cuaca/peta.js:149`); bukan mode Real Time/Riwayat/Kompleks. |
| C06 | Rentang waktu | diadaptasi | Seg hari 4 hari (`#hariSeg`); tidak ada chip Kemarin/72 jam/7 hari karena nowcast hidup 2-3 jam. |
| C07 | Garis waktu prakiraan | dibuat | Kartu "Prakiraan cuaca (hari)" `#garisWaktu` dan hari 72 jam kecamatan (`kIdx`, `cuaca.js:40`). |
| C08 | Panel lapisan | diadaptasi | 12 ubin Overlay live (BMKG, Ombak, Satelit; Kecamatan, Ombak, Sarana, Siklon; Hujan satelit, Suhu; Penduduk, Sekolah & faskes, Jalan & sungai), konteks dimuat malas (`konteks.js`); jauh di bawah ±25 lapisan karhutla. |
| C09 | Choropleth wilayah + kartu hover | diadaptasi | Poligon CAP dan provinsi bergelombang berwarna (`peta.js:47-51`), kecamatan sebagai titik berwarna tingkat; tidak ada choropleth wilayah berskala. Kartu hover `kartuTip` bersama. |
| C10 | Gelembung cluster | tidak berlaku | Objek peta berupa poligon CAP dan titik kecamatan/pelabuhan/siklon yang tidak berhimpit seperti kompleks api; tidak ada klaster angka yang perlu digabung. |
| C11 | Popup titik | dibuat | Kartu hover/klik titik kecamatan (tingkat, hujan, embusan, Hs), pelabuhan/bandara, titik siklon (`public/cuaca/status.js`, `inti/peta/lapis.js`). |
| C12 | Laci kejadian | sebagian | Laci peringatan: tingkat, wilayah, jam berlaku, deskripsi BMKG (`peta.js:86`); laci kejadian: tingkat, kab, penduduk, mulai, bagikan (`kejadian.js:laci`). Tidak ada kondisi sekarang, prakiraan per jam, penjelasan tingkat, riwayat sejenis, InaRISK, tautan simulasi. |
| C13 | Legenda | dibuat | `#legenda` di dok: skala hujan, embusan, peluang, tingkat, kelas gelombang (`inti/peta/legenda.js`). |
| C14 | Insight | dibuat | 17 kartu di `public/cuaca/insight.js:24` (kejadian, status, siklon, siklonBmkg, sarana, buktiBmkg, buktiKita, resmi, nowcast, gelombang, maritim, hujan, angin, ansambel, peluang, awan, provinsi). Belum ada "peringatan per provinsi 30 hari". Kepala kartu masih kalimat temuan (lihat temuan, `AGENTS.md` 3.5). |
| C15 | Tabel kejadian | dibuat | Tab Kejadian lengkap (tabel standar, urut, paginasi, `public/cuaca/kejadian.js`) dengan data live `kejadian_cuaca_awal.json` (35 baris) dan `_geo.json`. |
| C16 | Cerita | belum | Tidak ada `cerita_cuaca.js`. |
| C17 | Berita | sebagian | 5 kartu (Volume, Peta berita, Sorotan, Topik, Daftar; live 2.746 berita/30 hari). Dibuang: celah liputan, pantauan media, video, internasional (`berita.js:6`); sentimen tak teruji. |
| C18 | Tren | diadaptasi | 9 kartu (`public/cuaca/tren.js:154`: hujan, angin, provinsi, bnpb, logTahun, logMusim, logKab, musim, enso), seg rentang bila riwayat >14 hari. Indeks risiko 0-100 tidak ada (A15). |
| C19 | Posko, Sarana, Operasi, Keputusan | sebagian | Posko ada tetapi tersembunyi (A21); Sarana sebagai bagian Dampak (`dampak.js:10`); tidak ada sub-tab Operasi/Keputusan. |
| C20 | Dampak | dibuat | 7 bagian (`public/cuaca/dampak.js:10`: pend, zona, sarana, pesisir, hist, risiko, sarbnpb); live 5 tampil, zona dan pesisir muncul bila ada kecamatan tingkat 2+. |
| C21 | Dashboard pimpinan | sebagian | public/inti/dasbor_pimpinan.js; public/bnpb/pimpinan.js; src/pb_ringkas.js; public/bencana.json (dasbor.ringkas). PB-30/31/47: GET /api/pb/ringkas dan /bnpb/pimpinan membaca ringkas per bencana; angka belum diuji dengan data produksi dan tidak dijumlah antarsumber |
| C22 | Metode | sebagian | Metode ada dan tersembunyi (`public/cuaca/metode.js`): sumber, ambang, status 72 jam, batasan, peluang, simulasi, verifikasi. Tanpa contoh hitung dengan data hari ini; baris "Berita: diperbarui tangan" (`public/cuaca/metode.js:51`) basi karena `lintas.yml` menjalankannya harian. |
| C23 | Simulasi | diadaptasi | `/cuaca/simulasi.html` 3D 72 jam (angin, hujan, embusan, gelombang) dengan skenario siklon mendekat, menguat, melambat, profil Holland, dampak pelabuhan/bandara, perlakuan (`public/cuaca/sim_skenario.js`). Ditulis bukan model fisik badai (`metode.js:40`). |
| C24 | Lapor Warga | sebagian | Server dan katalog siap: 4 jenis cuaca (`public/informasi_jenis.js:91-98`), migrasi 0020, `tests/warga/skema.test.mjs`. Halaman /cuaca tidak memasang tab Informasi (karhutla pun menyembunyikannya); praktis tak terjangkau publik. |
| C25 | Foto lapangan | dibuat | `public/cuaca/foto.js:4` (`FOTO_BENCANA="cuaca"`) + `public/foto.js` bersama; kategori pohon/genangan/atap/lainnya dari registry. Foto dummy berlisensi masih ada di `public/img/dummy/cuaca/` tetapi data dummy sudah dipensiunkan pemilik (11 Nov); produksi hanya memuat foto asli. |
| C26 | Pop-up situasi hari ini | dibuat | `public/cuaca/sapa.js` lewat `inti/sapa.js`, kunci `pb_sapa_cuaca`, sekali per hari WIB. |
| C27 | Bagikan | dibuat | `public/cuaca/bagikan.js:9` tema `cuaca` (ringkasan hari ini, provinsi, Feed/Story/Kotak). |
| C28 | OG per rute | dibuat | `src/og_meta.js` memetakan `/cuaca/` dan `/cuaca/k/C…` (awalan dari registry); gambar `/data/og/cuaca.png` live 200 (`scripts/og/buat.py:148`). OG tidak per CAP atau provinsi. |
| C29 | i18n EN | sebagian | `scripts/i18n/kumpul.mjs:106` memuat /cuaca/. Pengukuran kebocoran terakhir `scripts/i18n/laporan.json` bertanggal 15 Okt 2026, tidak diukur ulang; kamus 17 kartu Insight dan 9 kartu Tren belum terbukti nol kebocoran. |
| C30 | Persetujuan, jejak, pesan, kaki | dibuat | `persetujuan.js`, `jejak.js data-halaman="cuaca"`, `kaki.js`, `pesan.js` terunduh di live. |
| C31 | Muat / kosong / galat / luring | sebagian | Spinner muat dan "Data belum tersedia" (`public/cuaca/mulai.js`), pesan kosong per tab, kartu tanpa data dibuang; keadaan luring tidak ada (tanpa service worker). |
| C32 | Mobile 375 px | sebagian | Terakhir diukur manual 19 Okt (emulasi 375x812, `scrollWidth` 375); tidak diukur ulang 15 Nov dan tidak ada uji otomatis, padahal Insight tumbuh 12 jadi 17 kartu. Diturunkan sampai ada uji. |
| C33 | Klik tidak membekukan | dibuat | Pola `nanti()` (`public/cuaca/cuaca.js:5`) di klik tab/mode/hari; jejak `inp-reviewer` memuat entri cuaca/udara. Tidak diukur ulang hari ini. |
| C34 | Halaman Tentang dan kartu bencana | dibuat | Tab Tentang (iframe `/tentang.html?tertanam=1`); Tentang menyebut tujuh bencana (commit f59388c). |
| C35 | Statistik publik | dibuat | `src/statistik.js:18` `HAL` dari registry (migrasi 0017); jejak `data-halaman="cuaca"`. |
| C36 | Admin moderasi | sebagian | Admin foto memakai pemilah bencana dari registry (`public/admin/foto.js`), tetapi berkas itu masih memuat tombol dummy (`public/admin/foto.js:1,21`) padahal pemilik mensyaratkan tombol dummy disembunyikan (11 Nov). Pemilik berkas: `warga-api`. |
| C37 | Bagikan lanjutan | diadaptasi | `bagi.js`/`bagi.css` (QR, WhatsApp, UTM) terunduh di live; "Bagikan video" Insight Musim tidak ada. |
| C38 | Lapisan tambahan | diadaptasi | Lapisan konteks registry (penduduk, sekolah+faskes, jalan; `inti/peta/konteks.js`) dan GIBS; tanpa hutan hilang, bekas terbakar, Daops, lencana iklim (milik karhutla). |
| C39 | Kaki dan Tentang | dibuat | `kaki.js` dan halaman Tentang bersama. |
| D01 | Rute HTML | dibuat | Rute `/cuaca/`, `/cuaca/k/…`, `/cuaca/simulasi.html` dari `src/bencana.generated.js`; live 200. |
| D02 | Route data cepat | dibuat | `/api/cuaca/nowcast` cache tepi 60 dtk (`src/nowcast.js:151-156`); `tests/warga/cakupan.json:9`. |
| D03 | Cron | dibuat | Pengatur cron menjalankan nowcast tiap kelipatan 10 menit (`bencana.json:567-570`, `nowcast.js:3`); uji "kelipatan 10" di `cakupan.json:9`. |
| D04 | Status kesegaran | dibuat | `sumber_status`: cuaca 30 jam, cuaca_nowcast 2 jam, berita_cuaca 30 jam (`public/bencana.json` (blok registry)); live `/api/status` `basi: []`; `jaga.yml` menerbitkan ulang bila basi. |
| D05 | Lapor warga | dibuat | `laporan.bahaya='cuaca'` + 4 jenis (`public/informasi_jenis.js:91-98`, migrasi 0020); antarmuka belum terpasang di /cuaca (C24). |
| D06 | Foto | dibuat | `foto.bencana` (migrasi 0013), `KAT_BENCANA` di `src/foto.js`; `tests/warga/foto_bencana.test.mjs`. |
| D07 | Statistik | dibuat | `stat_hari.hal` dari registry (migrasi 0017, `src/statistik.js:18`). |
| D08 | OG meta | dibuat | `src/og_meta.js` membaca registry; `tests/warga/og.test.mjs`. |
| D09 | Dummy | tidak berlaku | Pemilik mempensiunkan data dummy dan tombol 🧪/🧹 pada 11 Nov 2026; tidak ada yang perlu disediakan. |
| D10 | Privasi | dibuat | Memakai mesin bersama (hash IP bergaram, DNT/GPC); jalur cuaca tidak menyimpan data pribadi baru (CAP publik). |
| E01 | Self-check per skrip | dibuat | 15 Nov: `python3 scripts/cuaca/<skrip>.py uji` hijau untuk 35 skrip (`dasar.py`, `bangun_bnpb.py`, `uji_alur.py` adalah pustaka atau pembangun tanpa mode `uji`); `cuaca.py:198-199` merantai uji tiap modul 72 jam; dijalankan di `lintas.yml` sebelum `cuaca.py`; `tests/cuaca/sim_dampak.test.mjs` dan `tests/udara/*.test.mjs`: 54 lulus, 0 gagal. |
| E02 | Cakupan route/tabel | dibuat | `tests/warga/cakupan.json:7-11`: tabel cuaca_nowcast, cuaca_sumber, cuaca_arsip dan route `/api/cuaca/nowcast`, `/api/cuaca/arsip`. |
| E03 | Skema D1 | dibuat | Migrasi 0014 dan 0021 diuji idempoten (`cakupan.json:7,10`); katalog jenis laporan vs migrasi 0020 dijaga dua arah oleh `skema.test.mjs`. |
| E04 | Registry | dibuat | 15 Nov: `node --test tests/agen/gerbang-bencana.test.mjs tests/agen/gerbang-ilmu-agent.test.mjs tests/agen/gerbang-inti.test.mjs` 16 dari 16 hijau. |
| E05 | Duplikasi inti | dibuat | `gerbang-inti.test.mjs` hijau; 17 salinan CSS/JS dilunasi (commit c191384). |
| E06 | Kesegaran data | dibuat | `/api/status` memuat cuaca, cuaca_nowcast, berita_cuaca (live: tak ada yang basi); `jaga.yml` menerbitkan ulang bila basi. Catatan: kunci `dampak` umur 21,5 jam tanpa ambang. |
| E07 | Beban | dibuat | `tests/beban/beban.mjs:27` /cuaca/ bobot 5; `ukur_muat.mjs:49-51` terukur 597 KB, plafon 690 KB. |
| E08 | i18n | sebagian | Crawl dua arah mencakup /cuaca/ (`kumpul.mjs:106`) tetapi kebocoran 5-10 per bencana, bukan nol. |
| E09 | Kepemilikan berkas | dibuat | Semua berkas dimiliki agen `cuaca-udara` (`gerbang-ilmu-agent` hijau). Catatan: `.claude/ilmu-agent/cuaca-udara.md` 41.159 byte, di atas plafon 40 KB `AGENTS.md` 1.5; perlu dipangkas atau dipecah (pemilik: `mekanik-mesin`). |
| E10 | Model agent | dibuat | `.claude/agents/cuaca-udara.md` `model: sonnet` (`gerbang-model-agent` hijau). |
| F01 | Pengerja agent | dibuat | Satu pengerja `cuaca-udara` untuk dua modul (`scripts/agents/roster.json:473`); registry kini `pengerja: "cuaca-udara"` dan `workflow: "lintas.yml"` (cocok dengan kenyataan; ketidakcocokan 19 Okt sudah dibereskan). |
| F02 | Dokumen spesifikasi | dibuat | Dokumen ini, daftar periksa A01-F04 dan G01-G11 terisi dari audit 15 Nov 2026. |
| F03 | Dokumen riset | sebagian | Tidak ada `scripts/cuaca/RISET-*.md`; yang ada rancangan `docs/multi-bencana/RENCANA-CUACA-NOV.md` (1 Nov, tiga audit dan rencana koreksi silang logbook) dan docstring modul. Bukan dokumen riset ambang bersumber. |
| F04 | Kredit dan lisensi | sebagian | Kredit foto dummy per bencana ada (`public/img/dummy/cuaca/kredit.json`). Tidak ada `public/cuaca/kredit.json`; Tentang tidak menyebut JTWC, GDACS, OurAirports, atau OSM pelabuhan. |


## Komponen baru (audit 15 Nov)

Fitur karhutla yang lahir sesudah audit 19 Okt (G01-G11). Status = apakah bencana ini sudah tercakup fitur itu (bukan karhutla). Bukti berkas:baris atau jalur data yang ada hari ini.

| Kode | Komponen | Status | Bukti atau alasan |
| --- | --- | --- | --- |
| G01 | Tugas lapangan dan regu | diadaptasi | `scripts/umum/tugas.py:159` `adaptor_cuaca` (Awas/CAP Extreme = level 3, Siaga/CAP Severe = level 2 bersyarat jiwa >= 1.000) menulis `public/data/tugas_cuaca.json` (live 200, `kompleks: []` hari ini karena tak ada kejadian aktif), dirantai `lintas.yml` langkah "Tugas lapangan lintas bencana"; daftar bawaan regu `src/penugasan.js:45` (APD jas hujan, senter); peringatan angin per penugasan `src/penugasan.js:357`. Tanpa kabar regu khas cuaca. |
| G02 | Operasi udara/darat | sebagian | public/bencana.json (operasi, renlap.sarana, bobot hipotesis); scripts/umum/renlap.py; public/inti/renlap.js; public/inti/pb_titik.js. PB-41: seksi operasi dan sarana tampil di /operasi lewat registri; belum ada pantauan udara khusus dan bobot masih hipotesis |
| G03 | Sarana lapangan terencana (SIPPA) | sebagian | public/inti/pb_titik.js; public/bencana.json (renlap.sarana). PB-41: sarana lapangan terencana lewat titik sarana umum, bukan SIPPA pipa; belum ada kit khusus jenis |
| G04 | Laporan harian/penanganan otomatis (deck, bot WA) | sebagian | Deck harian memuat halaman cuaca (`data/laporan-bnpb/generator/cuaca_riwayat.py`, `harian.py`) dan ada `cuaca_laporan.json` + `/cuaca/laporan.html`. Tidak ada deck Penanganan khusus cuaca dan tidak ada notifikasi bot WA per kejadian cuaca. |
| G05 | Dalops: cek kabar luar, saringan per bencana, tindak lanjut | diadaptasi | Cuaca ada di Pantau Dalops: `src/dalops.js:31` `GET /api/dalops/cuaca`, saringan korban/ungsi/kabar `public/bnpb/dalops.js:22,28`, cek kabar luar dari `berita_cuaca.json` (`scripts/data/dalops_kabar.py:29`; tanpa sinyal alam cuaca berlabel `belum_ada`, `:300`). Milik `pipa-data`/`ruang-bnpb`. |
| G06 | Prakiraan +1..+3 hari dinilai prospektif (/prediksi) | diadaptasi | `scripts/prediksi/dasar.py:27` kode `CEX` (kejadian DIBI cuaca ekstrem) dinilai; kalender ancaman jenis `cuaca` (`scripts/prediksi/kalender.py:9`, `public/prediksi/prediksi.js:42`); `prediksi.yml` harian 01.50 UTC. Skor jujur rendah (lihat B02/B03). |
| G07 | Semai awan dan prakiraan asap | tidak berlaku | Semai awan (OMC) dan prakiraan asap melayani karhutla dan kekeringan; cuaca ekstrem tidak punya zona semai. |
| G08 | Masuk laporan berkala Kepala BNPB | belum | Rancangan memuat "Bab 4 Cuaca ekstrem dan kekeringan" (`data/kajian-bnpb/laporan-berkala/PRD.md:50`) tetapi tidak ada perakit `scripts/berkala/` di repo; belum ada angka cuaca di laporan berkala. |
| G09 | Peringatan dini tersambung (EWS, Peringatan Dini, CAP) | dibuat | `src/ews.js:200-207` poligon nowcast BMKG yang memuat titik tersambung ke EWS (kesegaran `:360`); `src/peringatan.js:74-84` nowcast Severe jadi Siaga, Extreme jadi Awas, tiap 10 menit (`:138`); CAP 1.2 kategori Met (`:181`); `cuaca_nowcast` live umur 0,2 jam (`/api/status`). |
| G10 | Renlap lengkap (target, sumber daya, rute, PDF/KML/GPX, versi) | sebagian | public/bencana.json (operasi, renlap.sarana, bobot hipotesis); scripts/umum/renlap.py; public/inti/renlap.js; public/inti/pb_titik.js. PB-41: sumber target, KML/GPX/teks WA lewat renlap umum; belum ada versi terbit di produksi atau PDF khusus jenis |
| G11 | Pembuat dokumen (laporan harian PPTX/PDF, sitrep, laporan kejadian, renkon, cetak A4) | diadaptasi | Laporan kejadian per kab oleh `scripts/umum/laporan_kejadian.py` (modul cuaca, dipanggil `scripts/cuaca/cuaca.py:156`), halaman `/cuaca/laporan.html`, bab cuaca di deck harian. Tanpa sitrep, renkon, atau cetak A4 khas cuaca. |
