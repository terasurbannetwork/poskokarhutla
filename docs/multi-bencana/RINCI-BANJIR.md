# Rincian kerja: BANJIR naik kelas ke karhutla (16 Okt 2026, hanya rencana)

Cakupan: `public/banjir/**`, `scripts/banjir/**`, plus berkas bersama yang harus disentuh. Rujukan: `public/index.html` (6.271 baris) dan modulnya. Berkas "* 2.*" diabaikan.

## 0. Temuan inti dari pemeriksaan kode (menentukan urutan)

1. Mesin kartu karhutla TIDAK bisa dipakai banjir apa adanya: `Insight.ex/pil/hl/leg/seg/selProv/selProvMulti` (`index.html` 3352-3395), `PilihCantik` (3731-3763), `rapikanTip` + handler tooltip (3766-3792), `paginasi` (3720), `Tabel` (2713) dan CSS `.ex-hd/.ex-bd/.ex-ft/.ex-ey/.ex-jd` (705-715, 843-844), `.pmulti` (598-606), `.pc-*` (1217-1220), `.tw` (384-392), `.tp2-*` semuanya INLINE di `index.html`. Banjir punya `Insight.ex(judul, sub, unit, isi, catatan, ctl)` gaya lama (`banjir/index.html` 1366: `<h3>` + `<p class="sub">` + `<p class="unit">` + `<p class="fn">`) yang melanggar A1/A4. Aturan `gerbang-tanpa-salin` melarang menyalin, jadi **langkah 1 wajib mengekstrak ke `public/inti/`** (belum ada; `ls public/inti` gagal).
2. `Berita` (inline `index.html` 3853-~4500) dan `Dampak` (`public/dampak.js`, 10 bagian khas asap/ISPA) juga karhutla-spesifik. Berita perlu ekstraksi bersama; Dampak ditulis baru untuk banjir.
3. `public/sapa.js` memakai `S.kluster` (kompleks api) dan teks karhutla; `public/kaki.js` memuat `fetch("data/kontak.json")` RELATIF (di `/banjir/` jadi `/banjir/data/kontak.json`, salah) dan tautan `/peta` dst. karhutla; `public/foto.js` + `src/foto.js` hanya kategori api/asap/padam/dampak/lainnya dan tabel tanpa kolom bencana; `bagikan.js` sudah punya cabang `hal==="banjir"` (baris 25, 313, 342, 396, 409, 475, 920, 964-1050) tapi tombol per kartu Insight belum ada.
4. Banjir TIDAK memuat `kaki.js`, `sapa.js`, `foto.js`, `bagi.js`, `lapisan5.js`, `dampak.js`. Muat saja: `databaru.js`, `informasi.js`, `bagikan.js`, `persetujuan.js`, `jejak.js`, `pesan.js`, `i18n.js` (`banjir/index.html` 3105-3109, 8).
5. Header banjir: tanpa tombol `#burger`, tanpa ikon di tab (`IK_TAB`), tanpa menu "Lainnya", tombol tema dan pilihan bencana tampil di mobile (A21 dilanggar), `TABS` 14 tombol di satu nav (`banjir/index.html` 714). `bukaTab` memakai hash `#id`, bukan URL bersih.
6. Panel peta banjir: `kiriPad()` tetap 430 px (bukan diukur), tanpa kartu hover `kartuTip`, tanpa gelembung prioritas, tanpa ubin Overlay ala Windy (checkbox teks polos `data-l`), tanpa naik-tingkat otomatis, legenda tanpa ambang zoom, tanpa laci kejadian (`PETA.md` §1). Panel Overlay masih berjudul grup `<details>` biasa, bukan satu baris ubin per kategori.
7. Data: `meta.hitung_harian` berisi 4 hari PRAKIRAAN (hari 0 = hari ini), BUKAN seri lampau. Pop-up "dari kemarin" (`sapa.js` pola ▲/▼) butuh seri aktual harian yang belum ada. `kejadian.json` (1,8 MB) adalah arsip DIBI/BNPB historis, bukan kejadian aktif.
8. Registry sudah ada (B2, commit 3f96134): `public/bencana.json` entri banjir `status: aktif`, `tab` masih 14 lama, `tab_sembunyi: []`. `src/bencana.generated.js` dibangkitkan oleh `scripts/umum/bencana.py js`. Worker `HTML_RUTE` hanya `/banjir/` (`src/worker.js` 406); `/banjir/peta` dll belum ada. `src/statistik.js` `HAL` sudah memuat "banjir" tapi `HALAMAN` karhutla tidak mencakup subrute banjir.
9. Pelanggaran ringan sudah bersih (em dash 0, "Anda" 0 di `banjir/index.html`), sisa: 13 `toFixed(` (harus `fmt`/`mtA`), 6 `<table>` tanpa gaya standar A10 (kepala gelap, urut, paginasi), `title=` bertooltip bawaan.

