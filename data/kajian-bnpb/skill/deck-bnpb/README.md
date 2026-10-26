# deck-bnpb: daftar berkas

Skill mandiri untuk deck BNPB. Mulai dari `SKILL.md`. Tiap berkas di folder ini tercantum di bawah dengan ukurannya.
Berkas data contoh dikelompokkan per folder; semuanya dibutuhkan agar tujuh spek contoh bisa dibangun ulang.

| Berkas | Ukuran | Isi |
| --- | --- | --- |
| `README.md` | - | berkas ini: daftar semua berkas |
| `SKILL.md` | 10.7 KB | pintu masuk skill: kapan dipakai, aturan keras, sepuluh langkah, mulai cepat |
| `assets/fonts/LICENSE.txt` | 11.1 KB | lisensi Apache 2.0 Roboto |
| `assets/kandidat-foto-commons.csv` | 108.0 KB | kandidat foto Wikimedia Commons per topik dengan lisensi, pengarang, URL |
| `assets/proyek-contoh/data/angka.json` | 84.3 KB | registri angka contoh: 220 kunci yang dipakai tujuh spek dan uji diri |
| `assets/proyek-contoh/data/glosarium.json` | 47.3 KB | glosarium dan istilah terlarang D-10 |
| `assets/proyek-contoh/kredit.json` | 4.7 KB | atribusi foto Commons `[{file, penulis, lisensi}]` |
| `assets/proyek-contoh/logo/sumber-bnpb.png` | 55.2 KB | logo BNPB resmi (kepala slide dan lingkaran sampul) |
| `assets/proyek-contoh/pustaka.json` | 343.2 KB | daftar pustaka (dibutuhkan Konteks; kunci untuk entri registri bernilai pustaka) |
| `assets/proyek-contoh/spek/deck-air.json` | 51.1 KB | spek deck final kajian (lihat references/contoh-deck.md) |
| `assets/proyek-contoh/spek/deck-mitigasi.json` | 54.3 KB | spek deck final kajian (lihat references/contoh-deck.md) |
| `assets/proyek-contoh/spek/deck-rehab.json` | 33.1 KB | spek deck final kajian (lihat references/contoh-deck.md) |
| `assets/proyek-contoh/spek/spek-mitigasi.json` | 12.5 KB | spek uji diri periksa.py |
| `assets/proyek-contoh/spek/spek-uji-air.json` | 13.1 KB | spek uji diri periksa.py |
| `assets/proyek-contoh/spek/spek-update-air.json` | 30.8 KB | spek deck pembaruan 231026, sudah melewati lintasan perbaikan 26 Okt |
| `assets/proyek-contoh/spek/spek-update-mitigasi.json` | 34.0 KB | spek deck pembaruan 231026, sudah melewati lintasan perbaikan 26 Okt |
| `assets/proyek-contoh/tema.json` | 58.3 KB | token desain (warna, tipografi, komponen slide, kosakata, ikon, kajian, qa) |
| `assets/templat-bnpb.pptx` | 1.3 MB | deck pemilik 221026 (d3): master, tema Roboto, layout PUTIH/GELAP; slidenya dibuang mesin |
| `references/NASKAH-SPEK.md` | 38.6 KB | dialek naskah: token angka (bagian 8), keyakinan (9), spek deck (17); dibaca uji diri naskah.py |
| `references/angka-dan-copy.md` | 4.0 KB | Buku Pegangan bab Angka & copy |
| `references/anti-slop.md` | 41.6 KB | ANTI-SLOP.md (S-1 sampai S-43, contoh salah dan benar) + TAMBAHAN-ANTI-AI |
| `references/contoh-deck.md` | 7.6 KB | tujuh spek contoh, keluaran asli, daftar render contoh |
| `references/contoh-judul.md` | 6.3 KB | judul yang lolos dan yang ditolak, pola baku per jenis deck |
| `references/deck-operasional.md` | 32.0 KB | laporan harian, Penanganan, paparan wilayah, Presiden: keputusan operasional terbaru dan cara bangun |
| `references/jenis-slide-S35.md` | 3.0 KB | daftar tertutup jenis_slide, pasangan dengan tata letak, aturan variasi |
| `references/keputusan-pemilik.md` | 29.1 KB | urutan otoritas, KEPUTUSAN.md (P, T), Keputusan pemilik Buku Pegangan, riwayat koreksi deck |
| `references/komponen-dan-tata-letak.md` | 33.3 KB | nilai tema.json: kerangka, warna, tipografi, geometri komponen, kosakata, ikon, kajian |
| `references/pedoman-desain-deck.md` | 126.0 KB | PEDOMAN-DESAIN bagian deck: warna B1, komponen, B7 deck kajian, bahasa dan angka C, gerbang D |
| `references/peta-jalur.md` | 4.3 KB | jalur repo poskokarhutla ke jalur skill; yang tidak dibawa dan alasannya |
| `references/pola-konsultan.md` | 40.4 KB | S1 sampai S39, pola konsultan, yang tidak ditiru, bentrok, cara memeriksa; TAMBAHAN-PPTX-RULES |
| `references/proses-produksi.md` | 12.3 KB | sepuluh langkah produksi end to end + TAMBAHAN-RISET |
| `references/qa-gerbang.md` | 6.8 KB | tiga lapis gerbang, perintah, cara membaca, pemeriksaan manual |
| `references/selera-presentasi.md` | 34.9 KB | Buku Pegangan bab Selera presentasi (PPT) lengkap + subbab Pilih grafik dan Anatomi gambar |
| `references/spek-deck-json.md` | 14.6 KB | skema spek JSON medan demi medan dan semua penolakan mesin |
| `scripts/banned-ai-words.txt` | 2.3 KB | 182 kata terlarang khas AI (Inggris), dibaca slop.py |
| `scripts/cakupan.json` | 13.1 KB | registri cakupan gerbang (diuji, dikecualikan, antre) |
| `scripts/deck.py` | 111.0 KB | pembangun spek JSON ke PPTX di templat BNPB, `--pdf` lewat LibreOffice, manifest, laporan QA |
| `scripts/glif.json` | 8.2 KB | glif Lucide dan glif khusus untuk 41 konsep ikon registri |
| `scripts/ikon.py` | 3.1 KB | ikon garis registri ke PNG 256 px (PyMuPDF), uji diri |
| `scripts/naskah.py` | 57.1 KB | resolver token `{{angka:...}}`, format angka id-ID, Konteks registri; uji diri |
| `scripts/periksa.py` | 30.7 KB | gerbang deck (XML, PDF, manifest), laporan QA S39, `--serah` cek basi, uji diri 44 fixture |
| `scripts/peta_irbi.py` | 4.3 KB | perender peta kelas IRBI nasional: GeoJSON ke SVG ke PNG + manifest perender |
| `scripts/peta_jawa.py` | 7.1 KB | perender peta Jawa per bahaya 5 kelas nilai + manifest berlegenda |
| `scripts/qa_periksa.py` | 134.5 KB | gerbang QA repo D-1 sampai D-32 dan T-1 sampai T-11 (deck memakai sebagian) |
| `scripts/requirements.txt` | 371 B | pustaka Python berpin (python-pptx, PyMuPDF, lxml, Pillow, XlsxWriter, spylls) |
| `scripts/slop.py` | 71.9 KB | detektor AI slop S-1 sampai S-43 dan ambang anti-AI per slide |
| `scripts/tema.py` | 12.9 KB | pemuat dan validator tema.json (AKAR proyek dari DECK_AKAR), uji diri |

