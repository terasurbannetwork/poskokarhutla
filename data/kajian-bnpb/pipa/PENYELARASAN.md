# Penyelarasan dokumen SIPPA (25 Oktober 2026)

Pemeriksa dan penyelaras berkonteks bersih (AGENTS.md §3.2) untuk tujuh dokumen di folder ini. `KEPUTUSAN-SIPPA.md` tidak disentuh (keputusan 1–53 menjadi rujukan semua perubahan). Cadangan versi sebelum penyelarasan ada di folder scratchpad sesi, bukan di repo; pembanding resmi tetap `git diff`.

Fakta yang diperiksa ke kode dan data sebelum memutus:

| Fakta | Cara periksa | Hasil |
| --- | --- | --- |
| Hitungan zona tiga versi dengan `<` dan `≤` | dihitung ulang dari `data/osm_jarak.csv` (865 baris) | `<`: A188/B418/C89/D170 (`air_km_lama` x `jalan_km_lama`), A198/B429/C81/D157 (`air_semua_km` x `jalan_utama_km`), A469/B158/C167/D71 (`air_semua_km` x `jalan_kend_km`); `≤`: A189/B420/C89/D167, A199/B429/C81/D156, A471/B157/C167/D70 |
| Angka hidraulika | rumus DESAIN-TEKNIS §5.3, g 9,81 | DN100 ID 100, 10 L/s, 1 km, C 130: h_f 19,06 m; contoh lengkap +2 m, K 5, sisa 3 bar, hisap: TDH 55,6 m, 5,45 bar, 8,4 kW; bawaan baru 300 L/min ID 96: p_pompa 4,183 bar, p_ujung 8,817 bar, KONDISIONAL; 600 L/min: 5,868 bar, H-SERAP NO-GO; 5 L/s: h_f 5,28 m/km |
| Jalur deploy | `.github/workflows/terbit.yml`, `data.yml:8,502`, `titik.yml:7,259`, `banjir.yml:7,160` | terbit.yml: `staging` = `versions upload --preview-alias staging`, `main` = `wrangler deploy`; `main` juga di-deploy titik.yml (tiap 3 jam), banjir.yml (07.20 WIB), data.yml (21.20 WIB) |
| Nama berkas naskah | `bangun/docx/bangun.py:430-442`, `naskah/air/` | pembangun mengurutkan satu front matter per berkas (`bagian`, `bab`, `lampiran`); kajian air memakai `00-depan-kata-pengantar.md`, `00-depan-ringkasan-eksekutif.md`, `90-lampiran-a.md` dst. |
| Perintah deck | `bangun/pptx/deck.py:1888-1894` | `deck.py <spek> [keluar] --pdf` |
| Argumen slop | `qa/slop.py:1176-1181` | `--laporan <berkas>` lalu daftar berkas |
| Pemilik berkas | `scripts/agents/ilmu.mjs:242-243`, `roster.json` | glob paling spesifik menang; `pipa-data` memegang `data/**`, jadi `data/kajian-bnpb/naskah/**` bisa diberikan ke agent baru |
| `bara_regu` tengah | `public/data/operasi.json` `koef.bara_regu.mid` | 1,0 ha/regu/hari (bukan 1,2) |
| Skrip workflow | `naskah-kajian.js`, `rakit-kajian.js` (di luar git) | bercabang tetap `air`/`mitigasi`, `agentType: 'general-purpose'`, `OUT = keluaran/final`; tidak disunting di sini (tiket SP-005) |

## 1. Daftar perubahan

Satu baris per perubahan bermakna; perubahan nama mekanis yang sama di banyak tempat digabung satu baris dengan jumlahnya.

### 1.1 PRD.md