## 1. Tab target banjir (cermin karhutla yang TAMPIL)

Urutan nav karhutla sebenarnya: Peta, Insight, Berita, Tren, Dampak, Simulasi, Foto, Tentang. Daftar dari pemilik: Peta, Insight, Tren, Berita, Dampak, Foto, Tentang. Simulasi saya pertahankan tampil seperti karhutla (keputusan terbuka K2); satu baris `tab_sembunyi` bila pemilik tak mau.

Registry target `public/bencana.json` banjir:
`tab: [peta, insight, berita, tren, dampak, sim, foto, tentang, posko, informasi, metode]`, `tab_sembunyi: [posko, informasi, metode]`. Tab "kompleks/kejadian" tidak ada: digabung ke bawah Insight (seperti karhutla 14 Okt).

| Tab banjir lama | Jadi apa | Isi pindah ke |
| --- | --- | --- |
| Peta | **Peta** | Panel kiri hanya "Wilayah" (seg Posko disembunyikan seperti karhutla); seg Banjir/Longsor tetap; mode Status/Hujan/Sungai/Rob/Riwayat tetap; Overlay ubin Windy |
| Informasi | **Informasi (tersembunyi)** | `informasi.js` tetap, `TAB_SEMBUNYI` (ledger A24) |
| Insight (8 kartu) | **Insight** | Kartu gaya baru: status per provinsi, hujan, sungai, rob, riwayat tahunan (`tren`), kabupaten langganan banjir (`kab`); `dampak` (korban DIBI) pindah ke tab Dampak; `musim` pindah ke Tren |
| Prakiraan | dihapus sebagai tab | Kartu Insight "Prakiraan 4 hari" + garis waktu di peta; `/banjir/prakiraan` beralias ke Insight |
| Wilayah siaga (Daftar) | dihapus sebagai tab | Blok bawah Insight `#insightKejadian`: tabel kecamatan siaga/awas bergaya A10 berpaginasi; juga daftar panel kiri; alias `/banjir/daftar` |
| Provinsi | dihapus sebagai tab | Pemilih provinsi PilihCantik/multi di kartu Insight + laci/dialog provinsi dari peta; alias `/banjir/provinsi` |
| Rob | dihapus sebagai tab | Kartu Insight `exRob` + mode peta "Rob"; grafik pasang di dialog titik |
| Sungai | dihapus sebagai tab | Kartu Insight `exSungai` + mode peta "Sungai"; hidrograf di dialog |
| Tren | **Tren** | Pertahankan `Tren` (1140-1362) dibungkus kartu; tambah kalender musim hujan (dari Insight `musim`) |
| Keputusan, Sarana, Posko | **Posko (tersembunyi)** | Satu tab `posko` dengan sub Posko/Sarana/Keputusan (alias `ALIAS` seperti karhutla 1652) |
| Simulasi | **Simulasi** | Tetap, dibungkus gaya kartu |
| Metode | **Metode (tersembunyi, wajib ada)** | Tetap; rute `/banjir/metode` hidup (gerbang butir 6) |
| (baru) | **Berita** | Langkah 11 |
| (baru) | **Dampak** | Langkah 12 |
| (baru) | **Foto** | Langkah 13 |
| (baru) | **Tentang** | Iframe `/tentang.html?tertanam=1` seperti karhutla (`index.html` 1581, 1684) |

## 2. Langkah berurutan

Format: **L#** judul · ukuran · pemilik. Setelah itu: Ubah/Mengapa · Berkas+fungsi · Pakai ulang/tulis baru · Data · Cek terima (1440 / 390).

### Gelombang 1: fondasi (L1, L2, L3, L4 jalan paralel)

