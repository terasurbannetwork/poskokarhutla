# Lapis (c) penyunting bahasa: mitigasi bab 3 (Metodologi)

Berkas: `data/kajian-bnpb/naskah/mitigasi/bab-03.md`. Tanggal: 25 Oktober 2026.

## Vonis

- `qa/slop.py --final`: **LOLOS, skor 0** (3.573 kata, kata kosong 0,0 per 1.000). Sebelum sunting juga LOLOS skor 0 (3.523 kata).
- Sisa temuan hanya S-18 tingkat rendah (11 butir, turun dari 13): semuanya daftar butir yang memang ada (ambang Juklak 7/2023, jenis bencana, besaran kerugian), bukan tiga-serangkai gaya. Tidak dihitung ke skor.
- Keutuhan: 223 token `{{angka:...}}`, 32 kutipan `[@...]`, 19 rujukan silang, dan 11 kutipan bertanda petik sama persis dengan versi sebelum sunting. Jumlah baris tetap 280.

## Suntingan

| Jenis | Lokasi | Perubahan |
| --- | --- | --- |
| Singkatan dieja pada kemunculan pertama di prosa (L66, T-9) | §IRBI dsb. | USGS, PuSGeN (§Skenario), WHO (§Skenario), ONI, NOAA CPC, ENSO (§Kemungkinan), BPS (§Keterbatasan). Sebelumnya kelimanya yang terdaftar di glosarium hanya dieja di tabel, yang tidak dihitung T-9 |
| Istilah tag riset (D-10) | §Kerugian | "tidak ditemukan di korpus" menjadi "tidak terdapat dalam korpus" |
| M-1 pasif menyembunyikan pelaku | §IRBI, §Kemungkinan, §Kerugian, §Keterbatasan | "Kenaikan itu dibaca" menjadi "Kajian membaca kenaikan itu"; "Ambang dikunci" menjadi "Penyusun mengunci ambang"; "Keduanya selalu ditulis berdampingan" menjadi "Kajian selalu menyandingkan keduanya"; kalimat penutup celah dijadikan aktif |
| Pengulangan antarsubbab | §Daftar perhatian | Kalimat "Kedua kriteria ditulis berdampingan." dibuang; isinya sudah dinyatakan pada butir provinsi utama |
| Pengulangan kata dalam paragraf | §Data, §Kemungkinan | "memakai ... tidak dipakai" dan "Pita itu" tiga kali diganti |
| Kalimat berantai "dan ... dan" | §DIBI, §Skenario | dipecah atau diberi "serta" |
| Kalimat kabur | §Kemungkinan, §Skenario, §Rekonsiliasi, §Kerugian | porsi jendela La Niña ditulis sebagai porsi; "COVID-19 mencatat" menjadi "Untuk COVID-19 tercatat"; "hanya pembanding dan pilihannya masuk keputusan" diberi subjek; YLL diberi predikat |
| Ejaan | §IRBI | "dikonfirmasi" menjadi "didukung" |

## Yang diperiksa dan dibiarkan

- M-10 "X, bukan Y": tiap kontras yang tersisa berlandaskan definisi atau data (patahan skala, angka analog bukan lantai, turunan Poisson bukan angka PuSGeN, peluang pemicu bukan peluang skenario).
- L16: semua paragraf temuan dibuka kalimat tebal berangka. Paragraf tanpa kalimat tebal adalah definisi atau metode (label keyakinan, RWCS, pita kemungkinan, kerugian imateriil, aturan daftar, keterbatasan).
- Ejaan (kamus id_ID): kata yang tidak dikenal kamus adalah istilah Inggris bercetak miring, istilah korpus kajian (*baseline*, multibahaya, terkuantifikasi, berpil), atau kata baku yang tidak diurai hunspell (pemilahan). "Anda" yang terdeteksi adalah bagian dari "Pandeglang".
- Singkatan di luar glosarium (NOAA, CPC, USGS, KD, KP): USGS dan NOAA CPC kini dieja di prosa; KD dan KP adalah kode keputusan dan kode RPJMN.

## Di luar lapis ini

- `bangun/kontrak/naskah.py` belum bisa membaca bab ini sampai tuntas, baik versi sebelum maupun sesudah sunting: kunci angka mitigasi (mis. `irbi.skala.perubahan_2025`) belum ada di `data/angka.json` dan kunci pustaka `bnpb-2023-juklak7` belum ada di `pustaka.json`. Itu urusan registri, bukan bahasa.