| Bagian | Sebelum | Sesudah | Alasan (butir brief) |
| --- | --- | --- | --- |
| kepala, konvensi | 50 keputusan; tanpa kode buku; tanpa rujukan dokumen turunan | keputusan 1–53; kode `sippa` untuk buku, `/pipa` dan `/api/sippa` untuk web; daftar dokumen turunan menurut AGENTS.md §2.1 | 1, keputusan 51–53 |
| seluruh berkas (mekanis) | `pipa.*`, `naskah/pipa/`, `keluaran/pipa.*`, `pipa-deck`, `pipa_angka.py`, `pipa_keuangan.py`, `gambar/pipa/`, `x-kode-sippa` (99 tempat) | `sippa.*`, `naskah/sippa/`, `keluaran/sippa.*`, `sippa-deck`, `sippa_angka.py`, `sippa_keuangan.py`, `gambar/sippa/`, `x-kode` | 1, 7 |
| §1.3 U3 | vonis pilot tanpa definisi | tujuh butir keputusan 53 lewat `vonisPilot`, tiga vonis | 3 |
| §2.1 | sampai keputusan 50 | baris 51, 52, 53; baris 30 merujuk 51 | 2, 3, 4 |
| §2.2 | T-A s.d. T-I | ditambah T-J (telemetri per pesan) dan T-K (paket D1 sebelum > 30 kit); kalimat "kode T-A s.d. T-K dipakai identik di semua dokumen" | 7, sapuan pertanyaan pemilik |
| §4.1 minggu 44 | vonis "dapat dipakai" tanpa ukuran | tujuh butir keputusan 53 | 3 |
| §4.4 G0, G1 | air ≤ 2,5 km; contoh 15 L/s untuk 10 L/s | air < 2,5 km; contoh 7,5 L/s untuk debit bawaan 5 L/s | 2, 6 |
| §5.1 | rumus `≤`; dua versi berlabel "konservatif (jalan utama, tersier ke atas)" A188 | rumus `<`; tiga versi: `kendala.json` A188/B418/C89/D170, jalan utama OSM A198/B429/C81/D157, semua jalan OSM A469/B158/C167/D71, dengan persen; kunci `sippa.zona.kalteng.<konservatif|utama|optimistis>` | 2 |
| §5.4 tabel | `bara_regu` tengah 1,2 | dibaca dari `operasi.json`, saat ini 1,0 | sapuan angka (DT §9.3 butir 8) |
| §6.1 | debit operasi 10 L/s | debit bawaan 300 L/min dengan 8 lance; 10 L/s hanya dengan pemakai lain tercatat; lance dikonfirmasi G2 | 6 |
| §6.2 | DN100 "sekitar 17 m/km", TDH sekitar 50 m, 5 bar, 7,5 kW; OD160 sekitar 12,4 bar; OD200 sekitar 6,3 | 19,06 m/km; TDH 55,6 m; 5,45 bar; 8,4 kW; 5,28 m/km pada 5 L/s; OD160 12,49 bar tanpa hisap (12,84 dengan); OD200 6,20 (6,54) | 5 |
| §6.9 G-08 | "dari DEMNAS nyata (bukan sintetis)" | DEMNAS bila sudah diterima, sebelumnya GLO-30 berlabel DSM, diganti saat DEMNAS tiba | konsistensi dengan KB §7.3, O7 |
| rujukan bab dan lampiran (30 tempat) | nomor bab PRD lama (15 bab, Lampiran A–K) | nomor KERANGKA (17 bab, Lampiran A–N), mis. surat = Lampiran I, gambar teknik = Lampiran F, SOP = Lampiran G, batas alat = Lampiran L | 10 |
| §8.1–§8.6 | kerangka 15 bab, Lampiran A–K, `kata-pengantar.md`, `lampiran-X.md`, `bangun/pptx/spek/pipa-deck.json`, `deck.py pipa-deck` | ringkasan 17 bab dan A–N yang isinya sama dengan KERANGKA; berkas `00-depan-*.md`, `bab-NN.md`, `90-lampiran-<huruf>.md`, `deck.json`; perintah `deck.py naskah/sippa/deck.json keluaran/sippa-deck.pptx --pdf`; warna zona buku biru-emas; Roboto hanya buku/deck/PDF | 4, 9, 10, 13 |
| §9.1.2 | tamu 303 ke `/admin/masuk?ke=`; `/pipa/lapangan` di `PUBLIK_TANPA_SESI` | tamu 303 ke `/admin/pantau?ke=`; `PUBLIK_TANPA_SESI` tidak diubah | 7 |
| §9.1.3, §9.4.1, §9.4.2 | versi Konservatif "jalan utama" | Konservatif = versi `kendala.json`; Optimistis = semua jalan OSM; jalan utama OSM sebagai kolom ringkasan; lapisan web wajib huruf dan pola | 2, 4 |
| §9.3 | `hitung.js` skrip biasa; zona `≤`; `zonaTerverifikasi` memakai `jalan_km_utama`; acuan sekitar 17 m, 12,4, 6,3; H-SERAP contoh 2.000 L/min; tanpa H-RATING | ES module + `globalThis`; zona `<`; `zonaTerverifikasi` = `zona_o` bila cek lolos, selain itu `zona_k`; acuan angka hitung bertanda `hisap`; H-SERAP contoh 600 L/min; H-RATING; tanda tangan `saranSarana`, `matriksRespons` sama dengan DT | 2, 5, 6 |
| §9.4.3 | debit bawaan 600 L/min | 300 L/min; medan "debit pemakai lain" | 6 |
| §9.4.4, §9.4.5 | `POST /api/sippa/kit/:id/gerak` | `POST /api/sippa/gerak/:id`, `POST /api/sippa/tiba/:id`; siapa boleh per transisi di DT §6.2 | 7 |
| §9.4.6, §9.4.7 | tanpa vonis pilot; tanpa penanda jam meleset | kartu vonis pilot keputusan 53 terpisah dari G4; penanda `jam_klien_meleset` | 3, 11 |
| §9.7.1–§9.7.3 | medan dan skema lama (`foto_kunci`, telemetri per bacaan), rute bersarang, laju di GET, `INSERT OR IGNORE`, `x-kode-sippa` | ringkasan yang isinya sama dengan DT §3 dan §4.3: `zona_u`, `sippa_foto`, medan vonis pilot, telemetri per pesan, rute aksi-sebelum-id termasuk `probe.csv` dan `foto/:id`, laju hanya tulis, `ON CONFLICT DO NOTHING`, `x-kode` | 7, 11 |
| §9.8 | CSP `tiles.openfreemap.org`; CSP lapangan ditambah `connect-src` | CSP sama dengan DT §4.2; `CSP_LAPANGAN` diekspor | 7 |
| §9.9 | sw-lapangan tanpa perbaikan scope; tahap probe tanpa `sesudah`; salinan `src/sippa_formulir.js`; `INSERT OR IGNORE`; PNG diterima; jam meleset tanpa cara turun | perbaikan scope dan `VERSI = 3`; tahap `sesudah`; medan vonis pilot; `formulir.js` diimpor worker; `ON CONFLICT`; JPEG/WebP saja; penurunan dari `jam_kirim` dan `waktu_klien` | 3, 7, 11 |
| §9.10 | pengingat lewat sistem pengingat; pola `laporan_bnpb.js` | butir Meja Pantau `sippa_mingguan`; pola `laporan_karhutla_deck.js` (laporan_bnpb memuat CDN); templat pilot memuat tujuh butir | 3, 7, 13 |
| §9.11 | tabel per bacaan, laju 7.200/jam | tabel per pesan, laju 120 pesan/jam, catatan kuota D1 100 rb per hari dan T-J, T-K | 7 |
| §9.12.1, §9.12.2 | `docs/sippa/**`; `src/sippa_formulir.js`; uji zona "2,5 masuk A"; skema di Miniflare | tanpa `docs/sippa/**`; agent `penulis-kajian`; uji zona `<`; skema di `node:sqlite` dengan ROLLBACK (RU §1.2); hak sesuai DT | 2, 7, 12 |
| §9.14 | dummy 3 kit | `SIPPA-901` s.d. `907`, satu per status | sapuan DT §8.5 |
| §10.1, §10.3 | P0-05 dengan `PUBLIK_TANPA_SESI`; B-01 lampiran A–K, bab 1–15, penulis tanpa agent | P0-05 dengan pengalihan `/admin/pantau`; B-00 agent `penulis-kajian`; B-01 A–N; B-02 dan B-07 bab 1–17; perintah buku dan deck baru | 7, 9, 10, 12 |
| §10.6 | `wrangler deploy` dari sesi | terbit.yml lewat `staging` lalu `main`; merge ke `main` = tayang (paling lambat 21.20 WIB); rollback + revert di `main` | 8 |
| §11.1–§11.4 | `data/sippa/harga.csv`; R15 `INSERT OR IGNORE`; AS-13 `≤`; glosarium versi zona lama | `kajian/data/sippa/harga.csv`; `ON CONFLICT`; AS-13 = keputusan 51; glosarium tiga versi | 1, 2, 7 |
| §12.2, §12.3 | keputusan 1–50; dua versi zona | 1–53; tiga versi zona; vonis pilot; agent `penulis-kajian` | 2, 3, 12 |

