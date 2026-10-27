# Katalog modul plug-and-play dan inventaris design system

Disusun 27 Okt 2026 dari kode di `main` (HEAD c823c39f), bukan dari ingatan. Setiap status di matriks diperiksa dengan grep terhadap `public/index.html`, `public/<bencana>/index.html`, `public/<bencana>/*.js`, dan `public/inti/**`. Bahan ini melengkapi [`MODUL-PLUG-AND-PLAY.md`](MODUL-PLUG-AND-PLAY.md) (kelas A sampai D, dipetakan 16 Okt) dan [`PAKET-FITUR.md`](PAKET-FITUR.md) (kode komponen A01 sampai C38). Nomor M di sini baru; kolom "Kode paket" menautkan ke nomor lama.

Catatan sebelum membaca:

- Data di checkout lokal hanyalah baseline (CI membuat data tayang tanpa commit), jadi status di bawah menilai KODE layar, bukan isi berkas data.
- Pesisir belum punya halaman: `public/pesisir/` hanya berisi `data/abrasi.json`, dan abrasi masuk sebagai lapisan di entri `banjir` registry (`public/bencana.json`, `lapisan: [..., "abrasi"]`). Pesisir karena itu tidak diberi kolom di matriks. Bila naik jadi entri sendiri, ia mulai dari kolom kosong.
- Audit paritas lama (`PARITAS-*.md`, 19 Okt) mengukur per komponen paket fitur. Dokumen ini mengukur per MODUL yang bisa dicolok, dan memperlihatkan hal yang tidak tertangkap audit itu: karhutla sendiri belum memakai sebagian modul bersama.

Legenda matriks:

| Tanda | Arti |
| --- | --- |
| B | Pakai modul bersama (`public/inti/**`, berkas akar bersama, atau registry) |
| B* | JS bersama, tetapi CSS atau cabang tampilannya masih salinan di halaman itu |
| S | Salinan atau kode sendiri di halaman itu (jalur bukti ditulis di kolom catatan) |
| - | Belum ada di halaman itu |
| x | Tidak relevan untuk bencana itu |

Singkatan kolom: K karhutla, Bnj banjir, Gmp gempa, Cua cuaca, Uda udara, Gng gunung api, Krg kekeringan.

Jawaban untuk pertanyaan pemilik, "apakah sudah punya grand design atau design system?": sebagian. Token warna, huruf, radius, bayangan, dan beberapa komponen sudah dipisah ke `public/inti/` dan aturan selera sudah tertulis rapi (buku pegangan, memori A1 sampai A25). Yang belum ada adalah dokumen atau halaman design system tunggal, katalog komponen yang bisa dibuka orang, token untuk jarak dan palet grafik, dan satu hal yang paling mengganggu: karhutla, yang jadi rujukan semua bencana lain, tidak memuat `inti/tema.css`, `inti/gaya.css`, `inti/insight.css`, `inti/tren.css`, dan `inti/peta/lapis.css`. Ia menyimpan salinan inline di `public/index.html` (841 KB, token di baris 39 sampai 60). Bagian 3 merinci ini.

## 1. Katalog modul

Kelas mengikuti `MODUL-PLUG-AND-PLAY.md` §1: A sudah colok, B satu langkah lagi (daftar dari registry atau satu migrasi), C mesin bersama dengan isi per bencana lewat adaptor, D karhutla saja (pola ditiru).

### Kelompok 1. Kepala dan navigasi

| No | Modul | Fungsi untuk pengguna | Kelas | Berkas sumber | Cara pasang | Kode paket |
| --- | --- | --- | --- | --- | --- | --- |
| M01 | Kepala dan menu bencana | Pengguna pindah antar bencana dari satu menu di kepala halaman. | B | `public/inti/kepala.js`, `public/inti/kepala.css`, `public/bencana.json` | `<details class="bencana" data-bencana="<id>">` plus `import("/inti/kepala.js")`; isi menu dari registry | C01 |
| M02 | Tab, alias, dan rute bersih | Pengguna membuka tab (Peta, Insight, Berita, dst.) lewat URL bersih `/<bencana>/<tab>`. | C | `public/bencana.json` (`tab`, `tab_sembunyi`, `alias`), `src/bencana.js`, `tests/agen/gerbang-tab-registry.test.mjs` | Daftarkan tab di registry dan tulis `TABS` + `TAB_SEMBUNYI` di kode halaman (dua sumber, dijaga gerbang) | C02 |
| M03 | Token tema dan dasar halaman | Warna, huruf, dan latar sama di semua bencana, terang dan gelap. | A | `public/inti/tema.css`, `public/inti/gaya.css` | `<link rel="stylesheet" href="../inti/tema.css">` sebelum `gaya.css` | C03 |
| M04 | Tombol tema terang/gelap | Pengguna mengganti tema dan pilihannya diingat. | C | Tiap halaman menulis sendiri (`public/banjir/index.html:229`, `public/gempa/dasar.js:9`, `public/index.html:1801`) | Belum ada modul; salin 3 baris atau tunggu `inti/tema.js` | C03 |
| M05 | Kaki, persetujuan, jejak statistik, kirim pesan | Kaki halaman, spanduk privasi, hitung kunjungan per bencana, dan dialog "kirim pesan". | B | `public/kaki.js`, `public/persetujuan.js`, `public/jejak.js`, `public/pesan.js`, `src/statistik.js` | Empat `<script src="../xxx.js">` di akhir halaman; `jejak.js data-halaman="<id>"` | C30 |
| M06 | Bahasa Indonesia dan Inggris | Satu tombol mengganti seluruh halaman ke EN. | B | `public/i18n.js`, `public/i18n/` (kamus), `scripts/i18n/` | `<script src="../i18n.js">` paling awal; tambahkan istilah bencana ke kamus | C29 |
| M07 | Cari wilayah | Kotak cari kabupaten/provinsi yang membuka kartu status wilayah. | C | `public/cari.js`, `public/cari.css`, `public/banjir/wilayah.js` | `Cari.wilayah(kode, nama)` setelah peta siap; butuh adaptor data per bencana | C05 |
| M08 | Pita "Data baru" (peringatan BMKG dan indikator harian) | Pita kecil di atas peta berisi peringatan resmi yang relevan. | C | `public/databaru.js`, `public/databaru.css`, `peringatan_relevan` di registry | `<script src="../databaru.js" data-halaman="<id>">` | C04 |

### Kelompok 2. Peta dan lapisan

| No | Modul | Fungsi untuk pengguna | Kelas | Berkas sumber | Cara pasang | Kode paket |
| --- | --- | --- | --- | --- | --- | --- |
| M09 | Panel Overlay berubin ikon | Pengguna menyalakan lapisan lewat ubin ikon putih ala Windy. | C | `public/inti/peta/lapis.js`, `public/inti/peta/lapis.css` | `import("../inti/peta/lapis.js")` lalu isi daftar ubin per bencana | C08 |
| M10 | Kartu hover satu baris berikon | Arahkan kursor ke wilayah atau titik dan muncul kartu ringkas berikon. | C | `public/inti/peta/lapis.js` (`kartuTip`, `tampilTip`, `sembunyiTip`), `#tip.kartu` di `lapis.css`, `public/inti/tip.js` | `PI.kartuTip({judul, kepala, stat})` di handler `mousemove` | C09 |
| M11 | Legenda dok mendatar | Legenda di bawah peta yang bisa ditarik tingginya dan diingat per perangkat. | C | `public/inti/peta/legenda.js`, `public/inti/peta/legenda.css` | `susunLegenda(el, {saatBuka})` sesudah mengisi `#legenda` | C13 |
| M12 | Lapisan konteks (penduduk, sekolah dan faskes, jalan) | Konteks siapa dan apa yang ada di sekitar kejadian. | B | `public/inti/peta/konteks.js`, `konteks-kerja.js` (worker), `lapisan` di registry, data `public/data/sekolah.json`, `fasilitas.json` | `import("../inti/peta/konteks.js").then(m => m.pasang(peta, "<id>"))` | C38 |
| M13 | Satelit NASA (GIBS) | Citra satelit harian sebagai lapisan dasar. | A | `public/inti/peta/nasa.js` | `<script src="/inti/peta/nasa.js">` | C08 |
| M14 | Mesin peta induk (MapLibre, ganti dasar, panel kiri, crumb, choropleth) | Peta Indonesia dengan panel kiri, crumb provinsi, dan warna wilayah menurut tingkat. | C | Belum ada modul. Tiap halaman: `public/index.html:1937` (`const Peta`), `public/banjir/peta.js:56`, `public/gempa/peta.js:46`, `public/cuaca/peta.js:18`, `public/udara/peta.js:17`, `public/gunungapi/peta.js:26`, `public/kekeringan/peta.js:48`; cetak biru `PETA.md` | Salin pola; rancangan `inti/peta/induk.js` ada di `PETA.md` tetapi belum dibangun | C05, C08, C09, C10 |
| M15 | Pengamatan hampir real time | Titik atau data langsung dari Worker menimpa data harian. | D | `public/titik_live.js`, `src/titik.js` (K); `public/banjir/hujan_kini.js`; `/api/gempa/terbaru` di `public/gempa/*.js`; `/api/cuaca/*` di `public/cuaca/cuaca.js`; `src/nowcast.js`, `src/gempa.js`, `src/gunungapi.js` | Pola `src/<id>.js` dengan `perbarui<Id>(env)` dipanggil cron, layar menimpa data harian | A03 |

