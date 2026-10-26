# Contoh deck: spek, keluaran asli, dan render

Tujuh spek di `assets/proyek-contoh/spek/` dibangun ulang dari zip skill ini dan semuanya LOLOS gerbang 26 Okt 2026
(halaman PDF = slide). Semua memakai registri contoh `assets/proyek-contoh/data/angka.json` dan CSV paket data di
`assets/proyek-contoh/data/`. Spek ini titik awal deck baru: salin yang paling mirip, lalu ganti isinya.

## Spek

| Spek | Slide | Asal | Gunanya |
| --- | --- | --- | --- |
| `spek-mitigasi.json` | 9 (8 spek, lampiran terpecah 2) | `bangun/pptx/contoh/` | contoh kecil semua komponen inti: sampul berfoto, Pesan Kunci (tesis + temuan), grafik tren IRBI, peta kelas IRBI berpenanda, tabel peringkat, pembatas Lampiran, lampiran-tabel dipecah "(lanjutan 2/2)". Dipakai uji diri `periksa.py` |
| `spek-uji-air.json` | 6 | `bangun/pptx/contoh/` | sampul gelap, tabel-peringkat, kartu skenario, strategi tiga fase bertaut rekomendasi, rekomendasi dua slide ber-seri. Dipakai uji diri |
| `deck-air.json` | 17 | `naskah/air/deck.json` | deck final Grand Design Ketahanan Air Pulau Jawa 2026–2030: Pesan Kunci, bagian A sampai E (tabel, tiga peta Jawa, dua kartu skenario, matriks kewenangan, tiga fase, kalender, tiga slide rekomendasi), Kesimpulan, penutup berfoto Waduk Sermo |
| `deck-mitigasi.json` | 17 | `naskah/mitigasi/deck.json` | deck final Grand Design Mitigasi Bencana Indonesia 2026–2030: grafik korban, peta IRBI 2025 nasional, matriks kelas dampak, dua kartu skenario ber-seri, analog nonalam, panel kesenjangan, tiga fase, kalender, matriks peran lembaga, tiga rekomendasi, Kesimpulan |
| `deck-rehab.json` | 18 | `naskah/rehab/deck.json` | deck final Grand Design Rehabilitasi dan Rekonstruksi Air dan Akses Pascabencana 2026–2030: pola tabel/matriks bergantian, peta jembatan provinsi (manifest perender DOCX), kerangka program tiga lapis, matriks K/P/R/I, dua rekomendasi, Kesimpulan |
| `spek-update-air.json` | 11 | `keluaran/update-231026/` | deck pembaruan penyusunan 231026: `pil_draf` DRAF PEMBARUAN, `cut_off` berjam, peta Jawa per bahaya dengan legenda dari manifest, Kesimpulan berupa status penyusunan dan jadwal |
| `spek-update-mitigasi.json` | 13 | `keluaran/update-231026/` | deck pembaruan mitigasi: `horizon_label`, `judul_sampul_maks_baris`, kartu skenario La Nina analog, contoh program kompendium dua slide |