### 1.2 DESIGN-SYSTEM.md

| Bagian | Sebelum | Sesudah | Alasan |
| --- | --- | --- | --- |
| §2.1.3 zona | `≤` dan `>`; "lihat butir terbuka §8" | `<` dan `≥`; ditetapkan keputusan 52 | 2, 4 |
| §4.2 wireframe peta | "(jalan utama)", tabel 4 x 3 | "(versi kendala.json)", tabel 4 x 4 (kendala, utama OSM, semua OSM, terverifikasi) | 2 |
| §4.3, §4.10 | debit 600 L/min | 300 L/min | 6 |
| §4.7 form lapangan | tanpa medan vonis; tahap probe tanpa `sesudah` | medan petak, air sampai lance, tekanan ujung dan lama, kecelakaan, henti bocor; tahap `sesudah` | 3 |
| §4.8 A/B | tanpa vonis pilot | kartu vonis pilot tujuh butir tiga nilai (wireframe baru) | 3 |
| §4.12 laporan | templat pilot tanpa rincian | tabel tujuh butir dan bagian "lebih baik: belum dapat diputus" | 3 |
| §5.1 peta buku | "dua versi zona" | panel `kendala.json` dan semua jalan OSM; jalan utama OSM di tabel | 2 |
| §5.2 grafik | kartu "17 m per km" | "19,06 m per km pada 10 L/s" | 5 |
| §5.5 deck | penomoran PRD lama (1 sampul, 16 penutup), C3/D1/D2/D3/E2/kesimpulan deskriptif, kartu 17 m/km | urutan KERANGKA §11 (1–15 isi, L1–L4), semua judul isi temuan kecuali slide 1, slide C4 modul banjir, kartu 19,06 m/km dan 300 L/min, zona biru-emas | 4, 5, 6, 10 |
| §6.2 contoh | "sekitar 17 m per km" | "sekitar 19 m per km" | 5 |
| §8 | butir terbuka "warna zona" menunggu pemilik; butir lain "pemilik" | warna zona diputus (keputusan 52); bagian menjadi "butir desain dengan bawaan tertulis"; tidak ada pertanyaan pemilik dari dokumen ini | 4, sapuan pertanyaan |
| mekanis | `pipa.*` (2), "daftar fungsi §9.3" | `sippa.*`, "PRD §9.3" | 1, rujukan |

### 1.3 DESAIN-TEKNIS.md