### Kelompok 3. Kartu dan hover

| No | Modul | Fungsi untuk pengguna | Kelas | Berkas sumber | Cara pasang | Kode paket |
| --- | --- | --- | --- | --- | --- | --- |
| M16 | Kartu Insight | Kartu seragam: pil kategori, judul satu kalimat berangka merah, grafik, legenda dan "Sumber:". | A | `public/inti/kartu.js` (`Kartu.ex`, `Kartu.kartu`, `Kartu.pil`, `Kartu.hl`, `Kartu.seg`), `public/inti/kartu.css`, `public/inti/insight.css` | `Kartu.kartu(ey, judul, isi, sumber, ctl, leg)`; halaman memasang jembatan tipis `Insight.ex = (...a) => Kartu.ex(...a)` | C14 |
| M17 | Tooltip grafik | Kartu keterangan saat menyentuh batang atau titik grafik, label dan nilai dua kolom. | A | `public/inti/tip.js` (`rapikanTip`, `pasangTip`, `Tip.polaSatu`), gaya `#tip` di `public/inti/kartu.css` | Beri atribut `data-tip` pada elemen SVG/HTML | C09 |
| M18 | Pemilih kustom dan pemilih provinsi ganda | Menu pilihan berbentuk pil, termasuk bandingkan beberapa provinsi lewat centang. | A | `public/inti/pilih.js` (`PilihCantik`), `Kartu.selProv`, `Kartu.selProvMulti` | `PilihCantik.pasang()` sesudah render | C14 |
| M19 | Pil label dan eyebrow kartu | Label berwarna berikon pengganti teks mentah (A3 pemilik). | C | Tersebar: `.ex-ey` di `inti/insight.css:21`, `inti/tren.css:23`, `inti/berita.css:8`, `inti/dampak.css:8`; `.pill` di `inti/peta.css:80`; `.br-lb` di `inti/berita.css:158`; `.pl` di `inti/cerita.css`; `Kartu.pil` SVG | Belum satu komponen; lihat celah G1 | C14 |
| M20 | Tabel standar | Kepala gelap putih, bisa diurut, sudut atas membulat, paginasi. | A | `public/inti/tabel.js` (`paginasi`, `pengurutKepala`), `public/inti/tabel.css` | Muat `tabel.js`, panggil `paginasi()` dan `pengurutKepala()` | C15 |
| M21 | Kartu Peluang (kontrak `peluang/1`) | Kartu "peluang melewati ambang" per wilayah: judul vonis, satu batang per hari. | A | `public/inti/peluang.js`, `scripts/umum/peluang.py`, `tests/agen/peluang-inti.test.mjs` | `Peluang.muat("data/peluang.json")` lalu `Peluang.kartu(d, {...})`; `Peluang.batasan(d)` untuk tab Metode | A10, B08 |
| M22 | Kartu Cerita | Bingkai kartu cerita dengan baris pil dan kalimat, atau kartu bergrafik. | C | `public/inti/cerita.js`, `public/inti/cerita.css` | `Cerita.daftar("<id>", () => ({judul, baris, sumber}))` lalu `Cerita.sisip(el, "<id>")` | C16 |
| M23 | Kartu Video | Tren unggahan video dan daftar video berita. | C | `public/inti/video.js`, `public/inti/video.css`, `scripts/umum/video.py` | `KartuVideo.pasang(elemenBerita, "<id>")` | A34 |
| M24 | Peringatan dari berita | Kartu peringatan yang diturunkan dari berita, bersama semua halaman. | A | `public/inti/peringatan-berita.js`, `.css`, `scripts/umum/peringatan_berita.py` | `PeringatanBerita.pasang("#pbBerita", "<id>")` | C17 |
| M25 | Tab Berita | Volume harian, sentimen, daftar berpaginasi, peta gelembung per kabupaten. | C | Belum satu modul: `public/index.html:4356` (`const Berita`), `public/banjir/berita.js`, `public/gempa/berita.js`, `public/cuaca/berita.js`, `public/udara/berita.js`, `public/gunungapi/berita.js`, `public/kekeringan/berita.js`; `public/inti/berita.css`; `scripts/umum/berita.py` | Salin `berita.js` dan ganti kunci data; lihat celah G6 | C17, A33 |
| M26 | Tab Tren | Indeks risiko, kalender musim, riwayat jangka panjang. | C | `public/index.html:3625`, `public/banjir/tren.js`, `public/gempa/tren.js`, `public/cuaca/tren.js`, `public/udara/tren.js`, `public/gunungapi/tren.js`, `public/kekeringan/tren.js`; hanya gaya di `public/inti/tren.css` | Belum ada mesin; tiap bencana menulis `Tren` sendiri | C18 |
| M27 | Tab Dampak | Dampak ke penduduk, sekolah, fasilitas, ekonomi. | C | `public/dampak.js` (K, 70 KB), `public/banjir/dampak.js`, `public/gempa/dampak.js`, `public/cuaca/dampak.js`, `public/udara/dampak.js`, `public/gunungapi/dampak.js`, `public/kekeringan/dampak.js`; gaya `public/inti/dampak.css`; `Kartu.hbar` | Belum ada mesin; bagian dampak ditulis per bencana | C20, A27 |
| M28 | Tab Metode | Rumus, contoh hitung dengan data hari ini, batasan; tersembunyi tetapi wajib ada. | C | `public/inti/metode.css`, `public/inti/metode-kartu.css`, `public/banjir/metode.js` (911 baris), `public/gempa/metode.js`, `public/cuaca/metode.js`, dst.; `Peluang.batasan` | Gerbang `gerbang-bencana` butir 6 mewajibkan; belum ada `inti/metode.js` | C22 |

### Kelompok 4. Laci dan pop-up lokasi (seperti laci cluster karhutla)

Laci karhutla (`Laci.buka`, `public/index.html:3109`) punya sembilan bagian `details.lipat`. Nama bagian di kode, bukan di ingatan: "Api saat ini", "Penjelasan status", "Cuaca di lokasi", "Lahan & penanggung jawab", "Gambut terbakar di bawah permukaan (estimasi)", "Respons terdekat" (tersembunyi), "Tren lokasi & prakiraan", "Tindakan yang disarankan" (tersembunyi), "Riwayat kecamatan". Tidak ada bagian berjudul persis "Peluang & kondisi" atau "Model terlatih" di laci karhutla: peluang lokasi hadir sebagai "Tren lokasi & prakiraan" (`public/riwayat_sel.js`), dan model terlatih (`public/sebaran_model.js`, GBDT 72 jam) tampil di tab Simulasi lewat tombol `#keSim`, bukan sebagai bagian laci. Katalog ini memakai nama yang ada di kode dan memberi nama modul usulan bila pemilik ingin keduanya jadi bagian laci.