## Berkas per folder

### `assets/contoh-png/` (24 berkas, render contoh 60 dpi per jenis deck (d3 harian, Penanganan, paparan wilayah, kajian, pembaruan))

`d3-harian-1-sampul.png` (320.6 KB), `d3-harian-2-ringkasan-peta.png` (111.5 KB), `d3-harian-3-rincian-jenis.png` (84.2 KB), `d3-harian-4-penutup.png` (182.0 KB), `kajian-air-03-tabel.png` (70.5 KB), `kajian-air-04-peta.png` (106.7 KB), `kajian-air-11-strategi-tiga-fase.png` (71.0 KB), `kajian-mitigasi-01-sampul.png` (275.2 KB), `kajian-mitigasi-02-pesan-kunci-navigasi.png` (83.0 KB), `kajian-mitigasi-05-matriks.png` (70.7 KB), `kajian-mitigasi-06-kartu-skenario.png` (74.1 KB), `kajian-mitigasi-14-rekomendasi.png` (88.7 KB), `kajian-mitigasi-16-kesimpulan.png` (64.4 KB), `kajian-rehab-03-grafik.png` (42.7 KB), `kajian-rehab-05-peta.png` (117.5 KB), `kajian-rehab-18-penutup.png` (432.8 KB), `penanganan-221026-1-peta.png` (118.8 KB), `penanganan-221026-2-tabel.png` (100.3 KB), `update-air-01-sampul.png` (252.1 KB), `update-air-10-kesimpulan-status.png` (55.1 KB), `update-mitigasi-08-kartu-skenario.png` (76.2 KB), `wilayah-jambi-241026-1-provinsi.png` (103.0 KB), `wilayah-jambi-241026-4-risiko-musim-hujan.png` (93.5 KB), `wilayah-jambi-251026-1-peta3d-slotfoto.png` (124.7 KB)