| Bagian | Sebelum | Sesudah | Alasan |
| --- | --- | --- | --- |
| kepala | keputusan 1–50 | 1–53 | keputusan 51–53 |
| §2.1 | tanpa `gerbang.test.mjs`, `regu_luring`, `terbit.yml`, uji `keadaan`, `antre`, `kontras`, `garis_keturunan`, `gerbang-cakupan`, `cakupan.json`, `studio_konstanta.json`, `kembar_cli.py`, `pilot_cek.py`; `uji:sippa` tanpa `--test-concurrency=1` | semua ditambah dengan pemilik; skrip uji sama dengan RU §0.4 | 11, sapuan RU |
| §2.3 baru | tidak ada | entri roster `penulis-kajian` (`milik: data/kajian-bnpb/naskah/**`, sonnet) | 12 |
| §3.1.1, §3.1.3 | `zona_k`, `zona_o`; `zona.json` versi k/o, median contoh salah versi | `zona_u` ditambah; versi k/u/o berlabel; median versi k 1,28/6,66 | 2 |
| §4.3 | kirim tanpa `jam_kirim`; tanpa rute ekspor probe | `jam_kirim`; `GET /api/sippa/probe.csv` (B, 60/jam) | 11 |
| §5.3.1 | `q_lpm` bawaan 600; pertanyaan T-03 | 300 dengan 8 lance; 600 kasus ajar | 6 |
| §5.4 | dua versi zona | tiga versi dengan hitungan `<` dan `≤`; `saranSarana` versi `k|u|o|v` | 2 |
| §5.8 | H7 600 L/min NO-GO; V1 memakai 16 lance | H7 300 L/min KONDISIONAL (angka baru); H8 kasus ajar 600 L/min NO-GO; V1 memakai H7 | 5, 6 |
| §6.1.5 | `jam_klien_meleset` hanya dari `waktu_klien` | dari `jam_kirim` (selisih > 10 menit) atau `waktu_klien` > kini + 10 menit; antrean lama bukan meleset | 11 |
| §7.2 | `zona.py` dua versi; tanpa `pilot_cek.py`; `bersama.py` tanpa `vonis_pilot` | tiga versi; `pilot_cek.py`; `vonis_pilot` di `bersama.py`; H1–H8 | 2, 3, 11 |
| §8.4 | deploy dengan peringatan data.yml saja | jalur terbit.yml `staging` lalu `main`; empat workflow men-deploy `main`; rollback + revert | 8 |
| §9.2 | T-02 s.d. T-10 (bentrok dengan gerbang buku T-1 s.d. T-12 dan kode pemilik) | pertanyaan pemilik dipindah ke PRD §2.2 (T-J, T-K, T-A); butir teknis BT-01 s.d. BT-05; butir yang sudah diputus dicatat | sapuan pertanyaan, 6 |
| §9.3, rujukan BT | daftar koreksi menunggu | ditandai sudah diterapkan; T-04/06/07/08 di teks diganti BT-xx atau T-K | rujukan |
| ADR-13 | "PRD menulis `x-kode-sippa`" | konteks dipertahankan dengan kata lain | perbaikan sesudah ganti nama |

### 1.4 KERANGKA-BUKU.md

| Bagian | Sebelum | Sesudah | Alasan |
| --- | --- | --- | --- |
| kepala | 50 keputusan; berkas ini di atas PRD | 1–53; PRD sudah selaras, beda baru = bertanya (AGENTS.md §2.1) | 1, otoritas |
| §0.1 | tanpa 51–53 | baris 51, 52, 53 | 2, 3, 4 |
| §0.3 | "PRD diperbarui pemiliknya" | sudah diterapkan ke PRD | 10 |
| §2 butir 8 | konservatif = "jalan utama `kendala.json` x air lama" | tiga versi berlabel benar | 2 |
| §3.4 temuan 6 | "sekitar {17} m" | {19,06} m; 8 lance {320} L/min; debit kerja {300} L/min | 5, 6 |
| BAB 4 | dua versi; ambang tanpa `<` | tiga versi, keputusan 51, kunci `sippa.zona.kalteng.utama.*`, warna biru-emas berhuruf dan berpola | 2, 4 |
| BAB 6.6, angka | debit operasi 10 L/s | 300 L/min (5 L/s), 600 L/min contoh ditolak, G2 | 6 |
| BAB 7.2, 7.4, 7.5, angka | sekitar 17 m, 50 m, 5 bar, 7,5 kW, 12,4, 6,3; neraca debit terbuka | 19,06 m; 55,6 m; 5,45 bar; 8,4 kW; 12,49/12,84; 6,20/6,54; neraca diputus | 5, 6 |
| BAB 9 angka | `bara_regu` tengah 1,2 | 1,0 dari `operasi.json` | sapuan angka |
| BAB 12.1, 12.3, angka | vonis "gelar, air mengalir, probe, tanpa kecelakaan" | tujuh butir keputusan 53, tiga vonis; ekspor `probe.csv`; kunci `vonis`, `butir_1..7` | 3, 11 |
| §5 Lampiran B | "dua versi" | tiga versi | 2 |
| §7.2 aturan 3 dan 5 | palet zona baru dari `tema.json` | biru dan emas + huruf + pola (keputusan 52) | 4 |
| §8.1 M6 | `agentType` tidak disebut | penulis memakai `penulis-kajian`, penyunting agent baru | 12 |
| §9.2 S5, S8, S9, S12 | "penulis"; perintah deck tanpa argumen | `penulis-kajian`; `deck.py naskah/sippa/deck.json keluaran/sippa-deck.pptx --pdf` | 9, 12 |
| §9.3 (e), §9.4 D-35 | D-1 s.d. D-32, T-1 s.d. T-11; D-35 tumpang tindih T-12 | D-1 s.d. D-38, T-1 s.d. T-12; D-35 = keterangan DOCX, isi lembar = T-12 | sapuan gerbang buku |
| §10 | O1 tanpa kode pemilik; O2 neraca debit terbuka | O1 = T-A; O2 diputus; catatan kode O lawan T | 6, sapuan pertanyaan |
| §11 deck | slide 14 dan 15 deskriptif; slide 4 "dua versi"; slide 7 judul 17 m | slide 14 dan 15 judul temuan; slide 4 tiga versi berwarna biru-emas; slide 7 judul serapan lance dan debit kerja; kunci `sippa.rek.n`, `sippa.rek.seratus_hari.n`, `sippa.kit.debit_operasi_l_min` | 10, 5, 6 |

### 1.5 RENCANA-UJI.md