Hanya CSS laci yang bersama (`.laci`, `.hd`, `.hd-aksi`, `details.lipat`, `.kv`, `.lc-h` di `public/inti/peta.css`). Kode laci ditulis ulang di tiap halaman. Inilah kelompok dengan nilai paritas terbesar.

| No | Modul | Fungsi untuk pengguna | Kelas | Berkas sumber | Cara pasang | Kode paket |
| --- | --- | --- | --- | --- | --- | --- |
| M29 | Cangkang laci lokasi | Panel kanan (dialog di HP) dengan kepala, aksi (Maps, WhatsApp, bagikan, simulasi, tutup), dan bagian yang bisa dilipat. | C | Rujukan `public/index.html:3109`; salinan `public/gempa/laci.js:6`, `public/cuaca/peta.js:130`, `public/udara/peta.js:108`; banjir dan gunung api merakit `lipat(...)` di `public/banjir/peta.js:369`, `public/banjir/tren.js`, `public/gunungapi/peta.js`; gaya `public/inti/peta.css` | Usulan `inti/laci.js`: `Laci.buka({ey, judul, meta, aksi, bagian: [...]})` dengan bagian dari registri bagian di bawah | C12 |
| M30 | Bagian laci: Kondisi kini | Ringkasan keadaan saat ini di lokasi (api, status, PM2,5, magnitudo, level). | C | K "Api saat ini" (`index.html:3139`); banjir "Saat ini, status 4 hari" (`banjir/tren.js`); gempa kartu Kekuatan/Kedalaman (`gempa/laci.js:7`); udara `laciProv` (`udara/peta.js:86`); gunung api "Erupsi terbaru" (`gunungapi/peta.js`) | `Laci.bagian("kini", id, fn)` | C12 |
| M31 | Bagian laci: Cuaca di lokasi | Cuaca yang menggerakkan bahaya di titik itu (FWI, angin, hujan 10 hari). | C | K "Cuaca di lokasi" (`index.html:3151`); banjir "Hujan 10 hari" (`banjir/peta.js`) | Sama | C12 |
| M32 | Bagian laci: Penjelasan status | Kenapa lokasi ini berstatus begini, dalam bentuk visual. | C | K "Penjelasan status" (`index.html:3142`); banjir "Cara skor dihitung" (`banjir/kejadian.js`) dan "Rincian skor" (`banjir/tren.js`) | Sama | C12 |
| M33 | Bagian laci: Peluang dan prakiraan lokasi | Peluang dan prakiraan beberapa hari untuk lokasi itu. | C | K "Tren lokasi & prakiraan" (`public/riwayat_sel.js`, `RiwayatSel.analisa` diuji di `tests/agen/riwayat-sel.test.mjs`); banjir "Prakiraan 3 hari dan peluang" (`banjir/peta.js`); gempa "Peluang susulan 7 hari ke depan" (`gempa/laci.js`, `gempa/susulan.js`); gunung api "Skenario abu 72 jam" | Kontrak `peluang/1` (M21) menyuplai angka | C12, B01 |
| M34 | Bagian laci: Lahan, wilayah, dan penanggung jawab | Siapa dan apa yang ada di lokasi: lahan, konsesi, InaRISK, sungai, evakuasi, kontak resmi. | C | K "Lahan & penanggung jawab" (`index.html:3153`); banjir "Indeks bahaya InaRISK", "Sungai terdekat (GloFAS)" (`banjir/peta.js`); gunung api "Evakuasi", "Kontak resmi" (`gunungapi/peta.js`) | Sama | A05, A26 |
| M35 | Bagian laci: Model terlatih | Hasil model data (peluang per sel, selang P10/P90) untuk lokasi itu. | D | K `public/sebaran_model.js` + `public/data/model_sebaran.json` (hanya tab Simulasi); bencana lain punya model sendiri tanpa kontrak bersama (banjir `ansambel_hujan.py`, gunung api abu 18+51 anggota, gempa susulan) | Butuh kontrak "model/1" (peluang per sel, selang, uji balik) sebelum bisa dicolok | B01, B08 |
| M36 | Bagian laci: Riwayat kecamatan atau lokasi | Riwayat kejadian di tempat itu per tahun, kecamatan paling langganan. | C | K "Riwayat kecamatan" + `Riwayat` (`index.html:3175`, `riwayat_sel.js`); banjir "Kejadian ... per tahun" dan "Musim rawan" (`banjir/tren.js`); gempa tidak punya | Sama | A15, A18 |
| M37 | Bagian laci: Respons terdekat dan tindakan | Posko, Daops, BPBD terdekat dan langkah yang disarankan; tersembunyi atas keputusan pemilik. | C | K "Respons terdekat" dan "Tindakan yang disarankan" (`index.html:3168,3174`); banjir `kejadian.js`; gempa "Kontak BPBD" (`gempa/kata.js`, disembunyikan lewat `gempa/gempa.css`) | Dibuat di kode, disembunyikan dengan `[data-j="..."]{display:none}` | A40, A24 |
| M38 | Pop-up Situasi hari ini | Pop-up sekali per hari WIB: apa yang naik, turun, baru, dan bertahan. | C | `public/inti/sapa.js` (mesin), adaptor `public/sapa.js` (K), `public/banjir/sapa_banjir.js`, `public/gempa/sapa.js`, `public/cuaca/sapa.js`, `public/udara/sapa.js`, `public/gunungapi/sapa.js`, `public/kekeringan/sapa.js` | `Sapa.daftar("<id>", {siap, hitung, html})` | C26 |
| M39 | Alarm peringatan dini | Kartu alarm di pojok kanan bawah saat ada peringatan Waspada, Siaga, atau Awas. | A | `public/inti/alarm.js`, `src/peringatan.js`, `public/peringatan.js` (halaman `/peringatan`) | `<script src="/inti/alarm.js" defer>`; tambahkan rute di tabel `RUTE` | A20, `PERINGATAN-DINI.md` |

### Kelompok 5. Insight, kejadian, simulasi

| No | Modul | Fungsi untuk pengguna | Kelas | Berkas sumber | Cara pasang | Kode paket |
| --- | --- | --- | --- | --- | --- | --- |
| M40 | Tab Kejadian (kode, tabel, laci, `/k/<kode>`) | Daftar kejadian aktif dengan kode stabil (K, B, G, C, U, V, D) dan tautan bersih. | C | Pipeline `scripts/umum/kejadian.py`, `scripts/banjir/kejadian_aktif.py`; layar `public/gempa/kejadian.js`, `public/cuaca/kejadian.js`, `public/udara/kejadian.js`, `public/gunungapi/kejadian.js`, `public/banjir/kejadian.js`; K di `Laci` dan `index.html` (cluster) | Awalan dan nama dari `kejadian` registry; layar menulis `Kejadian` sendiri | A04, C15 |
| M41 | Cangkang tab Simulasi | Simulasi 72 jam di tab sendiri. | D | `public/sim_*.js` (K), `public/banjir/sim*.js`, `public/gempa/sim.js`, `public/cuaca/sim_*.js`, `public/udara/sim/`, `public/gunungapi/sim*.js`, `public/kekeringan/simulasi.js` | Hanya pola; model fisik berbeda tiap bencana | C23 |
| M42 | Tab Insight (rakitan eksibit) | Kumpulan kartu Insight per bencana. | C | `Insight.EX` + `Insight.LABEL` di tiap `insight.js` (K di `index.html:3865`); `Cerita.sisip` dan `Peluang.kartu` menyisip kartu bersama | Daftar `EX` ditulis per bencana; kartu bersama lewat M21, M22, M24 | C14 |

### Kelompok 6. Laporan dan bagikan