**L1. Ekstrak mesin kartu ke `public/inti/` · L · inti-layar**
- Ubah/Mengapa: A4 menuntut satu bahasa kartu; tanpa ini banjir menyalin 400+ baris (dilarang gerbang salin). Karhutla harus identik.
- Berkas: baru `public/inti/kartu.js` (`Kartu.ex(judul,isi,ctl,{label,leg,sumber})`, `pil`, `hl`, `leg`, `seg`, `selProv`, `selProvMulti`, `_pmTutup`), `inti/pilih.js` (`PilihCantik` utuh), `inti/tip.js` (`rapikanTip`, handler `[data-tip]`, `wadahTip`), `inti/tabel.js` (`paginasi` + pengurut kepala; ambil dari `Tabel` 2713), `inti/format.js` (`fmt`, `rb`, `esc`, `jamWIB`, `tglPendek` jika ada), `inti/kartu.css` (blok CSS di atas). Sunting `public/index.html`: ganti definisi inline dengan `<script src>` dan sisakan `Insight.ex = (...a) => Kartu.ex(...a)` sebagai penghubung (state `_leg` pindah ke dalam `Kartu`, bukan `this`).
- Pakai ulang: potong-tempel persis dari `index.html` (jangan menulis ulang); tulis baru hanya pembungkus dan penghapusan ketergantungan pada `this.st`/`PRIO`/`namaProv` (jadikan parameter `daftar`, `nama`).
- Data: tidak ada.
- Cek: karhutla Insight, Tren, Berita, Dampak tangkapan sebelum/sesudah piksel-identik di 1440 dan 390; konsol bersih; `npm run uji:agen`.

**L2. Rute bersih dan registry banjir · M · warga-api**
- Ubah/Mengapa: URL `/banjir/peta` dst (FASE-0 D4), tab dari registry, statistik per tab.
- Berkas: `public/bencana.json` (entri banjir: `tab`, `tab_sembunyi`, `alias` prakiraan/daftar/provinsi/rob/sungai→insight, keputusan/sarana→posko, `foto_kategori`, `kata`), `scripts/umum/bencana.py js` -> `src/bencana.generated.js`, `src/worker.js` (`HALAMAN` untuk banjir: baris 398; tambah regex `^/banjir/(peta|insight|...)/?$` ke `/banjir/index.html`, `HTML_RUTE` 404-410, `SUMBER_STATUS` 330 sudah ada), `src/og_meta.js` (baris 12: cabang per subrute), `public/jejak.js` (regex 77-78), `tests/agen/gerbang-bencana.test.mjs`.
- Pakai ulang: pola yang sudah dipakai karhutla; tulis baru hanya baris registry dan regex.
- Data: `scripts/og/buat.py` perlu `og_banjir()` per subrute (judul dari data hari ini). Pipa belum menghasilkan; tugas `pipa-umum` di L4e.
- Cek: `curl` `/banjir/insight` -> 200 HTML banjir; `npm run bencana:cek` hijau; `uji:warga`.

**L3. Pecah monolit banjir tanpa ubah tampilan · M · banjir**
- Ubah/Mengapa: `banjir/index.html` 3.113 baris disentuh hampir semua langkah; tanpa pecah, langkah L5 sampai L14 bentrok. Tidak ada perubahan perilaku.
- Berkas: pindahkan objek ke berkas klasik di `public/banjir/`: `peta.js` (`Peta` 762, `Analisa` 951, `Riwayat` 1034, `renderLegenda`), `insight.js` (`Insight` 1363), `tren.js` (1140), `metode.js` (1597-2148), `keputusan.js` (2324), `sim.js` (`Simulasi` 2545), `posko.js` (`Posko` 2837, `Sarana` 3039, `Daftar`, `Provinsi`, `Rob`, `Sungai`). Buat CSS `public/banjir/{gaya,peta,insight,tren,dampak,berita,foto}.css` dari CSS inline (36-587), tiap modul satu berkas. Pasang kerangka kosong: `<section id="p-berita|p-dampak|p-foto|p-tentang">` dan `<script src>` stub (`berita.js`, `dampak.js`, `sapa_banjir.js`) agar langkah berikutnya tidak menyentuh `index.html`. Ganti `toFixed(` dengan `fmt`/`mtA`.
- Pakai ulang: seluruh kode lama apa adanya.
- Data: tidak ada.
- Cek: peta, 14 tab lama, simulasi, dialog bagikan sama dengan sebelum pecah (tangkapan 1440 dan 390 per tab); konsol bersih.

