# QA lapis (b) penyunting substansi: kajian air Bab 3

Berkas: `naskah/air/bab-03.md`. Pembanding: `naskah/air/bukti/bab-03.md`, `bab-03.angka.json`, `data/angka.json` dan
`bab-01` sampai `bab-10.angka.json`, KERANGKA §2 (butir 5–10, 17), §4 Bab 3, PEDOMAN §B5.27. Diperiksa 24 Oktober 2026.

## Pemeriksaan mekanis

- 160 token angka unik dibaca lewat `bangun/kontrak/naskah.py` dengan registri gabungan `data/angka.json` +
  `naskah/air/bukti/bab-*.angka.json`: semua kunci ada, nilai cocok dengan berkas bukti, label sah. `baca()` atas bab utuh
  lulus setelah suntingan.
- `qa/slop.py --final`: LOLOS, skor 0. Em dash dan titik tengah: nol.

## Suntingan

| No | Letak | Masalah | Tindakan |
| --- | --- | --- | --- |
| 1 | Subbab 3.8 paragraf 1–2 | Kunci `hidromet.jawa.lanina.pd_renas.korban_jiwa` ada di `data/angka.json` (153–330, faktor dikalikan ke longsor) dan di `bab-03.angka.json` (219–466, usulan bukti). Registri lama menang, sehingga naskah menulis "faktor tidak dikalikan ke tanah longsor" lalu menyajikan 153–330 yang justru mengalikannya (bukti P3, Catatan pemeriksaan no. 1). Hasil efek R = 8 juga tampil di kalimat pembuka tebal, padahal kalimat yang sama berkata hasilnya hanya di kartu (KERANGKA §2 butir 10) | Angka korban hasil efek dibuang dari Bab 3; pembuka tebal menjadi metode (R = 8, label Asumsi kebijakan, hanya di kartu dan grafik Bab 6); faktor 0,603 dan 0,998 tetap; kalimat jenis gabungan banjir dan tanah longsor tanpa angka 223–471 |
| 2 | Ringkasan bab butir 3; pembuka tebal pita model 3.6; contoh pembulatan 3.3 | Pita model 250–550 tampil di ringkasan dan judul paragraf; bukti P3 Celah: sampai diuji balik, pita hanya di kartu, tidak di judul atau kartu angka (KERANGKA §2 butir 9, larangan tampil) | Ringkasan dan pembuka tebal menyebut 156 tercatat dan mekanisme (1.816 kejadian); pita pindah ke badan teks berlabel belum diuji balik; contoh pembulatan diganti WorldPop "sekitar 160 juta" |
| 3 | Subbab 3.6 paragraf 1 | Aturan satu jenis satu kartu (lantai kejadian tunggal dan tahun terburuk per jenis; kartu musim = agregat operasional) tidak ada, padahal KERANGKA §2 butir 9 (P10, L20, V05/V08) | Ditambah satu kalimat; rujukan Perban 2/2023 diberi halaman (hlm. 4 dan 14, bukti P3) |
| 4 | Subbab 3.6 lantai | Lantai pengungsi 532.321 disebut "rekaman ... yang tidak terbukti" tanpa besaran | Besaran rekaman Kota Bekasi (366.274) disisipkan, ditulis "belum terverifikasi", dua angka disebut berdampingan |
| 5 | Ringkasan bab butir 1 | "119 kab/kota hanya memiliki satu komponen air yang lengkap" salah makna (bukti P1: hanya irigasi yang tersedia untuk seluruh 119) | Ditulis ulang |
| 6 | Ringkasan bab butir 2 | "lima syarat bersumber resmi"; syarat (d) penurunan muka tanah berlabel terverifikasi | "resmi atau terverifikasi" |
| 7 | Subbab 3.2 paragraf 2; Tabel 3.1 baris bendungan | 37 titik berlabel "resmi", padahal 18 resmi dan 19 sekunder/turunan sekunder (bukti P1 Komponen 3) | Badan teks menyebut sisanya sekunder; label baris "resmi dan sekunder per titik" |
| 8 | Subbab 3.5 pilihan kedua | Pemetaan syarat (d) per bahaya tidak menyebut tanah longsor | "tanpa penanda untuk tanah longsor" (bukti P2 catatan tabel) |
| 9 | Subbab 3.3 | "Kajian memakai empat label keyakinan" bertentangan dengan lima label KERANGKA §2 butir 6 | "empat dari lima label; Penilaian pakar tidak dipakai" (dicek: tak ada bab air yang memakainya) |
| 10 | Subbab 3.1 pembuka | "dengan lensa risiko BNPB" (frasa kosong) | "dari data kejadian dan risiko BNPB" |
| 11 | Subbab 3.9 pembuka | "Sedikitnya lima belas butir" padahal Tabel 3.7 memuat 12 baris (bukti P4 butir 5, 12, 15 tidak masuk tabel) | "Dua belas besaran ... versi angka atau definisi" |
| 12 | Tabel 3.5 catatan | Matriks kuantifikasi tanpa keterangan kepekaan (KERANGKA §4 Bab 3, G16) | Catatan: kepekaan berkalkulasi hanya faktor peringatan dini (selain longsor) dan pilihan analog pengungsi; lainnya kualitatif |
| 13 | Akhir bab: `matriks-rekomendasi` r-a03, r-a17, r-a14 | KERANGKA §2 butir 17: rekomendasi hanya di bab kesimpulan. Ketiga ID juga didefinisikan di `bab-10.md` dengan isi berbeda (unit r-a03 lain), sehingga ID ganda | Kedua blok dihapus; rujukan `@rek:` di ringkasan, 3.3, dan Tabel 3.8 tetap dan menunjuk definisi Bab 10 |