| Bagian | Sebelum | Sesudah | Alasan |
| --- | --- | --- | --- |
| kepala | 50 jawaban; tanpa DT/KB | 1–53; DT dan KB sebagai sumber nilai | otoritas |
| §1.1, §1.3 | `src/sippa_formulir.js`; daftar skrip tanpa `bersama`, `aoi`, `pilot_cek` | dihapus; daftar lengkap | 7, 11 |
| §2.1 | kolom "PRD" (angka lama); tanpa bawaan dan kasus ajar | "PRD lama" sudah dibetulkan; K6 = H7 bawaan 300 L/min, K7 = H8 600 L/min NO-GO; token hidraulika = kunci KB | 5, 6 |
| §2.3 | P1 dua versi; G5 "lihat §9"; F3 `INSERT OR IGNORE`; T1 oleh "A" | P1 tiga versi; P6 huruf dan pola diuji gerbang; G5 penurunan meleset tiga kasus; G6 vonis pilot V1–V3; F3 `ON CONFLICT` dan butir CHECK = ditolak; T1 oleh W, K, M | 2, 3, 4, 7, 11 |
| §2.4 | matriks jalur PRD bersarang, laju GET, tamu 403/`/admin/masuk`, `foto_kunci`, telemetri 7.200/jam, PK bacaan | ditulis ulang ke jalur DT §4.3 (termasuk `probe.csv`, `foto/:id`, `ab-status`, `tugas-cabut`), GET tanpa laju, tamu 401/303 `/admin/pantau`, uji pengalihan `pantau.js`, `foto_id`, telemetri 120 pesan/jam per pesan | 7, 11 |
| §2.5 | jalur singkat; probe tanpa `sesudah` | jalur DT, probe `sesudah`, langkah 10 `vonisPilot` | 3, 7 |
| §3.1–§3.5 | dummy telemetri dikecualikan; tahap probe enam; transisi hanya di rute; telemetri per bacaan | dummy semua tabel; tujuh tahap; CHECK pasangan, trigger `sippa_gerak_cek`, log append-only, medan vonis, `sippa_foto`, `ada_berkas`; §3.4 per pesan; §3.5 hanya hak pelaku | 3, 7, 11 |
| §4.1, §4.2, §4.3 | lima kasus; teks "PRD menulis ≤"; kunci `k.A` | H1–H8; keputusan 51 dan PRD sudah `<`; kunci `konservatif.a` | 2, 5 |
| §5.1–§5.3 | `deck.py sippa-deck`; merek di D-10; dua versi zona | `deck.py naskah/sippa/deck.json ... --pdf`; D-33 s.d. D-38; tiga versi; warna biru-emas; slide 2–15 judul temuan | 4, 9, 10 |
| §6.1–§6.3 | ekspor probe "lihat §9"; probe tanpa `sesudah`; `foto_kunci`; formulir salinan; vonis usulan | `probe.csv`; tahap `sesudah`; `foto_id`; PL9 medan vonis; formulir diimpor; §6.3 keputusan 53 tujuh butir dengan kasus uji | 3, 7, 11 |
| §7.1, §7.3 | `src/sippa_formulir.js` dipindai; layar `+ lapangan` | dihapus; `layar_*.js` = `LAYAR_SIPPA` + `ringkas`, `lapangan.js` terpisah | 7 |
| §8.2–§8.4 | catatan dua jalur; A1 `/admin/masuk`; rollback tanpa revert | merge `main` = tayang; A1 `/admin/pantau?ke=%2Fpipa`; A6 401; rollback + revert | 7, 8 |
| §9 | 16 butir belum selesai | 16 butir dengan penyelesaiannya; tidak ada butir uji terbuka | semua |

### 1.6 TIKET.md