| No | Modul | Fungsi untuk pengguna | Kelas | Berkas sumber | Cara pasang | Kode paket |
| --- | --- | --- | --- | --- | --- | --- |
| M43 | Bagikan (gambar IG, tautan, kartu per bagian) | Ikon bagikan di tiap kartu menghasilkan gambar 4:5, 9:16, atau 1:1 dan tautan. | C | `public/bagikan.js` (1250 baris), `public/bagi.js`, adaptor `public/gempa/bagikan.js` (44 baris), `cuaca/bagikan.js`, `udara/bagikan.js`, `gunungapi/bagikan.js`, `kekeringan/bagikan.js`; `bagikan` di registry | `Bagikan.tema[<id>] = {siap, tanggal, acuan, data, teksWil, keterangan}` di adaptor | C27 |
| M44 | Pratinjau sosial (OG) per rute | Tautan yang dibagikan menampilkan judul dan gambar yang benar. | B | `src/og_meta.js` (membaca `src/bencana.generated.js`), `scripts/og/buat.py`, `og` di registry | Isi `og.judul` dan `og.desk_templat` di registry | C28 |
| M45 | Laporan harian generik | Halaman laporan harian per bencana dengan tabel provinsi dan unduhan. | C | `public/inti/laporan.js` (188 baris), `public/inti/laporan.css`, `LAPORAN-HARIAN.md`, `scripts/umum/laporan.py`, `public/<id>/laporan.html` | `Laporan.pasang({id, url})` di `laporan.html` | C21 |
| M46 | Laporan khusus karhutla (konpers, Matador, Koordalops, BNPB, konsesi, deck) | Paket laporan resmi karhutla. | D | `public/laporan_*.js` (±14 berkas), `public/paparan*.js`, `public/dokumen*.js`; generik sebagian di `public/laporan_bencana_spek.js`, `laporan_bencana_wa.js` | Hanya pola; tidak dipindah | A20 |

### Kelompok 7. Warga dan foto

| No | Modul | Fungsi untuk pengguna | Kelas | Berkas sumber | Cara pasang | Kode paket |
| --- | --- | --- | --- | --- | --- | --- |
| M47 | Foto lapangan (termasuk tombol isi foto dummy) | Galeri foto warga, kirim foto bergeotag, upvote, komentar, tombol dummy untuk Super Admin. | B | `public/foto.js` (55 KB, `window.FOTO_BENCANA`), `public/foto.css`, `public/inti/exif.js`, `public/inti/foto_kecil.js`, `src/foto.js`, `foto_kategori` di registry; tombol dummy `foto.js:88` | Berkas `public/<id>/foto.js` 3 baris: `window.FOTO_BENCANA = "<id>"` sebelum `../foto.js` | C25 |
| M48 | Lapor Warga (Informasi) | Form laporan kejadian per jenis bahaya. | B | `public/informasi.js`, `public/informasi_jenis.js`, `src/worker.js`, `lapor_bahaya` di registry, migrasi D1 `0020` | `<script src="../informasi.js" data-halaman="<id>">`; tab `informasi` di `TABS` | C24 |

### Kelompok 8. Model, uji balik, dan pipeline

| No | Modul | Fungsi untuk pengguna | Kelas | Berkas sumber | Cara pasang | Kode paket |
| --- | --- | --- | --- | --- | --- | --- |
| M49 | Registry bencana dan generator | Satu entri JSON mendaftarkan bencana ke menu, rute, OG, foto, dan lapor. | A | `public/bencana.json`, `scripts/umum/bencana.py`, `src/bencana.generated.js`, `tests/agen/gerbang-bencana.test.mjs` | Tambah entri, jalankan generator, gerbang harus hijau | E |
| M50 | Pustaka pipeline bersama | Ambil data, simpan JSON, hitung kejadian, peluang, berita, laporan, video, peringatan. | C | `scripts/umum/` (`kejadian.py`, `peluang.py`, `berita.py`, `laporan.py`, `laporan_kejadian.py`, `video.py`, `peringatan_berita.py`, `bangunan.py`, `iklim_outlook.py`, `outlook12.py`, `tugas.py`) dan `scripts/banjir/umum.py` (`ambil`, `simpan`, `baca`, `grid_darat`) yang masih dipakai bencana lain | `sys.path` ke `scripts/umum`; lihat celah G9 | A01 sampai A40 |
| M51 | Aturan status 4 tingkat | Satu bahasa tingkat (normal, waspada, siaga, awas) dan warna per bencana. | C | `tingkat` di registry; `scripts/banjir/status.py`, `scripts/data/aturan.py`, `scripts/kekeringan/*`, `scripts/gunungapi/*` | Ambang domain di skrip bencana, nama dan warna tingkat dari registry | A13 |
| M52 | Uji balik dan prospektif | Angka kinerja (POD, FAR, CSI, BSS) dari kejadian nyata, dicatat tanpa mengubah masa lalu. | C | `scripts/banjir/uji_balik.py`, `scripts/banjir/prospektif.py`, `scripts/kekeringan/ujibalik.py`, `scripts/gunungapi/prospektif.py`, `scripts/sebaran/prospektif.py`, `scripts/sebaran/pfvi_balik.py` | Belum ada `scripts/umum/ujibalik.py`; lihat celah G9 | B02, B03 |
| M53 | Posko (greedy maximum coverage) | Rekomendasi lokasi posko yang menutup kejadian terbanyak. | C | `scripts/banjir/posko.py`, `scripts/data/posko.py` (K), `scripts/kekeringan/posko*`, `public/banjir/posko.js`, `public/kekeringan/posko.js` | Tersembunyi di semua halaman (A24); belum ada `scripts/umum/posko.py` | A21 |
| M54 | Ruang Instansi dan Ruang BNPB | Akun pemda, TNI, Polri, tugas api, laporan otomatis, relawan. | D | `public/instansi*.js`, `public/bnpb/`, `src/instansi.js`, `src/bnpb.js`, `src/tugas_bencana.js` | Dibangun karhutla dan multi-bencana (`tugas_bencana.js`); tidak dibahas matriks di bawah | memori `ruang-instansi`, `ruang-bnpb` |

Jumlah modul: 54 (M01 sampai M54). M46 dan M54 berstatus karhutla saja dan M41 serta M15 hanya pola; sisanya kandidat paritas.

## 2. Matriks status per bencana

Dibuktikan dengan grep (lihat kolom catatan). Hanya modul layar dan registry yang dimasukkan; modul pipeline (M50 sampai M53) dinilai di bagian 4.

