# Audit paritas karhutla vs banjir (read-only)

Snapshot: 16 Okt 2026 sekitar 13.10 sampai 13.30 WIB, server localhost:8788 (checkout utama), Chrome headless via Playwright, 1440x900 dan 390x844, bahasa ID (sebagian ?lang=en). Berkas banjir sedang disunting agen lain selama audit (mis. `BASI_TAMPIL=false` dan `.dok` legenda muncul di tengah audit); semua temuan di bawah diukur ulang pada snapshot akhir. Tangkapan berdampingan: karhutla KIRI, banjir KANAN, pemisah magenta, di folder yang sama: `sbs-<permukaan>-<lebar>.png`.

Keterangan tingkat: W = wajib-sama, D = beda-data-sah. Kolom "banjir ubah" = berkas di `public/banjir/` atau `public/inti/`; "pola karhutla" = tempat polanya.

Ringkasan: 50 selisih (sekitar 46 W, sisanya D/info). Tidak ada scroll horizontal di kedua sisi (scrollWidth = clientWidth di semua 16 halaman).

## 1. Kepala (4)

| # | Karhutla | Banjir | Tingkat | Banjir ubah / pola |
| --- | --- | --- | --- | --- |
| K1 | Tab: Peta, Insight, Berita, Tren, Dampak, Simulasi, Foto, Tentang (8) | Peta, Insight, Tren, Simulasi, Tentang (5). `/banjir/berita|dampak|foto` jatuh ke Peta | W | `banjir/index.html:186` `TAB_SEMBUNYI`, `bencana.json` banjir.tab_sembunyi; pola `index.html` TABS |
| K2 | nav `#tabs` 846px lebar, jarak antar tombol ~7px | nav 898px, jarak 68px (`justify-content:space-evenly` + flex:1, max-width 980 di `gaya.css:42`, hanya 5 tombol) | W (hilang sendiri bila K1 beres) | `banjir/gaya.css:42` |
| K3 | Menu bencana (`.menu`) 330px: Karhutla + 4 baris "SEGERA", tanpa "Tentang kami" | 250px: Karhutla, Banjir, garis, "Tentang kami", tanpa "Segera" (`data-tentang data-tanpa-segera` di `banjir/index.html` ~baris 60) | W | `banjir/index.html` atribut `<details class="bencana">`; `inti/kepala.js` |
| K4 | Chip "El Niño sangat kuat" (`.l5-iklim`, 139x24) di sebelah kiri tombol bagikan | tidak ada | D (bisa chip ENSO/La Niña bila pemilik mau) | `lapisan5.js` hanya karhutla |

Sama persis: logo 30x30, ikon tab (path SVG identik), padding tab 8/16, tab aktif bg putih 16%, toggle ID/EN 72x28, tombol bagikan 34x34, tema, burger 34x34 di 390, isi menu burger 44,5px per butir. Garis aktif: kedua sisi tanpa garis bawah (pil tembus).

## 2. Peta (23)

Tangkapan: `sbs-peta-1440.png`, `sbs-peta-390.png`, `sbs-menubencana.png`, `sbs-bagikan.png`.