| Bagian | Sebelum | Sesudah | Alasan |
| --- | --- | --- | --- |
| kepala | rujukan menurut nama bagian | nomor bagian; dokumen saudara sudah selaras | rujukan |
| §0 | `x-kode-sippa`; zona `≤`; tanpa kode buku, deploy, kalkulator, warna, vonis pilot | `x-kode`; `<` dengan tiga versi; baris kode buku `sippa`, batas tulis D1, kalkulator 300 L/min, warna zona, vonis keputusan 53, huruf web, deploy terbit.yml | 1, 2, 3, 4, 6, 7, 8, 13 |
| §2 indeks | 84 tiket; penulis `general-purpose`; bab 1–15 | 86 tiket (SP-085, SP-086); penulis `penulis-kajian`; bab 1–17; lampiran A–N | 10, 12 |
| rujukan (56 tempat) | "DT bagian rute", "RU bagian skema D1", "DS bagian layar Kit", dst. | DT §4.3, RU §3, DS §3.13, §3.14, §4.5, dst. | rujukan |
| mekanis (90 tempat) | `naskah/pipa/`, `pipa_*.py`, `--kajian pipa`, `x-kode-sippa`, dst. | kode `sippa` | 1 |
| SP-003, SP-004, SP-005 | `uji:sippa` tanpa terbit.yml; lampiran A–K; workflow bercabang tanpa nama berkas dan agent | terbit.yml dan `tests/sippa/cakupan.json`; `tema.json` persis KB §1 (A–N); workflow menulis berkas per front matter dan memakai `penulis-kajian` | 7, 9, 10, 12 |
| SP-006, SP-007, SP-008 | 9 tabel PRD; salinan `src/sippa_formulir.js`; jalur bersarang; `PUBLIK_TANPA_SESI` | 10 tabel DT §3.2 (dengan `sippa_foto`, medan vonis); `formulir.js` diimpor worker; rute DT termasuk `probe.csv`, `foto/:id`, `pantau.js`, `gerbang.test.mjs` | 3, 7, 11 |
| SP-009 s.d. SP-018 | formulir tanpa medan vonis; konstanta `KEDALAMAN_MAKS_*`; `layar_lapangan.js`; sw tanpa perbaikan scope; deploy langsung; vonis 1 Nov tanpa ukuran | medan vonis; `KONST.dalam_maks_m`; `lapangan.js`; perbaikan scope dan uji; staging lalu `main`, rollback + revert; `pilot_cek.py` | 3, 7, 8 |
| SP-019 s.d. SP-028 | CLI `hidraulika.py --json`; zona dua versi; `zona.py --aoi`; bukti tanpa `uji` | `kembar_cli.py`, `bersama.py` dengan `vonis_pilot`, `pilot_cek.py`; tiga versi; `aoi.py`; bukti `uji` | 2, 3, 11 |
| SP-029 s.d. SP-045 | data tamu 403, laju GET; jalur `unggah/:id/status`, `skenario/:id/hapus`, `laporan/:id/berkas`; pola `laporan_bnpb.js`; pengingat `src/pengingat.js` | tamu 401, GET tanpa laju; `ab-status/:id`, `skenario-hapus/:id`, `laporan-berkas/:id`; pola `laporan_karhutla_deck.js` (BT-05); butir Meja Pantau `sippa_mingguan` (ADR-11) | 7, 13 |
| SP-049 s.d. SP-057 | fungsi 3D nama lama; telemetri per bacaan, waktu 1 jam; dummy 12 layar | fungsi DT §6.5; telemetri per pesan, 120/jam, 6 menit, alarm Meja Pantau; dummy 13 kunci DT §8.5 | 7 |
| §3.G (SP-058 s.d. SP-080) | 15 bab; `00-depan.md`, `90-lampiran.md` tunggal; G-08 tertahan; perintah tanpa laporan | 17 bab dalam empat kelompok naskah (1–5, 6–9, 10–13, 14–17) dan tiga kelompok bukti; berkas per front matter; G-08 GLO-30 berlabel DSM; perintah lengkap | 9, 10 |
| SP-085 baru | tidak ada | agent `penulis-kajian` (roster, ilmu, AGENTS.md) | 12 |
| SP-086 baru | tidak ada | gerbang buku T-12 dan D-33 s.d. D-38 dengan fixture | sapuan bab ke uji |
| §4, §5, §7, §8 | graf dan gelombang tanpa tiket baru; T-A s.d. T-I; deploy `wrangler deploy` | SP-085 gelombang 1, SP-086 gelombang 9, SP-019 wajib sebelum pilot; T-J, T-K; deploy terbit.yml | 7, 8, 12 |
| §9, §10 | cakupan 15 bab; 15 butir belum selesai | cakupan 17 bab, A–N, gerbang; butir diselesaikan dan sisa berbawaan | 10 |

## 2. Matriks cakupan

### 2.1 Fitur web (PRD §9) terhadap dokumen

| Fitur | PRD | DESIGN-SYSTEM | DESAIN-TEKNIS | RENCANA-UJI | TIKET |
| --- | --- | --- | --- | --- | --- |
| Ringkas | §9.4.1 | §4.1 | §4.3 `ringkas`, §8.3 | §2.3 R1–R3 | SP-029, SP-031 |
| Peta kelayakan, tiga versi zona, saran sarana | §5.1, §9.4.2 | §3.6, §4.2, §2.1.3 | §3.1.1–§3.1.3, §5.4, §7.2 | §2.3 P1–P7, §4.1, §4.2 | SP-021, SP-029, SP-032 |
| Kalkulator hidraulika | §6.4, §9.3, §9.4.3 | §4.3, §3.12 | §5.2, §5.3, §5.8 | §2.1, §2.3 H1–H6 | SP-010, SP-030, SP-033 |
| Pemicu pra-posisi | §9.4.4 | §4.4 | §3.1.6, §5.4, §7.2, §7.4 | §2.3 M1–M4, §4.1 | SP-023, SP-025, SP-043 |
| Inventaris dan lacak kit | §9.4.5 | §3.13, §3.14, §4.5 | §3.2, §6.2 | §2.3 T1–T6, §2.5, §3.2 | SP-006, SP-008, SP-012, SP-013 |
| Rekap time-motion | §9.4.6 | §4.6 | §3.2, §5.5 | §2.3 G1–G5 | SP-008, SP-010 |
| Form lapangan luring | §9.9 | §3.7.2, §4.7 | §6.1 | §2.3 F1–F8, §6.2 | SP-007, SP-008, SP-009, SP-011, SP-013 |
| Dashboard A/B | §9.4.7 | §3.8, §4.8 | §3.3, §5.5.1 | §2.3 B1–B3 | SP-034, SP-035, SP-036 |
| Vonis pilot (keputusan 53) | §1.3 U3, §9.4.7, §9.10 | §4.8, §4.12 | §5.5.2 | §2.3 G6, §6.3 | SP-010, SP-019, SP-018, SP-036, SP-037 |
| Data dan metode, batas alat | §9.4.8 | §4.13 | §2.1 `batas.js`, §5.7 | §2.3 A1 | SP-030, SP-031 |
| Simulator keputusan | §9.5 | §3.9, §3.10, §4.9 | §5.7 | §2.2, §2.3 S1–S3 | SP-040, SP-041, SP-042 |
| Simulasi 3D | §9.6 | §3.17, §4.10 | §6.5 | §2.3 D1–D3 | SP-048, SP-049 |
| Telemetri dan alarm | §9.11 | §4.11 | §3.4, §6.3 | §2.3 E1–E3, §2.4, §3.4 | SP-050, SP-051 |
| Laporan PDF dan pengingat | §9.10 | §3.18, §4.12 | §6.4, ADR-11 | §2.3 L1–L3 | SP-037, SP-044, SP-045 |
| Akses, keamanan, halaman 403 | §9.1.2, §9.8 | §4.14 | §1.3, §1.4, §8.1 | §2.4, §8.3 | SP-008, SP-015, SP-056 |
| Navigasi, tema, keadaan | §9.1.3, §9.2, §9.2.1 | §2, §3.0, §3.1 | §4.2, §8.2 | §2.7 | SP-010, SP-055 |
| INP dan aksesibilitas | §9.13 | §7.2, §7.3 | §8.2 | §2.6, §2.7 | SP-055 |
| Data dummy | §9.14 | §3.19 | §8.5 | §7.5 | SP-052, SP-053 |
| Data turunan R2 (tanpa layar) | §9.7.1 | tidak berlaku | §3.1, §7 | §4 | SP-019 s.d. SP-025, SP-028 |
| Skema D1 (tanpa layar) | §9.7.2 | tidak berlaku | §3.2–§3.5 | §3 | SP-006, SP-034, SP-050 |
| Rute worker (tanpa layar) | §9.7.3 | tidak berlaku | §4 | §2.4 | SP-008, SP-029, SP-035, SP-050 |
| Pemilik berkas dan agent (tanpa layar) | §9.12.1 | tidak berlaku | §2.2, §2.3 | §0.4, §7 | SP-003, SP-085 |

