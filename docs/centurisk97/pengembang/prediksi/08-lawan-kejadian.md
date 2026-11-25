# Prakiraan lawan Kejadian (rancangan)

Halaman ini memuat rancangan perbandingan prakiraan dengan kejadian nyata di Dalops, yang belum dikode.

## Prakiraan lawan Kejadian di /bnpb/dalops (rencana, belum tersedia)

Paket `data/kajian-bnpb/prediksi-kejadian/` merancang seksi "Prakiraan dan kejadian" di `/bnpb/dalops` untuk staf Pusdalops dan Koordalops: pilih tanggal (hari ini sampai 7 hari lalu), lihat empat ubin (Kena, Luput, Belum ada laporan, Tenang), tabel kab/kota Kena dan Luput, peta berwarna menurut prakiraan beserta titik kejadian Dalops dan titik laporan Lapor Bencana, dan pop-up kab/kota. Per 24 November 2026 seksi ini belum ada di layar. Dalops masih membaca prakiraan banjir dan longsor dari `/banjir/data/status.json` (`public/bnpb/dalops.js:622`) dan belum ada rute `GET /api/dalops/lapor`. Metodenya dijelaskan di bagian Metode agar rancangan terdokumentasi.

## Metode Prakiraan lawan Kejadian (rancangan, belum dikode)

Seluruh bagian ini berasal dari `data/kajian-bnpb/prediksi-kejadian/ALGORITMA.md` dan `KEPUTUSAN-PREDIKSI-KEJADIAN.md`. Status: rancangan. Tiket PK-1 sampai PK-7 berstatus "belum" (`TIKET.md`).

![Empat kotak perbandingan prakiraan dengan kejadian: Kena, Luput, Belum ada laporan, Tenang. Rancangan dari prediksi-kejadian/ALGORITMA.md, belum dikode.](gambar/prediksi-kena-luput.svg)

Untuk tanggal `T` dan jenis `J`:

```
P[kab]       = level sel prakiraan untuk T (lalu.json bila T sudah lewat, prediksi.json bila T antara H+1 dan H+3);
               gelombang = maks(level GEL, level ROB); kab tanpa nilai tidak masuk kotak mana pun
diprakirakan = P[kab] >= 2
terjadi      = ada kejadian Dalops jenis J di kab dengan |mulai - T| <= 1 hari
               ATAU ada laporan Lapor Bencana jenis padanan di kab, status bukan tidak_valid, |waktu - T| <= 1 hari
kotak = Kena              bila diprakirakan dan terjadi
        Luput             bila tidak diprakirakan dan terjadi
        Belum ada laporan bila diprakirakan dan tidak terjadi
        Tenang            selainnya
matang = (hari ini - T) >= 3 ; "Belum ada laporan" yang belum matang ditulis "menunggu laporan"
```

Pasangan jenis Dalops dan kode prakiraan: banjir = BNJ; longsor = LSR; cuaca = CEX; gelombang = GEL dan ROB; udara = ASP; karhutla = API. Gempa, kekeringan, permukiman, dan gunung api tidak punya prakiraan harian. Kejadian yang mulai sebelum jendela dan masih berlangsung tidak dihitung terjadi (ditandai "masih berlangsung"). Laporan warga hanya boleh menjadi bukti terjadi, tidak pernah bukti tidak terjadi. Tidak ada kotak "salah alarm" dan tidak ada skor di Dalops.

Untuk rapor: logbook Pusdalops menjadi label kedua (sumber `logbook`) untuk banjir, longsor, angin, dan gelombang; skornya ditulis terpisah dari skor DIBI dan tidak pernah dirata-rata. Hanya positif; hari tanpa logbook dianggap tidak teramati, bukan nol; vonis "belum teruji" bila n kurang dari 30.

Pertanyaan terbuka Q1 sampai Q4 belum diputuskan pemilik; bawaan sementara disebut di bagian Batasan.