**L4. Data banjir yang belum diproduksi pipeline · L · banjir (skrip) + pipa-umum (pustaka)**
Satu pemilik `.github/workflows/banjir.yml` sekaligus supaya tidak bentrok. Semua keluaran ke `public/banjir/data/`, tiap skrip punya `uji` dan masuk blok "Uji aturan".
- L4a `scripts/banjir/kejadian_aktif.py` -> `kejadian_aktif_awal.json` + `kejadian_aktif_geo.json` (A04-A07): kejadian `B0001` = gugus kecamatan bersebelahan berstatus >= Siaga (hari 0), atribut: kecamatan, penduduk (`public/data/penduduk.json` kolom `kec`), hujan 3 hari, sungai, bahaya InaRISK, skor. Poligon gabungan dari `public/geo/kecamatan/{prov}.json`. Kode stabil antar-run. Ukuran `_awal` kecil.
- L4b `scripts/banjir/seri_status.py` -> `seri_status.json` bergulir (A39, A15): hitungan kecamatan awas/siaga/waspada per hari AKTUAL per provinsi, append-only, disimpan di cache `public/banjir/data` yang sudah dipulihkan `banjir.yml`. Dipakai pop-up "dari kemarin" dan kartu Tren. Tanpa seri ini pop-up tidak boleh menampilkan selisih (A18: dibuang, bukan kosong).
- L4c `scripts/banjir/berita.py` (kueri banjir/longsor/rob + leksikon) -> `berita.json`: refaktor `scripts/data/berita.py` ke `scripts/umum/berita.py` + `scripts/berita/banjir.py` (panen RSS, dedup, geocode, topik). Sentimen banjir butuh label uji >= 200 (PAKET B-gate A33); sampai ada, kartu sentimen disembunyikan, kartu volume/daftar/peta tampil. Pastikan keluaran karhutla tidak berubah (diff `berita.json` pada masukan yang sama).
- L4d `scripts/banjir/dampak.py` -> `dampak.json` (A27-A29), dihitung tanpa jaringan dari JSON lain: penduduk di kecamatan siaga/awas (`penduduk.json` `kec`), sekolah (`public/data/sekolah.json`), fasilitas kesehatan (`fasilitas.json`), kerugian dan korban tahunan (`kejadian.json` DIBI). Bagian tanpa data (sawah, jalan putus) dibuang (A18), bukan kosong.
- L4e `scripts/og/buat.py` `og_banjir()` per subrute (tugas pipa-umum, kecil).
- Ukuran total L: S per skrip. Hasil: tiga JSON baru + dua pecahan.
- Cek: `python3 scripts/banjir/<x>.py uji` hijau; ukuran berkas di plafon; `meta.json` mencatat kesegaran baru; `/api/status` memuat sumber berita/dampak banjir (`SUMBER_STATUS`).

### Gelombang 2: layar inti (butuh L1 dan L3; L5, L6, L7, L8, L9 paralel, berkas berbeda)

**L5. Kepala, nav, tab, mobile · M · banjir**
- Ubah/Mengapa: paritas header + A21 (burger, buang tema dan pilihan bencana di mobile), tab ikon, menu Lainnya, URL bersih, TAB_SEMBUNYI.
- Berkas: `public/banjir/index.html` (blok `<header class="top">` 594-606; kotak script utama), `bukaTab` (715) dan `TABS` (714).
- Pakai ulang: salin pola dari karhutla `index.html` 1650-1700 (`TABS`, `ALIAS`, `IK_TAB`, `TAB_SEMBUNYI`, burger 1688-1692, "Lainnya" 1701-1706) lewat `public/inti/tab.js` bila L1 sempat menyertakan (jika tidak, kerjakan dulu di banjir lalu tarik ke inti di langkah lain, jangan salin tiga kali). Tulis baru: ikon tab banjir (peta, insight, berita, tren, dampak, sim, foto, tentang), `history.replaceState` ke `/banjir/<tab>` + alih hash lama `#insight` -> `/banjir/insight`, menu bencana dari registry (`inti/kepala.js` bila ada), "Coming Soon" buang.
- Data: `public/bencana.json` (L2).
- Cek: 1440: 8 tab berikon, satu baris, Insight aktif memberi garis; 390: burger terbuka menu, tombol tema dan "Banjir, Longsor & Rob" disembunyikan, tanpa scroll horizontal.

