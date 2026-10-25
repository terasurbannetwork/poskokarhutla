# Penyunting bahasa: kajian air, Bab 3 (Metodologi dan Data)

Tanggal: 24 Oktober 2026. Berkas: `naskah/air/bab-03.md`.

## Vonis slop

- Sebelum sunting: LOLOS, skor 0 (3494 kata).
- Sesudah sunting: LOLOS, skor 0 (3487 kata), nol pelanggaran, kata kosong 0,0 per 1.000.
- Putaran antara: tiga kalimat penutup bergaya (S-21, baris 87, 144, 146) muncul karena penghubung "Oleh karena itu", "Oleh sebab itu", dan "Dengan demikian" di awal kalimat penutup; penghubung itu dibuang dan paragraf kini selesai di fakta.

## Suntingan

1. Singkatan: "Badan Perencanaan Pembangunan Nasional" diberi singkatan "(Bappenas)" pada kemunculan pertama di prosa, sesuai glosarium (`data/glosarium.json`), karena tabel sesudahnya memakai "Bappenas".
2. Pengulangan antarsubbab: frasa "karena itu" yang muncul enam kali dikurangi; baris 87, 144, 146 tanpa penghubung, baris 150 menjadi "dengan demikian", baris 252 menjadi "pun hanya dimuat di lampiran".
3. Pengulangan antarsubbab: "hampir tidak membedakan kab/kota" di subbab IRBI dan DIBI diganti "pun nyaris seragam" agar tidak sama dengan subbab Aturan Daftar Perhatian.
4. Tata bahasa: "dua di antaranya pertentangan antardokumen resmi" menjadi "dua di antaranya berupa pertentangan antardokumen resmi".

## Diperiksa, tidak diubah

- Token angka, kutipan `[@...]`, dan rujukan silang `@tbl/@gbr/@sub/@rek`: identik dengan naskah sebelum sunting (dibandingkan otomatis).
- Kalimat pembuka tebal berangka (L16) sudah ada di semua paragraf temuan; paragraf tanpa tebal adalah paragraf aturan atau metode (daftar syarat, definisi skenario, lintasan cakupan, kebijakan pembulatan).
- Judul subbab sudah deskriptif (L60). Label "terbukti" tidak dipakai untuk program; satu-satunya "belum terbukti" (La Niña) dan "tidak terbukti" (rekaman Kota Bekasi) tepat makna.
- Singkatan lain (BNPB, DIBI, IRBI, KRB, DI, BPS, BBWS, CAT, GNSS, WS, NRR, ONI, ENSO, JDIH, Renas PB, IKP, Renstra, NCICD, PJT, ESDM, BMKG, BPBD, IPA) sudah dieja pada kemunculan pertama. Perka, Perban, Juklak, dan Permen PUPR berstatus bentuk rujukan peraturan di glosarium.

## Catatan untuk penulis (tidak disunting karena di luar lapis bahasa)

- "Bappenas (2007)" di baris sumber @tbl:kuantifikasi muncul sebelum ejaan di prosa; baris sumber tabel tidak diperiksa singkatannya oleh slop.py.
