# Cuaca ekstrem (angin kencang, puting beliung, hujan es, petir, siklon, gelombang tinggi)

Pengerja: agen `cuaca-udara` (satu agen untuk cuaca dan udara). Urutan: 3. Gelombang tinggi dilebur sebagai lapisan dan bagian status
(ARSITEKTUR "Keputusan" butir 2). Ringkasan paritas: `PARITAS-CUACA.md`.

**Audit paritas akhir: 19 Okt 2026 malam** (HEAD `14d9be3`; kode dibaca satu per satu, data live dari `centurisk97.terasurbannetwork.workers.dev`, hanya GET). Hitungan 113 komponen `PAKET-FITUR.md`: **ADA 68** (dibuat 56, diadaptasi 12), **SEBAGIAN 25**, **BELUM 15**, **TIDAK BERLAKU 5**. Audit pagi 19 Okt: ADA 44 / SEBAGIAN 34 / BELUM 28 / TB 7.

Catatan kebijakan: `PAKET-FITUR.md` melarang status `aktif` selama ada baris "belum". Registry sudah `aktif` lewat tahap buka bertahap (`tests/agen/gerbang-bencana.test.mjs`, tabel TAHAP) dan tidak ada gerbang yang membaca tabel ini, jadi baris sebagian dan belum di bawah ditulis apa adanya dan keputusan membukanya tetap milik pemilik.

## 1. Identitas registry (keadaan sebenarnya)

| Kunci | Nilai |
| --- | --- |
| `id` / `rute` | `cuaca` / `/cuaca/` (halaman tambahan `/cuaca/simulasi.html`, `/cuaca/laporan.html`) |
| `kejadian.awalan` | `C` (registry: "Peringatan dini cuaca") |
| `cron_worker` | satu tugas: nowcast CAP BMKG tiap 600 dtk (`public/bencana.json:567-570`, `src/nowcast.js`); arsip CAP permanen di D1 `cuaca_arsip` (migrasi 0021) |
| Pipeline | `lintas.yml` harian 02:10 UTC: `cuaca.py` (8 langkah: sarana, gelombang, prakiraan_kec, dampak, medan, siklon, verifikasi, laporan), `peluang_cuaca.py`, berita, dampak, kejadian C. Registry masih menulis `workflow: "banjir.yml"` (usang) |
| Tab | peta, insight, berita, tren, kejadian, dampak, simulasi, foto, tentang; `metode` tersembunyi. Live: Kejadian dibuang sampai datanya terbit |
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

Dua jenis berawalan `C` di `scripts/umum/kejadian.py:307`: satu peringatan CAP = satu kejadian, dan gugus kecamatan bersebelahan berstatus Siaga/Awas dari prakiraan model
(deteksi Pantau Bencana, bukan pernyataan resmi). Masa aktif 1 hari. Siklon bukan kejadian (kartu Insight terpisah). Berkas `kejadian_cuaca_awal.json` dan `_geo.json`
belum terbit (404 live pada 19 Okt malam; lokal menghasilkan 3 kejadian); terbit setelah run `lintas.yml` berikutnya.

## 4. Model dan uji balik

- Tidak ada model dilatih: aturan ambang di atas prakiraan Open-Meteo dan ansambel ECMWF IFS 51 anggota.
- Uji balik (`scripts/cuaca/verifikasi.py`, `cuaca_verifikasi.json`): prakiraan hujan >=50 mm vs kejadian DIBI, 349 titik, 346 hari; prakiraan 1 hari sebelumnya POD 6,5%, FAR 59%, CSI 6,0%.
  Hasilnya tidak layak, ambang tetap berlabel hipotesis. Embusan, gelombang, dan ansambel belum diuji. Peringatan BMKG vs DIBI: n=0 (`dinilai_sampai` 2026-09-28, arsip mulai 12 Okt).
- Prospektif: `kita.arsip` mencatat tiap prakiraan terbit; `kita.prospektif` n=0. Arsip D1 `cuaca_arsip` (Worker) belum disambung ke `verifikasi.py` ataupun layar.
- Ekspektasi jujur: sel 0,25 derajat lebih luas dari puting beliung dan sel badai, jadi POD rendah ditampilkan apa adanya.

## 5. Layar, warga, dan media (keadaan sebenarnya)