**L6. Insight bergaya kartu karhutla · L · banjir**
- Ubah/Mengapa: A1, A3, A4, A8, A9, A15, A19: delapan kartu banjir lama diganti format pil kategori + judul berangka merah + pemilih kanan + legenda tengah + "Sumber:" + tombol bagikan ikon.
- Berkas: `public/banjir/insight.js` (`Insight.ex` jadi `Kartu.ex`; `exStatus`, `exHujan`, `exSungai`, `exRob`, `exTren`/`riwayat`, `exKab`; hapus `exMusim` ke Tren dan `exDampak` ke Dampak), tambah `exPrakiraan` (dari `Prakiraan` 987), blok `#insightKejadian` (tabel kecamatan siaga/awas dari `Daftar` 2153 dengan `Tabel`/`paginasi`, kepala gelap, urut, tautan ke peta), `exProvinsi` (dari `Provinsi` 2192, pemilih `selProvMulti`), `LABEL` pil: Status, Hujan, Sungai, Rob, Riwayat 15 tahun, Prakiraan, Kejadian. Label angka di ujung batang jadi pil (`Kartu.pil`), total di atas batang (A8), "rata-rata" pil navy. Tooltip `data-tip` ke format `rapikanTip` (kepala + kolom; ▲ merah, ▼ hijau; tanpa ISO). Kartu kejadian aktif (data L4a) di paling atas.
- Pakai ulang: seluruh logika SVG `exStatus/exHujan/...` dipertahankan; tulis ulang kerangka `ex`, kontrol (`seg` -> `PilihCantik` untuk hari/jenis), judul.
- Data: `status.json`, `hujan.json`, `sungai.json`, `rob.json`, `kejadian.json`, `hujan_ansambel.json` sudah ada; `kejadian_aktif_awal.json` dari L4a (kartu aktif disembunyikan sampai ada).
- Cek: 1440: kolom satu kartu lebar penuh, tak ada subjudul/unit/catatan, pil terisi, angka total di batang; 390: kartu satu kolom, pemilih tidak terpotong; hover memunculkan kartu `tp2`.

**L7. Tren bergaya kartu · M · banjir**
- Berkas: `public/banjir/tren.js` (`Tren` 1140-1362). Bungkus tiap blok dengan `Kartu.ex`; pindah `exMusim` dari Insight; tabel risiko memakai `Tabel` + `paginasi`; tanpa tombol "Tampilkan N".
- Data: `riwayat.json`, `riwayat_grid*.json`, `validasi.json` (ada); `seri_status.json` (L4b) untuk kurva status bergulir.
- Cek: seperti L6; tabel kepala gelap, urut, sudut atas membulat, satu kotak (A10).

**L8. Paritas peta · L · layar-peta (review banjir)**
- Ubah/Mengapa: `PETA.md` §1: tutup 7 selisih.
- Berkas: `public/banjir/peta.js`, CSS `peta.css`, bagian panel di `index.html` hanya lewat markup yang sudah dipasang L3. Item: (a) `kiriPad()` terukur seperti `padRuang` karhutla (2176-2195) bukan 430; (b) panel Overlay jadi ubin ikon kecil putih satu baris per kategori seperti `lapisan5.js`/`ubinLapis` (karhutla 2509-2532): ambil fungsi, jangan salin, bila L-peta inti belum ada tarik minimal `UBIN` ke `public/inti/peta/lapis.js`; (c) kartu hover `kartuTip` (1609-1611) untuk wilayah, sungai, rob; (d) naik-tingkat otomatis saat zoom keluar (1949-1951) dan `fitBounds` ber-padding+maxZoom; (e) legenda hanya lapisan terlihat di zoom ini, ambang `AMBANG`; (f) muat malas lapisan lewat `nanti(() => pasang(k))`; (g) `style.load` dengan `setStyle(..., {diff:false})` sudah ada, pertahankan; (h) seg "Posko" di panel disembunyikan (`hidden`, ledger A24), `cursor:help` buang.
- Pakai ulang: `Peta` banjir ada; ambil pola karhutla dengan memanggil modul inti, tulis baru adaptor data banjir.
- Data: tidak baru.
- Cek: 1440 Overlay tipis, ubin ikon, hover kartu angka satu baris ikon; zoom keluar naik tingkat; 390 panel bawah, ubin tidak meluber.

