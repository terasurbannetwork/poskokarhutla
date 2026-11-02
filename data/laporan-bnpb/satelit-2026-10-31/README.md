# Laporan Penanganan Pengendalian Karhutla 311026

- Cut-off 31 Okt 2026, 18.00 WIB (pilihan pemilik hari ini; baku 17.00). Versi akhir = "per sekarang" (cara 301026), atas permintaan tim
  di grup 19.00 ("diganti aja jadi yang per sekarang"): hotspot, firespot, luas terbakar, dan belum padam tiap kolom dari hari yang sama.
  Isi = berkas website terbitan 19.11–19.12 WIB (`web/`), sesudah NOAA-21 siang 31 Okt masuk FIRMS (~19.06): harian30.json, peta_karhutla.json
  s.d. 30 Okt, belum_kini.json 31 Okt, hotspot.json, kluster.json, kluster_hari 28–30 Okt, udara riwayat. Semua titik terekam sebelum 18.00 WIB.
  Kolom 31 Okt: belum padam = belum_kini.json; luas dan padam = rumus peta_karhutla atas hotspot.json (uji terhadap 30 Okt: 9.008 vs 9.009 ha).
- Versi pertama (18.51 WIB, `web-1849/`) memakai "hari utuh" karena NOAA-21 belum ada: luas/belum padam kolom 31 Okt = hari utuh 30 Okt.
  Tim menilai hotspot dan belum padamnya tidak tally (Kalteng hotspot turun 61%, belum padam naik 3.013%), jadi diganti.
- Nasional 31 Okt: 3.833 hotspot, 1.671 firespot, luas 6.029 ha, belum padam 2.244 ha (= belum_kini website), padam 3.974 ha.
  6 teratas hotspot: Papua Selatan 609, Sultra 433, Sulteng 424, Kalteng 400, NTT 261, Sulsel 229. cek6: 72 sel cocok.
- Tabel slide 1 tanpa persen (pemilik 31 Okt: "yang hotspot jangan pakai persenan"); legenda naik/turun slide 1 dibuang. Slide 2 tetap berpersen.
- Slide 3 dari WA satgas 31 Okt (`wa-satgas.txt`, "LAPORAN UPAYA PEMADAMAN", bagian 1.b Peralatan tidak disalin); judul dan pil = 31 Okt,
  kegiatannya 30 Okt. Personel 71.878. Armada 54 unit (22 patroli/OMC + 32 WB), baru: WB Papua Barat Daya 1; tanpa rekap instansi, jadi
  baris PEMILIK tidak tampil. OMC 2 provinsi, 13 sortie 20.800 kg (Kalteng 9 sortie 11.600 kg NaCl + 1.800 kg dry ice, Sumsel 4 sortie
  5.600 kg NaCl + 1.800 kg dry ice). Hujan 30 Okt di 4 provinsi (Kalbar, Kalteng, Kalsel, Jambi); hujan Sumsel bertanggal 29 Okt, tidak dihitung.
- Perbaikan `generator/wa_operasi.py` `_total`: WA Kalteng hari ini menulis total di depan DAN di belakang rincian ("Total penyemaian ...
  11.600 kg NaCl dan 1.800 kg dry ice"); sebelumnya terjumlah tiga kali (34.800 kg). WA 29 dan 30 Okt tetap sama hasilnya.
- Peta slide 1 (pemilik 31 Okt: "rapihin"): `generator/penanganan/peta.mjs` kini memisahkan lingkaran yang bertumpuk (Sulsel/Sultra/
  Sulteng/Gorontalo/Sulbar), yang kecil bergeser lebih jauh dan semuanya ditarik ke titik tengah provinsinya; nama provinsi yang lebih lebar
  dari lingkarannya (Gorontalo) dikecilkan.
- Open-Meteo (pil cuaca) ditarik secukupnya: hanya sel 6 provinsi tabel, `past_days=1` (pemilik 31 Okt: jangan 92 hari).

Dibuat di Windows:

```powershell
$env:PYTHONUTF8=1; C:\Python314\python data\laporan-bnpb\satelit-2026-10-31\jalan.py      # BARU=1 untuk unduh ulang web/
```

Bila NOAA-21 31 Okt sudah masuk dan website menerbitkan belum_kini 31 Okt, versi "hari yang sama" (cara 301026) bisa dibuat dengan
`BARU=1` dan mengembalikan blok kolom hari laporan di `hitung_web` seperti `../satelit-2026-10-30/jalan.py`.