| No | Modul | K | Bnj | Gmp | Cua | Uda | Gng | Krg | Bukti atau catatan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| M01 | Kepala dan menu | B | B | B | B | B | B | B | `grep kepala.js` di semua `index.html`. Menu hanya membuka `TAMPIL = {karhutla, banjir}`, lainnya berlabel "Soon" (`public/inti/kepala.js:23`) meski registry `aktif` |
| M02 | Tab dan rute | S | S | S | S | S | S | S | `TABS` ditulis ulang: `index.html:1729`, `banjir/index.html:200`, `gempa/tab.js:3`, `cuaca/cuaca.js:56`, `udara/app.js:49`, `gunungapi/app.js:50`, `kekeringan/app.js:65`; registry menyalin daftar yang sama |
| M03 | Token tema | S | B | B | B | B | B | B | K tidak memuat `tema.css` (0 hit di `index.html`), token inline `index.html:39-60`; tujuh halaman lain memuat `../inti/tema.css` |
| M04 | Tombol tema | S | S | S | S | S | S | S | `index.html:1801` kunci `pk-tema`; `banjir/index.html:229` dan `gempa/dasar.js:10` kunci `pb-tema`; kunci berbeda |
| M05 | Kaki, persetujuan, jejak, pesan | B | B | B | B | B | B | B | Empat skrip ada di semua `index.html` |
| M06 | Bahasa | B | B | B | B | B | B | B | `i18n.js` paling awal di semua halaman |
| M07 | Cari wilayah | B | B | - | - | - | - | - | `cari.js` hanya di K dan `banjir/wilayah.js`; lima lainnya tanpa kotak cari wilayah |
| M08 | Pita Data baru | B | B | - | - | - | - | - | `databaru.js` hanya di K dan banjir (grep: 0 hit di empat folder lain) |
| M09 | Panel Overlay ubin | S | B | B | B | B | B | B | K: 12 aturan `.ubin`/`.ub-th` inline di `index.html`; `lapis.css` sendiri bertuliskan "karhutla masih punya salinan inline" |
| M10 | Kartu hover berikon | S | B | B | B | B | B | B | K: `kartuTip` inline `index.html`; lainnya `import lapis.js` (`PI.kartuTip`) |
| M11 | Legenda dok | S | B | B | B | B | B | B | `legenda.js` baris 3: "Karhutla masih punya salinan sendiri di index.html" |
| M12 | Lapisan konteks | S | B | B | B | B | B | B | K memakai `lapisan5.js`; `konteks.js` baris 2: "untuk halaman bencana selain karhutla". Gunung api melewati sekolah dan fasilitas (`opsi.lewati`) |
| M13 | Satelit NASA | B | B | - | B | B | - | B | `nasa.js` tidak ada di `gempa/` dan `gunungapi/` |
| M14 | Mesin peta induk | S | S | S | S | S | S | S | Tujuh `new maplibregl.Map` terpisah (`index.html` 3 kali, enam `peta.js` masing-masing 1) |
| M15 | Pengamatan hampir real time | S | S | S | S | - | - | x | `titik_live.js`, `banjir/hujan_kini.js`, `/api/gempa/terbaru` di `gempa/insight.js`, `/api/cuaca` di `cuaca/cuaca.js`. Udara dan gunung api: tidak ada pemanggilan `/api/udara` atau `/api/gunungapi` di `public/` meski Worker punya (`src/gunungapi.js`). Kekeringan potret harian |
| M16 | Kartu Insight | B* | B | B | B | B | B | B | K memuat `kartu.js` dan `kartu.css` tetapi bukan `insight.css`; jembatan `Insight.ex = (...a) => Kartu.ex(...a)` di `index.html` |
| M17 | Tooltip | B | B | B | B | B | B | B | `tip.js` di semua halaman |
| M18 | Pemilih kustom | B | B | B | B | B | B | B | `pilih.js` di semua halaman |
| M19 | Pil label dan eyebrow | S | S | S | S | S | S | S | Lima definisi pil berbeda (celah G1) |
| M20 | Tabel standar | B* | B | B | B | B | B | B | K memuat `tabel.js` tetapi bukan `tabel.css` (CSS tabel inline) |
| M21 | Kartu Peluang | B | B | B | B | B | B | B | `Peluang.muat` dipanggil di semua; data cuaca, udara, kekeringan, gunung api di `public/banjir/data/*_peluang.json` |
| M22 | Kartu Cerita | S | B | B | B | B | B | B | `Cerita.daftar("<id>")` di enam `insight.js`; K memakai `cerita_karhutla.js` (50 KB) |
| M23 | Kartu Video | S | B | B | B | B | B | B | `KartuVideo` dipakai di enam `berita.js`; K inline `index.html:4651`. Berkas data `video_<id>.json` tidak ada di `public/banjir/data/` (0 berkas) |
| M24 | Peringatan dari berita | B | B | B | B | B | B | B | `PeringatanBerita.pasang` di tujuh `index.html` |
| M25 | Tab Berita | S | S | S | S | S | S | S | `diff` terhadap `banjir/berita.js`: cuaca 31 baris beda dari 190, udara 39/190, gunung api 32/189, kekeringan 26/189, gempa 108/127. Gerbang `gerbang-inti` tidak menangkapnya (celah G6) |
| M26 | Tab Tren | S | S | S | S | S | S | S | `const Tren` ditulis di tujuh tempat |
| M27 | Tab Dampak | S | S | S | S | S | S | S | `const Dampak` di tujuh tempat |
| M28 | Tab Metode | S | S | S | S | S | S | S | Per bencana; K tersembunyi (`TAB_SEMBUNYI`) |
| M29 | Cangkang laci lokasi | S | S | S | S | S | S | - | `const Laci` di K (`index.html:3109`), gempa, cuaca, udara; banjir dan gunung api `lipat(...)` inline. `kekeringan/peta.js` tidak memiliki laci (grep `laci` kosong) |
| M30 | Laci: Kondisi kini | S | S | S | S | S | S | - | Bagian per halaman, nama berbeda |
| M31 | Laci: Cuaca di lokasi | S | S | x | - | - | - | - | K dan banjir saja; gunung api punya skenario abu (M33) |
| M32 | Laci: Penjelasan status | S | S | - | - | - | - | - | K dan banjir |
| M33 | Laci: Peluang dan prakiraan | S | S | S | - | - | S | - | K `riwayat_sel.js`, banjir `peta.js`, gempa `susulan.js`, gunung api skenario abu |
| M34 | Laci: Lahan, wilayah, penanggung jawab | S | S | - | - | - | S | - | InaRISK/GloFAS di banjir; Evakuasi/Kontak di gunung api |
| M35 | Laci: Model terlatih | S | - | - | - | - | - | - | Hanya K (`sebaran_model.js`, tab Simulasi), belum jadi bagian laci |
| M36 | Laci: Riwayat lokasi | S | S | - | - | - | - | - | K `Riwayat.buka`, banjir "Kejadian per tahun" |
| M37 | Laci: Respons dan tindakan | S (sembunyi) | S (sembunyi) | S (sembunyi) | - | - | - | - | `fitur-disembunyikan.md`; gempa `gempa.css` menyembunyikan "Kontak BPBD" |
| M38 | Pop-up Situasi hari ini | B | B* | B | B | B | B | B | Mesin `inti/sapa.js` di semua. Banjir tidak memakai `Sapa.daftar` (adaptor `sapa_banjir.js` 81 baris dengan kunci `pb_sapa` yang SAMA dengan K) |
| M39 | Alarm peringatan | B | B | B | B | B | B | B | `alarm.js` dimuat di semua, tetapi `RUTE` di `inti/alarm.js:9` hanya memuat karhutla, banjir, gempa, tsunami, cuaca; udara, gunung api, kekeringan tidak punya rute |
| M40 | Tab Kejadian | S | S | S | S | S | S | - | `kekeringan/` tidak punya `kejadian.js` (kode D hanya dipakai `/semua`) |
| M41 | Cangkang Simulasi | S | S | S | S | S | S | S | Masing-masing model sendiri |
| M42 | Tab Insight | S | S | S | S | S | S | S | `const Insight` per bencana |
| M43 | Bagikan | B | B* | B | B | B | B | B | `bagikan.js` memuat 22 cabang `hal === "banjir"`; banjir tidak punya adaptor sendiri; enam lainnya `Bagikan.tema[<id>]` |
| M44 | Pratinjau sosial (OG) | B | B | B | B | B | B | B | `src/og_meta.js:5` memakai registry. Audit 19 Okt mencatat `og:image` kejadian gempa dan gunung api masih gambar karhutla (belum dicek ulang hari ini) |
| M45 | Laporan harian | S | B | B | B | B | B | B | K `laporan.html` memuat `/laporan.js` dan `/laporan.css`; enam lainnya `/inti/laporan.js` |
| M46 | Laporan khusus karhutla | x | x | x | x | x | x | x | Hanya K; `laporan_bencana_*` generik sebagian |
| M47 | Foto lapangan | B | B | B | B | B | B | B | `window.FOTO_BENCANA` di enam `<id>/foto.js` |
| M48 | Lapor Warga | B | B | B | B | B | B | B | `informasi.js` di semua; tab tersembunyi di semua |
| M49 | Registry | B | B | B | B | B | B | B | Tujuh entri aktif di `public/bencana.json` |

Ringkasan hitungan (49 modul layar dan registry di bagian ini; B* dihitung sebagai B; "S (sembunyi)" dihitung S):