**L9. Laci kejadian aktif + gelembung prioritas · M · layar-peta**
- Butuh L4a dan L8. Berkas: `public/banjir/peta.js` (`Laci` banjir: sembilan bagian disaring ke yang punya data: saat ini, hujan, sungai, InaRISK, riwayat; "Respons terdekat"/"Tindakan" disembunyikan seperti karhutla), klaster MapLibre `kejadian` (`prio-klaster`, 1823-1835), tautan `/banjir/k/B0001` (rute di L2, OG L4e). Data: `kejadian_aktif_*.json`. Cek: klik gelembung membuka laci lebar, `fitBounds` terukur; 390 laci jadi dialog.

**L10. Ekstrak Berita ke inti · L · inti-layar**
- Berkas: `public/inti/berita.js` dari `Berita` (`index.html` 3853-~4500), diparameter `{data, bahasa, wilayah, kata}`; karhutla memakai versi inti, hasil identik. Setelah L1 (bila di `index.html`, serialkan dengan L1 oleh agen yang sama, jangan paralel dengan L1).
- Cek: tab Berita karhutla identik 1440/390.

### Gelombang 3: fitur baru (paralel, berkas berbeda; butuh L1-L4 yang relevan)

**L11. Tab Berita banjir · M · banjir**
- `public/banjir/berita.js` memanggil `Berita` inti dengan `data/berita.json` banjir; kartu: volume harian, topik, peta berita, daftar berpaginasi (judul = tautan), sentimen hanya bila label uji lolos. Kata dari `kata` registry ("banjir", "longsor", "rob"; frasa "kecamatan langganan banjir"). Data: L4c. Cek 1440/390: kartu seragam, tanpa blok judul, pil topik, footer kaki.

**L12. Tab Dampak banjir · L · banjir**
- `public/banjir/dampak.js` (modul baru, bukan salinan `dampak.js` karhutla). Bagian ditulis dari data L4d: Penduduk terdampak, Sekolah, Kesehatan, Korban dan kerugian historis (`exDampak` lama, DIBI), Kerugian ekonomi bila ada asumsi bernama. Semua dengan `Kartu.ex`, pil, tooltip, tabel standar, A17 angka langsung. Data: `dampak.json`. Cek 1440/390.

**L13. Foto lapangan banjir · M · warga-api (server) lalu banjir (layar)**
- Server: migrasi `0009` kolom `foto.bahaya` (rebuild aman tabel anak, rencana C1/C6), `src/foto.js` (`KATEGORI` jadi per-bencana dari registry `foto_kategori`: banjir `genangan, arus, longsor, rob, lainnya`), `GET /api/foto?bencana=banjir`, validasi server, `tests/warga/foto.test.mjs`. `public/admin/foto.js` pemilah bahaya.
- Layar: `public/foto.js` baca registry (subjudul/ikon/KAT) tanpa mengubah karhutla; `p-foto` dan lapisan "Foto lapangan warga" di Overlay banjir (mulai mati, tidak disimpan). Foto contoh banjir berlisensi (Wikimedia) di `public/img/dummy`: butuh keputusan pemilik soal sumber foto (K3); tanpa itu tab menampilkan keadaan kosong "Belum ada foto" + "Ambil foto".
- Cek: 1440 galeri bergeotag dengan ikon dan waktu di dalam foto (A23), upvote panah naik; 390 kartu satu kolom.

**L14. Pop-up situasi hari ini banjir · M · inti-layar (mesin) + banjir (adaptor)**
- `public/sapa.js` jadi mesin `Sapa.daftar(id, {siap, hitung, html})`, kunci `pb_sapa_<id>`, tata letak bersama; karhutla pindah ke `public/sapa_karhutla.js` (agen inti-layar menyentuh `index.html` hanya satu tag, serialkan dengan L1/L10). Adaptor `public/banjir/sapa_banjir.js`: judul berangka "N kecamatan siaga atau awas banjir hari ini" + selisih kemarin dari `seri_status.json`, chip, seksi: provinsi terparah, kejadian baru 24 jam (L4a), peringatan BMKG relevan (`R_API` -> `hujan|banjir|longsor|rob|gelombang`), kaki "Sumber:" + "Lihat peta". Muncul sekali per hari WIB, di `/banjir/` dan `/banjir/peta`.
- Data: `seri_status.json`, `kejadian_aktif_awal.json`, `peringatan.json`.
- Cek 1440: dialog 560 px lebar, satu angka besar; 390: dialog penuh; tidak muncul lagi setelah ditutup; kata "kamu"; tanpa em dash.