## Diperiksa dan tidak diubah

- Lantai: skenario tidak di bawah lantai tercatat per metrik (216; 270; 525.861 berdampingan 532.321; 6.905); batas pita
  di bawah lantai dinaikkan ke lantai dengan catatan. Tidak ada musim yang disisihkan (semua di atas pita 1).
- Angka model selalu berlabel dan bersanding angka tercatat (250–550 lawan 156; longsor 160 lawan rasio musim 0,13).
- Angka bertentangan berdampingan: pengungsi Jabodetabek 2020 (DIBI lawan Renstra), IRBI provinsi terendah 2023,
  Pekalongan dua baris terverifikasi, sedimentasi Pemali-Juana. Jatiluhur dan Cirata tidak dikutip nilainya (sekunder,
  KERANGKA §2 butir 5), meskipun KERANGKA §4 masih menyebut angkanya.
- "Terbukti": tidak ada program disebut terbukti; P16 tidak muncul di Bab 3 (sesuai Catatan wajib bukti).
- Kewenangan: tidak ada klaim BNPB sebagai regulator air; rekomendasi per WS diturunkan ke BBWS dan DI pusat.
- Pertanyaan kunci 1–4 KERANGKA terjawab; komponen Tabel 3.1–3.8 dan Gambar 3.1 ada.

## Sisa untuk orkestrator (di luar berkas ini)

1. Konflik registri `hidromet.jawa.lanina.pd_renas.korban_jiwa`: `data/angka.json` 153–330 lawan `bab-03.angka.json`
   219–466. Saat digabung, nilai bukti harus menang dan `kepekaan_peringatan_dini.csv` dibangun ulang (tanpa longsor).
   Periksa Bab 6 dan deck yang memakai kunci ini.
2. ID rekomendasi ganda: r-a04, r-a06, r-a07, r-a08, r-a12, r-a13 didefinisikan di `bab-06.md` dan `bab-10.md`.
3. Tabel 3.4 baru memuat sebaran DIBI, belum titik potong kelas 1–5; unitnya provinsi-tahun, sedangkan kartu Bab 5–6
   tingkat Jawa per musim (bukti P3 Celah). Ambang dan unit harus diputus dan dibekukan sebelum kartu dan kisi prioritas
   Bab 10 dinilai; sampai itu kalimat "unit skala disamakan dengan unit kartu" belum terpenuhi.
4. YLL (KERANGKA §2 butir 9, lampiran metode) tidak ada di bukti maupun naskah.
5. Angka lantai per jenis menunggu `skenario-hidromet/lantai_jenis.csv`; Bab 3 hanya menyatakan aturannya.
6. KERANGKA §4 Bab 3 masih memuat angka sekunder Jatiluhur dan Cirata sebagai rekonsiliasi; selaraskan dengan prinsip 5.