### `assets/fonts/` (3 berkas, Roboto Regular, Medium, Bold (pasang ke sistem untuk LibreOffice; metrik pas teks))

`Roboto-Bold.ttf` (502.2 KB), `Roboto-Medium.ttf` (499.6 KB), `Roboto-Regular.ttf` (503.0 KB)

### `assets/proyek-contoh/data/air-jawa/` (6 berkas)

`bendungan.csv` (10.0 KB), `irbi_kab_2015_2025.csv` (152.3 KB), `neraca_jawa.csv` (2.9 KB), `peta_kab.geojson` (914.8 KB), `provinsi.csv` (2.0 KB), `subsiden_kota.csv` (9.0 KB)

### `assets/proyek-contoh/data/dibi/` (2 berkas)

`kejadian_besar.csv` (132.9 KB), `rekap_nasional_tahunan.csv` (89.2 KB)

### `assets/proyek-contoh/data/irbi/` (7 berkas)

`irbi.json` (1.8 MB), `irbi_agregat_provinsi.csv` (138.9 KB), `irbi_agregat_pulau.csv` (31.8 KB), `irbi_hitung_kelas.csv` (3.5 KB), `irbi_kab_2015_2025.csv` (1.3 MB), `irbi_kab_2025.csv` (66.9 KB), `irbi_tren_2015_2024.csv` (27.2 KB)

### `assets/proyek-contoh/data/lembaga/` (3 berkas)

`celah.csv` (19.6 KB), `matriks_air.csv` (12.8 KB), `matriks_bencana.csv` (4.3 KB)

### `assets/proyek-contoh/data/nonalam-sosial/` (2 berkas)

`covid19_nasional.csv` (15.0 KB), `skenario_terburuk.csv` (15.2 KB)

### `assets/proyek-contoh/data/program-terbukti/` (3 berkas)

`bukti_dampak.csv` (73.7 KB), `kompendium_program.csv` (41.9 KB), `renas_pb_2025_2029.csv` (7.6 KB)

### `assets/proyek-contoh/data/skenario-hidromet/` (4 berkas)

`kartu_skenario.csv` (155.7 KB), `kartu_skenario.json` (212.0 KB), `kepekaan_peringatan_dini.csv` (61.6 KB), `musim_hujan.csv` (3.2 KB)

### `assets/proyek-contoh/data/turunan/` (2 berkas)

`angka_tesis.csv` (740 B), `daftar_perhatian_kepekaan.csv` (2.6 KB)