- Peta: nowcast CAP, gelombang, status 72 jam per kecamatan, sarana, siklon, hujan/angin/ansambel, GIBS IMERG dan suhu, lapisan konteks registry.
- Insight 12 kartu; Tren 6 kartu (termasuk kalender musim dan ENSO); Dampak 7 bagian; Berita 5 kartu; Simulasi 3D 72 jam dengan skenario siklon; Laporan harian; Foto bersama.
- Warga: jenis laporan `pohon_tumbang`, `atap_rusak`, `puting_beliung`, `hujan_es` ada di server dan katalog, tetapi tab Informasi tidak dipasang di halaman bencana.
- Foto: pohon, genangan, atap, lainnya (17 foto dummy berlisensi). Berita: Google News RSS, 1.500 artikel/120 hari, diperbarui harian oleh `lintas.yml`.

## 6. Tabel 113 baris

Status: `dibuat` dan `diadaptasi` = ADA (diadaptasi = bentuk berbeda karena domain, alasan tertulis); `sebagian` = ada tetapi tidak memenuhi gerbang atau belum tayang; `belum` = tidak ada; `tidak berlaku` = alasan satu kalimat. Paritas diukur terhadap karhutla yang TAMPIL (tab Dashboard, Posko, Informasi, Kompleks, Metode karhutla tersembunyi, dan kartu uji/galat model di Insight).