| Bencana | Pakai bersama (B) | Salinan sendiri (S) | Belum ada (-) | Tidak relevan (x) |
| --- | --- | --- | --- | --- |
| Karhutla | 19 | 29 | 0 | 1 |
| Banjir | 27 | 20 | 1 | 1 |
| Gempa | 24 | 16 | 7 | 2 |
| Cuaca | 25 | 14 | 9 | 1 |
| Udara | 25 | 13 | 10 | 1 |
| Gunung api | 24 | 15 | 9 | 1 |
| Kekeringan | 25 | 10 | 12 | 2 |

Bacaan: karhutla, yang jadi rujukan, justru paling banyak berstatus S (29 dari 48 modul yang berlaku) karena bagian inti peta dan tema masih inline di `index.html`. Bencana lain sudah memakai 24 sampai 27 modul bersama, terutama kartu, tabel, tooltip, foto, lapor, kaki, dan bahasa. Yang belum bersama di semua bencana adalah lapisan "isi": laci, tab Berita, Tren, Dampak, Metode, Kejadian, dan Simulasi.

## 3. Inventaris design system

### 3.1 Yang SUDAH ada

Sumber: `public/inti/tema.css` (29 baris), `public/inti/gaya.css` (71), `public/inti/kartu.css` (79), `public/inti/insight.css` (91), `public/inti/tabel.css` (93), `public/inti/peta.css` (191), `public/inti/peta/lapis.css` (33), `public/inti/peta/legenda.css` (19), `public/inti/kepala.css` (21), `public/inti/tren.css` (50), `public/inti/berita.css` (182), `public/inti/dampak.css` (16), `public/inti/metode.css` (109). Tidak ada berkas atau halaman bernama design system; `grep -ri "design system" docs` tidak menemukan dokumen.

Token (`public/inti/tema.css`, persis juga di `public/index.html:39-60`):

| Kelompok | Token | Nilai terang | Nilai gelap |
| --- | --- | --- | --- |
| Latar | `--paper`, `--card`, `--surface` | `oklch(97.6% .006 255)`, `oklch(100% 0 0)`, `oklch(95.5% .012 255)` | `oklch(18% .035 256)`, `oklch(22.5% .045 256)`, `oklch(26% .05 256)` |
| Teks dan garis | `--ink`, `--ink2`, `--line` | `oklch(25.5% .075 256)`, `oklch(50% .045 258)`, `oklch(90% .015 255)` | `oklch(94% .012 255)`, `oklch(76% .035 255)`, `oklch(33% .05 256)` |
| Merek | `--brand`, `--brand2`, `--accent` | `oklch(25.5% .075 256)`, `oklch(42% .11 255)`, `oklch(68% .09 252)` | `oklch(64% .12 252)`, `oklch(70% .11 250)`, `oklch(72% .1 252)` |
| Status umum | `--ok`, `--warn`, `--bad`, `--info` | `oklch(62% .16 150)`, `oklch(76% .16 75)`, `oklch(57% .21 27)`, `oklch(66% .13 235)` | tidak dibedakan |
| Skala tingkat | `--f0` sampai `--f3` | hijau `oklch(72% .15 150)`, kuning `oklch(86% .16 98)`, oranye `oklch(73% .17 58)`, merah `oklch(57% .21 27)` | tidak dibedakan |
| Bayangan | `--shadow`, `--shadow-lg` | `0 2px 14px oklch(25% .07 256 / .08)`, `0 8px 28px oklch(25% .07 256 / .16)` | `0 2px 14px oklch(0% 0 0 / .35)`, `0 8px 28px oklch(0% 0 0 / .5)` |
| Radius | `--r`, `--r-sm` | `16px`, `10px` | sama |
| Tinggi kepala | `--top` | `58px` | sama |
| Huruf | `--font`, `--display` | `"Inter", system-ui, ...` dan `"Plus Jakarta Sans"` (dimuat dari Google Fonts, `index.html:34`) | sama |
| Dasar badan | `body` | `14.5px/1.5`, `letter-spacing:-.006em` | sama |
| Warna bencana | `warna` di registry | karhutla `#f08a3c`, banjir `#4f9be0`, gempa `#8a6d4e`, cuaca `#7d8ca3`, udara `#4a9d9c`, gunung api `#b5523b`, kekeringan `#c9a24b` | tidak dibedakan |
| Warna tingkat | `tingkat[].warna` di registry | `#9aa4b2` (normal), `#e0b400` (waspada), `#e8743b` (siaga), `#d64545` (awas); udara memakai lima tingkat dengan `#5a9e74` dan `#8a2be2` | tidak dibedakan |

Komponen yang sudah punya wujud tetap:

| Komponen | Spesifikasi nyata | Sumber |
| --- | --- | --- |
| Kartu Insight | Radius 18px di `#insight .ex`, kepala berlatar gradien `--surface`, isi, kaki. Eyebrow: huruf 10px/800, kapital, `letter-spacing:.08em`, latar `color-mix(--brand2 12%)`, radius pil. Judul `clamp(17px,2vw,21px)`, angka merah `.hl` (`--bad`). Padding 22px. | `inti/insight.css:1-60`, `inti/kartu.js:6-17` |
| Pil status | Tinggi 22px, 11px/700, titik 6px di depan; varian SVG `Kartu.pil` tinggi 20px. | `inti/peta.css:80-81`, `inti/kartu.js:20` |
| Segmen | Radius 999px, tombol 12px/600, aktif `--brand` teks putih (gelap: teks `oklch(18% .035 256)`). | `inti/kartu.css:1-6` |
| Tabel | Kepala `--brand` teks putih 10.5px/800 kapital, `border-bottom 2px --accent`, baris genap bernuansa, `tfoot` sama dengan kepala, sudut atas membulat lewat `.tw`. | `inti/tabel.css:1-25` |
| Paginasi | "Menampilkan a sampai b dari n", nomor dengan jeda. | `inti/tabel.js:1` |
| Ubin overlay | Grid 5 kolom, ikon 32px radius 9px latar gradien `--a`/`--b`, label 9px; aktif diberi centang hijau `#2b8c86`. | `inti/peta/lapis.css:1-14` |
| Kartu hover | `#tip.kartu` radius 12px, kepala pusat berikon 20px, isi satu baris. Tooltip grafik: radius 14px, pita judul gradien, naik merah `#b8392b`, turun hijau `#2b8c86`. | `inti/peta/lapis.css:18-33`, `inti/kartu.css:19-30` |
| Legenda | Dok mendatar, kelompok `.lg-g`, tinggi bisa ditarik; legenda kartu `.ex-leg` pusat dengan kotak 12px radius 3. | `inti/peta/legenda.js`, `inti/kartu.css:17-19` |
| Tombol | `.btn` tinggi 38px radius 12px 13.5px/700; `.ik-btn` 36px radius 10px (di laci 30px radius 9px); `.iconbtn` kepala 34px radius 10px. | `inti/peta.css:152,137,126`, `inti/kepala.css:20` |
| Laci | `.hd` dengan `.hd-ey`, `h2`, `.hd-meta`, `.hd-aksi`; bagian `details.lipat`; angka `.kv` bergaris tipis tanpa wadah (keputusan 15 Okt); judul bagian `.lc-h` 11.5px/800 kapital. | `inti/peta.css:126-191` |
| Pemilih | Pil `PilihCantik` dan `.pmulti` radius 999px tinggi 34px. | `inti/pilih.js`, `inti/kartu.css:7-14` |
| Tab kepala | Rata tengah, tab pil radius 999px, ikon 15 sampai 16px, tab pindah ke menu garis tiga di bawah 1280px. | `inti/gaya.css:20-34` |

Aturan selera pemilik yang berlaku (ringkas, sumber `docs/buku-pegangan/pantau-bencana.md` §Selera tampilan dan §Angka & copy, `docs/multi-bencana/RENCANA-20-JAM.md` A1 sampai A25, memori `aturan-berulang`, `gaya-kartu-insight`, `tanpa-titik-tengah`, `tanpa-titik-pemisah`, `fitur-disembunyikan`):

