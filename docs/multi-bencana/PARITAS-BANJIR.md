# Paritas karhutla vs banjir: tabel akhir

Audit akhir 16 Okt 2026 (HEAD 02e7568 + perbaikan audit ini), `wrangler dev --local`, Chrome headless via Playwright, 1440x900 dan 390x844, ID dan `?lang=en`. Tangkapan berdampingan (karhutla kiri, banjir kanan) per tab di folder kerja audit. Tidak ada galat konsol milik banjir; yang tersisa (404 favicon situs berita luar, 500 `/api/foto` dan `/api/titik` karena D1 tidak ada di lokal, CSP report-only frame-src Tentang) sama di kedua sisi.

Keterangan: SAMA = identik atau memakai mesin bersama yang sama. D = beda yang sah karena data/bahaya (alasan tertulis). BEDA = selisih yang belum bisa ditutup.

Hasil: 45 SAMA, 11 D, 0 BEDA (Foto kirim dipasang 16 Okt 2026). Status registry tidak diubah.

## Diperbaiki pada audit ini

| Selisih | Perbaikan |
| --- | --- |
| Berita: kartu menempel (jarak 2px vs 18px karhutla `#brEx`) | `inti/berita.css`: `#berita{display:grid;gap:18px}` |
| 390: seg Insight (Banjir/Longsor + Hari) terpotong | `inti/insight.css`: dua seg turun baris, tombol rapat |
| 390: seg Dampak (4 pilihan) terpotong | `inti/insight.css`: tombol rapat di `#dampak` |
| 390: seg jenis bencana Tren (8 pilihan) terpotong digeser | `inti/tren.css`: seg membungkus baris |
| Kamera awal peta beda (dok legenda banjir lebih tinggi mengecilkan area) | `banjir/peta.js` `kiriPad`: padding bawah dibatasi 160 |
| Laci: dua catatan penjelas (A1) dan "Status dari aturan di tab Metode" | `banjir/peta.js`: dihapus, kaki laci = "Data {jam}" seperti karhutla |
| EN: judul Berita, judul + sumber Dampak, label Riwayat, "Status longsor per wilayah", judul laci "Kejadian ... tercatat BNPB" | `i18n/en.json`: 15 kunci baru |
| EN: pop-up Situasi memetakan waspada=watch, siaga=alert, awas=warning (terbalik dari kamus Waspada=Alert, Siaga=Watch, Awas=Warning) | `i18n/en.json`: tiga kunci dibenahi |

## 1. Kepala

| # | Hasil | Catatan |
| --- | --- | --- |
| K1 tab (8 tab) | SAMA | Peta, Insight, Berita, Tren, Dampak, Simulasi, Foto, Tentang; Posko/Informasi/Metode dan tab lama disembunyikan (A24) |
| K2 jarak tab | SAMA | |
| K3 menu bencana | SAMA | Banjir tampil aktif; "Segera" untuk sisanya. Di karhutla Banjir masih "Segera" karena registry `uji` (ikut status) |
| K4 chip El Nino | D | Chip ENSO milik `lapisan5.js` karhutla; banjir tak punya padanan data |
| Judul tab, logo, ikon, ID/EN, bagikan, tema, burger | SAMA | |

## 2. Peta

| # | Hasil | Catatan |
| --- | --- | --- |
| P1 dasar satelit | SAMA | |
| P2 kamera awal | SAMA | setelah pembatasan padding bawah |
| P3 panel 440 | SAMA | |
| P4 crumb pil gelap di luar kartu | SAMA | |
| P5 seg atas + cari | D | seg Status/Hujan/Sungai/Rob/Riwayat + Banjir/Longsor adalah mode bahaya; tak ada chip rentang (data banjir per hari prakiraan) |
| P6 kepala tabel gelap | SAMA | |
| P7 kepala bisa diurut | SAMA | |
| P8 kolom Tren sparkline | D | butuh `seri_status.json` (tidak ada); kolom Awas/Siaga menggantikan |
| P9 tinggi baris 30px | SAMA | |
| P10 pil status | SAMA | |
| P11 kolom kanan 280 | SAMA | |
| P12 kartu rentang/hari di kolom kanan | SAMA | "Prakiraan banjir (hari)" |
| P13 seg mode di panel kiri | SAMA | |
| P14 Overlay berkepala gelap + lipat | SAMA | |
| P15 judul grup kalimat + chevron | SAMA | |
| P16 chip BMKG | SAMA | `databaru.js` bersama; karhutla menampilkan chip yang sama bila ada peringatan |
| P17 legenda dok | D | tiga kolom + baris skala "Hujan 3 hari puncak": isi legenda khas banjir |
| P18 legenda terlipat pil | SAMA | |
| P19 laci rincian | SAMA | |
| P20 kartu hover wilayah/sungai/rob | SAMA | `inti/peta/lapis.js` `kartuTip` |
| P21 mobile lembar bawah | SAMA | |
| P22 mobile kartu hari vs chip BMKG | SAMA | tidak bertumpuk lagi |
| P23 chip LEGENDA | SAMA | |