| Kode | Komponen | Status | Bukti atau alasan |
| --- | --- | --- | --- |
| A01 | Sumber pengamatan utama | dibuat | CAP nowcast BMKG lewat Worker (`src/nowcast.js:1-4`), peringatan gelombang BMKG Maritim (`public/data/peringatan.json`), hujan dan embusan Open-Meteo (`public/banjir/data/hujan.json`). Skema diuji dengan fixture `scripts/cuaca/fixture`; `python3 scripts/cuaca/cuaca.py uji` hijau. |
| A02 | Varian keluaran bertingkat | sebagian | Tidak ada tiga potongan 24/72/semua. Penggantinya: nowcast hidup (`/api/cuaca/nowcast`), arsip rentang bebas maks 62 hari (`/api/cuaca/arsip`, `src/nowcast.js:129`; live 19 Okt: 7 CAP karena arsip baru mulai hari ini) dan status 72 jam `cuaca_kec.json` (hanya kecamatan tingkat 1 ke atas). |
| A03 | Pengamatan hampir-waktu-nyata | dibuat | Cron Worker 600 dtk (`public/bencana.json:567-570`), D1 `cuaca_nowcast` (migrasi 0014), `/api/cuaca/nowcast`. Live: `/api/status` cuaca_nowcast umur 0,1 jam (ambang 2). Uji Miniflare `tests/warga/cuaca_nowcast.test.mjs`. |
| A04 | Entitas kejadian aktif | sebagian | Kode C#### ada: `scripts/umum/kejadian.py:307` (satu CAP = satu kejadian, plus gugus kecamatan Siaga/Awas), masa aktif 1 hari (`:32`), kode stabil diuji (`kejadian.py uji` hijau). Siklon bukan kejadian (kartu Insight terpisah). Berkas `kejadian_cuaca_awal.json` BELUM terbit: 404 live dan tidak ada di repo (langkah baru di `lintas.yml:128`, jadwal 02:10 UTC belum jalan). Dijalankan lokal ke folder sementara: 3 kejadian. |
| A05 | Atribut kejadian | sebagian | Atribut kejadian hanya nama, tempat, provinsi/kab, tingkat atau severity CAP, jiwa, pusat (`kejadian.py` `_awal`). Tidak ada fasilitas terdekat, InaRISK, skor, atau riwayat sejenis per kejadian. |
| A06 | Geometri dampak | dibuat | Poligon CAP tampil live sebagai overlay BMKG (`public/cuaca/peta.js:51`) dan tersimpan sederhana di D1 `cuaca_arsip.poligon` (migrasi 0021, maks 8 cincin x 12 titik). Poligon kejadian ke `kejadian_cuaca_geo.json` (dimuat malas, `kejadian.js:geo`). |
| A07 | Pemecahan muatan | sebagian | Pemisahan `_awal` dan `_geo` ada di kode (lokal: 1 KB dan 21 KB), tetapi dua berkas itu belum terbit (404 live), jadi belum ikut `tests/beban/ukur_muat.mjs` (terukur /cuaca/ 597 KB, plafon 690 KB). |
| A08 | Cuaca pendukung | dibuat | Open-Meteo kisi 0,25 derajat dari modul banjir (`hujan.json`, `scripts/cuaca/cuaca.py:1-25`), medan 1,5 derajat (`medan.py`), gelombang Marine (`gelombang.py`). Kuota tertulis di `.github/workflows/lintas.yml:76-77` (±1.085/hari). |
| A09 | Indeks bahaya harian | diadaptasi | `dasar.tingkat_kec` (`scripts/cuaca/dasar.py:27`) mengambil maksimum dari hujan harian kelas BMKG 50/100/150 mm, embusan 54/72/90 km/jam, Hs 2,5/4/6 m, dan peluang ansambel. Hanya kelas hujan dan gelombang yang bersumber lembaga; embusan dan ansambel hipotesis (`dasar.py:19-24`). CAPE/LI tidak ada. Tidak ada contoh literatur untuk dicocokkan. |
| A10 | Prakiraan ansambel | dibuat | ECMWF IFS 51 anggota via Open-Meteo: peluang hujan >=50 dan >=100 mm (`hujan_ansambel.json`), peluang per kab/provinsi 8 hari (`scripts/cuaca/peluang_cuaca.py`, `cuaca_peluang.json`, 253 KB). Tidak ada p150; P10/P90 sengaja kosong (`peluang_cuaca.py:5`). |
| A11 | Kondisi latar | tidak berlaku | Ambang cuaca ekstrem absolut (kelas BMKG), bukan anomali terhadap klimatologi; tidak ada klimatologi 2015-2025 yang dihitung. |
| A12 | Indeks khusus tambahan | tidak berlaku | Tidak ada indeks riset tambahan; tidak ada kandidat yang punya uji balik. |
| A13 | Aturan status 4 tingkat | dibuat | Normal/Waspada/Siaga/Awas per kecamatan 72 jam (`dasar.py:27`, `prakiraan_kec.py`, `cuaca_kec.json`). Peringatan BMKG tidak dipetakan ke tingkat; tampil dengan kata dan warna asli (`public/cuaca/cuaca.js:26`, `peta.js:15`). |
| A14 | Prioritas | belum | `prioritas: []` (`public/bencana.json:611`). Tidak ada ambang prioritas bertangkapan/presisi; Sapa hanya mengurutkan provinsi menurut hujan. |
| A15 | Risiko riwayat 0–100 | sebagian | Tidak ada risiko riwayat 0-100 sendiri. Yang tampil indeks risiko BNPB (IRBI) per kab 2015-2025 (`cuaca_risiko_bnpb.json`, bagian "Risiko menurut BNPB", `dampak.js:10`); skala 2025 tidak sebanding dengan 2015-2024. |
| A16 | Kalender musim | sebagian | `scripts/cuaca/musim.py` menulis `cuaca_musim.json` (live 200): kalender per BULAN nasional dari satu tahun DIBI penuh (2025) dan ENSO per tahun 2010-2023 (`tren.js:81-98`). Bukan per dasarian per provinsi; El Nino vs biasa tidak dipisah per bulan. |
| A17 | Iklim | dibuat | ONI/IOD dari `public/data/iklim.json` dipakai bersama; `cuaca_musim.json` `kini`: El Nino, IOD positif, ONI 2,16 (live). Tampil di kartu ENSO Tren. |
| A18 | Riwayat grid dan sejarah | sebagian | DIBI cuaca+gelombang nasional 2010-2023 (`kejadian.json`), arsip CAP harian sejak 12 Okt (`cuaca_arsip_bmkg.json`) dan D1 `cuaca_arsip` sejak 19 Okt, riwayat model harian baru ±10 hari (`cuaca_riwayat.json`). IBTrACS (siklon sejak 1980) tidak ada. |
| A19 | Statistik per provinsi | dibuat | `cuaca_kec.json` `prov` (tingkat maks, jumlah kecamatan W/S/A), `cuaca_laporan.json` 38 provinsi x 30 hari, `cuaca_dampak.json` per provinsi. |
| A20 | Data lembaga | dibuat | CAP BMKG apa adanya (label BMKG), peringatan gelombang BMKG Maritim, siklon JTWC/GDACS (`cuaca_siklon.json`; live: Champi), BNPB DIBI dan InaRISK. Kontak BPBD `bpbd.json` ada tetapi disembunyikan (A40). |
| A21 | Posko | belum | Tidak ada titik kumpul/posko cuaca; registry tab tidak memuat `posko` (`public/bencana.json:499`). Karhutla pun menyembunyikan tab Posko. |
| A22 | Operasi | belum | Tidak ada kebutuhan atap darurat/terpal per rumah rusak dan tidak ada koefisien bersumber. |
| A23 | Aset udara | tidak berlaku | Respons cuaca ekstrem tidak memakai aset udara (heli, OMC) yang menjadi dasar A23 karhutla. |
| A24 | Keputusan ekonomi | belum | Tidak ada biaya respons vs kerugian dihindari; rupiah sengaja tidak ditampilkan karena belum ada asumsi bernama bersumber (`public/cuaca/dampak.js:6-7`). |
| A25 | Preventif | belum | Tidak ada profil atau rencana pencegahan (pemangkasan pohon, penguatan atap). |
| A26 | Penanggung jawab lahan | tidak berlaku | Kejadian cuaca tidak punya pemilik atau pengelola lahan yang bisa dinamai. |
| A27 | Dampak | dibuat | `scripts/cuaca/dampak_cuaca.py` -> `cuaca_dampak.json`: penduduk di sel hujan >=50 mm (WorldPop), zona kecamatan tingkat 2+ (jiwa, sekolah, faskes), pelabuhan/bandara, pesisir Hs >=2,5 m, korban dan rumah rusak tahunan DIBI. Tanpa rupiah; semua berlabel prakiraan. |
| A28 | Paparan penduduk | dibuat | WorldPop x sel hujan >=50 mm (`cuaca_dampak.json` `terpapar`), penduduk per kecamatan tingkat 2+ dan pesisir; bukan jiwa yang sudah terdampak. |
| A29 | Sekolah dan fasilitas | dibuat | Sekolah dan faskes di zona tingkat 2+ (`dampak_cuaca.py` `zona`, hanya yang tercatat) dan lapisan konteks "Sekolah & faskes" (`public/inti/peta/konteks.js:15`, registry `lapisan`, `public/bencana.json:612`). |
| A30 | Muatan Dashboard | belum | Tidak ada tab Dashboard/`ringkasan.json`. Karhutla menyembunyikan tab itu (`TAB_SEMBUNYI`, `public/index.html:1658`). |
| A31 | Cuaca per jam untuk simulasi | dibuat | `scripts/cuaca/medan.py` -> `cuaca_medan.json` (angin u/v, hujan, embusan; kisi 1,5 derajat, 72 jam, 303 KB, batas 600 KB) dan `gelombang.py` 72 jam, dipakai Simulasi. |
| A32 | Citra satelit | diadaptasi | Sentinel-2 sebelum/sesudah tidak berlaku (awan menutup, kejadian singkat). Gantinya GIBS GPM IMERG hujan dan suhu AIRS (`public/inti/peta/nasa.js:11,13`, dipasang di `Peta.init`) plus dasar satelit. |
| A33 | Berita | sebagian | `scripts/cuaca/berita.py` -> `berita_cuaca.json` (1.500 artikel, 120 hari, 312 kab; live dibuat 19 Okt 10.51 UTC lewat `lintas.yml:112`). Sentimen tidak teruji (`sentimen_teruji: false`), tidak ada label uji >=200, tidak ada EN. |
| A34 | Video | belum | Tidak ada video; dibuang dengan alasan data belum ada (`public/cuaca/berita.js:6`). |
| A35 | Data sektor | dibuat | Pelabuhan (OSM) dan bandara (OurAirports) di `cuaca_sarana.json` (`sarana.py`), status sarana tingkat 1+ di Dampak dan kartu Insight "Pelabuhan dan bandara terancam". |
| A36 | Kurasi tangan | belum | Tidak ada `factsheet_cuaca.json` atau berkas kurasi tangan lain berkolom sumber dan tanggal. |
| A37 | Meta | dibuat | `cuaca_meta.json` (`dibuat`, ambang, hari) dibaca `/api/status`; live cuaca umur 4,2 jam (ambang 30). |
| A38 | Data statis bulanan | sebagian | `cuaca_sarana.json` (OSM) dan `cuaca_risiko_bnpb.json` dibangun tangan (`risiko_bnpb.py --bangun`, `sarana.py --bangun`) dan tidak dijadwalkan di `statis.yml`. |
| A39 | Seri jangka pendek bergulir | dibuat | `cuaca_riwayat.json` bergulir tiap hari (hari lampau = analisis model), `cuaca_laporan.json` 30 hari (kontrak LAPORAN-HARIAN, `scripts/cuaca/laporan_cuaca.py`), halaman `/cuaca/laporan.html`. |
| A40 | Data respons dan kontak | sebagian | Kontak BPBD terdekat dari `bpbd.json` dibuat di laci kejadian tetapi disembunyikan karena data kantor lama (`public/cuaca/kejadian.js:7,84`). Tidak ada unit respons BMKG/Basarnas. |
| B01 | Model prakiraan | diadaptasi | Tidak ada model dilatih: aturan ambang di atas prakiraan Open-Meteo/ECMWF (`dasar.py`), sesuai rencana awal. Jejak `validasi-model` memuat 6 entri cuaca/udara. |
| B02 | Uji balik aturan status | sebagian | `scripts/cuaca/verifikasi.py` menguji prakiraan hujan >=50 mm vs DIBI (Previous Runs, 349 titik, 346 hari): prakiraan 1 hari sebelumnya POD 6,5%, FAR 59%, CSI 6,0% (`cuaca_verifikasi.json` `kita.lead`), tidak layak sehingga ambang tetap hipotesis. Embusan, gelombang, ansambel belum diuji. Peringatan BMKG vs DIBI n=0 (`dinilai_sampai` 2026-09-28 lebih awal dari arsip 12 Okt). |
| B03 | Prospektif | sebagian | `kita.arsip` menyimpan prakiraan yang terbit tiap hari (19 Okt sudah tercatat) dan `kita.prospektif` menilainya setelah DIBI memuat tanggalnya; n=0 sampai sekarang. |
| B04 | Kasus historis | belum | Tidak ada galeri kejadian besar masa lalu. |
| B05 | Galat dan pendorong | sebagian | Galat per provinsi di `kita.prov` (kartu "Ketepatan prakiraan"). Tidak ada analisis pendorong. |
| B06 | Tren jangka panjang | belum | Tidak ada Theil-Sen/Mann-Kendall; kartu ENSO dan kalender hanya menampilkan deret, tidak menguji tren. |
| B07 | Kesetaraan Python↔JS | sebagian | `public/cuaca/sim_data.js` membawa ambang dan uji sendiri (`node public/cuaca/sim_data.js`) tetapi tidak ada uji silang dengan `dasar.py` dan tidak ada `tests/cuaca/` di CI. Tingkat kecamatan dihitung sekali di Python (JS hanya membaca). |
| B08 | Selang ketidakpastian | sebagian | Peluang ansambel ada; P10/P50/P90 sengaja kosong karena anggota per hari tidak disimpan (`peluang_cuaca.py:5`). Tanpa CQR. |
| B09 | Kinerja tercatat | dibuat | Kinerja ditampilkan apa adanya: kalimat "menangkap X dari N provinsi-hari" (`cuaca.js:50-52`), kartu Insight "Ketepatan peringatan BMKG" dan "Ketepatan prakiraan", bab Verifikasi di Metode, pil "Ambang masih hipotesis" (`cuaca.js:49`). |
| B10 | Dokumen riset | belum | Tidak ada `scripts/cuaca/RISET-*.md` (rencana menyebut `RISET-AMBANG.md`); alasan ambang hanya di docstring `dasar.py` dan `cuaca.py`. |
| C01 | Kepala + menu bencana | dibuat | `details.bencana` di `public/cuaca/index.html` + `public/inti/kepala.js`; menu dari registry (`gerbang-bencana` hijau). |
| C02 | Tab dan URL bersih | dibuat | `/cuaca/<tab>` dan `/cuaca/k/C0001` (`public/cuaca/mulai.js:11-14`), `TAB_SEMBUNYI` {metode} (`cuaca.js:57`). Live: 7 tab (Peta, Insight, Berita, Tren, Dampak, Foto, Tentang); Kejadian dibuang karena datanya 404; Simulasi dibuka dari ikon kepala ke `/cuaca/simulasi.html`, bukan tab. |
| C03 | Tema terang/gelap | dibuat | `#tema`, kunci `pb-tema`, `peta.setStyle` (`cuaca.js:82`). |
| C04 | Waktu data | dibuat | `#upd` "Data 19 Okt 15.44 WIB" dari `cuaca_meta.json` (live). |
| C05 | Panel kiri | diadaptasi | Crumb + seg "Nowcast / Gelombang / Status 72 jam" + cari + daftar (`public/cuaca/peta.js:149`); bukan mode Real Time/Riwayat/Kompleks. |
| C06 | Rentang waktu | diadaptasi | Seg hari 4 hari (`#hariSeg`); tidak ada chip Kemarin/72 jam/7 hari karena nowcast hidup 2-3 jam. |
| C07 | Garis waktu prakiraan | dibuat | Kartu "Prakiraan cuaca (hari)" `#garisWaktu` dan hari 72 jam kecamatan (`kIdx`, `cuaca.js:40`). |
| C08 | Panel lapisan | diadaptasi | 12 ubin Overlay live (BMKG, Ombak, Satelit; Kecamatan, Ombak, Sarana, Siklon; Hujan satelit, Suhu; Penduduk, Sekolah & faskes, Jalan & sungai), konteks dimuat malas (`konteks.js`); jauh di bawah ±25 lapisan karhutla. |
| C09 | Choropleth wilayah + kartu hover | diadaptasi | Poligon CAP dan provinsi bergelombang berwarna (`peta.js:47-51`), kecamatan sebagai titik berwarna tingkat; tidak ada choropleth wilayah berskala. Kartu hover `kartuTip` bersama. |
| C10 | Gelembung cluster | tidak berlaku | Objek peta berupa poligon CAP dan titik kecamatan/pelabuhan/siklon yang tidak berhimpit seperti kompleks api; tidak ada klaster angka yang perlu digabung. |
| C11 | Popup titik | dibuat | Kartu hover/klik titik kecamatan (tingkat, hujan, embusan, Hs), pelabuhan/bandara, titik siklon (`public/cuaca/status.js`, `inti/peta/lapis.js`). |
| C12 | Laci kejadian | sebagian | Laci peringatan: tingkat, wilayah, jam berlaku, deskripsi BMKG (`peta.js:86`); laci kejadian: tingkat, kab, penduduk, mulai, bagikan (`kejadian.js:laci`). Tidak ada kondisi sekarang, prakiraan per jam, penjelasan tingkat, riwayat sejenis, InaRISK, tautan simulasi. |
| C13 | Legenda | dibuat | `#legenda` di dok: skala hujan, embusan, peluang, tingkat, kelas gelombang (`inti/peta/legenda.js`). |
| C14 | Insight | dibuat | 12 kartu gaya pil (`public/cuaca/insight.js:21`): status 72 jam, siklon, pelabuhan/bandara, ketepatan BMKG, ketepatan prakiraan, nowcast, gelombang, hujan, angin, ansambel, peluang, provinsi. Belum ada "peringatan per provinsi 30 hari" dan siklon sejak 1980. |
| C15 | Tabel kejadian | sebagian | Tab Kejadian lengkap (tabel standar, urut, paginasi, `kejadian.js:23-50`) tetapi tidak tampil di produksi karena datanya 404 (lihat A04). |
| C16 | Cerita | belum | Tidak ada `cerita_cuaca.js`. |
| C17 | Berita | sebagian | 5 kartu (Volume, Peta berita, Sorotan, Topik, Daftar; live 2.746 berita/30 hari). Dibuang: celah liputan, pantauan media, video, internasional (`berita.js:6`); sentimen tak teruji. |
| C18 | Tren | diadaptasi | 6 kartu (Hujan lebat, Angin, Provinsi, Per tahun BNPB, Kalender musim, ENSO; `tren.js:104`), seg rentang bila riwayat >14 hari. Indeks risiko 0-100 tidak ada (A15). |
| C19 | Posko, Sarana, Operasi, Keputusan | belum | Tidak ada sub-tab Posko/Sarana/Operasi/Keputusan (Pelabuhan dan bandara ada sebagai bagian Dampak). Karhutla menyembunyikan Posko. |
| C20 | Dampak | dibuat | 7 bagian (`public/cuaca/dampak.js:10`: pend, zona, sarana, pesisir, hist, risiko, sarbnpb); live 5 tampil, zona dan pesisir muncul bila ada kecamatan tingkat 2+. |
| C21 | Dashboard pimpinan | belum | Tidak ada Dashboard pimpinan (karhutla menyembunyikannya). |
| C22 | Metode | sebagian | Metode ada dan tersembunyi (`public/cuaca/metode.js`): sumber, ambang, status 72 jam, batasan, peluang, simulasi, verifikasi. Tanpa contoh hitung dengan data hari ini; baris "Berita: diperbarui tangan" (`metode.js:31`) usang karena `lintas.yml:112` menjalankannya harian. |
| C23 | Simulasi | diadaptasi | `/cuaca/simulasi.html` 3D 72 jam (angin, hujan, embusan, gelombang) dengan skenario siklon mendekat, menguat, melambat, profil Holland, dampak pelabuhan/bandara, perlakuan (`public/cuaca/sim_skenario.js`). Ditulis bukan model fisik badai (`metode.js:40`). |
| C24 | Lapor Warga | sebagian | Server dan katalog siap: 4 jenis cuaca (`public/informasi_jenis.js:86-92`), migrasi 0020, `tests/warga/skema.test.mjs`. Halaman /cuaca tidak memasang tab Informasi (karhutla pun menyembunyikannya); praktis tak terjangkau publik. |
| C25 | Foto lapangan | dibuat | `public/cuaca/foto.js:4` (`FOTO_BENCANA="cuaca"`) + `public/foto.js` bersama; kategori pohon/genangan/atap/lainnya dari registry (`public/bencana.json:546`); 17 foto dummy berlisensi (`public/img/dummy/cuaca/kredit.json`). Live: tab Foto "Belum ada foto" (dummy belum diisi di produksi). |
| C26 | Pop-up situasi hari ini | dibuat | `public/cuaca/sapa.js` lewat `inti/sapa.js`, kunci `pb_sapa_cuaca`, sekali per hari WIB. |
| C27 | Bagikan | dibuat | `public/cuaca/bagikan.js:9` tema `cuaca` (ringkasan hari ini, provinsi, Feed/Story/Kotak). |
| C28 | OG per rute | dibuat | `src/og_meta.js` memetakan `/cuaca/` dan `/cuaca/k/C…` (awalan dari registry); gambar `/data/og/cuaca.png` live 200 (`scripts/og/buat.py:148`). OG tidak per CAP atau provinsi. |
| C29 | i18n EN | sebagian | Kamus EN lima bencana baru (commit 0f2ecb1) menurunkan kebocoran Indonesia dari 92-207 menjadi 5-10 per bencana, belum nol; crawl `scripts/i18n/kumpul.mjs:106` memuat /cuaca/. Tab Kejadian dan kalender musim belum dicrawl. |
| C30 | Persetujuan, jejak, pesan, kaki | dibuat | `persetujuan.js`, `jejak.js data-halaman="cuaca"`, `kaki.js`, `pesan.js` terunduh di live. |
| C31 | Muat / kosong / galat / luring | sebagian | Spinner muat dan "Data belum tersedia" (`mulai.js`), pesan kosong per tab, kartu tanpa data dibuang; keadaan luring tidak ada (tanpa service worker). |
| C32 | Mobile 375 px | dibuat | Diukur 19 Okt malam di live dengan emulasi 375x812: `scrollWidth` = 375 di ketujuh tab. Belum ada uji otomatis. |
| C33 | Klik tidak membekukan | dibuat | Pola `nanti()` (`cuaca.js:6`) di klik tab/mode/hari; jejak `inp-reviewer` memuat 13 entri cuaca/udara. Tidak diukur ulang hari ini. |
| C34 | Halaman Tentang dan kartu bencana | dibuat | Tab Tentang (iframe `/tentang.html?tertanam=1`); Tentang menyebut tujuh bencana (commit f59388c). |
| C35 | Statistik publik | dibuat | `src/statistik.js:18` `HAL` dari registry (migrasi 0017); jejak `data-halaman="cuaca"`. |
| C36 | Admin moderasi | dibuat | Admin foto memakai pemilah bencana dari registry (`public/admin/foto.js:8,76-77`) dan dummy 🧪/🧹 per bencana (`:56-58`). |
| C37 | Bagikan lanjutan | diadaptasi | `bagi.js`/`bagi.css` (QR, WhatsApp, UTM) terunduh di live; "Bagikan video" Insight Musim tidak ada. |
| C38 | Lapisan tambahan | diadaptasi | Lapisan konteks registry (penduduk, sekolah+faskes, jalan; `inti/peta/konteks.js`) dan GIBS; tanpa hutan hilang, bekas terbakar, Daops, lencana iklim (milik karhutla). |
| C39 | Kaki dan Tentang | dibuat | `kaki.js` dan halaman Tentang bersama. |
| D01 | Rute HTML | dibuat | Rute `/cuaca/`, `/cuaca/k/…`, `/cuaca/simulasi.html` dari `src/bencana.generated.js`; live 200. |
| D02 | Route data cepat | dibuat | `/api/cuaca/nowcast` cache tepi 60 dtk (`src/nowcast.js:151-156`); `tests/warga/cakupan.json:9`. |
| D03 | Cron | dibuat | Pengatur cron menjalankan nowcast tiap kelipatan 10 menit (`bencana.json:567-570`, `nowcast.js:3`); uji "kelipatan 10" di `cakupan.json:9`. |
| D04 | Status kesegaran | dibuat | `sumber_status`: cuaca 30 jam, cuaca_nowcast 2 jam, berita_cuaca 30 jam (`public/bencana.json:502`); live `/api/status` `basi: []`; `jaga.yml` menerbitkan ulang bila basi. |
| D05 | Lapor warga | dibuat | `laporan.bahaya='cuaca'` + 4 jenis (migrasi 0020, `src/worker.js:194,215-217`); antarmuka belum terpasang (C24). |
| D06 | Foto | dibuat | `foto.bencana` (migrasi 0013), `KAT_BENCANA` di `src/foto.js`; `tests/warga/foto_bencana.test.mjs`. |
| D07 | Statistik | dibuat | `stat_hari.hal` dari registry (migrasi 0017, `src/statistik.js:18`). |
| D08 | OG meta | dibuat | `src/og_meta.js` membaca registry; `tests/warga/og.test.mjs`. |
| D09 | Dummy | sebagian | Foto dummy 17 + tombol 🧪/🧹 (`src/foto.js:113`, `public/admin/foto.js:48-60`). Tabel D1 khas cuaca (`cuaca_nowcast`, `cuaca_arsip`) dibaca layar tetapi tanpa `POST /api/cuaca/dummy`; produksi: tab Foto kosong. |
| D10 | Privasi | dibuat | Memakai mesin bersama (hash IP bergaram, DNT/GPC); jalur cuaca tidak menyimpan data pribadi baru (CAP publik). |
| E01 | Self-check per skrip | dibuat | Semua 13 skrip `scripts/cuaca/*.py` punya `uji` (lulus malam ini) dan `uji_alur.py`; `cuaca.py:196-197` merantai uji tiap modul; dijalankan di `lintas.yml:78-83`; uji berita/dampak di `lintas.yml:112`. |
| E02 | Cakupan route/tabel | dibuat | `tests/warga/cakupan.json:7-11`: tabel cuaca_nowcast, cuaca_sumber, cuaca_arsip dan route `/api/cuaca/nowcast`, `/api/cuaca/arsip`. |
| E03 | Skema D1 | dibuat | Migrasi 0014 dan 0021 diuji idempoten (`cakupan.json:7,10`); katalog jenis laporan vs migrasi 0020 dijaga dua arah oleh `skema.test.mjs`. |
| E04 | Registry | dibuat | `tests/agen/gerbang-bencana.test.mjs`: `npm run uji:agen` 57/57 hijau malam ini; `bencana.py cek` sah 7 entri. |
| E05 | Duplikasi inti | dibuat | `gerbang-inti.test.mjs` hijau; 17 salinan CSS/JS dilunasi (commit c191384). |
| E06 | Kesegaran data | dibuat | `/api/status` memuat cuaca, cuaca_nowcast, berita_cuaca (live: tak ada yang basi); `jaga.yml` menerbitkan ulang bila basi. Catatan: kunci `dampak` umur 21,5 jam tanpa ambang. |
| E07 | Beban | dibuat | `tests/beban/beban.mjs:27` /cuaca/ bobot 5; `ukur_muat.mjs:49-51` terukur 597 KB, plafon 690 KB. |
| E08 | i18n | sebagian | Crawl dua arah mencakup /cuaca/ (`kumpul.mjs:106`) tetapi kebocoran 5-10 per bencana, bukan nol. |
| E09 | Kepemilikan berkas | dibuat | Semua berkas dimiliki agen `cuaca-udara` (`gerbang-ilmu-agent` hijau; ilmu 21,7 KB, plafon 40 KB). |
| E10 | Model agent | dibuat | `.claude/agents/cuaca-udara.md` `model: sonnet` (`gerbang-model-agent` hijau). |
| F01 | Pengerja agent | diadaptasi | Satu pengerja `cuaca-udara` untuk dua modul (`scripts/agents/roster.json:355`); registry menulis `pengerja: "cuaca"` (`public/bencana.json:574`) dan `workflow: "banjir.yml"` (`:573`), keduanya tidak cocok dengan kenyataan (agen `cuaca-udara`, pipeline di `lintas.yml`). |
| F02 | Dokumen spesifikasi | dibuat | Dokumen ini, daftar periksa A01-F04 terisi dari audit 19 Okt 2026 malam (sebelumnya hanya rencana R/A/T). |
| F03 | Dokumen riset | belum | Tidak ada `scripts/cuaca/RISET-*.md`. |
| F04 | Kredit dan lisensi | sebagian | Kredit foto dummy per bencana ada (`public/img/dummy/cuaca/kredit.json`). Tidak ada `public/cuaca/kredit.json`; Tentang tidak menyebut JTWC, GDACS, OurAirports, atau OSM pelabuhan. |