| # | Karhutla | Banjir | Tingkat | Banjir ubah / pola |
| --- | --- | --- | --- | --- |
| P1 | Peta dasar default citra satelit Esri (tile Satelit tercentang) | Peta dasar terang (positron), Satelit tak tercentang | W | `banjir/peta.js` init gaya; pola `index.html` lapis Satelit |
| P2 | Kamera awal memusat Indonesia (Papua penuh) | Kamera bergeser/zoom lain, Papua terpotong, label "Papua New Guinea" besar | W | `banjir/peta.js` fitBounds/center awal |
| P3 | Panel kiri 440px lebar | 400px | W | `banjir/peta.css`, `--lp` |
| P4 | Crumb: pil gelap "Indonesia" (bg ink, putih, 12,5/700, radius 999, 33px) DI LUAR kartu (y70), kartu mulai y113 | Crumb tautan biru 12,5/600 di DALAM kartu (y127), kartu mulai y70 | W | `banjir/index.html` `#crumb` pindah ke `<nav class="crumb">` di atas `.card.list` |
| P5 | Atas panel: seg 3 arah (Real Time/Riwayat/Kompleks, 410x36), kolom cari, baris chip rentang (3 hari ... 3 bulan) | seg 2 arah (Banjir/Longsor), crumb, cari, lalu kotak angka "Banjir · Sel, 13 Okt · kecamatan" 0/0/99 (102px) | W (kotak angka tak ada di karhutla; seg isi boleh D) | `banjir/index.html` `.top`, `#rows .ringkas` |
| P6 | Kepala tabel gelap: bg oklch(.255 .075 256), teks putih, 9,5/800 kapital, radius 8px 8px 0 0, sticky | Kepala putih, teks abu, radius 8px | W | `banjir/tabel.css` `.tb.kepala`; pola `index.html` `.tb.kepala` |
| P7 | Kepala kolom bisa diurut (indikator "KOMP. •") | span biasa, tak bisa diurut | W | `banjir/peta.js` render `#rows`; pola `Tabel` karhutla |
| P8 | Grid 6 kolom (18px, 2,6fr, ...) termasuk Tren sparkline | 5 kolom (20px, 1fr, 46, 46, 78), tanpa Tren | D untuk jumlah kolom; W untuk lebar/pola. Kolom Tren butuh `seri_status.json` (404) | `banjir/peta.js` |
| P9 | Tinggi baris 30px semua | 30px untuk 10 baris pertama, 27px untuk baris Normal | W | `banjir/tabel.css` |
| P10 | Pil status di tiap baris | Pil hanya baris Waspada ke atas, Normal teks abu polos | W | `banjir/peta.js` render baris |
| P11 | Kolom kanan 280px | 250px | W | `banjir/peta.css` `.tools` |
| P12 | Kolom kanan atas: 2 kartu putih (`#rentangKartu`, `#garisWaktu` "Prakiraan cuaca (siang)") 280x73 / 280x71, label 10,5/800 di atas seg | Tidak ada; hari prakiraan ada di kartu bawah tengah "Hari" 620x54 (label inline kiri) | W | `banjir/index.html` `#garisWaktu` pindah ke `.tools`; pola `index.html` `#rentangKartu` |
| P13 | Tidak ada seg mode di kolom kanan (mode ada di panel kiri) | Seg "Status/Hujan/Sungai/Rob/Riwayat" 250px berisi 5 tombol selebar 311px: "Riwayat" TERPOTONG ("Ri") di 1440 | W (bug dan beda pola) | `banjir/index.html` `#modePeta`; pindah ke seg panel kiri |
| P14 | Kotak Overlay: kepala gelap "OVERLAY" (`.lapis-hd`, 10,5/800, putih, bg ink, radius 13 13 0 0) + tombol lipat kanan | Label "OVERLAY" abu 10,5/800 polos, tanpa tombol lipat | W | `inti/peta/lapis.css/js`; pola `.lapis-hd` di `index.html` |
| P15 | Judul grup: teks ink 11,5/800 sentence-case + chevron kanan (Api & respons, Cuaca & asap, ...) | Judul grup = bar gelap (bg #0b2545, putih, kapital 10,5/700, radius 8px), tanpa chevron | W | `inti/peta/lapis.css`; `banjir/index.html` `<details open><summary>` |
| P16 | Tidak ada chip peringatan terpisah | Chip "BMKG: 8 gelombang tinggi" (`details.db-bmkg`) di bawah seg mode | W | `banjir/peta.js`; karhutla mengikuti ubin BMKG di Overlay saja |
| P17 | Legenda dok tengah bawah 567x135: 3 kolom horizontal + 2 chip info (Angin, Citra satelit) | 742x188: 3 kolom + baris skala "Hujan 3 hari puncak" di bawah, dok 742x250 (legenda + kartu hari menumpuk) | W | `inti/peta/legenda.css`, `banjir/peta.js renderLegenda` |
| P18 | Legenda terlipat jadi pil 98x32 di dasar dok (y856) | pil 98x32 melayang di y794, di atas kartu Hari (karena dok berisi kartu Hari) | W (ikut P12) | `banjir/index.html` `#dok` |
| P19 | Laci rincian (`.laci.card`, `#dlgLaci`) ada; klik peta membukanya | tidak ada elemen laci | W | `banjir/peta.js`; pola `index.html` `.laci`, lihat `docs/multi-bencana/PETA.md` |
| P20 | Kartu hover wilayah (`kartuTip`)/gelembung prioritas | tidak ditemukan di DOM; hover peta tidak terpicu di uji (opacity 0 di kedua sisi, TIDAK TERBUKTI) | W (perlu uji manual) | `banjir/peta.js` |
| P21 (390) | Lembar bawah mulai y517, atasnya kartu rentang + pil "Indonesia" gelap melayang di atas lembar | Lembar mulai y483 (lebih tinggi karena kotak angka) | W | `banjir/peta.css` `@media` |
| P22 (390) | Dua kartu (Titik panas, Prakiraan cuaca) tersusun rapi kanan atas, tombol lapis di bawahnya | Seg mode pil melintang di atas; kartu "Hari ini" (y212) TERTIMPA chip BMKG (x560..790) sehingga "Rab, 14 Okt" terpotong | W | `banjir/peta.css` |
| P23 (390) | Chip "LEGENDA ▾" 12px kiri, di y185 | di y185 juga, sama | sama | n/a |

Sama persis: zoom (1401,788, 29x58), skala (y756), tombol Chat Admin (1234,808 144x48, `position:fixed`), pegangan tarik panel (`.tarik`), spanduk "data basi" kini tersembunyi di banjir (`BASI_TAMPIL=false`, `mulai.js`) sama seperti karhutla (`index.html:1663` `if (false && umur > 26)`). Pada pengukuran awal spanduk merah sempat tampil menimpa semua halaman; sudah diperbaiki agen lain.

## 3. Pop-up "Situasi hari ini" (1)

| # | Karhutla | Banjir | Tingkat | Ubah / pola |
| --- | --- | --- | --- | --- |
| S1 | Saat pertama buka (/ dan /peta, sekali sehari, `localStorage pb_sapa`): dialog `.dlg.sp` eyebrow "SITUASI KARHUTLA HARI INI", judul berangka + selisih, chip, daftar provinsi, kaki "Sumber:" + "Lihat peta" | Tidak ada pop-up; `public/banjir/sapa_banjir.js` hanya 2 baris stub | W | `banjir/sapa_banjir.js`; pola `public/sapa.js` (`:55-79`); tangkapan `sbs-sapa-1440.png`, `sbs-sapa-390.png` |

## 4. Insight (3)

Anatomi kartu SAMA (hasil bersama `inti/kartu.js` + `inti/kartu.css`): `.ex` 1180 lebar, border 1px, radius 18, bayangan sama; `.ex-hd` gradien, padding 18/22/14; pil `.ex-ey` 10/800 kapital, padding 3/9, radius 999; judul `.ex-jd` 14,5 dasar, `.hl` 21/700 merah; `.ex-ft` 11,5 abu, padding 10/22/14; jarak antar kartu 16px; tombol bagikan ikon oranye 36 bulat; tooltip `#tip` `tp2-h` bg putih radius 14 pad 9/13 (sama). Judul satu kalimat angka merah, "Sumber:" miring, legenda tengah: sama. Tak ada `.sub/.unit/.fn` di banjir (A1 lolos).

| # | Karhutla | Banjir | Tingkat | Ubah / pola |
| --- | --- | --- | --- | --- |
| I1 | Kontrol seg dimasukkan ke BADAN kartu (di bawah garis kepala) dan pilihan provinsi (`.pc-btn`) di kanan kepala (`.ex-aksi`) | 3 dari 8 kartu menaruh `.ctl` (seg "Banjir/Longsor" + "Hari ini/Rab..." selebar kartu, atau "3 hari/Harian maks/7 hari lalu") DI KEPALA di bawah judul; kepala 137px vs 91px | W | `banjir/insight.js` pembangun kartu (`ctl`), `banjir/insight.css:31`; pola `Insight.ex` di `inti/kartu.js`, `bagikan.js:70` `ex-aksi` |
| I2 (390) | Seg ada di badan kartu, tak melebar keluar | Seg "Banjir/Longsor + Hari ini/Rab, 14 Okt" melebihi lebar kartu, "Kam", "Jum" terpotong | W | `banjir/insight.css` |
| I3 | Grafik aktual; footer sumber | Konsol: 404 `banjir/data/kejadian_aktif_awal.json` setiap buka Insight | W (galat baru) | berkas data hilang atau fetch di `banjir/insight.js` |

Tangkapan: `sbs-insight-1440.png`, `sbs-insight-390.png`, `sbs-tipinsight.png`.

## 5. Tren (4)

| # | Karhutla | Banjir | Tingkat | Ubah / pola |
| --- | --- | --- | --- | --- |
| T1 | Filter atas: seg 2 opsi (MODIS 2002-2026 / VIIRS 2015-2026) | Seg 8 opsi (Banjir ... Semua bencana) selebar halaman; di 390 terpotong/geser ("Cua..." hilang) | D di 1440 (isi), W di 390 | `banjir/tren.js` |
| T2 | Tombol bagikan konsisten di pojok kanan atas kepala kartu | Kartu kedua dan seterusnya (tanpa pilihan provinsi): tombol bagikan MELESET ke luar kartu (x ~1287 -> tepi, y ~10px di atas garis); di 390 setengah keluar kartu | W | `banjir/tren.css`, `bagikan.css:46`, kartu tanpa `.ex-aksi` di `banjir/tren.js` |
| T3 (390) | Pil kategori + select + bagikan satu baris rapi, judul di bawahnya | Select "Indonesia" MENIMPA judul kartu pertama | W | `banjir/tren.css` |
| T4 | Tabel standar (kepala gelap, urut, paginasi) di Tren | tabel `.tb2` bergaya lama (`banjir/tren.js:227`) tanpa kepala gelap/urut | W | pola `Tabel` karhutla; `inti/tabel.js` |
| (galat) | - | 404 `banjir/data/seri_status.json` di Tren (dihitung di bagian 11) | | |

Tangkapan: `sbs-tren-1440.png`, `sbs-tren-390.png`.

## 6. Simulasi (4)

Tangkapan `sbs-sim-1440.png`, `sbs-sim-390.png`.

| # | Karhutla | Banjir | Tingkat | Ubah / pola |
| --- | --- | --- | --- | --- |
| M1 | Peta layar penuh + panel kiri melayang berkartu (judul wilayah, KPI FFMC/ISI/DC, "Skenario yang dibandingkan") | Halaman form biasa dengan h1 "Simulasi skenario", kartu kontrol, kartu "Ringkasan", 4 kotak KPI, peta kecil + kartu "Kecamatan yang berubah status" | W | `banjir/sim.js`; pola `index.html` sim |
| M2 | Tanpa subjudul/penjelas | Subjudul 2 kalimat: "Ubah hujan, tanah, sungai, atau pasang, lalu lihat ... Aturannya sama persis dengan status di peta." (aturan A1) | W | `banjir/sim.js` |
| M3 | Skenario = tombol gelap bertitik warna 2 kolom | Seg/checkbox/input putih biasa | W | `banjir/sim.js` |
| M4 | Slider "Pengaturan skenario" berkartu warna-warni | Tidak ada slider (input angka "Hujan 3 hari ekstrem") | W | `banjir/sim.js` |

## 7. Tentang (0, 1 info)

Iframe `/tentang.html?tertanam=1` dipasang identik; tangkapan sama persis (`sbs-tentang-*.png`). Info: kartu Banjir di tentang masih berlabel "SEGERA" karena `bencana.json` banjir `status:"uji"` (D, ikut status registry).

## 8. Berita, Dampak, Foto (3)

| # | Karhutla | Banjir | Tingkat | Ubah |
| --- | --- | --- | --- | --- |
| B1 | Tab Berita berisi 7.973 berita dst | Tab dan halaman tidak ada; `/banjir/berita` menampilkan Peta (`p-berita` kosong `hidden`) | W | `banjir/berita.js` (2 baris stub), pola `index.html` Berita |
| B2 | Tab Dampak (kualitas udara, penerbangan, ...) | idem (`banjir/dampak.js` stub) | W | pola `public/dampak.js` |
| B3 | Tab Foto + `/api/foto` | idem, `banjir/foto.css` 1 baris, tanpa `foto.js` | W | pola `public/foto.js` |

## 9. Kaki halaman, Chat Admin, dialog bagikan (2)

| # | Karhutla | Banjir | Tingkat | Ubah / pola |
| --- | --- | --- | --- | --- |
| F1 | `kaki.js` memasang `.kaki-situs` di Insight, Berita, Tren, Dampak, Foto | Tidak memuat `kaki.js`, tak ada kaki di halaman mana pun; selain itu `kaki.js` memakai `fetch("data/kontak.json")` relatif (salah dari `/banjir/`) dan tautan `/peta` karhutla | W | `banjir/index.html` tambah `<script src="../kaki.js">`; `kaki.js` HAL dan tautan perlu rute-sadar |
| F2 | Dialog bagikan: template "Grafik Insight" berpratinjau | Template "Grafik Insight" abu-abu tanpa pratinjau (nonaktif) | W | `bagikan.js` cabang `hal==="banjir"` |

Sama persis: Chat Admin (ps-dlg 700x597, isi form identik), struktur dialog bagikan (860x852, tab Gambar/Tautan, templat, Feed/Story/Kotak). Tema gelap berfungsi di keduanya (`html[data-tema]`).

## 10. Mobile 390 (detail di atas)

- Tak ada scroll horizontal. Ukuran sentuh: tombol 22 sampai 29px di kedua sisi (ID/EN 22px, seg 28px): sama-sama di bawah 44px, tidak ada selisih (info).
- Selisih khusus mobile: P21, P22, I2, T1 (390), T3 sudah tercantum.

## 11. Teks, bahasa, galat konsol (9)

| # | Temuan | Tingkat | Berkas |
| --- | --- | --- | --- |
| X1 | `toFixed` dengan titik desimal di teks tampil: `banjir/peta.js:267` ("Sel 0,25° terdekat (lat.toFixed(2), lon.toFixed(2))"), `banjir/tren.js:197`, `banjir/posko.js:118` (koordinat "x.xxx, y.yyy"); `tren.js:227` `.n` sel | W | ganti `fmt`/`mtA` |
| X2 | EN: `FLOODS · SEL, 13 OKT · DISTRICT` tidak diterjemahkan | W | `banjir/index.html`/`peta.js` label ringkas |
| X3 | EN: tombol hari "Rab, 14 Okt, Kam, 15 Okt, Jum, 16 Okt" tetap Indonesia di Peta dan Simulasi | W | `renderHari` di `banjir/index.html`; pola karhutla |
| X4 | EN Insight: "Source: Copernicus GloFAS lewat Open-Meteo, ambang dari data..." sisa Indonesia | W | `banjir/insight.js` kunci i18n |
| X5 | Em dash di teks tampil: 0. "Anda": 0. Tanggal ISO mentah: 0. "Coming Soon": 0 (hanya "Segera" di menu/tentang, ada juga di karhutla) | lolos | - |
| X6 | Subjudul/penjelas berlebih (A1): hanya di Simulasi (M2) | W | - |
| X7 | Konsol banjir: 404 `data/kejadian_aktif_awal.json` (Insight) | W | file data hilang |
| X8 | Konsol banjir: 404 `data/seri_status.json` (Tren) | W | file data hilang |
| X9 | Konsol karhutla (BUKAN selisih, akibat server lokal tanpa data): 404 `data/harian30.json`, `api/titik`, `api/foto/thumb/...`; CSP report-only frame-src untuk iframe Tentang di KEDUA sisi | info | - |

## 15 teratas (urut paling terlihat)

1. K1/B1-B3: tab Berita, Dampak, Foto tidak ada; nav jadi 5 tab (K2: jarak antar tab 68px vs 7px).
2. P1/P2: peta dasar terang + kamera berbeda; karhutla satelit.
3. P12-P16: kolom kanan peta: kartu rentang/hari, seg mode terpotong ("Ri"), Overlay tanpa kepala gelap/tombol lipat, judul grup bar gelap, chip BMKG.
4. F1: kaki halaman tidak ada di semua tab banjir.
5. P6/P7/P9/P10: tabel panel kiri: kepala putih (bukan gelap), tak bisa diurut, baris 27px vs 30px, pil tak konsisten.
6. S1: pop-up Situasi hari ini tidak ada.
7. M1-M4: Simulasi berupa halaman form, bukan peta + panel; subjudul penjelas.
8. P17/P18: legenda 742x188 menumpuk dengan kartu Hari, bukan 567x135.
9. I1/I2: seg Insight di kepala kartu, melebihi lebar di 390.
10. T2/T3: tombol bagikan Tren meleset; select menimpa judul di 390.
11. K3: menu bencana beda isi (Segera vs Tentang kami).
12. P3-P5: panel kiri 400 vs 440, crumb di dalam kartu, kotak angka tambahan.
13. P22/P21: mobile, kartu Hari tertimpa chip BMKG; tinggi lembar beda.
14. P19/P20: laci rincian dan kartu hover tak ada.
15. X1-X4, X7-X8: `toFixed` titik desimal, sisa Indonesia di EN, dua 404 baru.

Skrip dan data mentah: `lib.mjs`, `t*.mjs`, `*.json` di folder yang sama.