### 2.2 Rute dan tabel DESAIN-TEKNIS terhadap uji dan tiket

| Kelompok | DT | RENCANA-UJI | TIKET |
| --- | --- | --- | --- |
| Halaman `/pipa*`, `/admin/pipa`, `pantau.js ke=` | §4.2, §1.4 | §2.4 baris 1–4, §8.3 A1–A5 | SP-008 |
| Data R2, ringkas | §4.3 | §2.4 | SP-029 |
| Kit, komponen, gerak, tiba, tugas, tugas-cabut | §4.3, §6.2 | §2.4, §2.5, §2.3 T1–T6 | SP-008, SP-012 |
| Lapangan saya, kirim, foto; foto/:id | §4.3, §6.1 | §2.4, §2.3 F1–F8 | SP-008, SP-011 |
| Log, log.csv, probe.csv, POST log | §4.3 | §2.4, §6.1 | SP-008 |
| Jalan-cek, aoi | §4.3 | §2.4 | SP-029 |
| A/B, ab-status, ab.csv, skenario, skenario-hapus, laporan, laporan-berkas | §4.3 | §2.4 | SP-035 |
| Telemetri, perangkat, perangkat-cabut, alarm, alarm-tutup | §4.3, §6.3 | §2.4, §2.3 E1–E3 | SP-050 |
| Dummy isi, hapus | §4.3, §8.5 | §2.4, §7.5 | SP-008, SP-052 |
| 0055: kit, komponen, gerak, tugas, log_gelar, probe, bbm, foto, jalan_cek, aoi_usul | §3.2 | §3.2 | SP-006 |
| 0056: ab_unggah, petak, skenario, laporan | §3.3 | §3.3 | SP-034 |
| 0057: perangkat, telemetri, telemetri_harian, alarm | §3.4 | §3.4 | SP-050 |

### 2.3 Buku: bab dan lampiran terhadap dokumen

Gerbang buku yang berlaku untuk semua bab: RU §5.1 dan §5.3 (D-1 s.d. D-38, T-1 s.d. T-12, slop), dibangun SP-004 dan SP-086.

| Bagian | KERANGKA | Uji khusus | Bukti | Naskah |
| --- | --- | --- | --- | --- |
| Depan (Kata Pengantar, Ringkasan Eksekutif) | §3 | §5.3 (angka = bab) | dari bab | SP-074 |
| Bab 1 Pendahuluan | §4 BAB 1 | §5.3 | SP-058 | SP-068 |
| Bab 2 Bara Gambut | §4 BAB 2 | §5.3, D-34 | SP-058 | SP-068 |
| Bab 3 Pola Api | §4 BAB 3 | §4.1 `sel22.py` | SP-058 | SP-068 |
| Bab 4 Kelayakan Kit Kalteng | §4 BAB 4 | §4.1, §4.2, §5.3 tiga versi | SP-058 | SP-068 |
| Bab 5 Kebutuhan Kit 18 Provinsi | §4 BAB 5 | §4.1 `nasional.py`, D-37 | SP-058 | SP-068 |
| Bab 6 Desain SIPPA | §4 BAB 6 | §5.3 | SP-059 | SP-069 |
| Bab 7 Hidraulika | §4 BAB 7 | §2.1 (acuan = token), §1.1 L2 | SP-059 | SP-069 |
| Bab 8 Komponen dan Gambar Teknik | §4 BAB 8 | §5.4 T-12, D-33, D-35 | SP-059 | SP-069 |
| Bab 9 Operasi | §4 BAB 9 | §4.1 `respons.py` | SP-059 | SP-069 |
| Bab 10 Kelembagaan | §4 BAB 10 | §5.3 | SP-059 | SP-070 |
| Bab 11 Pemakaian Ganda | §4 BAB 11 | §5.3, D-36 | SP-059 | SP-070, SP-072 |
| Bab 12 Pilot dan Program Uji | §4 BAB 12 | §6.3, D-38 | SP-060 | SP-070, SP-072 |
| Bab 13 Anggaran, NPV, BCR, Monte Carlo | §4 BAB 13 | §5.3, D-36, D-37 | SP-060 | SP-070 |
| Bab 14 Risiko | §4 BAB 14 | §5.3 | SP-060 | SP-071 |
| Bab 15 Sistem Data dan Pemantauan | §4 BAB 15 | §5.3 | SP-060 | SP-071 |
| Bab 16 Peta Jalan | §4 BAB 16 | §5.3 (D-31) | SP-060 | SP-071 |
| Bab 17 Kesimpulan dan Keputusan | §4 BAB 17 | §5.3 | SP-060 | SP-071 |
| Lampiran A–H, J–L (tertulis) | §5 | §2.3 A1 (L), §5.3 | | SP-073 |
| Lampiran I (surat) | §5 | slop | | SP-067 |
| Lampiran F lembar A3 | §5, §7.3 | §5.4 T-12 | | SP-065, SP-066, SP-077 |
| Lampiran M, N (dibangkitkan) | §5 | D-15 | | SP-077 |
| Deck 15 slide | §11 | §5.2, §5.3 | | SP-078 |