Catatan lintasan perbaikan (devil's advocate) pada salinan skill: kedua spek pembaruan dibangun 23 Okt dengan gerbang saat
itu. Pada gerbang 26 Okt keduanya GAGAL: T-8 dan T-4 (tiga-serangkai di judul Pesan Kunci, tesis, butir panel, isi pita,
label data CSV "Penguatan Kelembagaan, Pendanaan, dan Peningkatan Kolaborasi Multi-Pihak ...", "Gempa, tsunami, dan
likuefaksi Sulawesi Tengah") dan S36 (slide 7 mitigasi hanya kartu tanpa visual). Salinan skill dibetulkan: kalimat ditulis
ulang tanpa daftar tiga, label CSV dipendekkan lewat `ganti` kolom, slide 7 diubah ke `temuan-grafik` dengan grafik
kematian COVID per tahun dan daftar analog di panel. Isi angka tidak berubah. Spek asli di repo (`keluaran/update-231026/`)
masih bentuk 23 Okt dan akan gagal bila dibangun ulang dengan gerbang terkini.

## Keluaran asli di repo (dibangun dari spek yang sama)

| Berkas | Halaman |
| --- | --- |
| `keluaran/final/Grand Design Ketahanan Air Pulau Jawa 2026-2030.pptx` + `Paparan Grand Design Ketahanan Air Pulau Jawa 2026-2030.pdf` | 17 |
| `keluaran/final/Grand Design Mitigasi Bencana Indonesia 2026-2030.pptx` + `Paparan ... .pdf` | 17 |
| `keluaran/final/Grand Design Rehabilitasi dan Rekonstruksi Air dan Akses Pascabencana 2026-2030.pptx` + `Paparan ... .pdf` | 18 |
| `keluaran/update-231026/Update Grand Design Ketahanan Air Pulau Jawa 2026-2030 231026.pptx` + PDF | 11 |
| `keluaran/update-231026/Update Grand Design Mitigasi Bencana Indonesia 2026-2030 231026.pptx` + PDF | 13 |

Paket final tiap kajian 8 berkas bersama DOCX dan PDF dokumennya (P13). Tiap PPTX punya manifest `<stem>.manifest.json`
(spek, pesan kunci, slide dengan jenis, judul, peran warna, angka bersumber, masukan ber-hash).

## Render contoh (`assets/contoh-png/`, 60 dpi, 800 x 450 px)

| Berkas | Jenis deck | Yang diperlihatkan |
| --- | --- | --- |
| `d3-harian-1-sampul.png` | Laporan harian d3 (templat pemilik 221026) | foto kanan fade putih, logo dalam lingkaran, judul 2 baris, pil PERIODE, DISAMPAIKAN OLEH, pil tanggal navy |
| `d3-harian-2-ringkasan-peta.png` | Laporan harian d3 | grup KEJADIAN BENCANA + PERLU PERHATIAN, peta penanda per jenis + badge, panel STATUS PENANGANAN, pita YANG AKAN DILAKUKAN BNPB |
| `d3-harian-3-rincian-jenis.png` | Laporan harian d3 | panel per jenis selebar isinya (Karhutla 13 lebar, Kekeringan 2 sempit), daftar lokasi dengan ikon status (selesai centang navy, dalam penanganan titik tiga oranye), chip hotspot dan sisa ha, kartu kekeringan per kabupaten (KK, jiwa, liter, tangki), keterangan status |
| `d3-harian-4-penutup.png` | Laporan harian d3 | penutup GELAP, Terima kasih 54 pt, garis oranye, nama lembaga |
| `penanganan-221026-1-peta.png`, `-2-tabel.png` | Laporan Penanganan (d6, templat BNPB) | peta hotspot + kotak angka nasional; tabel provinsi tiga hari, chip grup, baris Jumlah navy, pil CUT OFF |
| `wilayah-jambi-241026-1-provinsi.png` | Paparan wilayah (pola d5) | judul deskriptif satu sorot, grup DATA SATELIT dan PERLU PERHATIAN, peta kab bertitik + legenda cluster, tabel peringkat berpil, panel kejadian dan status, pita tren batang harian |
| `wilayah-jambi-241026-4-risiko-musim-hujan.png` | Paparan wilayah | slide risiko lanjutan (peralihan musim): grup PRAKIRAAN HUJAN dan PRESEDEN, tabel kab/kota berstatus Waspada dengan chip ancaman berikon, panel kejadian DIBI, pita YANG PERLU DISIAPKAN; tanpa pil CUT OFF (slide risiko d5) |
| `wilayah-jambi-251026-1-peta3d-slotfoto.png` | Paparan wilayah | peta provinsi 3D miring (freeform native per kabupaten) dan slot foto (keputusan 25 Okt) |
| `kajian-mitigasi-01-sampul.png` | Deck kajian | sampul kajian berfoto Commons beratribusi |
| `kajian-mitigasi-02-pesan-kunci-navigasi.png` | Deck kajian | Pesan Kunci: tesis navy, temuan "Temuan A.1" berikon dan berpil keyakinan, pita keputusan, baris Sumber |
| `kajian-mitigasi-05-matriks.png` | Deck kajian | judul temuan "B2." berangka oranye, grup kartu, matriks kelas dampak, panel Cara membaca |
| `kajian-mitigasi-06-kartu-skenario.png` | Deck kajian | kartu skenario satu kontainer: kerusakan dan korban berchip keyakinan, kemungkinan 5 kelas, angka kebijakan, respons, pemulihan, lembaga |
| `kajian-mitigasi-14-rekomendasi.png` | Deck kajian | baris LANGKAH, RINCIAN, PENANGGUNG JAWAB, lingkaran jenis aksi, chip horizon dan status, chip lembaga |
| `kajian-mitigasi-16-kesimpulan.png` | Deck kajian | 8 kartu grid 4 x 2 dan pita ARAHAN YANG DIMINTA |
| `kajian-air-03-tabel.png`, `kajian-air-04-peta.png`, `kajian-air-11-strategi-tiga-fase.png` | Deck kajian | tabel peringkat subsiden, peta Jawa 5 kelas nilai berlegenda dari manifest, tiga panel fase bertaut kode rekomendasi |
| `kajian-rehab-03-grafik.png`, `kajian-rehab-18-penutup.png` | Deck kajian | grafik batang native, penutup berfoto |
| `kajian-rehab-05-peta.png` | Deck kajian, **contoh cacat** | peta simbol proporsional memakai PNG render DOCX yang sudah memuat label, legenda, dan baris sumber batas, sehingga legenda dan sumber batas tampil dua kali. Lolos gerbang mesin, tetapi melanggar S37 (PNG peta di slide tanpa teks; label dan legenda dibangun native). Untuk deck baru render PNG khusus deck tanpa lapisan teks, seperti `peta_irbi.py` |
| `update-air-01-sampul.png`, `update-air-10-kesimpulan-status.png`, `update-mitigasi-08-kartu-skenario.png` | Deck pembaruan | sampul pembaruan, Kesimpulan status penyusunan, kartu skenario dengan pil DRAF PEMBARUAN di atas pil CUT OFF |