- Tiap halaman meniru kartu Insight: pil kategori, judul satu kalimat berangka merah, kontrol segmen, grafik, kaki legenda tengah dan "Sumber:" miring. Dilarang subjudul, baris satuan, paragraf catatan, kotak KPI berkepala navy.
- Angka di ujung batang dan kolom tabel jadi pil (sering berikon); tiap bar chart menulis total; nilai kecil tetap ditulis.
- Tabel standar: kepala gelap tulisan putih, bisa diurut, sudut atas membulat, dipaginasi. `<select>` bawaan diganti `PilihCantik`.
- Tooltip: pita judul dan kolom label/nilai, naik ▲ merah, turun ▼ hijau, tanpa tanggal ISO, tanpa `cursor:help`.
- Peta: Overlay ubin ikon latar putih, nama provinsi di rounded rectangle, peta buka di "Hari ini", `setStyle({diff:false})`.
- Lebar penuh tanpa ruang kosong, semua di dalam kontainer dan kartu, tanpa latar abu gelap, pop-up lebar dan interaktif, bagikan berupa ikon saja.
- Angka: format id-ID (titik ribuan, koma desimal, paling banyak 1 desimal), satuan tertulis, tiap angka punya sumber dan waktu, probabilitas dibulatkan kasar atau jadi kelas, "hipotesis" atau "belum diuji balik" untuk angka yang belum lulus uji.
- Copy: sapaan "kamu", em dash dilarang, titik tengah (karakter U+00B7) sebagai pemisah dilarang (pakai koma, label, atau baris baru), ikon SVG garis, tanpa emoji, satu baris satu temuan dengan angka di depan, tidak pernah menulis "perkiraan satelit". "Titik panas" untuk data satelit; "provinsi yang sering mengalami karhutla".
- Data yang tidak ada dibuang, bukan ditampilkan kosong (A18). Fitur yang disembunyikan dicatat di ledger, dibuat di kode, dan disembunyikan lewat `tab_sembunyi` atau CSS (A24).
- Interaksi: klik tidak membekukan layar; chrome kontrol di-set langsung, kerja berat lewat `nanti()` (`~/.claude/INP.md`).

Gerbang mekanis yang sudah ada: `gerbang-inti` (blok CSS 90+ karakter atau fungsi JS 200+ karakter yang identik di dua berkas diblok), `gerbang-bencana`, `gerbang-tab-registry`, `peluang-inti`, `laporan-inti`. Belum ada gerbang untuk token (hex mentah), skala jarak, atau kemiripan dekat.

### 3.2 CELAH: belum distandarkan atau berbeda antar halaman

| Kode | Celah | Bukti (jalur nyata) | Dampak |
| --- | --- | --- | --- |
| G1 | Pil/eyebrow/label punya lima wujud dan empat salinan CSS per ID | `.ex-ey` didefinisikan terpisah per ID di `inti/insight.css:21`, `inti/tren.css:23`, `inti/berita.css:8`, `inti/dampak.css:8`, dan tiga kali di `index.html:753,872`; `.pill` (`inti/peta.css:80`), `.br-lb` (`inti/berita.css:158`, `index.html:1282`), `.pl` (`inti/cerita.css`), `Kartu.pil` SVG | Satu perubahan pil harus dilakukan 8 kali; gerbang tidak menangkap karena selektor berbeda |
| G2 | Rujukan (karhutla) tidak memakai berkas tema bersama | `index.html` memuat 0 dari `tema.css`, `gaya.css`, `insight.css`, `tren.css`, `dampak.css`, `peta.css`, `berita.css`, `lapis.css`; token dobel di `index.html:39-60` | Perubahan token di `inti/tema.css` tidak sampai ke karhutla; dua sumber kebenaran |
| G3 | Tiga "merah", dua "abu normal", dua skala tingkat | Merah akses `--bad` `oklch(57% .21 27)`, merah tingkat `#d64545` (`bencana.json`), merah grafik `#c9503a` (hard-coded); tingkat 0 abu `#9aa4b2` di registry tetapi hijau `--f0` di CSS | Peta, grafik, dan pil untuk "Awas" tidak persis sama warna |
| G4 | Warna hex mentah di mana-mana, tanpa token palet grafik | Hex 6 digit: `index.html` 689 kali, `banjir/` 376, `cuaca/` 200, `kekeringan/` 187, `gunungapi/` 171, `gempa/` 158, `udara/` 93; `inti/*.css` hanya 49. Palet grafik hanya sebagai `--mt-*` terbatas di `#metode` (`index.html:1051`) | Tiap bencana memilih warna grafik sendiri; sulit mengganti tema |
| G5 | Kunci tema berbeda | `pk-tema` di `index.html:1801` dan `inti/laporan.js:151`; `pb-tema` di `banjir/index.html:229`, `gempa/dasar.js:10`, enam halaman lain | Mengganti tema di karhutla tidak terbawa ke banjir |
| G6 | Tab Berita, Tren, Dampak, Metode ditulis ulang per bencana, dan gerbang salinan tidak menangkap | `berita.js` mirip 80 sampai 85% di cuaca, udara, gunung api, kekeringan; `gerbang-inti` hanya memeriksa `function nama(){}` dan blok CSS identik, bukan `const X = {...}` | Anatomi tab menyimpang diam-diam |
| G7 | Anatomi laci tidak sama | K dan gunung api: `details.lipat` + `.kv` tanpa wadah; gempa: `.lc-sek` + `.kpi` berkepala navy (`gempa/laci.js:7`, `inti/peta.css:11-12`); cuaca, udara, kekeringan: `.kpi`; udara menulis jiwa per kategori sebagai teks bertitik tengah (`udara/peta.js:86-92`) | Pemilik melarang kotak KPI berkepala navy; laci gempa tetap memakainya |
| G8 | Helper dasar disalin padahal modulnya ada | `inti/nanti.js` dimuat di 0 halaman (K=0 dan 6 bencana=0), `nanti` didefinisikan ulang di 20 berkas (sebagian definisi lokal) (`index.html`, `banjir/index.html`, `gempa/dasar.js`, `cuaca/cuaca.js`, `udara/app.js`, `gunungapi/app.js`, `kekeringan/app.js`, dst.); `toast` di 11 berkas; `muatJSON` di 9; `namaProv` di 19 | Perbaikan INP harus dibuat berkali-kali |
| G9 | Pustaka pipeline "umum" ternyata masih `banjir/umum.py` | `scripts/umum/` hanya memuat 19 berkas; `status.py`, `posko.py`, `riwayat.py`, `prospektif.py`, `uji_balik.py`, `wilayah.py` yang dijanjikan `PAKET-FITUR.md` tetap di `scripts/banjir/`; skrip kekeringan menyisipkan `sys.path` ke `banjir` 13 kali (`from umum` ambigu) | Modul bergantung pada folder bencana tertentu |
| G10 | Titik putus responsif tidak seragam | `index.html` memakai 900, 700, 640, 600, 560, 760 px; `inti/peta.css` 900; `inti/gaya.css` 1500, 1340, 1280, 640; `inti/insight.css` 1000, 900, 700, 640 | Tata letak ponsel beda antar komponen |
| G11 | Tidak ada token jarak dan ukuran huruf | Jarak `gap` 6, 8, 10, 14, 16, 18, 22, 24 px ditulis langsung; huruf 9, 9.5, 10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14.5 px | Skala tidak konsisten |
| G12 | Menu bencana hanya membuka karhutla dan banjir | `inti/kepala.js:23` `TAMPIL = {karhutla, banjir}`; lima bencana `aktif` di registry tampil "Soon" | Pengguna tidak menemukan lima bencana dari menu |
| G13 | Pop-up Situasi berbagi kunci antar bencana | `inti/sapa.js:1-2` dan `banjir/sapa_banjir.js:1-3`: kunci `pb_sapa` dipakai bersama K dan banjir | Melihat pop-up banjir hari ini menyembunyikan pop-up karhutla hari ini |
| G14 | Alarm tidak mengenal tiga bencana | `inti/alarm.js:9` `RUTE` tanpa udara, gunung api, kekeringan; PARITAS-GUNUNGAPI (19 Okt, belum dicek ulang) mencatat `gunungapi_ubah` belum dibaca di `src/gunungapi.js:73` | Alarm untuk tiga bencana tidak membuka halaman yang benar |
| G15 | Pelanggaran aturan copy masih banyak | Kemunculan titik tengah sebagai pemisah di kode: `index.html` 232, `banjir/` 169, `gunungapi/` 29, `cuaca/` 27, `gempa/` 23, `kekeringan/` 19, `udara/` 18, `inti/` 12 (sebagian komentar, sebagian teks tampil seperti label tab Nowcast di `cuaca/peta.js:143`); `toFixed(` 37 kali di folder bencana; em dash praktis nol (1 di `index.html`) | Aturan pemilik (tanpa titik tengah) belum dijaga gerbang |
| G16 | Data lintas bencana menumpang di `public/banjir/data/` | Banyak `../banjir/data/` di `cuaca/*.js` 27 kali, `gunungapi/*.js` 16, `gempa/*.js` 8, `kekeringan/*.js` 6, `udara/*.js` 5; `public/cuaca/data/` kosong | Nama jalur menyesatkan; sulit mencolok bencana baru |
| G17 | Dua dunia huruf | Layar memakai Inter dan Plus Jakarta Sans (`tema.css:10`); PPT dan laporan memakai Roboto (`inti/roboto.js`, memori `ppt-keputusan-selera`) | Wajar, tetapi belum tertulis sebagai keputusan di satu tempat |