Celah cakupan yang tersisa: **nol**. Butir "tidak berlaku" di §2.1 adalah bagian tanpa layar, sehingga tidak butuh wireframe.

## 3. Pertanyaan pemilik yang tersisa

Didaftar sekali di PRD §2.2, kode sama di semua dokumen. Semuanya punya bawaan dan tidak menghalangi kerja.

| Kode | Pertanyaan | Bawaan | Mendesak |
| --- | --- | --- | --- |
| T-A | Harga heli kontrak BNPB per jam dan per sorti | slot `menunggu`; pembanding "> Rp200 juta per sorti" | sebelum serah buku |
| T-B | Lokasi, tanggal, alat, dan jumlah lance pilot | AOI mudah Palangka Raya, 2 lance, 2 termometer | **ya, minggu ini** |
| T-C | Pemilik pompa pilot dan penanda tangan pinjam pakai | dicatat di `pemilik_asal`, tanpa dokumen formal | **ya, minggu ini** |
| T-D | Provinsi/kabupaten banjir penerima kit | tujuan bebas di layar Kit | minggu 45 |
| T-E | OPEX regu konvensional Manggala Agni | `bara_regu` 0,5–2,8 dari `operasi.json` | sebelum Bab 13 final |
| T-F | Nilai manfaat untuk NPV/BCR | manfaat 0 + dua skenario berlabel | sebelum Bab 13 final |
| T-G | Penanda tangan Kata Pengantar dan kolofon | seperti deck BNPB 21 Okt 2026, draf berpenanda | sebelum serah buku |
| T-H | Akses `/pipa` untuk akun instansi | hanya admin dan staf BNPB | tidak |
| T-I | Keluaran Deep Research pemilik | tidak dirujuk | tidak |
| T-J | Setuju telemetri satu baris per pesan (kuota D1) | per pesan, interval 60 detik | sebelum migrasi 0057 diterapkan (R3) |
| T-K | Paket D1 berbayar atau interval 5 menit sebelum telemetri > 30 kit | putus 2027 | tidak |

## 4. Penyimpangan dari brief, dengan bukti

1. **Nama berkas naskah.** Brief butir 9 menyebut `00-depan.md` dan `90-lampiran.md` tunggal. Pembangun `bangun/docx/bangun.py:430-436` mengurutkan dari SATU front matter per berkas (`bagian`, `bab`, atau `lampiran`), dan naskah kajian air yang sudah terbit memakai `00-depan-kata-pengantar.md`, `00-depan-ringkasan-eksekutif.md`, `90-lampiran-a.md` dst. Berkas tunggal tidak bisa memuat dua bagian depan atau sebelas lampiran. Semua dokumen memakai pola berkas per front matter (sudah tertulis di KERANGKA §1 dan §8.1 M6); `rakit-kajian.js` yang meminta berkas tunggal harus disesuaikan di tiket SP-005.
2. **Waktu tayang sesudah merge ke `main`.** Brief menyebut "paling lambat 21.20 WIB" (data.yml). Kenyataannya terbit.yml menerbitkan dalam hitungan menit dan `titik.yml` men-deploy `main` tiap 3 jam; semua dokumen menulis "dalam hitungan menit, paling lambat 21.20 WIB".
3. **Tamu `/api/sippa/data/<nama>`.** RENCANA-UJI lama menulis 403; DESAIN-TEKNIS §4.3 menulis 401. Dipakai 401 (DT), dan semua dokumen menulis "401 identik untuk ada dan tidak ada".

## 5. Tindak lanjut di luar enam dokumen (untuk sesi induk)

1. `AGENTS.md` §2.1 baris 1 masih menulis "50 keputusan pemilik"; perlu "keputusan 1–53" (di luar wewenang penyelaras).
2. `naskah-kajian.js` dan `rakit-kajian.js` belum bercabang `sippa` (TIKET SP-005); sampai selesai, workflow tidak dijalankan untuk SIPPA.
3. Agent `sippa` dan `penulis-kajian` belum ada di roster (TIKET SP-003, SP-085).
4. Penyelaras tidak meng-commit. Selama penyelarasan berjalan, sesi lain meng-commit keenam dokumen dalam keadaan setengah jadi (`fee28d48`, `727c412e`, `699585fe`, pesan "gas"); keadaan akhir sekarang sama dengan HEAD untuk keenam dokumen, dan `PENYELARASAN.md` belum dilacak git.


## Penyelarasan 26 Okt 2026: nomor migrasi

`migrations/0055_uji_lapangan.sql` (halaman /uji-lapangan) sudah memakai nomor 0055. Migrasi SIPPA digeser: 0056_sippa_inti, 0057_sippa_ab_skenario, 0058_sippa_telemetri, di PRD, DESAIN-TEKNIS, RENCANA-UJI, dan TIKET. Catatan lama di dokumen ini yang menyebut 0055–0057 dibaca sebagai 0056–0058.
