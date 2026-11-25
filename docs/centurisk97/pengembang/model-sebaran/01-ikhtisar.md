# Ikhtisar model sebaran

Modul ini menjawab tiga pertanyaan operasional tentang kebakaran hutan dan lahan: titik panas yang baru muncul akan membesar atau tidak, ke sel mana api menjalar dalam 72 jam, dan sel mana yang berpeluang mengandung api dalam tujuh hari ke depan. Semua jawabannya adalah perkiraan model, bukan pengamatan dan bukan keputusan resmi.

Modul ini terdiri dari enam komponen yang berbeda status ujinya.

| Komponen | Apa yang diramal | Tempat tampil | Status uji (dari berkas di repo) |
| --- | --- | --- | --- |
| Peluang titik panas baru membesar ("WASPADA", `lolos.py`) | Titik panas baru mencapai 10 sel VIIRS 375 m (sekitar 140 hektare) atau lebih dalam 72 jam | Kartu perkiraan di tab Simulasi, jejak api | Uji balik 2015 sampai 2023 dan uji 2024 sampai 2026 baik (AUC 0,91), tetapi uji prospektif masih `belum_cukup_data` pada salinan lokal; gerbang pembanding menahan penampilan sebagai non-eksperimental |
| Model sel (gradient boosting, 40 fitur) | Peluang tiap sel 375 m terbakar dalam 24, 48, 72 jam, luas dengan rentang | Garis biru dan kartu di tab Simulasi | Kalah dari pembanding "api tetap di tempat" pada IoU sel terbakar (0,58 lawan 0,67), jadi berlabel eksperimental |
| Mesin fisika Simulasi (FBP Kanada, waktu tempuh minimum) | Waktu tiba api per sel, luas per skenario | Tab Simulasi | Tidak divalidasi untuk Indonesia; galat luas 72 jam 3,50 lawan 1,01 untuk "luas awal tetap" pada 123 kejadian; hanya dipakai membandingkan skenario |
| Jejak api kompleks aktif (`jejak.py`) | Simulasi 24, 48, 72 jam untuk tiap kompleks aktif | `public/data/jejak_api.json`, dibaca peringatan email (`src/ews.js`) | Dipakai hanya bila `boleh_tampil` bernilai `true`. `jejak_api.json` dibuat CI dan tidak ada di repo, sehingga nilai terkininya belum terdokumentasi di kode; pada salinan lokal `gerbang_model.json` (23 Okt 2026) gerbang `jejak_api` bernilai `false` |
| Peluang api 7 hari per sel 5,5 km ("model P1", `risiko_produksi.py`) | Sel memuat sekurangnya satu titik NOAA-20 dalam minggu berlaku | Lapisan peta "Peluang api 7 hari (eksperimental)", hanya untuk yang sudah masuk | Uji balik lolos empat syarat; uji prospektif mingguan sedang berjalan, belum ada vonis |
| Riset pendukung | Awal musim, tren 25 tahun, pendorong, analisis galat, PFVI, skor prioritas, kalibrasi wilayah, uji tutupan lahan dan bahan bakar | Insight (cerita musim dan pendorong), Metode | Beberapa gagal dan sengaja tidak dipasang (lihat bagian Metode) |

Pengguna modul ini adalah staf BNPB dan BPBD yang memantau kompleks karhutla (tab Simulasi, Insight, Tren, Metode), akun pemirsa dan admin yang boleh melihat lapisan peluang 7 hari, dan penerima peringatan email yang isinya memakai jejak api. Warga umum dapat membuka tab-tab publik di halaman utama, tetapi tidak menerima keluaran khusus warga dari modul ini.

Dokumen sumber: modul ini tidak memiliki paket `KEPUTUSAN-*.md`, `PRD.md`, atau `ALGORITMA.md` di `data/kajian-bnpb/`. Dasar tertulisnya adalah `scripts/sebaran/SEBARAN_MODEL.md` (cara memasang dan memperbarui), `scripts/sebaran/RISET-SEBARAN.md` (angka dan klaim), `scripts/sebaran/RISET-PFVI.md` dan `PAPER-PFVI.md`, `docs/riset/RISIKO-MINGGUAN.md`, `docs/riset/SKOR-PRIORITAS.md`, `docs/riset/HIERARKI-WILAYAH.md`, serta ilmu agent `.claude/ilmu-agent/model-sebaran.md`. Bila dokumen dan kode berbeda, tulisan ini mengikuti kode; selisihnya dicatat di bagian Batasan.

## Hal yang sering disalahpahami

1. Luas dan sel pada Simulasi bukan pengamatan. Titik panas satelit melebihkan api kecil dan tidak melihat api di bawah awan atau asap.
2. Peluang membesar bukan peluang adanya api, dan "WASPADA" adalah tanda ambang (recall 70 persen), bukan kepastian. Pada uji, sekitar 10 dari tiap 100 titik baru ditandai, dan hanya sekitar 21 persen yang ditandai benar-benar membesar.
3. Arah penjalaran tidak dapat diramal dengan data ini: pada uji semua model salah arah 71 sampai 87 derajat (acak adalah 90 derajat).
4. "Model eksperimental" berarti model belum mengalahkan pembanding sederhana pada uji balik, bukan berarti kodenya rusak.
5. Kolom dan angka yang belum terukur ditulis "–" atau "belum teruji"; angka nol hanya ditulis bila memang dihitung nol (misalnya prospektif `dinilai: 0` berarti belum ada ramalan yang cukup umur 78 jam, bukan galat).