## 4. Sepuluh pekerjaan prioritas menuju paritas penuh

Urut menurut dampak (jumlah halaman yang tersentuh dikali risiko menyimpang). Tiap butir mengikuti aturan repo: pengerja pemilik dari `ilmu.mjs pemilik`, pemeriksa bukan pengerja yang sama, tanpa mengurangi tampilan karhutla (sebelum/sesudah dengan tangkapan layar).

| Urut | Pekerjaan | Modul | Hasil yang diukur | Pengerja yang cocok |
| --- | --- | --- | --- | --- |
| 1 | Pasang token dan gaya bersama di karhutla: ganti blok `<style>` token di `index.html:39-60` dengan `inti/tema.css`, `gaya.css`, `insight.css`, `tren.css`, `dampak.css`, `peta.css`, `lapis.css`; hapus salinan inline satu per satu. Samakan kunci tema `pk-tema` dan `pb-tema` (G2, G5). | M03, M04, M09 sampai M11, M16, M19, M20 | `index.html` tidak lagi berisi token; nol salinan inline `.ubin`/`.ub-th` | `layar-peta` lalu `inti-layar` |
| 2 | Bangun `inti/laci.js` (cangkang laci) dan registri bagian: kepala, aksi, `lipat`, `.kv`, dialog HP; pindahkan K, gempa, cuaca, udara, banjir, gunung api. Hapus `.kpi` navy dari laci (G7). Beri kekeringan laci. | M29 sampai M37 | Satu `Laci.buka`; 7 halaman memakai; `tests/agen` memeriksa tidak ada `const Laci` selain di inti | `inti-layar` |
| 3 | Jadikan bagian laci "Peluang dan prakiraan" dan "Model terlatih" kontrak: `peluang/1` (sudah ada) dan `model/1` baru (peluang per sel, selang P10/P90, uji balik) supaya `sebaran_model.js` bukan lagi satu-satunya. | M33, M35, M21 | Dua bagian laci dibaca dari JSON kontrak | `model-sebaran` + `inti-layar`, diperiksa `validasi-model` |
| 4 | Bangun `inti/berita.js` (tab Berita) dari `banjir/berita.js`, ganti enam salinan; tambah `gerbang-inti` untuk kemiripan `const X = {...}` (G6). | M25 | Enam file `berita.js` menjadi adaptor ≤ 40 baris; gerbang baru hijau | `inti-layar`, `penulis-gerbang` |
| 5 | Bangun `inti/tren.js` dan `inti/dampak.js` (bingkai kartu, pemilih provinsi, kalender musim, bagian dampak berbasis `Kartu.hbar`), isi per bencana lewat adaptor. | M26, M27, M28 | `const Tren`/`const Dampak` tersisa hanya di inti | `inti-layar` |
| 6 | Pasang `inti/nanti.js`, `toast`, `muatJSON`, `namaProv` sebagai satu `inti/dasar.js` yang dimuat semua halaman; hapus salinan `nanti` (20), `toast` (11), `muatJSON` (9), `namaProv` (19) (G8). | M-dasar (di luar daftar), menyentuh semua | Satu definisi per helper; `gerbang-inti` menolak definisi ulang | `inti-layar`, `inp-reviewer` |
| 7 | Satukan komponen pil/eyebrow: satu `.pil` dan satu `.ex-ey` tanpa selektor ID; token palet grafik (`--g1` sampai `--g8`) dan token jarak/huruf (`--sp-*`, `--fs-*`); ganti hex mentah bertahap mulai dari `inti/*.css` (G1, G3, G4, G11). | M19 + design system | Hex di `inti/*.css` turun dari 49 ke ≤ 5; tiga merah menjadi satu | `layar-peta` |
| 8 | Tulis `docs/multi-bencana/DESIGN-SYSTEM.md` dan halaman `/gaya` (katalog komponen hidup dari `inti/**`), memindahkan butir 3.1 dan 3.2 dokumen ini jadi sumber tunggal; jadikan aturan A1 sampai A25 gerbang (larang titik tengah di teks tampil, `toFixed` mentah, em dash) (G15). | Seluruh bagian 3 | Satu dokumen dan satu halaman; gerbang copy di `uji:agen` | `penulis-gerbang`, `selera-angka` |
| 9 | Naikkan pustaka pipeline: pindahkan `status.py`, `posko.py`, `riwayat.py`, `prospektif.py`, `uji_balik.py`, `wilayah.py`, `umum.py` dari `scripts/banjir/` ke `scripts/umum/`, ubah impor lima bencana; pindahkan data lintas bencana dari `public/banjir/data/` ke `public/umum/data/` dengan alias (G9, G16). | M50 sampai M53 | `from banjir` nol di luar folder banjir | `pipa-umum` |
| 10 | Tutup celah perilaku halaman: buka menu untuk semua bencana `aktif` (G12), kunci `pb_sapa_<id>` per bencana (G13), rute alarm untuk udara, gunung api, kekeringan (G14), pasang `cari.js`, `databaru.js`, `nasa.js` di bencana yang belum (M07, M08, M13), laci kekeringan dan Kejadian D (M29, M40). | M01, M07, M08, M13, M38, M39, M40 | Matriks bagian 2 tanpa sel "-" pada modul yang relevan | pengerja pemilik tiap bencana |

Catatan urutan: butir 1 dan 2 harus selesai sebelum butir 3, 4, 5 supaya modul baru lahir di atas token yang sama. Butir 6 dan 7 bisa paralel dengan butir 4 karena menyentuh berkas berbeda (pakai `isolation: "worktree"` bila menulis, §3.3 `AGENTS.md`). Butir 8 boleh dimulai kapan saja dan memberi gerbang untuk sisanya.

## 5. Cara pakai katalog untuk bencana baru

1. Daftarkan di `public/bencana.json` (M49), jalankan generator, biarkan `gerbang-bencana` mengarahkan.
2. Muat M03, M05, M06, M01, M16, M17, M18, M20, M21, M24, M47, M48 apa adanya; itu "paket wajib" yang sudah B di enam bencana.
3. Pasang M09, M10, M11, M12, M13 dari `inti/peta/`; tulis hanya daftar ubin dan data.
4. Tulis adaptor untuk M22, M38, M43 (tiga baris sampai 40 baris).
5. Sisanya (laci, Berita, Tren, Dampak, Metode, Kejadian, Simulasi) diperlakukan sebagai C: tunggu modul bersama dari butir 2, 4, 5 di bagian 4, atau tulis dengan anatomi yang sama persis dengan karhutla dan catat sebagai hutang di sini.
6. Tambahkan baris ke matriks bagian 2 dengan bukti grep.