**L15. Kaki situs · S · inti-layar**
- `public/kaki.js`: daftar tab dari registry (`window.PB_BENCANA`/`bencana.json`), prefiks rute (`/banjir/`), `fetch("/data/kontak.json")` absolut, `HAL` dari tab non-peta. Pasang di Insight, Berita, Tren, Dampak, Foto banjir lewat `<script src="../kaki.js" defer>` (tag ditambahkan di bagian skrip banjir `index.html` 3105-3110; serialkan dengan L5). Cek 1440/390: footer Teras Urban di bawah kelima tab, tautan benar `/banjir/...`.

**L16. Bagikan per kartu + dialog · M · banjir**
- `public/bagikan.js` cabang `banjir` sudah ada; tambah tombol ikon-saja pojok kanan atas tiap kartu (`.bg-ex`, tiru `index.html` 851/889), `Bagikan.tema.banjir` (MODUL-PLUG §3), grafik Insight disalin dari tab (baris 479), teks bagikan pola temuan -> konteks -> "Data per {tgl}" -> tagar, tanpa emoji, tab Ekspor tetap tersembunyi (ledger). QR lewat `bagi.js` (tag `<script src="../bagi.js">` ditambah). Cek 1440/390: setiap kartu Insight/Tren/Dampak/Berita punya ikon; dialog menampilkan gambar siap unggah.

**L17. Tentang · S · banjir + warga-api**
- Iframe `#p-tentang` seperti karhutla; `tentang.html` kartu banjir dari registry (status aktif, hapus "Coming Soon" yang tersisa); `/banjir/tentang` rute (L2). Cek: tab Tentang muncul tanpa header ganda.

**L18. Simulasi bergaya kartu · M · banjir**
- `public/banjir/sim.js` (`Simulasi` 2545, `ASUMSI`, `sim` grafik): bungkus panel dan hasil dengan `Kartu.ex`, pil, `PilihCantik`, tabel A10, tanpa teks penjelas A1. Cek 1440/390.

### Gelombang 4: sapuan akhir

**L19. i18n EN · M · banjir (`scripts/i18n/kumpul.mjs`, `public/i18n/en.json`)**
- Jalankan crawl untuk `/banjir/*`, tambahkan kunci baru (kartu, pop-up, dampak, berita, foto), GLOSARIUM banjir/longsor/rob; ID default tiap kunjungan (`sessionStorage`). Hreflang trio untuk subrute. Cek: `?lang=en` nol kebocoran di tiap tab 1440/390.

**L20. Sapuan tabel, tooltip, copy · M · banjir (selera-angka, gerbang-copy)**
- Semua tabel sisa (Posko, Sarana, Keputusan, Metode, Rob/Sungai dialog) memakai `Tabel` standar atau minimal kelas `.tw` baru; grep: `toFixed(`, `title="`, `cursor:help`, "9 provinsi", "prioritas", "Anda", em dash = nol. Tab tersembunyi tidak diutak-atik selain gaya dasar (A24).

**L21. Mobile 390 + INP · M · banjir + inp-reviewer**
- Tanpa scroll horizontal, target sentuh >= 44 px, handler klik lewat `nanti()`. Cek: preview 390 tiap tab; konsol bersih.

**L22. Verifier + catatan · S · agen baru berkonteks bersih**
- `npm run uji:warga`, `npm run uji:agen`, self-check Python L4, preview 1440 dan 390 per tab, tangkapan karhutla sebelum/sesudah. Catat penyembunyian di `fitur-disembunyikan.md`: tab posko/informasi/metode banjir, seg Posko panel, tab Ekspor, kartu sentimen bila belum teruji, foto contoh. Perbarui `docs/multi-bencana/bencana/banjir.md` (kolom celah -> ada). Push/deploy menunggu kata pemilik.

## 3. Peta paralel (berkas yang disentuh)