## 3. Pop-up Situasi

| # | Hasil | Catatan |
| --- | --- | --- |
| S1 eyebrow, judul berangka, chip, daftar provinsi, daftar kecamatan, kaki Sumber + Lihat peta, 1440 dan 390 | SAMA | `inti/sapa.js` + `sapa_banjir.js`; sekali sehari `pb_sapa` |

## 4. Insight

| # | Hasil | Catatan |
| --- | --- | --- |
| Anatomi kartu, pil, judul merah, kaki legenda + Sumber, bagikan | SAMA | |
| I1 seg di kepala kartu | SAMA | karhutla memakai `.ctl` di kepala juga (Berita sorotan, Dampak); audit lama keliru |
| I2 mobile seg melebar | SAMA | diperbaiki |
| I3 404 `kejadian_aktif_awal.json` | SAMA | tak muncul lagi |

## 5. Tren

| # | Hasil | Catatan |
| --- | --- | --- |
| T1 seg sumber | D | 8 jenis bencana vs 2 sensor; membungkus baris di 390 |
| T2 bagikan konsisten | SAMA | |
| T3 select vs judul 390 | SAMA | |
| T4 tabel standar | SAMA | |
| Warna biru/La Nina vs oranye/El Nino | D | identitas bahaya |
| 404 `seri_status.json` | SAMA | tak muncul lagi |

## 6. Simulasi

| # | Hasil | Catatan |
| --- | --- | --- |
| M1 peta penuh + panel kiri melayang | SAMA | |
| M2 tanpa subjudul | SAMA | |
| M3 skenario tombol gelap bertitik | SAMA | |
| M4 slider berkartu | SAMA | |
| Pemilih Provinsi/Kabupaten, kartu legenda di peta | D | simulasi per wilayah administratif, bukan per kompleks |

## 7. Tentang, Berita, Dampak

| # | Hasil | Catatan |
| --- | --- | --- |
| Tentang iframe | SAMA | |
| Berita (Volume, Peta berita, Sorotan, Topik, Daftar) | SAMA | jarak kartu diperbaiki; kartu sentimen dan garis titik panas tak ada: D (tak ada sentimen/ data pembanding banjir) |
| Dampak (menu kiri, banner, kartu Insight) | SAMA | satu bagian "Korban dan kerugian": D (hanya data BNPB/DIBI yang ada, A18) |

## 8. Foto

| # | Hasil | Catatan |
| --- | --- | --- |
| Galeri, saring, urut, paginasi, kartu `fg-k` | SAMA | |
| F3 tombol "Ambil foto", kalimat ajakan, alur kirim (Turnstile, EXIF/GPS, batas ukuran, pernyataan) | SAMA | Satu kode: `public/foto.js` diparameterkan lewat `window.FOTO_BENCANA` (disetel `public/banjir/foto.js`), mengirim `bencana=banjir` dan kategori banjir dari server (migrasi 0013). Diuji lokal: kirim dari `/banjir/` tampil di galeri banjir, tidak di karhutla. Tombol "Peta" di rincian tidak ada (banjir belum punya lapisan foto di peta) |

## 9. Kaki, bagikan, jejak

| # | Hasil | Catatan |
| --- | --- | --- |
| F1 kaki Teras Urban di semua tab | SAMA | |
| F2 dialog bagikan + templat Grafik Insight berpratinjau, Feed/Story/Kotak | SAMA | |
| Chat Admin, jejak | SAMA | |

## 10. Mobile 390

Tidak ada scroll horizontal; semua tab dibandingkan berdampingan; seg Insight, Dampak, Tren diperbaiki.

## 11. Teks, bahasa, galat

| # | Hasil | Catatan |
| --- | --- | --- |
| X1 `toFixed` titik desimal di teks tampil | SAMA | |
| X2/X3/X4 sisa Indonesia di EN | SAMA | seluruh tab dan mode peta, pop-up Situasi, laci diperiksa `?lang=en`; sisa hanya judul artikel berita (isi) |
| X5 em dash, "Anda", ISO mentah | SAMA | 0 |
| X6 subjudul/penjelas (A1) | SAMA | catatan di laci dibuang |
| X7/X8 404 data | SAMA | |
| INP | SAMA | klik mode/tab 10-70 ms sampai dua frame (`nanti()`) |

## Bukti

Uji: `npm run uji:agen`, `npm run uji:warga`, konsol bersih per tab, INP diukur klik-ke-dua-frame.