### `assets/proyek-contoh/data/turunan/deck-rehab/` (10 berkas)

`celah_dana.csv` (434 B), `data_hilang.csv` (377 B), `lantai.csv` (566 B), `mandat.csv` (346 B), `matriks.csv` (457 B), `preseden.csv` (337 B), `program.csv` (687 B), `program_jembatan.csv` (295 B), `pulih_sumatra.csv` (134 B), `sumur.csv` (234 B)

### `assets/proyek-contoh/data/turunan/gambar-rehab/` (2 berkas)

`jembatan_tahun.csv` (119 B), `peta_jembatan_prov.csv` (1.4 KB)

### `assets/proyek-contoh/foto/` (5 berkas, foto Commons beratribusi untuk sampul dan penutup contoh)

`air-penutup-sermo.jpg` (841.5 KB), `bencana-gempa.jpg` (625.3 KB), `bencana-rob.jpg` (192.0 KB), `bencana-tsunami.jpg` (188.3 KB), `sampul-rehab.jpg` (159.2 KB)

### `assets/proyek-contoh/geo/` (1 berkas, batas provinsi untuk perender peta (bukan rujukan resmi))

`provinsi.json` (381.4 KB)

### `assets/proyek-contoh/geo/kabupaten/` (38 berkas, batas kab/kota per provinsi untuk peta_irbi.py)

`11.json` (164.4 KB), `12.json` (252.4 KB), `13.json` (163.7 KB), `14.json` (140.5 KB), `15.json` (91.0 KB), `16.json` (188.7 KB), `17.json` (62.2 KB), `18.json` (144.8 KB), `19.json` (75.0 KB), `21.json` (177.9 KB), `31.json` (13.5 KB), `32.json` (184.9 KB), `33.json` (209.9 KB), `34.json` (21.6 KB), `35.json` (270.3 KB), `36.json` (56.1 KB), `51.json` (45.2 KB), `52.json` (112.4 KB), `53.json` (227.3 KB), `61.json` (269.5 KB), `62.json` (155.3 KB), `63.json` (107.8 KB), `64.json` (256.6 KB), `65.json` (171.8 KB), `71.json` (102.5 KB), `72.json` (249.4 KB), `73.json` (210.3 KB), `74.json` (185.5 KB), `75.json` (59.7 KB), `76.json` (64.2 KB), `81.json` (289.4 KB), `82.json` (195.7 KB), `91.json` (199.3 KB), `92.json` (222.6 KB), `93.json` (87.5 KB), `94.json` (152.8 KB), `95.json` (114.1 KB), `96.json` (191.1 KB)

### `assets/proyek-contoh/naskah/air/` (1 berkas)

`deck_kalender_rencana_aksi.csv` (596 B)

### `assets/proyek-contoh/naskah/mitigasi/` (3 berkas)

`deck_kalender_rencana_aksi.csv` (560 B), `deck_kelas_dampak.csv` (578 B), `deck_korban_alam.csv` (136 B)

### `assets/proyek-contoh/peta/` (12 berkas, PNG peta dasar + manifest perender (unsur_peta, masukan ber-hash, legenda))

`deck-peta-irbi-2025.json` (4.2 KB), `deck-peta-irbi-2025.png` (272.7 KB), `peta-irbi-2023.json` (4.3 KB), `peta-irbi-2023.png` (273.2 KB), `peta-irbi-banjir-2025-jawa.json` (1.2 KB), `peta-irbi-banjir-2025-jawa.png` (206.3 KB), `peta-irbi-kekeringan-2025-jawa.json` (1.1 KB), `peta-irbi-kekeringan-2025-jawa.png` (210.3 KB), `peta-irbi-longsor-2025-jawa.json` (1.2 KB), `peta-irbi-longsor-2025-jawa.png` (209.4 KB), `peta-jembatan-provinsi.json` (8.4 KB), `peta-jembatan-provinsi.png` (276.3 KB)

Total: 175 berkas, 22.4 MB.