| Gelombang | Boleh jalan bersamaan | Berkas utama (tidak bentrok) |
| --- | --- | --- |
| 1 | L1, L2, L3, L4 | L1: `public/inti/*`, `public/index.html` · L2: `src/*`, `public/bencana.json`, `tests/agen` · L3: `public/banjir/*` · L4: `scripts/banjir/*`, `.github/workflows/banjir.yml`, `scripts/og/buat.py` (satu pemilik) |
| 2 | L5, L6, L7, L8, L10 | L5: `banjir/index.html` (kepala/nav, CSS kepala) · L6: `banjir/insight.js,.css` · L7: `banjir/tren.js,.css` · L8: `banjir/peta.js,.css` · L10: `public/inti/berita.js` + `index.html` (setelah L1 selesai, satu agen dengan L1 menyentuh `index.html`) |
| 3 | L9 (peta.js, setelah L8), L11, L12, L13, L14, L15, L16, L17, L18 | L11 `berita.js`; L12 `dampak.js`; L13 `src/foto.js`, `migrations/0009`, `public/foto.js`, `public/admin/foto.js`; L14 `public/sapa*.js`; L15 `public/kaki.js`; L16 `public/bagikan.js`, `bagi.js`; L18 `banjir/sim.js` |
| 4 | Serial | L19 `en.json`; L20 sapuan semua; L21; L22 |

Titik serialisasi yang tidak bisa dihindari:
- `public/index.html` (karhutla): L1 -> L10 -> L14 (tag), satu agen inti-layar berurutan.
- `public/banjir/index.html`: hanya L3 (pecah), L5 (kepala), L15 (tag kaki), L16/L17 (tag skrip). L5 menyentuh sebelum L15-L17, atau L3 memasang semua tag stub lebih dulu supaya tak ada sentuhan lagi.
- `.github/workflows/banjir.yml`: semua L4 di bawah satu pemilik.
- `public/bencana.json`: L2 saja, sisanya hanya membaca.

## 4. Keputusan terbuka untuk pemilik

K1. Tampilkan sentimen berita banjir sebelum label uji (>= 200) ada? Default: sembunyikan.
K2. Simulasi tetap sebagai tab tampil (default) atau disembunyikan?
K3. Foto contoh banjir berlisensi untuk galeri: sumber dan lisensi.
K4. Dashboard (ringkasan) banjir: tidak dibuat karena karhutla menyembunyikannya (A24); gerbang mengizinkan "tidak berlaku sementara" bila ada alasan satu kalimat.
K5. Citra sebelum/sesudah (A32) dan video (A34): ditandai "tidak berlaku" dengan alasan di `banjir.md` (awan, kuota), bukan dibuat.

## 5. Ringkasan 250 kata

Banjir sudah punya data pipa dan logika, tetapi tampilannya gaya lama. Penghalang utama: mesin kartu karhutla (Insight.ex, PilihCantik, rapikanTip, paginasi, CSS) inline di `index.html`, sehingga banjir tidak dapat memakainya tanpa menyalin. Maka urutan dimulai dari ekstraksi ke `public/inti/` (L1), disusul rute bersih dan registry (L2), pemecahan monolit banjir jadi modul (L3) supaya pekerjaan paralel tidak bentrok, dan data baru di pipa (L4): kejadian aktif, seri status harian, berita, dampak.

Tab target: Peta, Insight, Berita, Tren, Dampak, Simulasi, Foto, Tentang (tampil); Posko (berisi Sarana dan Keputusan), Informasi, Metode (tersembunyi tapi ada). Prakiraan, Wilayah siaga, Provinsi, Rob, Sungai tidak lagi tab: jadi kartu Insight, mode peta, dan tabel berpaginasi di bawah Insight.

Gelombang 2 (kepala dan burger, Insight, Tren, paritas peta, ekstraksi Berita) berjalan paralel karena berkas terpisah. Gelombang 3 menambah Berita, Dampak, Foto (migrasi `foto.bahaya`), pop-up situasi (butuh seri status harian, karena `hitung_harian` hanya prakiraan), kaki (perbaiki `data/kontak.json` relatif), tombol bagikan per kartu, Tentang, Simulasi. Gelombang 4: i18n EN, sapuan tabel dan copy, mobile 390, INP, verifier, catatan ledger.

Titik serial: `public/index.html` (L1, L10, L14), `banjir/index.html` (L3, L5), `banjir.yml` (satu pemilik). Tidak ada push tanpa kata pemilik. Lima keputusan terbuka: sentimen, Simulasi, foto contoh, Dashboard, citra dan video.
