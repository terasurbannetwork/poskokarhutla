# Paritas karhutla vs banjir

Audit akhir 19 Okt 2026 malam, HEAD c191384. Rincian 113 baris dengan bukti `berkas:baris`: [`bencana/banjir.md`](bencana/banjir.md).
Yang dibandingkan: karhutla yang TAMPIL (posko, sarana, keputusan, informasi, metode yang disembunyikan tidak dihitung kurang).
Pembuktian: `gerbang-{bencana,inti,ilmu-agent,tab-registry}` 18/18; `tests/banjir` 40 lulus, 1 dilewati (`prospektif.json` tak ada lokal);
swa-uji `uji_balik`, `unit_respons`, `hulu`, `citra_banjir`, `bukti_das`, `ambang_wilayah` ok.
Data lokal hanya baseline (CI membuat data tayang tanpa commit); `hujan/status/rob/posko/validasi.json` lokal bertanggal 13 Okt.

## Hitungan

| | ADA | SEBAGIAN | BELUM | TB |
| --- | --- | --- | --- | --- |
| Pagi 19 Okt | 76 | 28 | 6 | 3 |
| Malam 19 Okt | 70 | 36 | 5 | 2 |

Tidak ada komponen yang mundur. Selisih karena pemeriksaan malam lebih ketat: keputusan/sarana (A22, A24), indeks lereng (A12),
heli (A23), preventif (A25), kesetaraan Python-JS (B07), rentang waktu (C06), berita (C17), muat/375 px/INP (C31-C33), admin (C36),
`URL_STATUS` (E06) kini SEBAGIAN. Naik hari ini: kejadian aktif `B####` di peta + rute `/banjir/k/B####`, unit respons, prospektif
(live 19 Okt, 521 kabupaten, belum ada skor), Lapor Warga multi-bahaya, foto dummy, lapisan konteks, EN, F02.

## Yang sama dengan karhutla

Kepala, menu, tab URL bersih, peta satelit multi-mode, kartu hover, legenda dok, Insight (±18 eksibit), Tren, Dampak, Simulasi
(banjir, genangan, longsor), pop-up Situasi, Foto + dummy, Tentang, bagikan, OG `/banjir/k/B0007`, statistik, pemilik berkas.

## Beda yang sah (D)

Status dari aturan ambang Perka BNPB (bukan model terlatih); hari prakiraan 0..3 menggantikan rentang waktu; tidak ada penanggung
jawab tunggal lahan (A26) dan cuaca per jam terpisah (A31); simulasi per wilayah administratif.

## Ketepatan: diakui, belum membaik

Uji balik `validasi.json` (POD/FAR/CSI/PSS/ETS + bootstrap blok): ETS 0,02-0,03, FAR 0,92-0,96, ditampilkan apa adanya. Protokol
ambang per kabupaten (`ambang_wilayah.py`, RISET-AMBANG-WILAYAH.md:122 "Belum dijalankan") lulus swa-uji tetapi tidak dijalankan:
DIBI harian 2016-2021 tidak tersedia; `status.py` tetap `i_waspada` 20 dan tidak membaca berkas apa pun. Kejadian aktif memakai skor
"belum dikalibrasi" tanpa angka tangkapan/presisi.

## 5 celah terbesar

1. Paket pimpinan (A30, C21, C16, B04): tanpa `ringkasan.json`/dashboard, cerita, galeri kejadian besar.
2. Bukti ketepatan: prospektif baru mulai 19 Okt (B03), ambang per kabupaten terblokir data (B01/A13), skor kejadian belum dikalibrasi (A14).
3. Rantai pipeline: `hulu.py`, `unit_respons.py`, `citra_banjir.py`, `bukti_das.py` tidak dipanggil workflow mana pun; `uji` tiga skrip tak terdaftar (E01).
4. Data sekunder tipis/basi: berita 16 Okt tanpa label uji (A33), video tidak ada (A34), sekolah/faskes 9 provinsi (A29), katalog BNPB/InaRISK tak pernah diperbarui (A01/A38).
5. Gerbang non-fungsional: tanpa uji otomatis 375 px/INP (C32-C33), `keputusan.js`/`posko.js` tanpa uji (A22/A24), kesetaraan hanya cek runtime (B07); laci kejadian miskin (C12) dan Lapor Warga admin tanpa pemilah bahaya (C36).

## Rusak / basi

- `banjir.yml:164-179`: `URL_STATUS` bawaan menunjuk worker yatim `poskokarhutla.terasurbannetwork.workers.dev`; kesegaran bisa dinilai pada worker yang salah kecuali `vars.URL_STATUS` diset.
- `unit_respons.py` docstring "bulanan" dan `hulu.py` "dibangun sesudah status.py" tanpa pemanggil (`hulu.json`, dipakai `insight.js:229`, akan basi; `unit_respons.json` hanya 29 unit SAR bernomor).
- `prakiraan72.json` lokal: `kec_dihitung` 0 padahal `hujan_ansambel.json` 19 Okt ada; `meta.json` lokal `hari_wib` 13 Okt padahal `dibuat` 19 Okt.
- `.claude/ilmu-agent/banjir.md` memuat klaim usang (rute `/banjir/k/B...` tak dilayani; kini `PATH_K: true`).
- `scripts/i18n/laporan.json` 15 Okt; 9 dari 14 string baru banjir belum di kamus EN.
- Live: `/api/status` banjir 4,2 jam (ambang 30), `kejadian_aktif_awal.json` 11 kejadian dibuat 16:14 WIB, `seri_status.json` 3 hari (lokal benih kosong 31 byte).
