# Peta: cetak biru karhutla dan cara menirunya per bencana

Dipetakan dari kode 16 Okt 2026 (`public/index.html`, `public/lapisan5.js`, `public/databaru.js`,
`public/foto.js`, `public/i18n.js`, `public/banjir/index.html`). Nomor baris merujuk pohon kerja saat itu.

Prinsip pemilik yang berlaku (Buku Pegangan Utama bab 24 "Peta dan wilayah", bab 3 "Tiru layar X
berarti tiru modelnya"): **tiru modelnya, bukan satu detail yang paling gampang**. Sebelum menyentuh
kode peta bencana baru, tulis daftar perbedaan lengkap antara peta karhutla dan peta bencana itu,
lalu kerjakan semuanya sekaligus.

## 1. Kondisi sekarang

- Peta karhutla adalah satu skrip inline besar di `public/index.html` dengan objek global `Peta`
  (`:1771`), `Lapis` (`:2002`), `Angin` (`:2130`), `Kini` (`:2205`), `Laci` (`:2637`), `Riwayat`
  (`:3059`), `Sim` (`:5832`) dan fungsi `renderLegenda`, `garisWaktu`, `nanti`, `kartuTip`,
  `tampilTip`, `muatJSON`, `gradasi`, `gambarGrid`.
- Modul tambahan (`lapisan5.js`, `databaru.js`, `foto.js`, `citra.js`, `konsesi.js`, dst.) dimuat
  sesudahnya dan **membungkus** fungsi inti (`renderLegenda`, `Laci.buka`, `Sim.*`), tidak
  menyuntingnya. Pola ini dipertahankan.
- `public/banjir/index.html` menyalin sekitar 60% inti peta dengan tangan dan sudah menyimpang:
  padding tetap 430 (bukan diukur), tanpa kartu hover, tanpa gelembung prioritas, tanpa muat
  malas lapisan, tanpa ubin lapisan, tanpa naik tingkat otomatis saat zoom keluar, tanpa batas
  ambang legenda. **Ini bukti kenapa inti peta harus jadi satu rumah sebelum bencana ketiga.**

## 2. Arsitektur target: `public/inti/peta/`

Dipecah dari karhutla dengan pola strangler (FASE-0 tahap D5). Tiap berkas satu tanggung jawab,
API-nya dibaca semua bencana.

| Berkas | Isi (asal di karhutla) | API |
| --- | --- | --- |
| `dasar.js` | `DASAR()` OpenFreeMap positron/dark (`:1770`), opsi peta (`:1773-1777`): center/zoom per registri, minZoom 3, maxZoom 15, tanpa rotasi, Navigation + Scale kanan bawah, laju zoom roda (`:1945`), `BB_ID` + `petaIndonesia()` + `padRuang()` (`:2176-2180`), `gantiDasar()` dengan `setStyle(..., {diff:false})` (`:1783`) yang memicu `style.load` lalu `pasang()` ulang, raster satelit Esri (`:1789-1791`), `lapisAwal()` (`:1784`) | `buatPeta(el, opsi)`, `gantiDasar()`, `bingkaiIndonesia()`, `padRuang()` |
| `wilayah.js` | Choropleth 3 tingkat (`aturWilayah` `:1913-1929`): geometri `geo/provinsi.json` + `geo/{kabupaten,kecamatan}/{prov}.json` dimuat saat perlu dan dimemo; nilai ditulis ke **properties** (`v`, `lv`), feature-state hanya untuk hover (`promoteId:"id"`); turun tingkat lewat popup Zoom/Rincian (`pilihWilayah` `:2183`, `turun` `:2200`), naik tingkat otomatis saat zoom keluar (`:1949-1951`), remah roti (`renderCrumb` `:2233`) | `pasangWilayah({nilai(kunci), skala, warnaLv})`, `turun(kunci)`, `naik()` |
| `kartu.js` | `kartuTip` (`:1609-1611`) kartu hover berlambang, ubin angka, daftar, tren, kaki; `tampilTip` (`:1619`), `wadahTip` (pindah ke `<dialog>` aktif); HTML dibangun ulang hanya bila id berubah | `kartuTip(spec)`, `tampilTip(e, html)` |
| `gelembung.js` | Dua pola: (a) **klaster MapLibre** untuk kejadian prioritas (`:1823-1835`): `cluster:true`, `clusterRadius 38`, `clusterMaxZoom 7`, hover `getClusterLeaves(id,8)` dicache, klik `fitBounds` ke daun; (b) **gelembung bertabrakan** untuk peringkat (`riw-bubble` `:3093-3101`): gambar kanvas `rb0..rb3`, `symbol-sort-key: 100 - skor`, overlap bawaan false sehingga angka tidak pernah bertumpuk, nama lapis terpisah `text-optional` | `pasangKlaster(id, data, spec)`, `pasangGelembungSkor(id, data, spec)` |
| `lapis.js` | Panel `#lapis` (`:1515-1545`): `<details>` per kelompok, `<label><input data-l>`; ubin (`ubinLapis` `:2509-2515`, `UBIN`, `UBIN_IK`, `UBIN_PENDEK`) + `MutationObserver`; handler change (`:2521-2532`) dengan muat malas lewat `nanti(() => pasang(k))`, saling-kecuali (asap/pm10); **visibilitas tidak disimpan**; cara modul menambah kelompok (`lapisan5.js:27-35, 150-159`): `sisipKotak`, listener fase capture yang mengklaim kuncinya, `pasangSatu` malas, pasang ulang di `style.load` | `daftarLapis({kelompok, kunci, nama, ikon, pasang, lihat, legenda})` |
| `legenda.js` | `renderLegenda` (`:2561-2605`): hanya lapisan yang menyala **dan** terlihat di zoom sekarang; skala kontinu dari `gradasi`; kolom `.lg-g`; tinggi bisa ditarik; tertutup di HP; dirender ulang hanya saat zoom melewati `AMBANG` (`:1946`) | `daftarLegenda(kunci, fnHtml, ambangZoom)` |
| `waktu.js` | Dua pemilih terpisah (`:1509`): `#rentang` untuk pengamatan yang sudah terjadi (`RENTANG` `:2477-2488`, label relatif, disimpan `localStorage`), `#garisWaktu` untuk hari prakiraan (`:2545-2560`, muncul hanya bila lapisan prakiraan menyala, `updateImage`/`setData` per hari) | `pasangRentang(pilihan, onUbah)`, `pasangGarisWaktu(hari, onUbah)` |
| `kisi.js` | Lapisan kisi sebagai `image` source dari kanvas (`fwiGambar` `:1885`, `gambarGrid` `:2095`, `gambarAsap` dengan tepi berbulu `:2113`), permukaan kepadatan `Kini` (`:2205-2230`: kisi 0,1°, dua box blur 3×3, warna log, upscale ×3 blur 2px) | `gambarKisi(sel, skala, opsi)`, `permukaanKepadatan(titik)` |
| `angin.js` | `Angin` (`:2130-2173`): kanvas partikel 3.500 (1.500 di HP), umur 110 frame, jejak `destination-in` 0,93, bilinear `di()`, bersih di `movestart`, putih saat gelap/satelit, cadangan panah statis untuk `prefers-reduced-motion` | `pasangAngin(medanUV)` |
| `laci.js` | `Laci.buka(id)` (`:2638-2699`): buka tab peta, `<details class="lipat">` per bagian, sorot garis kejadian, `fitBounds` berpadding panel, pindah ke `#dlgLaci` saat dari tab lain, tautan `/<rute>/k/<id>` | `pasangLaci({bagian[], sorot, bingkai})` |
| `klik.js` | Satu handler klik global berprioritas (`:1974-1990`): klaster → kejadian (kotak ±6px) → posko → titik (zoom ≥ 8) → lapisan ber-handler sendiri → wilayah; modul memakai `klikSekali` (`lapisan5.js:132-135`) | `daftarKlik(prioritas, lapisanIds, fn)` |
| `foto.js` | Sudah bersama (`public/foto.js:117-150`): penanda HTML berkelompok menurut zoom (prov < 6,2, kab < 8,6, kec < 11,2), maks 160, `bounds.pad(.2)`, debounce 120 ms | sudah ada; tambah `?bahaya=` |
| `sim.js` | Peta kedua `#simPeta` (`:5835-5845`) dengan `DASAR()` sama, gambar hasil sebagai `image` `raster-resampling: nearest`, penggeser waktu `updateImage`, desa memerah lewat `case eta <= t`. Mesin fisikanya khas karhutla dan TIDAK masuk inti | `buatPetaSim(el)`, `gambarHasil(kanvas, bbox)` |

Aturan inti yang dibawa semua bencana:

- `nanti(fn)` (`:1599-1600`) untuk semua kerja berat sesudah klik (INP).
- `setData` / `updateImage` dibanding membuang-pasang ulang.
- Muatan bertingkat: data 24 jam dulu, 72 jam/7 hari saat diminta; atribut kejadian dulu, poligon belakangan.
- `style.load`, bukan `load`; warna bergantung tema dipanggang saat `addLayer`, karena itu pasang ulang penuh saat tema berganti.
- i18n kontrol peta otomatis lewat `i18n.js:131-142` asalkan `i18n.js` dimuat sebelum MapLibre.
- Tiap `fitBounds` memakai padding terukur (`kiriPad` `:2195`, `padRuang`) dan batas maxZoom per jenis (wilayah 11, kecamatan 12, kejadian 12,5, klaster 9,5).
- Dari Buku Pegangan Utama bab 24 (berlaku walau MBG memakai Leaflet): peta menjawab sebaran
  nasional, tidak disaring cakupan kursi; jenis dibedakan bentuk, bukan dua warna; satu warna untuk
  semua entitas sejenis (tingkat jadi lencana di popup, bukan warna pin); titik tanpa koordinat ikut
  tabel tetapi tidak digambar; legenda di kaki peta, entrinya diturunkan dari daftar yang dipakai;
  popup dua kolom tanpa baris kedua dan tanpa teks terpotong; aksi di popup dititipkan lewat
  `closest('[data-aksi]')`; ubin cadangan bertukar sesudah beberapa kegagalan, bukan satu; berkas
  `geo/*.json` tidak pernah dijaga login; kegagalan satu lapis tidak menghapus seluruh peta.

## 3. Peta per bencana

Semua bencana memakai inti di atas. Tabel ini adalah daftar perbedaan yang wajib ditulis sebelum
kode (aturan "tiru modelnya").

| Komponen peta | Karhutla (rujukan) | Gempa & tsunami | Cuaca + gelombang | Udara | Gunung api | Kekeringan | Banjir (naik kelas) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Lapisan pengamatan | `titik` warna menurut umur jam | `gempa` lingkaran ukuran M (log), warna kedalaman (dangkal merah, menengah oranye, dalam biru); susulan titik kecil; umur memudar 24/72 jam | poligon CAP BMKG (warna dan kata asli BMKG) | stasiun terukur (titik bercincin) | gunung berikon segitiga, warna level PVMBG resmi | — (data area, bukan titik) | sungai GloFAS, gauge rob |
| Kejadian aktif | kompleks api, poligon + titik pusat + klaster prioritas | isoseismal bertingkat (poligon MMI), titik episentrum bintang | sel ekstrem (poligon gabungan kecamatan), lintasan siklon (garis + kerucut) | poligon episode | radius rekomendasi (lingkaran km), KRB I/II/III, kerucut abu | poligon kompleks kekeringan | poligon kejadian banjir `B` |
| Klaster prioritas | `prio` klaster MapLibre | gempa ≥ M5 72 jam diklaster bila bertumpuk (Sulawesi/Maluku padat) | CAP Awas | kota Berbahaya | gunung Level III–IV | kompleks Awas | kejadian Awas |
| Choropleth wilayah | jumlah titik (step `SKALA_WIL`) | tingkat Pantau Bencana 72 jam (`match lv`) | tingkat (`match lv`) | ISPU 24 jam perkiraan (`step`) | turunan level resmi (kecamatan dalam radius/KRB) | kelas HTH/SPI | tingkat status (sudah ada) |
| Kisi kontinu | FWI, asap, PM10, hujan (`image`) | perkiraan MMI kisi (`image`) | embusan, CAPE, hujan per jam, tinggi gelombang | PM2,5, PM10, CO, AOD, debu | angin 700/500/300 hPa | HTH, SPI-1/3/6, kelembapan tanah | hujan, ansambel |
| Partikel angin | `Angin` dari `fwi.json` | — | ya, embusan | ya, 850 hPa (arah asap) | ya, lapisan atas | — | ya (sudah dari `databaru.js`) |
| Gelembung peringkat | `riw-bubble` skor riwayat | skor riwayat gempa | skor riwayat puting beliung | skor episode | skor riwayat letusan | skor riwayat kekeringan | sudah ada |
| Garis waktu prakiraan | 4 hari FWI | 7 hari peluang susulan | 72 jam per jam | 4 hari CAMS | 72 jam angin | 1–3 bulan prospek | 6 hari hujan |
| Rentang pengamatan | hari ini / kemarin / 72 jam / 7 hari | 24 jam / 72 jam / 7 hari / 30 hari | aktif / 24 jam / 7 hari | hari ini / 7 hari / 30 hari | 24 jam / 7 hari / 30 hari | 30 / 90 / 180 hari | hari ini / 7 hari |
| Lapisan statis | gambut, kawasan, konsesi, kanal, jalan | sesar aktif, InaRISK gempa & tsunami, zona subduksi | InaRISK cuaca, pelabuhan, alur pelayaran | kawasan industri, PLTU (bila data terbuka) | KRB, desa, jalur evakuasi, bandara | waduk, sawah, InaRISK kekeringan | sudah ada |
| Lintas modul | — | — | — | kompleks api karhutla (tautan `/k/K…`) | — | titik panas karhutla | — |
| Simulasi | FBP + Dijkstra 72 jam | isoseismal "bagaimana kalau" (titik + M + kedalaman) | T (diganti grafik per titik) | geser arah angin | kerucut abu dengan tinggi kolom pilihan | hujan X mm dalam 30 hari | sudah ada (aturan status) |
| Klik prioritas | klaster → kompleks → posko → titik → wilayah | klaster → gempa → isoseismal → posko → wilayah | CAP → sel → wilayah | episode → stasiun → wilayah | gunung → kerucut → wilayah | kompleks → wilayah | kejadian → sungai → rob → wilayah |
| Status resmi di peta | — | pita tsunami BMKG/PTWC di atas peta | poligon CAP berlabel BMKG | stasiun KLHK bila pulih | warna level PVMBG apa adanya | buletin BMKG bila bisa dipanen | peringatan BMKG |

## 4. Gerbang peta

| Gerbang | Menolak |
| --- | --- |
| `tests/agen/gerbang-inti-peta.test.mjs` | Definisi ulang tingkat atas fungsi yang sudah ada di `public/inti/peta/*` (ratchet untuk karhutla/banjir, nol untuk bencana baru) |
| idem | Lapisan yang menyala tanpa entri legenda; glif popup tanpa entri legenda tingkat titik |
| idem | `setStyle` tanpa `{diff:false}`; `fitBounds` tanpa padding terukur atau tanpa maxZoom |
| idem | Saringan cakupan kursi di berkas peta (peta menjawab sebaran nasional) |
| `tests/agen/gerbang-geo.test.mjs` | Kode wilayah tanpa berkas geo, berkas geo kosong, berkas provinsi > 700 KB (naikkan penyederhanaan, bukan ambang) |
| `inp-reviewer` (pemeriksa) | Handler klik/geser peta yang tidak lewat `nanti()` |
